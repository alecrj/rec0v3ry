# RecoveryOS — Integration Specs (Research Complete)

> Every external API we need, with exact code patterns.
> Sonnet agents reference this file to implement mechanically.

---

## 1. PLAID (Expense Tracking — Phase C)

### NPM Packages
```
plaid           # Server-side Node client
react-plaid-link # Client-side Link component
```

### Environment Variables
```
PLAID_CLIENT_ID=your_client_id
PLAID_SECRET=your_secret
PLAID_ENV=sandbox  # sandbox | development | production
```

### Flow: Link Token → Public Token → Access Token

**Step 1: Create Link Token (server-side tRPC procedure)**
```typescript
import { PlaidApi, Configuration, PlaidEnvironments, Products, CountryCode } from 'plaid';

const plaidClient = new PlaidApi(new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV || 'sandbox'],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
}));

// tRPC procedure: plaid.createLinkToken
const response = await plaidClient.linkTokenCreate({
  user: { client_user_id: ctx.userId },
  client_name: 'RecoveryOS',
  products: [Products.Transactions],
  transactions: { days_requested: 730 },
  country_codes: [CountryCode.Us],
  language: 'en',
  webhook: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/plaid`,
});
return { linkToken: response.data.link_token };
```

**Step 2: Plaid Link (client-side React component)**
```typescript
import { usePlaidLink } from 'react-plaid-link';

const { open } = usePlaidLink({
  token: linkToken, // from Step 1
  onSuccess: (publicToken, metadata) => {
    // Send publicToken to server for exchange
    exchangeTokenMutation.mutate({ publicToken, institutionId: metadata.institution?.institution_id });
  },
});
```

**Step 3: Exchange Public Token (server-side)**
```typescript
// tRPC procedure: plaid.exchangeToken
const response = await plaidClient.itemPublicTokenExchange({
  public_token: input.publicToken,
});
const accessToken = response.data.access_token;
const itemId = response.data.item_id;
// Store accessToken + itemId in plaid_items table (encrypted)
```

### Transactions Sync API (cursor-based)
```typescript
// tRPC procedure: plaid.syncTransactions
let cursor = existingCursor || undefined; // stored from last sync
let hasMore = true;
const allAdded = [];

while (hasMore) {
  const response = await plaidClient.transactionsSync({
    access_token: accessToken,
    cursor: cursor,
  });
  allAdded.push(...response.data.added);
  cursor = response.data.next_cursor;
  hasMore = response.data.has_more;
}
// Update stored cursor
// Each transaction has: transaction_id, name, amount, date, category[], merchant_name, account_id
```

### Transaction Shape (what Plaid returns)
```typescript
{
  transaction_id: "txn_abc123",
  name: "HOME DEPOT #1234",         // Raw merchant name
  merchant_name: "Home Depot",       // Cleaned merchant name (nullable)
  amount: 127.43,                    // Positive = debit (money spent)
  date: "2026-02-20",
  category: ["Shops", "Hardware Store"], // Plaid's auto-categories
  account_id: "acc_xyz",
  pending: false,
}
```

### Plaid Auto-Categories (built-in)
Plaid provides categories like: Shops, Food and Drink, Service, Transfer, Payment, Recreation, Healthcare, etc. Each has subcategories. We can MAP these to our simpler categories:
- "Shops > Hardware Store" → Repairs/Maintenance
- "Shops > Supermarkets" → Supplies/Food
- "Service > Utilities" → Utilities
- "Service > Insurance" → Insurance

### Pricing
- Sandbox: Free
- Development: 100 Items free
- Production: Per-connection pricing (starts ~$1.50-3/connection/month for Transactions)

---

## 2. STRIPE CHECKOUT (Payments — Phase D)

### NPM Packages (already installed)
```
stripe                 # Server-side (v20.3.1 installed)
@stripe/stripe-js      # Client-side (v8.8.0 installed)
```

### Environment Variables (already configured)
```
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Create Checkout Session (server-side)
```typescript
// tRPC procedure: stripe.createCheckoutSession
const session = await stripe.checkout.sessions.create({
  mode: 'payment',
  line_items: [{
    price_data: {
      currency: 'usd',
      product_data: { name: `Rent Payment - Invoice #${invoiceNumber}` },
      unit_amount: amountCents, // e.g., 70000 = $700
    },
    quantity: 1,
  }],
  // Optional convenience fee as second line item
  payment_method_types: ['card', 'us_bank_account'], // Card + ACH
  success_url: `${process.env.NEXT_PUBLIC_APP_URL}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/payments`,
  metadata: { org_id: orgId, invoice_id: invoiceId, resident_id: residentId },
  // For Stripe Connect:
  payment_intent_data: {
    application_fee_amount: platformFeeCents,
    transfer_data: { destination: connectedAccountId },
    metadata: { org_id: orgId, invoice_id: invoiceId },
  },
});
return { url: session.url };
```

### Apple Pay / Google Pay
- Automatically available in Stripe Checkout. No extra code.
- Shows based on user's device/browser + wallet availability.

### ACH vs Card Fees
- Card: 2.9% + $0.30 ($20.60 on $700)
- ACH: 0.8% capped at $5 ($5.00 on $700)
- Apple Pay/Google Pay: Same as card rates

### Key Webhook Events
```typescript
// /api/webhooks/stripe/route.ts
switch (event.type) {
  case 'checkout.session.completed':
    // Card: payment confirmed immediately
    // ACH: payment_status may be 'unpaid' (still processing)
    break;
  case 'payment_intent.succeeded':
    // FINAL confirmation for both card and ACH
    // Create payment record + ledger entries here
    break;
  case 'payment_intent.payment_failed':
    // Card declined or ACH insufficient funds
    break;
}
```

---

## 3. N8N (Automations — Phase E)

### Docker Compose (self-hosted)
```yaml
version: '3.8'
services:
  n8n:
    image: docker.n8n.io/n8nio/n8n
    restart: always
    ports:
      - "5678:5678"
    environment:
      - GENERIC_TIMEZONE=America/New_York
      - TZ=America/New_York
      - N8N_HOST=n8n.yourdomain.com
      - N8N_PORT=5678
      - N8N_PROTOCOL=https
      - WEBHOOK_URL=https://n8n.yourdomain.com/
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_PORT=5432
      - DB_POSTGRESDB_DATABASE=n8n
      - DB_POSTGRESDB_USER=n8n
      - DB_POSTGRESDB_PASSWORD=${POSTGRES_PASSWORD}
      - N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY}
    volumes:
      - n8n_data:/home/node/.n8n
    depends_on:
      - postgres
  postgres:
    image: postgres:15
    restart: always
    environment:
      - POSTGRES_USER=n8n
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=n8n
    volumes:
      - postgres_data:/var/lib/postgresql/data
volumes:
  n8n_data:
  postgres_data:
```

### n8n Cloud Alternative
- Starter: $24/mo (2,500 executions)
- Pro: $60/mo (10,000 executions)
- Easier than self-hosting for small teams

### Webhook Node (trigger n8n FROM our app)
```
// Webhook URLs:
Test: https://n8n.yourdomain.com/webhook-test/my-endpoint
Production: https://n8n.yourdomain.com/webhook/my-endpoint

// Our app calls n8n:
await fetch('https://n8n.yourdomain.com/webhook/payment-received', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ event: 'payment.created', orgId, residentId, amount }),
});
```

### HTTP Request Node (n8n calls OUR API)
n8n can call any REST endpoint. Since tRPC uses POST to a single endpoint, we need thin REST wrappers:
```typescript
// /api/automations/daily-digest/route.ts
export async function POST(req: Request) {
  const { apiKey } = await req.json();
  if (apiKey !== process.env.N8N_API_KEY) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  // Call reporting.getDashboardData internally
  // Return formatted digest data
}
```

### Cron/Schedule Node
```json
{
  "type": "n8n-nodes-base.scheduleTrigger",
  "parameters": {
    "rule": {
      "interval": [{ "field": "cronExpression", "expression": "0 7 * * *" }]
    }
  }
}
// "0 7 * * *" = every day at 7:00 AM
// "0 8 * * 1" = every Monday at 8:00 AM
```

### n8n REST API (activate/deactivate workflows)
```bash
# Activate a workflow
POST https://n8n.yourdomain.com/api/v1/workflows/{workflowId}/activate
Header: X-N8N-API-KEY: your-api-key

# Deactivate
POST https://n8n.yourdomain.com/api/v1/workflows/{workflowId}/deactivate
Header: X-N8N-API-KEY: your-api-key

# List all workflows
GET https://n8n.yourdomain.com/api/v1/workflows
Header: X-N8N-API-KEY: your-api-key
```

### Create Workflow via API
```bash
POST https://n8n.yourdomain.com/api/v1/workflows
Header: X-N8N-API-KEY: your-api-key
Body: { "name": "Daily Digest", "nodes": [...], "connections": {...}, "settings": {...} }
```

### Sending Emails from n8n
Use the Send Email node with SMTP or the SendGrid node:
```json
{
  "type": "n8n-nodes-base.sendEmail",
  "parameters": {
    "fromEmail": "noreply@recoveryos.com",
    "toEmail": "={{ $json.operatorEmail }}",
    "subject": "RecoveryOS Daily Digest",
    "html": "={{ $json.digestHtml }}"
  }
}
```

---

## 4. DOCUSIGN (Documents — Phase G)

### NPM Package
```
docusign-esign    # Official Node SDK
```

### Environment Variables
```
DOCUSIGN_INTEGRATION_KEY=your_integration_key     # OAuth client ID
DOCUSIGN_USER_ID=your_user_id                      # Impersonated user GUID
DOCUSIGN_ACCOUNT_ID=your_account_id
DOCUSIGN_PRIVATE_KEY=base64_encoded_rsa_private_key
DOCUSIGN_BASE_PATH=https://demo.docusign.net/restapi  # demo | production
```

### JWT Authentication (server-to-server)
```typescript
import * as docusign from 'docusign-esign';

const apiClient = new docusign.ApiClient();
apiClient.setBasePath(process.env.DOCUSIGN_BASE_PATH);

const results = await apiClient.requestJWTUserToken(
  process.env.DOCUSIGN_INTEGRATION_KEY,
  process.env.DOCUSIGN_USER_ID,
  ['signature', 'impersonation'],
  Buffer.from(process.env.DOCUSIGN_PRIVATE_KEY, 'base64'),
  3600 // 1 hour expiry
);
apiClient.addDefaultHeader('Authorization', `Bearer ${results.body.access_token}`);
```

### Create Envelope + Send for Signature
```typescript
const envelopesApi = new docusign.EnvelopesApi(apiClient);

const envelope = {
  emailSubject: 'Please sign your House Rules Agreement',
  documents: [{
    documentBase64: base64PdfContent,
    name: 'House Rules Agreement',
    fileExtension: 'pdf',
    documentId: '1',
  }],
  recipients: {
    signers: [{
      email: resident.email,
      name: `${resident.firstName} ${resident.lastName}`,
      recipientId: '1',
      clientUserId: resident.id, // REQUIRED for embedded signing
      tabs: {
        signHereTabs: [{
          anchorString: '/sig1/',  // or absolute positioning
          anchorUnits: 'pixels',
        }],
        dateSignedTabs: [{
          anchorString: '/date1/',
          anchorUnits: 'pixels',
        }],
      },
    }],
  },
  status: 'sent', // 'sent' = send immediately, 'created' = draft
};

const result = await envelopesApi.createEnvelope(accountId, { envelopeDefinition: envelope });
const envelopeId = result.envelopeId;
```

### Embedded Signing URL (resident signs in-app)
```typescript
const viewRequest = {
  returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/documents/signing-complete?envelopeId=${envelopeId}`,
  authenticationMethod: 'none',
  clientUserId: resident.id,
  email: resident.email,
  userName: `${resident.firstName} ${resident.lastName}`,
};

const recipientView = await envelopesApi.createRecipientView(
  accountId,
  envelopeId,
  { recipientViewRequest: viewRequest }
);
// recipientView.url = the signing URL — redirect user here or open in iframe
return { signingUrl: recipientView.url };
```

### Webhook (Connect) for Completion
DocuSign sends webhook events when envelopes complete:
```typescript
// /api/webhooks/docusign/route.ts
// Event: envelope-completed
// Payload includes: envelopeId, status, recipients, completedDateTime
// On completion: download signed PDF, store in S3, update document record
```

### Download Signed Document
```typescript
const documentBytes = await envelopesApi.getDocument(accountId, envelopeId, 'combined');
// Upload to S3, link to resident profile
```

---

## 5. EXPO / REACT NATIVE (Mobile App — Phase H)

### Setup
```bash
npx create-expo-app@latest mobile --template blank-typescript
cd mobile
npx expo install expo-notifications expo-device expo-constants
npx expo install expo-router expo-linking expo-status-bar
```

### Push Notifications Setup
```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Register for push notifications
async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  if (!Device.isDevice) return;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const projectId = Constants?.expoConfig?.extra?.eas?.projectId;
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  return token; // "ExponentPushToken[xxxx]"
}
```

### Sending Push from Server (n8n or API route)
```typescript
await fetch('https://exp.host/--/api/v2/push/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  body: JSON.stringify({
    to: expoPushToken, // stored per user in DB
    title: 'Rent Reminder',
    body: 'Your rent of $700 is due in 3 days',
    data: { screen: '/payments', invoiceId: 'inv_123' },
    sound: 'default',
  }),
});
```

### tRPC Client in React Native
```typescript
import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../../app/src/server/routers/_app';

export const trpc = createTRPCReact<AppRouter>();

// In provider:
const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: `${API_BASE_URL}/api/trpc`,
      headers: () => ({
        Authorization: `Bearer ${clerkToken}`,
      }),
    }),
  ],
});
```

### Clerk Auth in React Native
```bash
npx expo install @clerk/clerk-expo expo-secure-store
```
```typescript
import { ClerkProvider } from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';

const tokenCache = {
  async getToken(key: string) { return SecureStore.getItemAsync(key); },
  async saveToken(key: string, value: string) { return SecureStore.setItemAsync(key, value); },
};

<ClerkProvider publishableKey={CLERK_KEY} tokenCache={tokenCache}>
  <App />
</ClerkProvider>
```

### App Store Requirements
- App icons: 1024x1024 (iOS), 512x512 (Android)
- Splash screen: 1284x2778 recommended
- iOS: Apple Developer account ($99/year)
- Android: Google Play Developer account ($25 one-time)
- EAS Build: `npx eas build --platform all`

---

## 6. EXISTING CODEBASE PATTERNS (for Sonnet agents)

### tRPC Router Pattern (follow this exactly)
File: `src/server/routers/invoice.ts` (use as template)
- Import from `@/server/trpc` (not trpc-init)
- Use `protectedProcedure` for authenticated routes
- Filter by `eq(table.org_id, ctx.orgId)` for tenant isolation
- Return typed data

### DB Schema Pattern (follow this exactly)
File: `src/server/db/schema/billing.ts` (use as template)
- All tables have `org_id` column with FK to orgs
- Use `pgTable` from drizzle-orm/pg-core
- Add indexes on org_id + any query columns
- Add relations in same file

### Frontend Page Pattern
File: `src/app/(crm)/billing/rates/page.tsx` (use as template)
- `export const dynamic = "force-dynamic"` at top
- Use `trpc.routerName.procedureName.useQuery()` for reads
- Use `trpc.routerName.procedureName.useMutation()` for writes
- Use components from `@/components/ui`
- Follow Obsidian dark theme (zinc backgrounds, indigo accents)

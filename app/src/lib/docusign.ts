/**
 * DocuSign API Client
 *
 * Lazy-initialized DocuSign client for e-signature integration.
 * Uses the same Proxy pattern as stripe.ts and db/client.ts
 * to avoid build-time crashes when env vars are absent.
 *
 * Architecture: docs/02_ARCHITECTURE.md Section 13 (DocuSign Integration)
 * Compliance: NO SUD data in envelope metadata per 42 CFR Part 2
 */

import jwt from 'jsonwebtoken';

// ============================================================
// TYPES
// ============================================================

export interface DocuSignEnvelopeParams {
  orgId: string;
  documents: {
    documentId: string;
    name: string;
    fileUrl: string;
    documentBase64?: string;
  }[];
  signers: {
    email: string;
    name: string;
    recipientId: string;
    clientUserId?: string;
  }[];
  ccRecipients?: {
    email: string;
    name: string;
  }[];
  webhookUrl: string;
  emailSubject?: string;
  emailBody?: string;
}

export interface DocuSignSigningUrlParams {
  envelopeId: string;
  signerEmail: string;
  signerName: string;
  clientUserId: string;
  returnUrl: string;
}

export interface DocuSignEnvelopeResult {
  envelopeId: string;
  status: string;
  uri: string;
}

export interface DocuSignSigningUrlResult {
  signingUrl: string;
}

// ============================================================
// CLIENT CONFIGURATION
// ============================================================

interface DocuSignConfig {
  baseUrl: string;
  accountId: string;
  integrationKey: string;
  userId: string;
  rsaPrivateKey: string;
  oauthBaseUrl: string;
}

let _config: DocuSignConfig | null = null;

function getConfig(): DocuSignConfig {
  if (!_config) {
    const baseUrl = process.env.DOCUSIGN_BASE_URL || 'https://demo.docusign.net/restapi';
    // Determine OAuth base URL from environment
    const isDemo = baseUrl.includes('demo.docusign.net');
    _config = {
      baseUrl,
      accountId: process.env.DOCUSIGN_ACCOUNT_ID!,
      integrationKey: process.env.DOCUSIGN_INTEGRATION_KEY!,
      userId: process.env.DOCUSIGN_USER_ID!,
      rsaPrivateKey: process.env.DOCUSIGN_RSA_PRIVATE_KEY!,
      oauthBaseUrl: isDemo
        ? 'https://account-d.docusign.com'
        : 'https://account.docusign.com',
    };
  }
  return _config;
}

// ============================================================
// ACCESS TOKEN MANAGEMENT
// ============================================================

let _accessToken: string | null = null;
let _tokenExpiry: number = 0;

async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 5-min buffer)
  if (_accessToken && Date.now() < _tokenExpiry - 5 * 60 * 1000) {
    return _accessToken;
  }

  const config = getConfig();
  const assertion = createJWTAssertion(config);

  const response = await fetch(`${config.oauthBaseUrl}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DocuSign auth failed: ${error}`);
  }

  const data = await response.json();
  _accessToken = data.access_token;
  _tokenExpiry = Date.now() + data.expires_in * 1000;
  return _accessToken!;
}

/**
 * Create a JWT assertion for DocuSign JWT Grant authentication.
 *
 * DocuSign requires RS256-signed JWT with:
 *   - iss: integration key (OAuth client ID)
 *   - sub: user ID to impersonate
 *   - aud: OAuth base URL host (no https://)
 *   - iat: issued at (unix seconds)
 *   - exp: expiry (iat + 3600 seconds)
 *   - scope: "signature impersonation"
 *
 * The RSA private key may be stored as bare base64 (no PEM headers)
 * or with PEM headers. We normalize it to PEM format here.
 */
function createJWTAssertion(config: DocuSignConfig): string {
  const now = Math.floor(Date.now() / 1000);

  const payload = {
    iss: config.integrationKey,
    sub: config.userId,
    aud: config.oauthBaseUrl.replace('https://', ''),
    iat: now,
    exp: now + 3600,
    scope: 'signature impersonation',
  };

  // Normalize the RSA private key to PEM format.
  // The env var may be stored as bare base64 without PEM headers.
  const privateKey = normalizePemKey(config.rsaPrivateKey);

  return jwt.sign(payload, privateKey, {
    algorithm: 'RS256',
    header: { alg: 'RS256', typ: 'JWT' },
  });
}

/**
 * Normalize an RSA private key to PEM format.
 * Handles bare base64 (no headers), PKCS#8, and traditional RSA keys.
 */
function normalizePemKey(key: string): string {
  const trimmed = key.trim();

  // Already has PEM headers — return as-is
  if (trimmed.startsWith('-----BEGIN')) {
    return trimmed;
  }

  // Bare base64 — wrap with PKCS#8 headers
  // Remove any whitespace from the raw key
  const stripped = trimmed.replace(/\s+/g, '');
  // Add line breaks every 64 chars (standard PEM format)
  const formatted = stripped.match(/.{1,64}/g)?.join('\n') ?? stripped;

  return `-----BEGIN RSA PRIVATE KEY-----\n${formatted}\n-----END RSA PRIVATE KEY-----`;
}

// ============================================================
// API METHODS
// ============================================================

/**
 * Create a DocuSign envelope (send documents for signature)
 *
 * Compliance: Only generic metadata allowed — no SUD indicators
 */
export async function createDocuSignEnvelope(
  params: DocuSignEnvelopeParams
): Promise<DocuSignEnvelopeResult> {
  const config = getConfig();
  const token = await getAccessToken();

  const envelopeDefinition = {
    emailSubject: params.emailSubject || 'Please sign this document',
    emailBlurb: params.emailBody || '',
    status: 'sent',
    documents: params.documents.map((doc, i) => ({
      documentId: doc.documentId || String(i + 1),
      name: doc.name,
      documentBase64: doc.documentBase64 || '',
      fileExtension: 'pdf',
    })),
    recipients: {
      signers: params.signers.map((s, i) => ({
        email: s.email,
        name: s.name,
        recipientId: s.recipientId || String(i + 1),
        clientUserId: s.clientUserId, // Required for embedded signing
        tabs: {
          signHereTabs: [
            {
              documentId: '1',
              pageNumber: '1',
              xPosition: '200',
              yPosition: '700',
            },
          ],
        },
      })),
      carbonCopies: (params.ccRecipients || []).map((cc, i) => ({
        email: cc.email,
        name: cc.name,
        recipientId: String(params.signers.length + i + 1),
      })),
    },
    eventNotification: {
      url: params.webhookUrl,
      requireAcknowledgment: true,
      loggingEnabled: true,
      envelopeEvents: [
        { envelopeEventStatusCode: 'completed' },
        { envelopeEventStatusCode: 'declined' },
        { envelopeEventStatusCode: 'voided' },
        { envelopeEventStatusCode: 'sent' },
        { envelopeEventStatusCode: 'delivered' },
      ],
      recipientEvents: [
        { recipientEventStatusCode: 'Completed' },
        { recipientEventStatusCode: 'Declined' },
        { recipientEventStatusCode: 'AuthenticationFailed' },
      ],
    },
  };

  const response = await fetch(
    `${config.baseUrl}/v2.1/accounts/${config.accountId}/envelopes`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(envelopeDefinition),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DocuSign envelope creation failed: ${error}`);
  }

  return response.json();
}

/**
 * Get embedded signing URL for a recipient
 *
 * Returns a URL that can be embedded in an iframe for in-app signing
 */
export async function getDocuSignSigningUrl(
  params: DocuSignSigningUrlParams
): Promise<DocuSignSigningUrlResult> {
  const config = getConfig();
  const token = await getAccessToken();

  const response = await fetch(
    `${config.baseUrl}/v2.1/accounts/${config.accountId}/envelopes/${params.envelopeId}/views/recipient`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        authenticationMethod: 'none',
        clientUserId: params.clientUserId,
        email: params.signerEmail,
        userName: params.signerName,
        returnUrl: params.returnUrl,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DocuSign signing URL failed: ${error}`);
  }

  const data = await response.json();
  return { signingUrl: data.url };
}

/**
 * Create a DocuSign envelope from a saved DocuSign template.
 *
 * This is the primary flow for sending standard documents (House Rules,
 * Move-In Agreement, Financial Agreement, Emergency Contact, Drug Testing).
 *
 * @param templateId - DocuSign template ID (from account)
 * @param signer - recipient who will sign
 * @param webhookUrl - where DocuSign Connect will POST status updates
 * @param emailSubject - optional email subject override
 * @param mergeFields - template tab values to pre-fill
 */
export async function createEnvelopeFromTemplate(params: {
  templateId: string;
  signer: {
    email: string;
    name: string;
    recipientId: string;
    clientUserId: string;
    roleName?: string;
  };
  webhookUrl: string;
  emailSubject?: string;
  mergeFields?: Record<string, string>;
}): Promise<DocuSignEnvelopeResult> {
  const config = getConfig();
  const token = await getAccessToken();

  const envelopeDefinition: Record<string, unknown> = {
    templateId: params.templateId,
    emailSubject: params.emailSubject || 'Please sign this document',
    status: 'sent',
    templateRoles: [
      {
        email: params.signer.email,
        name: params.signer.name,
        recipientId: params.signer.recipientId,
        clientUserId: params.signer.clientUserId,
        roleName: params.signer.roleName || 'Signer',
        ...(params.mergeFields && Object.keys(params.mergeFields).length > 0 && {
          tabs: {
            textTabs: Object.entries(params.mergeFields).map(([label, value]) => ({
              tabLabel: label,
              value,
            })),
          },
        }),
      },
    ],
    eventNotification: {
      url: params.webhookUrl,
      requireAcknowledgment: true,
      loggingEnabled: true,
      envelopeEvents: [
        { envelopeEventStatusCode: 'completed' },
        { envelopeEventStatusCode: 'declined' },
        { envelopeEventStatusCode: 'voided' },
        { envelopeEventStatusCode: 'sent' },
        { envelopeEventStatusCode: 'delivered' },
      ],
      recipientEvents: [
        { recipientEventStatusCode: 'Completed' },
        { recipientEventStatusCode: 'Declined' },
        { recipientEventStatusCode: 'AuthenticationFailed' },
      ],
    },
  };

  const response = await fetch(
    `${config.baseUrl}/v2.1/accounts/${config.accountId}/envelopes`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(envelopeDefinition),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DocuSign template envelope creation failed: ${error}`);
  }

  return response.json();
}

/**
 * List available templates in the DocuSign account.
 */
export async function listDocuSignTemplates(): Promise<Array<{
  templateId: string;
  name: string;
  description: string;
  lastModified: string;
}>> {
  const config = getConfig();
  const token = await getAccessToken();

  const response = await fetch(
    `${config.baseUrl}/v2.1/accounts/${config.accountId}/templates`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DocuSign list templates failed: ${error}`);
  }

  const data = await response.json();
  return (data.envelopeTemplates || []).map((t: Record<string, string>) => ({
    templateId: t.templateId,
    name: t.name,
    description: t.description || '',
    lastModified: t.lastModified,
  }));
}

/**
 * Void (cancel) an envelope
 */
export async function voidDocuSignEnvelope(
  envelopeId: string,
  reason: string
): Promise<void> {
  const config = getConfig();
  const token = await getAccessToken();

  const response = await fetch(
    `${config.baseUrl}/v2.1/accounts/${config.accountId}/envelopes/${envelopeId}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'voided',
        voidedReason: reason,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DocuSign void failed: ${error}`);
  }
}

/**
 * Get envelope status
 */
export async function getDocuSignEnvelopeStatus(
  envelopeId: string
): Promise<{ status: string; completedDateTime?: string }> {
  const config = getConfig();
  const token = await getAccessToken();

  const response = await fetch(
    `${config.baseUrl}/v2.1/accounts/${config.accountId}/envelopes/${envelopeId}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DocuSign status check failed: ${error}`);
  }

  return response.json();
}

/**
 * Download a completed envelope's documents as a combined PDF.
 * Returns the PDF as a Buffer.
 */
export async function downloadDocuSignEnvelopeDocuments(
  envelopeId: string
): Promise<Buffer> {
  const config = getConfig();
  const token = await getAccessToken();

  const response = await fetch(
    `${config.baseUrl}/v2.1/accounts/${config.accountId}/envelopes/${envelopeId}/documents/combined`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/pdf',
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DocuSign document download failed: ${error}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

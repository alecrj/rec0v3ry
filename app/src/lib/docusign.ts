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

// ============================================================
// TYPES
// ============================================================

export interface DocuSignEnvelopeParams {
  orgId: string;
  documents: {
    documentId: string;
    name: string;
    fileUrl: string;
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
}

let _config: DocuSignConfig | null = null;

function getConfig(): DocuSignConfig {
  if (!_config) {
    _config = {
      baseUrl: process.env.DOCUSIGN_BASE_URL || 'https://demo.docusign.net/restapi',
      accountId: process.env.DOCUSIGN_ACCOUNT_ID!,
      integrationKey: process.env.DOCUSIGN_INTEGRATION_KEY!,
      userId: process.env.DOCUSIGN_USER_ID!,
      rsaPrivateKey: process.env.DOCUSIGN_RSA_PRIVATE_KEY!,
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

  // JWT Grant flow for server-to-server auth
  // In production, this would use jsonwebtoken to create a JWT assertion
  // and exchange it for an access token via DocuSign OAuth
  const response = await fetch(`${config.baseUrl.replace('/restapi', '')}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: createJWTAssertion(config),
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

function createJWTAssertion(_config: DocuSignConfig): string {
  // TODO: Implement JWT assertion creation with jsonwebtoken
  // This requires the RSA private key to sign the JWT
  // For now, return placeholder — actual implementation needs:
  //   1. Create JWT header: { alg: 'RS256', typ: 'JWT' }
  //   2. Create JWT payload with iss, sub, aud, iat, exp, scope
  //   3. Sign with RSA private key
  throw new Error('DocuSign JWT assertion not yet implemented — configure DOCUSIGN_* env vars');
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
      documentBase64: '', // Would be populated from S3 file content
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

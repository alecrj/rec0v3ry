/**
 * DocuSign Webhook Handler (Connect)
 *
 * Handles webhook events from DocuSign Connect for:
 * - Envelope completed (all signers have signed)
 * - Recipient completed (individual signer signed)
 * - Envelope voided
 * - Envelope declined
 *
 * Architecture: docs/02_ARCHITECTURE.md Section 13 (DocuSign Integration)
 * Compliance: Audit trail for all signature events
 */

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { db } from '@/server/db/client';
import { documents, signatures } from '@/server/db/schema/documents';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

// ============================================================
// HMAC SIGNATURE VERIFICATION
// ============================================================

function verifyDocuSignSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const computed = hmac.digest('base64');
  return crypto.timingSafeEqual(
    Buffer.from(computed),
    Buffer.from(signature)
  );
}

// ============================================================
// WEBHOOK HANDLER
// ============================================================

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();

  // Verify HMAC signature from DocuSign Connect
  const docusignSignature = headersList.get('x-docusign-signature-1');
  const hmacSecret = process.env.DOCUSIGN_WEBHOOK_SECRET;

  if (hmacSecret && docusignSignature) {
    const isValid = verifyDocuSignSignature(body, docusignSignature, hmacSecret);
    if (!isValid) {
      console.error('[DocuSign Webhook] Invalid HMAC signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  }

  let payload: DocuSignWebhookPayload;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  console.log(`[DocuSign Webhook] Event: ${payload.event}`);

  try {
    switch (payload.event) {
      case 'envelope-completed':
        await handleEnvelopeCompleted(payload);
        break;

      case 'envelope-sent':
        await handleEnvelopeSent(payload);
        break;

      case 'envelope-delivered':
        await handleEnvelopeDelivered(payload);
        break;

      case 'recipient-completed':
        await handleRecipientCompleted(payload);
        break;

      case 'envelope-voided':
        await handleEnvelopeVoided(payload);
        break;

      case 'envelope-declined':
        await handleEnvelopeDeclined(payload);
        break;

      default:
        console.log(`[DocuSign Webhook] Unhandled event: ${payload.event}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[DocuSign Webhook] Processing error:', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}

// ============================================================
// EVENT HANDLERS
// ============================================================

async function handleEnvelopeSent(payload: DocuSignWebhookPayload) {
  const envelopeId = payload.data?.envelopeId;
  if (!envelopeId) return;

  console.log(`[DocuSign Webhook] Envelope sent: ${envelopeId}`);

  await db
    .update(documents)
    .set({
      docusign_status: 'sent',
      status: 'pending_signature',
      updated_by: 'system',
    })
    .where(eq(documents.docusign_envelope_id, envelopeId));
}

async function handleEnvelopeDelivered(payload: DocuSignWebhookPayload) {
  const envelopeId = payload.data?.envelopeId;
  if (!envelopeId) return;

  console.log(`[DocuSign Webhook] Envelope delivered: ${envelopeId}`);

  // Mark as delivered — recipient has opened/viewed the document
  await db
    .update(documents)
    .set({
      docusign_status: 'delivered',
      updated_by: 'system',
    })
    .where(eq(documents.docusign_envelope_id, envelopeId));
}

async function handleEnvelopeCompleted(payload: DocuSignWebhookPayload) {
  const envelopeId = payload.data?.envelopeId;
  if (!envelopeId) return;

  console.log(`[DocuSign Webhook] Envelope completed: ${envelopeId}`);

  // Find all documents with this envelope ID and mark as signed
  await db
    .update(documents)
    .set({
      status: 'signed',
      docusign_status: 'completed',
      updated_by: 'system',
    })
    .where(eq(documents.docusign_envelope_id, envelopeId));
}

async function handleRecipientCompleted(payload: DocuSignWebhookPayload) {
  const envelopeId = payload.data?.envelopeId;
  const recipientEmail = payload.data?.recipientEmail;
  const recipientName = payload.data?.recipientName;
  if (!envelopeId || !recipientEmail) return;

  console.log(`[DocuSign Webhook] Recipient signed: ${recipientEmail} on ${envelopeId}`);

  // Find documents with this envelope ID
  const docs = await db.query.documents.findMany({
    where: eq(documents.docusign_envelope_id, envelopeId),
  });

  // Update matching signature records
  for (const doc of docs) {
    const existingSigs = await db.query.signatures.findMany({
      where: and(
        eq(signatures.document_id, doc.id),
        eq(signatures.signer_email, recipientEmail)
      ),
    });

    for (const sig of existingSigs) {
      if (!sig.signed_at) {
        await db
          .update(signatures)
          .set({
            signed_at: new Date(),
            is_verified: true,
            ip_address: payload.data?.recipientIpAddress || null,
          })
          .where(eq(signatures.id, sig.id));
      }
    }
  }
}

async function handleEnvelopeVoided(payload: DocuSignWebhookPayload) {
  const envelopeId = payload.data?.envelopeId;
  if (!envelopeId) return;

  console.log(`[DocuSign Webhook] Envelope voided: ${envelopeId}`);

  await db
    .update(documents)
    .set({
      status: 'voided',
      docusign_status: 'voided',
      updated_by: 'system',
    })
    .where(eq(documents.docusign_envelope_id, envelopeId));
}

async function handleEnvelopeDeclined(payload: DocuSignWebhookPayload) {
  const envelopeId = payload.data?.envelopeId;
  if (!envelopeId) return;

  console.log(`[DocuSign Webhook] Envelope declined: ${envelopeId}`);

  await db
    .update(documents)
    .set({
      docusign_status: 'declined',
      updated_by: 'system',
    })
    .where(eq(documents.docusign_envelope_id, envelopeId));
}

// ============================================================
// TYPES
// ============================================================

interface DocuSignWebhookPayload {
  event: string;
  apiVersion: string;
  uri: string;
  retryCount: number;
  configurationId: string;
  generatedDateTime: string;
  data?: {
    envelopeId?: string;
    accountId?: string;
    recipientEmail?: string;
    recipientName?: string;
    recipientId?: string;
    recipientIpAddress?: string;
    [key: string]: unknown;
  };
}

/**
 * E-Sign Router
 *
 * DocuSign integration for electronic signatures.
 * Source: docs/02_ARCHITECTURE.md Section 13 (DocuSign Integration)
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { db } from '../db/client';
import { documents, signatures } from '../db/schema/documents';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { NotFoundError, InvalidInputError } from '@/lib/errors';
import {
  createDocuSignEnvelope,
  createEnvelopeFromTemplate,
  listDocuSignTemplates,
  getDocuSignSigningUrl,
  voidDocuSignEnvelope,
} from '@/lib/docusign';
import { residents } from '../db/schema/residents';

// ============================================================
// INPUT SCHEMAS
// ============================================================

const createEnvelopeSchema = z.object({
  documentIds: z.array(z.string().uuid()).min(1),
  signers: z.array(z.object({
    email: z.string().email(),
    name: z.string().min(1),
    residentId: z.string().uuid().optional(),
    userId: z.string().uuid().optional(),
  })).min(1),
  ccRecipients: z.array(z.object({
    email: z.string().email(),
    name: z.string().min(1),
  })).optional(),
  emailSubject: z.string().optional(),
  emailBody: z.string().optional(),
});

const getSigningUrlSchema = z.object({
  documentId: z.string().uuid(),
  signerEmail: z.string().email(),
  signerName: z.string().min(1),
  returnUrl: z.string().url().optional(),
});

const recordSignatureSchema = z.object({
  documentId: z.string().uuid(),
  signerResidentId: z.string().uuid().optional(),
  signerUserId: z.string().uuid().optional(),
  signerName: z.string().min(1),
  signerEmail: z.string().email().optional(),
  signatureMethod: z.enum(['electronic', 'wet_signature', 'click_to_sign']).default('electronic'),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  docusignRecipientId: z.string().optional(),
});

const bulkSignSchema = z.object({
  documentIds: z.array(z.string().uuid()).min(1).max(20),
  signerEmail: z.string().email(),
  signerName: z.string().min(1),
  signerResidentId: z.string().uuid().optional(),
  signerUserId: z.string().uuid().optional(),
  emailSubject: z.string().optional(),
});

// ============================================================
// E-SIGN ROUTER
// ============================================================

export const esignRouter = router({
  /**
   * Create a DocuSign envelope for one or more documents
   */
  createEnvelope: protectedProcedure
    .meta({ permission: 'document:update', resource: 'esign' })
    .input(createEnvelopeSchema)
    .mutation(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;
      const userId = ctx.user!.id;

      // Verify all documents exist and belong to this org
      const docs = await Promise.all(
        input.documentIds.map(async (docId) => {
          const doc = await db.query.documents.findFirst({
            where: and(
              eq(documents.id, docId),
              eq(documents.org_id, orgId),
              isNull(documents.deleted_at)
            ),
          });
          if (!doc) {
            throw new NotFoundError('Document', docId);
          }
          return doc;
        })
      );

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const webhookUrl = `${appUrl}/api/webhooks/docusign`;

      // Call DocuSign API to create envelope
      const envelope = await createDocuSignEnvelope({
        orgId,
        documents: docs.map((d, i) => ({
          documentId: String(i + 1),
          name: d.title,
          fileUrl: d.file_url || '',
          // documentBase64 is optional — DocuSign will use file_url if provided
          // For now we send empty and rely on DocuSign templates or upload separately
          documentBase64: '',
        })),
        signers: input.signers.map((s, i) => ({
          email: s.email,
          name: s.name,
          recipientId: String(i + 1),
          clientUserId: s.residentId || s.userId || s.email,
        })),
        ccRecipients: input.ccRecipients,
        webhookUrl,
        emailSubject: input.emailSubject,
        emailBody: input.emailBody,
      });

      const envelopeId = envelope.envelopeId;

      // Update documents with envelope info and status
      await Promise.all(
        docs.map(async (doc) => {
          await db
            .update(documents)
            .set({
              docusign_envelope_id: envelopeId,
              docusign_status: 'sent',
              status: 'pending_signature',
              updated_by: userId,
            })
            .where(eq(documents.id, doc.id));
        })
      );

      // Create pending signature records for each signer × document
      for (const doc of docs) {
        for (const signer of input.signers) {
          await db.insert(signatures).values({
            org_id: orgId,
            document_id: doc.id,
            signer_resident_id: signer.residentId || null,
            signer_user_id: signer.userId || null,
            signer_name: signer.name,
            signer_email: signer.email,
            signature_method: 'electronic',
          });
        }
      }

      return {
        envelopeId,
        documentCount: docs.length,
        signerCount: input.signers.length,
      };
    }),

  /**
   * Get embedded signing URL for a document
   */
  getSigningUrl: protectedProcedure
    .meta({ permission: 'document:read', resource: 'esign' })
    .input(getSigningUrlSchema)
    .mutation(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;

      const doc = await db.query.documents.findFirst({
        where: and(
          eq(documents.id, input.documentId),
          eq(documents.org_id, orgId),
          isNull(documents.deleted_at)
        ),
      });

      if (!doc) {
        throw new NotFoundError('Document', input.documentId);
      }

      if (!doc.docusign_envelope_id) {
        throw new InvalidInputError('Document does not have an active signing envelope');
      }

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const returnUrl = input.returnUrl || `${appUrl}/documents/signatures`;

      // Call DocuSign API to get embedded signing URL
      const { signingUrl } = await getDocuSignSigningUrl({
        envelopeId: doc.docusign_envelope_id,
        signerEmail: input.signerEmail,
        signerName: input.signerName,
        clientUserId: ctx.user!.id,
        returnUrl,
      });

      return {
        signingUrl,
        envelopeId: doc.docusign_envelope_id,
        expiresIn: 300, // 5 minutes
      };
    }),

  /**
   * Get envelope/signature status for a document
   */
  getStatus: protectedProcedure
    .meta({ permission: 'document:read', resource: 'esign' })
    .input(z.object({ documentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;

      const doc = await db.query.documents.findFirst({
        where: and(
          eq(documents.id, input.documentId),
          eq(documents.org_id, orgId),
          isNull(documents.deleted_at)
        ),
        with: {
          signatures: true,
        },
      });

      if (!doc) {
        throw new NotFoundError('Document', input.documentId);
      }

      return {
        documentId: doc.id,
        status: doc.status,
        docusignEnvelopeId: doc.docusign_envelope_id,
        docusignStatus: doc.docusign_status,
        signatures: doc.signatures.map((sig) => ({
          id: sig.id,
          signerName: sig.signer_name,
          signatureMethod: sig.signature_method,
          signedAt: sig.signed_at,
          isVerified: sig.is_verified,
        })),
      };
    }),

  /**
   * List documents pending signature for the current user
   */
  listPending: protectedProcedure
    .meta({ permission: 'document:read', resource: 'esign' })
    .input(z.object({ limit: z.number().min(1).max(50).default(20) }).optional())
    .query(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;

      // Find signatures pending for the current user
      const pendingSigs = await db.query.signatures.findMany({
        where: and(
          eq(signatures.org_id, orgId),
          eq(signatures.signer_user_id, ctx.user!.id),
          isNull(signatures.signed_at)
        ),
        orderBy: [desc(signatures.created_at)],
        limit: input?.limit ?? 20,
        with: {
          document: {
            columns: {
              id: true,
              title: true,
              document_type: true,
              status: true,
              created_at: true,
            },
          },
        },
      });

      return pendingSigs;
    }),

  /**
   * Record a completed signature
   */
  recordSignature: protectedProcedure
    .meta({ permission: 'document:update', resource: 'esign' })
    .input(recordSignatureSchema)
    .mutation(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;
      const userId = ctx.user!.id;

      const doc = await db.query.documents.findFirst({
        where: and(
          eq(documents.id, input.documentId),
          eq(documents.org_id, orgId),
          isNull(documents.deleted_at)
        ),
      });

      if (!doc) {
        throw new NotFoundError('Document', input.documentId);
      }

      // Create signature record
      const [sig] = await db
        .insert(signatures)
        .values({
          org_id: orgId,
          document_id: input.documentId,
          signer_resident_id: input.signerResidentId || null,
          signer_user_id: input.signerUserId || userId,
          signer_name: input.signerName,
          signer_email: input.signerEmail || null,
          signature_method: input.signatureMethod,
          signed_at: new Date(),
          ip_address: input.ipAddress || null,
          user_agent: input.userAgent || null,
          docusign_recipient_id: input.docusignRecipientId || null,
          is_verified: true,
        })
        .returning();

      // Check if all signers have signed — if so, mark document as signed
      const allSigs = await db.query.signatures.findMany({
        where: eq(signatures.document_id, input.documentId),
      });
      const allSigned = allSigs.every((s) => s.signed_at !== null);

      if (allSigned) {
        await db
          .update(documents)
          .set({
            status: 'signed',
            docusign_status: 'completed',
            updated_by: userId,
          })
          .where(eq(documents.id, input.documentId));
      }

      return sig;
    }),

  /**
   * Create bulk signing envelope (DOC-11: sign multiple documents in sequence)
   */
  bulkSign: protectedProcedure
    .meta({ permission: 'document:update', resource: 'esign' })
    .input(bulkSignSchema)
    .mutation(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;
      const userId = ctx.user!.id;

      // Verify all documents exist
      const docs = await Promise.all(
        input.documentIds.map(async (docId) => {
          const doc = await db.query.documents.findFirst({
            where: and(
              eq(documents.id, docId),
              eq(documents.org_id, orgId),
              isNull(documents.deleted_at)
            ),
          });
          if (!doc) {
            throw new NotFoundError('Document', docId);
          }
          return doc;
        })
      );

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const webhookUrl = `${appUrl}/api/webhooks/docusign`;

      // Call DocuSign API to create bulk envelope
      const envelope = await createDocuSignEnvelope({
        orgId,
        documents: docs.map((d, i) => ({
          documentId: String(i + 1),
          name: d.title,
          fileUrl: d.file_url || '',
          documentBase64: '',
        })),
        signers: [{
          email: input.signerEmail,
          name: input.signerName,
          recipientId: '1',
          clientUserId: input.signerResidentId || input.signerUserId || input.signerEmail,
        }],
        webhookUrl,
        emailSubject: input.emailSubject,
      });

      const envelopeId = envelope.envelopeId;

      // Update all documents and create signature records
      await db.transaction(async (tx) => {
        for (const doc of docs) {
          await tx
            .update(documents)
            .set({
              docusign_envelope_id: envelopeId,
              docusign_status: 'sent',
              status: 'pending_signature',
              updated_by: userId,
            })
            .where(eq(documents.id, doc.id));

          await tx.insert(signatures).values({
            org_id: orgId,
            document_id: doc.id,
            signer_resident_id: input.signerResidentId || null,
            signer_user_id: input.signerUserId || null,
            signer_name: input.signerName,
            signer_email: input.signerEmail,
            signature_method: 'electronic',
          });
        }
      });

      // Get embedded signing URL for the bulk envelope
      const returnUrl = `${appUrl}/documents/signatures`;
      const { signingUrl } = await getDocuSignSigningUrl({
        envelopeId,
        signerEmail: input.signerEmail,
        signerName: input.signerName,
        clientUserId: input.signerResidentId || input.signerUserId || input.signerEmail,
        returnUrl,
      });

      return {
        envelopeId,
        documentCount: docs.length,
        signingUrl,
      };
    }),

  /**
   * Check DocuSign connection status
   * Verifies that env vars are configured and the JWT auth works
   */
  checkConnection: protectedProcedure
    .meta({ permission: 'document:read', resource: 'esign' })
    .query(async () => {
      const hasIntegrationKey = !!process.env.DOCUSIGN_INTEGRATION_KEY;
      const hasAccountId = !!process.env.DOCUSIGN_ACCOUNT_ID;
      const hasUserId = !!process.env.DOCUSIGN_USER_ID;
      const hasPrivateKey = !!process.env.DOCUSIGN_RSA_PRIVATE_KEY;
      const hasWebhookSecret = !!process.env.DOCUSIGN_WEBHOOK_SECRET;
      const baseUrl = process.env.DOCUSIGN_BASE_URL || 'https://demo.docusign.net/restapi';
      const isConfigured = hasIntegrationKey && hasAccountId && hasUserId && hasPrivateKey;

      return {
        isConfigured,
        isDemo: baseUrl.includes('demo.docusign.net'),
        baseUrl,
        envVars: {
          integrationKey: hasIntegrationKey,
          accountId: hasAccountId,
          userId: hasUserId,
          rsaPrivateKey: hasPrivateKey,
          webhookSecret: hasWebhookSecret,
        },
      };
    }),

  /**
   * Void/cancel an envelope
   */
  voidEnvelope: protectedProcedure
    .meta({ permission: 'document:delete', resource: 'esign' })
    .input(z.object({
      documentId: z.string().uuid(),
      reason: z.string().min(1).max(500),
    }))
    .mutation(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;
      const userId = ctx.user!.id;

      const doc = await db.query.documents.findFirst({
        where: and(
          eq(documents.id, input.documentId),
          eq(documents.org_id, orgId),
          isNull(documents.deleted_at)
        ),
      });

      if (!doc) {
        throw new NotFoundError('Document', input.documentId);
      }

      if (!doc.docusign_envelope_id) {
        throw new InvalidInputError('Document does not have an active signing envelope');
      }

      if (doc.status === 'signed') {
        throw new InvalidInputError('Cannot void a signed document');
      }

      // Call DocuSign API to void the envelope
      await voidDocuSignEnvelope(doc.docusign_envelope_id, input.reason);

      const [updated] = await db
        .update(documents)
        .set({
          status: 'voided',
          docusign_status: 'voided',
          updated_by: userId,
        })
        .where(eq(documents.id, input.documentId))
        .returning();

      return updated;
    }),

  /**
   * List DocuSign templates available in the account.
   * Used to populate the "Send from Template" dropdown.
   */
  listTemplates: protectedProcedure
    .meta({ permission: 'document:read', resource: 'esign' })
    .query(async () => {
      return listDocuSignTemplates();
    }),

  /**
   * Send a document for signature using a DocuSign template.
   *
   * G2-21: Operator selects template + resident → envelope sent via DocuSign
   * A document record is created in DB to track signature status.
   */
  sendFromTemplate: protectedProcedure
    .meta({ permission: 'document:update', resource: 'esign' })
    .input(z.object({
      templateId: z.string().min(1, 'Template ID required'),
      templateName: z.string().min(1),
      residentId: z.string().uuid(),
      emailSubject: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;
      const userId = ctx.user!.id;

      // Look up resident to get name + email
      const resident = await db.query.residents.findFirst({
        where: and(
          eq(residents.id, input.residentId),
          eq(residents.org_id, orgId)
        ),
      });

      if (!resident) {
        throw new NotFoundError('Resident', input.residentId);
      }

      if (!resident.email) {
        throw new InvalidInputError('Resident does not have an email address');
      }

      const signerName = `${resident.first_name} ${resident.last_name}`;
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const webhookUrl = `${appUrl}/api/webhooks/docusign`;

      // Send via DocuSign template API
      const envelope = await createEnvelopeFromTemplate({
        templateId: input.templateId,
        signer: {
          email: resident.email,
          name: signerName,
          recipientId: '1',
          clientUserId: resident.id, // enables embedded signing
          roleName: 'Signer',
        },
        webhookUrl,
        emailSubject: input.emailSubject || `Please sign: ${input.templateName}`,
        mergeFields: {
          ResidentName: signerName,
        },
      });

      const envelopeId = envelope.envelopeId;

      // Determine document_type from template name (best-effort mapping)
      // Valid values: intake_form, resident_agreement, house_rules, consent_form,
      //               release_of_info, financial_agreement, treatment_plan,
      //               discharge_summary, incident_report, other
      const docTypeMap: Record<string, string> = {
        'house rules': 'house_rules',
        'move-in': 'resident_agreement',
        'move in': 'resident_agreement',
        'financial': 'financial_agreement',
        'emergency': 'consent_form',
        'drug test': 'consent_form',
        'drug testing': 'consent_form',
        'intake': 'intake_form',
        'consent': 'consent_form',
        'release': 'release_of_info',
      };
      const nameLower = input.templateName.toLowerCase();
      const docType = Object.entries(docTypeMap).find(([k]) => nameLower.includes(k))?.[1] ?? 'other';

      // Create a document record to track this envelope
      const [doc] = await db
        .insert(documents)
        .values({
          org_id: orgId,
          resident_id: resident.id,
          document_type: docType as any,
          status: 'pending_signature',
          title: input.templateName,
          docusign_envelope_id: envelopeId,
          docusign_status: 'sent',
          sensitivity_level: 'confidential',
          created_by: userId,
          updated_by: userId,
        })
        .returning();

      // Create signature record for the resident
      await db.insert(signatures).values({
        org_id: orgId,
        document_id: doc.id,
        signer_resident_id: resident.id,
        signer_name: signerName,
        signer_email: resident.email,
        signature_method: 'electronic',
      });

      return {
        envelopeId,
        documentId: doc.id,
        signerName,
        signerEmail: resident.email,
      };
    }),
});

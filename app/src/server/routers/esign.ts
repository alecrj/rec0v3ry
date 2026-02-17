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
import { eq, and, isNull, desc, sql } from 'drizzle-orm';
import { NotFoundError, InvalidInputError } from '@/lib/errors';

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

      // TODO: Replace with actual DocuSign API call via src/lib/docusign.ts
      // const envelope = await createDocuSignEnvelope({
      //   orgId,
      //   documents: docs.map((d, i) => ({
      //     documentId: String(i + 1),
      //     name: d.title,
      //     content: d.file_url || '',
      //   })),
      //   signers: input.signers.map((s, i) => ({
      //     email: s.email,
      //     name: s.name,
      //     recipientId: String(i + 1),
      //     clientUserId: s.residentId || s.userId,
      //   })),
      //   ccRecipients: input.ccRecipients,
      //   webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/docusign`,
      //   emailSubject: input.emailSubject,
      // });

      const envelopeId = `env_${crypto.randomUUID()}`; // Placeholder until DocuSign integration

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

      // TODO: Replace with actual DocuSign signing URL via src/lib/docusign.ts
      // const { signingUrl } = await getDocuSignSigningUrl({
      //   envelopeId: doc.docusign_envelope_id,
      //   signerEmail: input.signerEmail,
      //   signerName: input.signerName,
      //   clientUserId: ctx.user!.id,
      //   returnUrl: input.returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/documents`,
      // });

      return {
        signingUrl: `/sign/${doc.docusign_envelope_id}`, // Placeholder
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

      // TODO: Replace with actual DocuSign bulk envelope via src/lib/docusign.ts
      const envelopeId = `env_bulk_${crypto.randomUUID()}`;

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

      return {
        envelopeId,
        documentCount: docs.length,
        signingUrl: `/sign/${envelopeId}`, // Placeholder
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

      // TODO: Call DocuSign API to void envelope
      // await voidDocuSignEnvelope(doc.docusign_envelope_id, input.reason);

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
});

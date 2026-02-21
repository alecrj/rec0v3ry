/**
 * Document Router
 *
 * Document CRUD, templates, and retention policies for the Documents & E-Sign module.
 * Source: docs/01_REQUIREMENTS.md Module 6, docs/02_ARCHITECTURE.md Section 11
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { db } from '../db/client';
import { documents, documentTemplates, signatures, retentionPolicies } from '../db/schema/documents';
import { documentVersions } from '../db/schema/documents-extended';
import { eq, and, isNull, desc, gte, lte, sql, like, or, asc } from 'drizzle-orm';
import { NotFoundError, InvalidInputError } from '@/lib/errors';
import { generateUploadUrl, generateDownloadUrl } from '@/lib/s3';

// ============================================================
// RETENTION MINIMUM DAYS (regulatory requirements)
// ============================================================
const RETENTION_MINIMUMS: Record<string, number> = {
  consent_form: 2190,       // 6 years (Part 2)
  release_of_info: 2190,    // 6 years (Part 2)
  treatment_plan: 2190,     // 6 years (medical)
  discharge_summary: 2190,  // 6 years (medical)
  intake_form: 2190,        // 6 years (medical)
  financial_agreement: 2555, // 7 years (financial)
  // Default for others
  _default: 1095,           // 3 years (operational)
};

function getMinRetentionDays(documentType: string): number {
  return RETENTION_MINIMUMS[documentType] ?? RETENTION_MINIMUMS._default;
}

// ============================================================
// INPUT SCHEMAS
// ============================================================

const listDocumentsSchema = z.object({
  residentId: z.string().uuid().optional(),
  documentType: z.enum([
    'intake_form', 'resident_agreement', 'house_rules', 'consent_form',
    'release_of_info', 'financial_agreement', 'treatment_plan',
    'discharge_summary', 'incident_report', 'other',
  ]).optional(),
  status: z.enum(['draft', 'pending_signature', 'signed', 'expired', 'voided']).optional(),
  search: z.string().optional(),
  limit: z.number().min(1).max(100).default(25),
  cursor: z.string().uuid().optional(),
});

const createDocumentSchema = z.object({
  residentId: z.string().uuid().optional(),
  templateId: z.string().uuid().optional(),
  documentType: z.enum([
    'intake_form', 'resident_agreement', 'house_rules', 'consent_form',
    'release_of_info', 'financial_agreement', 'treatment_plan',
    'discharge_summary', 'incident_report', 'other',
  ]),
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  fileUrl: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
  sensitivityLevel: z.enum(['public', 'internal', 'confidential', 'part2_protected']).default('confidential'),
  retentionPolicyId: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

const updateDocumentSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  documentType: z.enum([
    'intake_form', 'resident_agreement', 'house_rules', 'consent_form',
    'release_of_info', 'financial_agreement', 'treatment_plan',
    'discharge_summary', 'incident_report', 'other',
  ]).optional(),
  status: z.enum(['draft', 'pending_signature', 'signed', 'expired', 'voided']).optional(),
  fileUrl: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
  retentionPolicyId: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

const getUploadUrlSchema = z.object({
  fileName: z.string().min(1),
  contentType: z.string().min(1),
  category: z.string().default('document'),
  residentId: z.string().uuid().optional(),
});

const createTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  documentType: z.enum([
    'intake_form', 'resident_agreement', 'house_rules', 'consent_form',
    'release_of_info', 'financial_agreement', 'treatment_plan',
    'discharge_summary', 'incident_report', 'other',
  ]),
  description: z.string().optional(),
  templateContent: z.string().optional(),
  docusignTemplateId: z.string().optional(),
  mergeFields: z.record(z.string(), z.any()).optional(),
  version: z.string().default('1.0'),
});

const updateTemplateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200).optional(),
  documentType: z.enum([
    'intake_form', 'resident_agreement', 'house_rules', 'consent_form',
    'release_of_info', 'financial_agreement', 'treatment_plan',
    'discharge_summary', 'incident_report', 'other',
  ]).optional(),
  description: z.string().optional(),
  templateContent: z.string().optional(),
  docusignTemplateId: z.string().optional(),
  mergeFields: z.record(z.string(), z.any()).optional(),
  version: z.string().optional(),
  isActive: z.boolean().optional(),
});

const createRetentionPolicySchema = z.object({
  name: z.string().min(1).max(200),
  documentType: z.enum([
    'intake_form', 'resident_agreement', 'house_rules', 'consent_form',
    'release_of_info', 'financial_agreement', 'treatment_plan',
    'discharge_summary', 'incident_report', 'other',
  ]).optional(),
  retentionPeriodDays: z.string(), // number as string, or 'indefinite'
  description: z.string().optional(),
});

const updateRetentionPolicySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200).optional(),
  retentionPeriodDays: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

// ============================================================
// DOCUMENT ROUTER
// ============================================================

/** Template sub-router */
const templateRouter = router({
  list: protectedProcedure
    .meta({ permission: 'document:read', resource: 'document_template' })
    .input(z.object({
      documentType: z.string().optional(),
      activeOnly: z.boolean().default(true),
    }).optional())
    .query(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;
      const conditions = [eq(documentTemplates.org_id, orgId)];

      if (input?.activeOnly !== false) {
        conditions.push(eq(documentTemplates.is_active, true));
      }

      if (input?.documentType) {
        conditions.push(eq(documentTemplates.document_type, input.documentType as any));
      }

      return db.query.documentTemplates.findMany({
        where: and(...conditions),
        orderBy: [desc(documentTemplates.created_at)],
      });
    }),

  getById: protectedProcedure
    .meta({ permission: 'document:read', resource: 'document_template' })
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;
      const template = await db.query.documentTemplates.findFirst({
        where: and(
          eq(documentTemplates.id, input.id),
          eq(documentTemplates.org_id, orgId)
        ),
      });

      if (!template) {
        throw new NotFoundError('Document template', input.id);
      }

      return template;
    }),

  create: protectedProcedure
    .meta({ permission: 'document:create', resource: 'document_template' })
    .input(createTemplateSchema)
    .mutation(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;
      const userId = ctx.user!.id;

      const [template] = await db
        .insert(documentTemplates)
        .values({
          org_id: orgId,
          name: input.name,
          document_type: input.documentType,
          description: input.description || null,
          template_content: input.templateContent || null,
          docusign_template_id: input.docusignTemplateId || null,
          merge_fields: input.mergeFields || null,
          version: input.version,
          created_by: userId,
          updated_by: userId,
        })
        .returning();

      return template;
    }),

  update: protectedProcedure
    .meta({ permission: 'document:update', resource: 'document_template' })
    .input(updateTemplateSchema)
    .mutation(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;
      const userId = ctx.user!.id;

      const existing = await db.query.documentTemplates.findFirst({
        where: and(
          eq(documentTemplates.id, input.id),
          eq(documentTemplates.org_id, orgId)
        ),
      });

      if (!existing) {
        throw new NotFoundError('Document template', input.id);
      }

      const updates: Record<string, unknown> = { updated_by: userId };
      if (input.name !== undefined) updates.name = input.name;
      if (input.documentType !== undefined) updates.document_type = input.documentType;
      if (input.description !== undefined) updates.description = input.description;
      if (input.templateContent !== undefined) updates.template_content = input.templateContent;
      if (input.docusignTemplateId !== undefined) updates.docusign_template_id = input.docusignTemplateId;
      if (input.mergeFields !== undefined) updates.merge_fields = input.mergeFields;
      if (input.version !== undefined) updates.version = input.version;
      if (input.isActive !== undefined) updates.is_active = input.isActive;

      const [updated] = await db
        .update(documentTemplates)
        .set(updates)
        .where(eq(documentTemplates.id, input.id))
        .returning();

      return updated;
    }),

  delete: protectedProcedure
    .meta({ permission: 'document:delete', resource: 'document_template' })
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;
      const userId = ctx.user!.id;

      const existing = await db.query.documentTemplates.findFirst({
        where: and(
          eq(documentTemplates.id, input.id),
          eq(documentTemplates.org_id, orgId)
        ),
      });

      if (!existing) {
        throw new NotFoundError('Document template', input.id);
      }

      const [updated] = await db
        .update(documentTemplates)
        .set({ is_active: false, updated_by: userId })
        .where(eq(documentTemplates.id, input.id))
        .returning();

      return updated;
    }),
});

/** Retention sub-router */
const retentionRouter = router({
  list: protectedProcedure
    .meta({ permission: 'document:read', resource: 'retention_policy' })
    .input(z.object({ activeOnly: z.boolean().default(true) }).optional())
    .query(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;
      const conditions = [eq(retentionPolicies.org_id, orgId)];

      if (input?.activeOnly !== false) {
        conditions.push(eq(retentionPolicies.is_active, true));
      }

      return db.query.retentionPolicies.findMany({
        where: and(...conditions),
        orderBy: [asc(retentionPolicies.name)],
      });
    }),

  getById: protectedProcedure
    .meta({ permission: 'document:read', resource: 'retention_policy' })
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;
      const policy = await db.query.retentionPolicies.findFirst({
        where: and(
          eq(retentionPolicies.id, input.id),
          eq(retentionPolicies.org_id, orgId)
        ),
      });

      if (!policy) {
        throw new NotFoundError('Retention policy', input.id);
      }

      return policy;
    }),

  create: protectedProcedure
    .meta({ permission: 'document:create', resource: 'retention_policy' })
    .input(createRetentionPolicySchema)
    .mutation(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;
      const userId = ctx.user!.id;

      // Validate retention period against regulatory minimums
      if (input.retentionPeriodDays !== 'indefinite') {
        const days = parseInt(input.retentionPeriodDays, 10);
        if (isNaN(days) || days < 0) {
          throw new InvalidInputError('Retention period must be a positive number or "indefinite"');
        }
        const minDays = getMinRetentionDays(input.documentType || '_default');
        if (days < minDays) {
          throw new InvalidInputError(
            `Retention period for ${input.documentType || 'this document type'} cannot be less than ${minDays} days (regulatory minimum)`
          );
        }
      }

      const [policy] = await db
        .insert(retentionPolicies)
        .values({
          org_id: orgId,
          name: input.name,
          document_type: input.documentType || null,
          retention_period_days: input.retentionPeriodDays,
          description: input.description || null,
          created_by: userId,
          updated_by: userId,
        })
        .returning();

      return policy;
    }),

  update: protectedProcedure
    .meta({ permission: 'document:update', resource: 'retention_policy' })
    .input(updateRetentionPolicySchema)
    .mutation(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;
      const userId = ctx.user!.id;

      const existing = await db.query.retentionPolicies.findFirst({
        where: and(
          eq(retentionPolicies.id, input.id),
          eq(retentionPolicies.org_id, orgId)
        ),
      });

      if (!existing) {
        throw new NotFoundError('Retention policy', input.id);
      }

      // Validate retention period against regulatory minimums
      if (input.retentionPeriodDays && input.retentionPeriodDays !== 'indefinite') {
        const days = parseInt(input.retentionPeriodDays, 10);
        if (isNaN(days) || days < 0) {
          throw new InvalidInputError('Retention period must be a positive number or "indefinite"');
        }
        const docType = existing.document_type || '_default';
        const minDays = getMinRetentionDays(docType);
        if (days < minDays) {
          throw new InvalidInputError(
            `Retention period for ${docType} cannot be less than ${minDays} days (regulatory minimum)`
          );
        }
      }

      const updates: Record<string, unknown> = { updated_by: userId };
      if (input.name !== undefined) updates.name = input.name;
      if (input.retentionPeriodDays !== undefined) updates.retention_period_days = input.retentionPeriodDays;
      if (input.description !== undefined) updates.description = input.description;
      if (input.isActive !== undefined) updates.is_active = input.isActive;

      const [updated] = await db
        .update(retentionPolicies)
        .set(updates)
        .where(eq(retentionPolicies.id, input.id))
        .returning();

      return updated;
    }),

  getExpiring: protectedProcedure
    .meta({ permission: 'document:read', resource: 'retention_policy' })
    .input(z.object({ daysAhead: z.number().min(1).max(365).default(90) }))
    .query(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + input.daysAhead);

      return db.query.documents.findMany({
        where: and(
          eq(documents.org_id, orgId),
          isNull(documents.deleted_at),
          lte(documents.expires_at, cutoff)
        ),
        orderBy: [asc(documents.expires_at)],
        limit: 50,
      });
    }),
});

/** Main document router */
export const documentRouter = router({
  template: templateRouter,
  retention: retentionRouter,

  list: protectedProcedure
    .meta({ permission: 'document:read', resource: 'document' })
    .input(listDocumentsSchema)
    .query(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;
      const conditions = [
        eq(documents.org_id, orgId),
        isNull(documents.deleted_at),
      ];

      if (input.residentId) {
        conditions.push(eq(documents.resident_id, input.residentId));
      }

      if (input.documentType) {
        conditions.push(eq(documents.document_type, input.documentType));
      }

      if (input.status) {
        conditions.push(eq(documents.status, input.status));
      }

      if (input.search) {
        conditions.push(
          or(
            like(documents.title, `%${input.search}%`),
            like(documents.description, `%${input.search}%`)
          )!
        );
      }

      if (input.cursor) {
        conditions.push(sql`${documents.id} > ${input.cursor}`);
      }

      const items = await db.query.documents.findMany({
        where: and(...conditions),
        orderBy: [desc(documents.created_at)],
        limit: input.limit + 1,
        with: {
          resident: {
            columns: {
              id: true,
              first_name: true,
              last_name: true,
            },
          },
        },
      });

      const hasMore = items.length > input.limit;
      const results = hasMore ? items.slice(0, input.limit) : items;

      return {
        items: results,
        nextCursor: hasMore ? results[results.length - 1]?.id : null,
      };
    }),

  getById: protectedProcedure
    .meta({ permission: 'document:read', resource: 'document' })
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;
      const doc = await db.query.documents.findFirst({
        where: and(
          eq(documents.id, input.id),
          eq(documents.org_id, orgId),
          isNull(documents.deleted_at)
        ),
        with: {
          resident: {
            columns: { id: true, first_name: true, last_name: true },
          },
          signatures: true,
          template: true,
        },
      });

      if (!doc) {
        throw new NotFoundError('Document', input.id);
      }

      // Fetch version history
      const versions = await db.query.documentVersions.findMany({
        where: eq(documentVersions.document_id, input.id),
        orderBy: [desc(documentVersions.version_number)],
      });

      return { ...doc, versions };
    }),

  create: protectedProcedure
    .meta({ permission: 'document:create', resource: 'document' })
    .input(createDocumentSchema)
    .mutation(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;
      const userId = ctx.user!.id;

      const [doc] = await db
        .insert(documents)
        .values({
          org_id: orgId,
          resident_id: input.residentId || null,
          template_id: input.templateId || null,
          document_type: input.documentType,
          title: input.title,
          description: input.description || null,
          file_url: input.fileUrl || null,
          expires_at: input.expiresAt ? new Date(input.expiresAt) : null,
          sensitivity_level: input.sensitivityLevel,
          retention_policy_id: input.retentionPolicyId || null,
          metadata: input.metadata || null,
          created_by: userId,
          updated_by: userId,
        })
        .returning();

      return doc;
    }),

  update: protectedProcedure
    .meta({ permission: 'document:update', resource: 'document' })
    .input(updateDocumentSchema)
    .mutation(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;
      const userId = ctx.user!.id;

      const existing = await db.query.documents.findFirst({
        where: and(
          eq(documents.id, input.id),
          eq(documents.org_id, orgId),
          isNull(documents.deleted_at)
        ),
      });

      if (!existing) {
        throw new NotFoundError('Document', input.id);
      }

      const updates: Record<string, unknown> = { updated_by: userId };
      if (input.title !== undefined) updates.title = input.title;
      if (input.description !== undefined) updates.description = input.description;
      if (input.documentType !== undefined) updates.document_type = input.documentType;
      if (input.status !== undefined) updates.status = input.status;
      if (input.fileUrl !== undefined) updates.file_url = input.fileUrl;
      if (input.expiresAt !== undefined) updates.expires_at = input.expiresAt ? new Date(input.expiresAt) : null;
      if (input.retentionPolicyId !== undefined) updates.retention_policy_id = input.retentionPolicyId;
      if (input.metadata !== undefined) updates.metadata = input.metadata;

      const [updated] = await db
        .update(documents)
        .set(updates)
        .where(eq(documents.id, input.id))
        .returning();

      return updated;
    }),

  delete: protectedProcedure
    .meta({ permission: 'document:delete', resource: 'document' })
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;
      const userId = ctx.user!.id;

      const existing = await db.query.documents.findFirst({
        where: and(
          eq(documents.id, input.id),
          eq(documents.org_id, orgId),
          isNull(documents.deleted_at)
        ),
      });

      if (!existing) {
        throw new NotFoundError('Document', input.id);
      }

      const [deleted] = await db
        .update(documents)
        .set({ deleted_at: new Date(), updated_by: userId })
        .where(eq(documents.id, input.id))
        .returning();

      return deleted;
    }),

  getUploadUrl: protectedProcedure
    .meta({ permission: 'document:create', resource: 'document' })
    .input(getUploadUrlSchema)
    .mutation(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;

      // Build S3 key: {orgId}/residents/{residentId}/{category}/{uuid}_{filename}
      // or {orgId}/documents/{category}/{uuid}_{filename}
      const uuid = crypto.randomUUID();
      const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const keyPrefix = input.residentId
        ? `${orgId}/residents/${input.residentId}/${input.category}`
        : `${orgId}/documents/${input.category}`;
      const storageKey = `${keyPrefix}/${uuid}_${safeName}`;

      const { uploadUrl } = await generateUploadUrl({
        key: storageKey,
        contentType: input.contentType,
      });

      return {
        uploadUrl,
        storageKey,
        expiresIn: 900,
      };
    }),

  getDownloadUrl: protectedProcedure
    .meta({ permission: 'document:read', resource: 'document' })
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;

      const doc = await db.query.documents.findFirst({
        where: and(
          eq(documents.id, input.id),
          eq(documents.org_id, orgId),
          isNull(documents.deleted_at)
        ),
      });

      if (!doc) {
        throw new NotFoundError('Document', input.id);
      }

      if (!doc.file_url) {
        throw new InvalidInputError('Document has no associated file');
      }

      const { downloadUrl } = await generateDownloadUrl({
        key: doc.file_url,
        filename: doc.title,
      });

      return {
        downloadUrl,
        expiresIn: 900,
      };
    }),

  search: protectedProcedure
    .meta({ permission: 'document:read', resource: 'document' })
    .input(z.object({
      query: z.string().min(1).max(200),
      limit: z.number().min(1).max(50).default(20),
    }))
    .query(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;

      return db.query.documents.findMany({
        where: and(
          eq(documents.org_id, orgId),
          isNull(documents.deleted_at),
          or(
            like(documents.title, `%${input.query}%`),
            like(documents.description, `%${input.query}%`)
          )
        ),
        orderBy: [desc(documents.created_at)],
        limit: input.limit,
        columns: {
          id: true,
          title: true,
          document_type: true,
          status: true,
          created_at: true,
        },
      });
    }),
});

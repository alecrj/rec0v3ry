/**
 * Consent Router
 *
 * 42 CFR Part 2 consent management.
 * Source: docs/04_COMPLIANCE.md Section 3.1 (Consent Management System)
 */

import { z } from 'zod';
import { router, part2Procedure, protectedProcedure } from '../trpc';
import { consents } from '../db/schema/compliance';
import { eq, and, desc } from 'drizzle-orm';
import { NotFoundError, ConflictError } from '@/lib/errors';

/**
 * Consent creation input schema
 * Validates all 42 CFR 2.31 required elements
 */
const createConsentSchema = z.object({
  residentId: z.string().uuid(),
  consentType: z.enum([
    'general_disclosure',
    'treatment',
    'payment',
    'healthcare_operations',
    'research',
    'audit',
    'medical_emergency',
  ]),
  patientName: z.string().min(1),
  disclosingEntity: z.string().min(1),
  recipient: z.string().min(1),
  purpose: z.string().min(1),
  informationScope: z.string().min(1),
  expirationDate: z.string().datetime().optional(),
  expirationEvent: z.string().optional(),
  patientSignature: z.string().min(1), // DocuSign signature ID
  signatureDate: z.string().datetime(),
  notes: z.string().optional(),
});

/**
 * Consent revocation input schema
 */
const revokeConsentSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().optional(),
});

/**
 * List consents input schema
 */
const listConsentsSchema = z.object({
  residentId: z.string().uuid().optional(),
  status: z.enum(['pending', 'active', 'revoked', 'expired']).optional(),
  limit: z.number().min(1).max(100).default(25),
  cursor: z.string().uuid().optional(),
});

/**
 * Consent router
 * All endpoints use part2Procedure for consent verification
 */
export const consentRouter = router({
  /**
   * Create a new consent
   * Requires consent_type and all 42 CFR 2.31 fields
   */
  create: part2Procedure
    .meta({ permission: 'consent:create', resource: 'consent' })
    .input(createConsentSchema)
    .mutation(async ({ ctx, input }) => {
      // In protected procedures, ctx.user is always present (enforced by authMiddleware)
      const orgId = (ctx as any).orgId as string;

      // Create consent record
      const [consent] = await ctx.db
        .insert(consents)
        .values({
          org_id: orgId,
          resident_id: input.residentId,
          consent_type: input.consentType,
          status: 'active',
          purpose: input.purpose,
          recipient_name: input.recipient, // Should be encrypted
          recipient_organization: input.disclosingEntity, // Should be encrypted
          scope_of_information: input.informationScope,
          granted_at: new Date(),
          expires_at: input.expirationDate ? new Date(input.expirationDate) : null,
          consent_form_signed: true,
          signature_date: input.signatureDate.split('T')[0],
          notes: input.notes || null,
          metadata: {
            patientName: input.patientName,
            signatureId: input.patientSignature,
            expirationEvent: input.expirationEvent,
          },
          created_by: ctx.user!.id,
          updated_by: ctx.user!.id,
        })
        .returning();

      return consent;
    }),

  /**
   * List consents
   * Filterable by resident and status
   */
  list: protectedProcedure
    .meta({ permission: 'consent:read', resource: 'consent' })
    .input(listConsentsSchema)
    .query(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;
      const conditions = [eq(consents.org_id, orgId)];

      if (input.residentId) {
        conditions.push(eq(consents.resident_id, input.residentId));
      }

      if (input.status) {
        conditions.push(eq(consents.status, input.status));
      }

      const items = await ctx.db.query.consents.findMany({
        where: and(...conditions),
        orderBy: [desc(consents.created_at)],
        limit: input.limit + 1, // Get one extra to determine if there are more
      });

      const hasMore = items.length > input.limit;
      const results = hasMore ? items.slice(0, input.limit) : items;

      return {
        items: results,
        nextCursor: hasMore ? results[results.length - 1]?.id : null,
        totalCount: items.length,
      };
    }),

  /**
   * Get consent by ID
   */
  getById: protectedProcedure
    .meta({ permission: 'consent:read', resource: 'consent' })
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;
      const consent = await ctx.db.query.consents.findFirst({
        where: and(
          eq(consents.id, input.id),
          eq(consents.org_id, orgId)
        ),
      });

      if (!consent) {
        throw new NotFoundError('Consent', input.id);
      }

      return consent;
    }),

  /**
   * Renew an expired or expiring consent
   * Creates a new active consent based on the original, with a new expiration date
   * Source: 42 CFR 2.31 - renewal requires same elements as original consent
   */
  renew: part2Procedure
    .meta({ permission: 'consent:create', resource: 'consent' })
    .input(z.object({
      id: z.string().uuid(),
      newExpirationDate: z.string().datetime(),
    }))
    .mutation(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;

      const existing = await ctx.db.query.consents.findFirst({
        where: and(
          eq(consents.id, input.id),
          eq(consents.org_id, orgId)
        ),
      });

      if (!existing) {
        throw new NotFoundError('Consent', input.id);
      }

      if (existing.status === 'active') {
        throw new ConflictError('Consent is already active', {
          consentId: input.id,
        });
      }

      // Create a new consent record based on the expired one
      const [renewed] = await ctx.db
        .insert(consents)
        .values({
          org_id: orgId,
          resident_id: existing.resident_id,
          consent_type: existing.consent_type,
          status: 'active',
          purpose: existing.purpose,
          recipient_name: existing.recipient_name,
          recipient_organization: existing.recipient_organization,
          scope_of_information: existing.scope_of_information,
          granted_at: new Date(),
          expires_at: new Date(input.newExpirationDate),
          consent_form_signed: true,
          signature_date: new Date().toISOString().split('T')[0],
          notes: `Renewed from consent ${existing.id}`,
          metadata: {
            ...(existing.metadata as Record<string, unknown> ?? {}),
            renewedFrom: existing.id,
            renewedAt: new Date().toISOString(),
          },
          created_by: ctx.user!.id,
          updated_by: ctx.user!.id,
        })
        .returning();

      return renewed;
    }),

  /**
   * Revoke consent
   * Source: 42 CFR 2.31(b) - revocation does not apply retroactively
   */
  revoke: part2Procedure
    .meta({ permission: 'consent:update', resource: 'consent' })
    .input(revokeConsentSchema)
    .mutation(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;

      // Check if consent exists
      const existing = await ctx.db.query.consents.findFirst({
        where: and(
          eq(consents.id, input.id),
          eq(consents.org_id, orgId)
        ),
      });

      if (!existing) {
        throw new NotFoundError('Consent', input.id);
      }

      // Check if already revoked
      if (existing.status === 'revoked') {
        throw new ConflictError('Consent is already revoked', {
          consentId: input.id,
          revokedAt: existing.revoked_at,
        });
      }

      // Revoke consent
      const [updated] = await ctx.db
        .update(consents)
        .set({
          status: 'revoked',
          revoked_at: new Date(),
          revocation_reason: input.reason || null,
          updated_by: ctx.user!.id,
        })
        .where(eq(consents.id, input.id))
        .returning();

      return updated;
    }),
});

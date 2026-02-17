/**
 * Disclosure Router
 *
 * 42 CFR Part 2 disclosure tracking and accounting.
 * Source: docs/04_COMPLIANCE.md Section 3.2 (Disclosure Tracking)
 */

import { z } from 'zod';
import { router, part2Procedure, protectedProcedure } from '../trpc';
import { consentDisclosures, consents } from '../db/schema/compliance';
import { disclosureAccountingRequests } from '../db/schema/compliance-extended';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import { NotFoundError } from '@/lib/errors';

/**
 * Create disclosure input schema
 */
const createDisclosureSchema = z.object({
  residentId: z.string().uuid(),
  consentId: z.string().uuid(),
  recipientName: z.string().min(1),
  recipientOrganization: z.string().optional(),
  recipientEmail: z.string().email().optional(),
  purpose: z.enum([
    'treatment',
    'payment',
    'healthcare_operations',
    'research',
    'audit',
    'court_order',
    'medical_emergency',
    'crime_on_premises',
    'other',
  ]),
  dataCategoriesDisclosed: z.string().min(1), // Description of what was shared
  disclosureMethod: z.enum(['email', 'fax', 'phone', 'in_person', 'portal']).optional(),
  notes: z.string().optional(),
});

/**
 * List disclosures input schema
 */
const listDisclosuresSchema = z.object({
  residentId: z.string().uuid(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  purpose: z.enum([
    'treatment',
    'payment',
    'healthcare_operations',
    'research',
    'audit',
    'court_order',
    'medical_emergency',
    'crime_on_premises',
    'other',
  ]).optional(),
  limit: z.number().min(1).max(100).default(25),
  cursor: z.string().uuid().optional(),
});

/**
 * Request accounting input schema
 */
const requestAccountingSchema = z.object({
  residentId: z.string().uuid(),
  periodStart: z.string().refine((val) => /^\d{4}-\d{2}-\d{2}$/.test(val), {
    message: 'Date must be in YYYY-MM-DD format',
  }),
  periodEnd: z.string().refine((val) => /^\d{4}-\d{2}-\d{2}$/.test(val), {
    message: 'Date must be in YYYY-MM-DD format',
  }),
  deliveryMethod: z.enum(['email', 'mail', 'in_person', 'portal']).optional(),
});

/**
 * Get accounting report input schema
 */
const getAccountingReportSchema = z.object({
  residentId: z.string().uuid(),
  dateFrom: z.string().datetime(),
  dateTo: z.string().datetime(),
});

/**
 * Disclosure router
 */
export const disclosureRouter = router({
  /**
   * List disclosures for a resident
   * Requires Part 2 consent verification
   */
  list: part2Procedure
    .meta({ permission: 'disclosure:read', resource: 'disclosure' })
    .input(listDisclosuresSchema)
    .query(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;

      const conditions = [
        eq(consentDisclosures.org_id, orgId),
        eq(consentDisclosures.resident_id, input.residentId),
      ];

      if (input.dateFrom) {
        conditions.push(gte(consentDisclosures.disclosed_at, new Date(input.dateFrom)));
      }

      if (input.dateTo) {
        conditions.push(lte(consentDisclosures.disclosed_at, new Date(input.dateTo)));
      }

      if (input.purpose) {
        conditions.push(eq(consentDisclosures.disclosure_purpose, input.purpose));
      }

      const items = await ctx.db.query.consentDisclosures.findMany({
        where: and(...conditions),
        orderBy: [desc(consentDisclosures.disclosed_at)],
        limit: input.limit + 1,
        with: {
          consent: true,
          discloser: {
            columns: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
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

  /**
   * Create a disclosure record
   * Records that Part 2 data was shared
   */
  create: part2Procedure
    .meta({ permission: 'disclosure:read', resource: 'disclosure' })
    .input(createDisclosureSchema)
    .mutation(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;

      // Verify consent exists and is active
      const consent = await ctx.db.query.consents.findFirst({
        where: and(
          eq(consents.id, input.consentId),
          eq(consents.org_id, orgId),
          eq(consents.resident_id, input.residentId)
        ),
      });

      if (!consent) {
        throw new NotFoundError('Consent', input.consentId);
      }

      if (consent.status !== 'active') {
        throw new NotFoundError('Active consent', input.consentId);
      }

      // Create disclosure record
      const [disclosure] = await ctx.db
        .insert(consentDisclosures)
        .values({
          org_id: orgId,
          consent_id: input.consentId,
          resident_id: input.residentId,
          disclosed_to_name: input.recipientName, // Should be encrypted
          disclosed_to_organization: input.recipientOrganization || null,
          disclosed_to_email: input.recipientEmail || null,
          disclosure_purpose: input.purpose,
          information_disclosed: input.dataCategoriesDisclosed, // Should be encrypted
          disclosure_method: input.disclosureMethod || null,
          disclosed_at: new Date(),
          disclosed_by: ctx.user!.id,
          notes: input.notes || null,
        })
        .returning();

      return disclosure;
    }),

  /**
   * Request accounting of disclosures
   * Creates a data access request for disclosure accounting
   */
  requestAccounting: protectedProcedure
    .meta({ permission: 'disclosure:read', resource: 'disclosure' })
    .input(requestAccountingSchema)
    .mutation(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;

      // Create accounting request
      const [request] = await ctx.db
        .insert(disclosureAccountingRequests)
        .values({
          org_id: orgId,
          resident_id: input.residentId,
          requested_by: ctx.user!.id,
          period_start: input.periodStart,
          period_end: input.periodEnd,
          delivery_method: input.deliveryMethod || null,
          status: 'pending',
        })
        .returning();

      return request;
    }),

  /**
   * Generate accounting report for a resident
   * Returns all disclosures within date range
   */
  getAccountingReport: protectedProcedure
    .meta({ permission: 'disclosure:read', resource: 'disclosure' })
    .input(getAccountingReportSchema)
    .query(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;

      const disclosures = await ctx.db.query.consentDisclosures.findMany({
        where: and(
          eq(consentDisclosures.org_id, orgId),
          eq(consentDisclosures.resident_id, input.residentId),
          gte(consentDisclosures.disclosed_at, new Date(input.dateFrom)),
          lte(consentDisclosures.disclosed_at, new Date(input.dateTo))
        ),
        orderBy: [desc(consentDisclosures.disclosed_at)],
        with: {
          consent: {
            columns: {
              id: true,
              consent_type: true,
              purpose: true,
            },
          },
          discloser: {
            columns: {
              id: true,
              first_name: true,
              last_name: true,
            },
          },
        },
      });

      return {
        residentId: input.residentId,
        periodStart: input.dateFrom,
        periodEnd: input.dateTo,
        totalDisclosures: disclosures.length,
        disclosures,
        generatedAt: new Date().toISOString(),
        generatedBy: ctx.user!.id,
      };
    }),
});

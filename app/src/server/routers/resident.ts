/**
 * Resident Router
 * CRUD operations for residents (the people receiving care)
 *
 * Phase 5A: Critical Fixes - Residents Page
 * Source: docs/03_DATA_MODEL.md Section 3 (Residents)
 */

import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { db } from '../db/client';
import { residents, admissions, residentContacts } from '../db/schema/residents';
import { houses, beds } from '../db/schema/orgs';
import { consents } from '../db/schema/compliance';
import { eq, and, isNull, sql, desc, ilike, or } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

export const residentRouter = router({
  /**
   * List residents with filtering and pagination
   */
  list: protectedProcedure
    .input(z.object({
      status: z.enum(['all', 'active', 'discharged', 'pending']).default('all'),
      houseId: z.string().uuid().optional(),
      search: z.string().optional(),
      limit: z.number().int().min(1).max(100).default(50),
      offset: z.number().int().min(0).default(0),
    }))
    .query(async ({ input, ctx }) => {
      const orgId = (ctx as any).orgId as string;

      // Build conditions
      const conditions = [
        eq(residents.org_id, orgId),
        isNull(residents.deleted_at),
      ];

      // Search filter
      if (input.search && input.search.trim()) {
        const searchTerm = `%${input.search.trim()}%`;
        conditions.push(
          or(
            ilike(residents.first_name, searchTerm),
            ilike(residents.last_name, searchTerm),
            ilike(residents.email, searchTerm),
          )!
        );
      }

      // Get residents with their current admission (if any)
      const result = await db
        .select({
          id: residents.id,
          first_name: residents.first_name,
          last_name: residents.last_name,
          preferred_name: residents.preferred_name,
          date_of_birth: residents.date_of_birth,
          email: residents.email,
          phone: residents.phone,
          profile_photo_url: residents.profile_photo_url,
          created_at: residents.created_at,
          // Current admission info (most recent)
          admission_id: admissions.id,
          admission_status: admissions.status,
          admission_date: admissions.admission_date,
          house_id: admissions.house_id,
          bed_id: admissions.bed_id,
          house_name: houses.name,
          bed_name: beds.name,
        })
        .from(residents)
        .leftJoin(
          admissions,
          and(
            eq(admissions.resident_id, residents.id),
            isNull(admissions.deleted_at),
            // Get most recent admission
            sql`${admissions.id} = (
              SELECT a2.id FROM admissions a2
              WHERE a2.resident_id = ${residents.id}
              AND a2.deleted_at IS NULL
              ORDER BY a2.created_at DESC
              LIMIT 1
            )`
          )
        )
        .leftJoin(houses, eq(houses.id, admissions.house_id))
        .leftJoin(beds, eq(beds.id, admissions.bed_id))
        .where(and(...conditions))
        .orderBy(desc(residents.created_at))
        .limit(input.limit)
        .offset(input.offset);

      // Apply status filter in memory (based on admission status)
      let filtered = result;
      if (input.status !== 'all') {
        if (input.status === 'active') {
          filtered = result.filter(r => r.admission_status === 'active');
        } else if (input.status === 'discharged') {
          filtered = result.filter(r =>
            r.admission_status === 'completed' || r.admission_status === 'terminated'
          );
        } else if (input.status === 'pending') {
          filtered = result.filter(r => r.admission_status === 'pending');
        }
      }

      // Filter by house
      if (input.houseId) {
        filtered = filtered.filter(r => r.house_id === input.houseId);
      }

      // Get total count
      const [countResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(residents)
        .where(and(...conditions));

      return {
        items: filtered,
        total: countResult?.count ?? 0,
        limit: input.limit,
        offset: input.offset,
      };
    }),

  /**
   * Get resident by ID with full details
   */
  getById: protectedProcedure
    .input(z.object({
      residentId: z.string().uuid(),
    }))
    .query(async ({ input, ctx }) => {
      const orgId = (ctx as any).orgId as string;

      const [resident] = await db
        .select()
        .from(residents)
        .where(
          and(
            eq(residents.id, input.residentId),
            eq(residents.org_id, orgId), // Ensure tenant isolation
            isNull(residents.deleted_at)
          )
        )
        .limit(1);

      if (!resident) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Resident not found' });
      }

      // Get current admission
      const [currentAdmission] = await db
        .select({
          id: admissions.id,
          status: admissions.status,
          admission_date: admissions.admission_date,
          planned_discharge_date: admissions.planned_discharge_date,
          house_id: admissions.house_id,
          bed_id: admissions.bed_id,
          case_manager_id: admissions.case_manager_id,
          house_name: houses.name,
          bed_name: beds.name,
        })
        .from(admissions)
        .leftJoin(houses, eq(houses.id, admissions.house_id))
        .leftJoin(beds, eq(beds.id, admissions.bed_id))
        .where(
          and(
            eq(admissions.resident_id, input.residentId),
            isNull(admissions.deleted_at)
          )
        )
        .orderBy(desc(admissions.created_at))
        .limit(1);

      // Get admission history
      const admissionHistory = await db
        .select({
          id: admissions.id,
          status: admissions.status,
          admission_date: admissions.admission_date,
          actual_discharge_date: admissions.actual_discharge_date,
          discharge_reason: admissions.discharge_reason,
          house_name: houses.name,
        })
        .from(admissions)
        .leftJoin(houses, eq(houses.id, admissions.house_id))
        .where(
          and(
            eq(admissions.resident_id, input.residentId),
            isNull(admissions.deleted_at)
          )
        )
        .orderBy(desc(admissions.admission_date));

      // Get contacts
      const contacts = await db
        .select()
        .from(residentContacts)
        .where(
          and(
            eq(residentContacts.resident_id, input.residentId),
            isNull(residentContacts.deleted_at)
          )
        )
        .orderBy(desc(residentContacts.is_emergency_contact));

      // Get active consents count
      const [consentCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(consents)
        .where(
          and(
            eq(consents.resident_id, input.residentId),
            eq(consents.status, 'active'),
            isNull(consents.deleted_at)
          )
        );

      return {
        ...resident,
        currentAdmission,
        admissionHistory,
        contacts,
        activeConsentsCount: consentCount?.count ?? 0,
      };
    }),

  /**
   * Create a new resident
   */
  create: protectedProcedure
    .input(z.object({
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      preferredName: z.string().optional(),
      dateOfBirth: z.string(), // ISO date
      email: z.string().email().optional(),
      phone: z.string().optional(),
      ssnLast4: z.string().length(4).optional(),
      emergencyContactName: z.string().optional(),
      emergencyContactPhone: z.string().optional(),
      emergencyContactRelationship: z.string().optional(),
      referralSource: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const orgId = (ctx as any).orgId as string;

      const [resident] = await db
        .insert(residents)
        .values({
          org_id: orgId,
          first_name: input.firstName,
          last_name: input.lastName,
          preferred_name: input.preferredName,
          date_of_birth: input.dateOfBirth,
          email: input.email,
          phone: input.phone,
          ssn_last_4: input.ssnLast4,
          emergency_contact_name: input.emergencyContactName,
          emergency_contact_phone: input.emergencyContactPhone,
          emergency_contact_relationship: input.emergencyContactRelationship,
          referral_source: input.referralSource,
          notes: input.notes,
          created_by: ctx.user!.id,
        })
        .returning();

      return resident;
    }),

  /**
   * Update resident
   */
  update: protectedProcedure
    .input(z.object({
      residentId: z.string().uuid(),
      firstName: z.string().min(1).optional(),
      lastName: z.string().min(1).optional(),
      preferredName: z.string().nullable().optional(),
      dateOfBirth: z.string().optional(),
      email: z.string().email().nullable().optional(),
      phone: z.string().nullable().optional(),
      emergencyContactName: z.string().nullable().optional(),
      emergencyContactPhone: z.string().nullable().optional(),
      emergencyContactRelationship: z.string().nullable().optional(),
      notes: z.string().nullable().optional(),
      profilePhotoUrl: z.string().url().nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const orgId = (ctx as any).orgId as string;
      const { residentId, ...updates } = input;

      // Convert camelCase to snake_case for DB
      const dbUpdates: Record<string, unknown> = {
        updated_at: new Date(),
        updated_by: ctx.user!.id,
      };

      if (updates.firstName !== undefined) dbUpdates.first_name = updates.firstName;
      if (updates.lastName !== undefined) dbUpdates.last_name = updates.lastName;
      if (updates.preferredName !== undefined) dbUpdates.preferred_name = updates.preferredName;
      if (updates.dateOfBirth !== undefined) dbUpdates.date_of_birth = updates.dateOfBirth;
      if (updates.email !== undefined) dbUpdates.email = updates.email;
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
      if (updates.emergencyContactName !== undefined) dbUpdates.emergency_contact_name = updates.emergencyContactName;
      if (updates.emergencyContactPhone !== undefined) dbUpdates.emergency_contact_phone = updates.emergencyContactPhone;
      if (updates.emergencyContactRelationship !== undefined) dbUpdates.emergency_contact_relationship = updates.emergencyContactRelationship;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      if (updates.profilePhotoUrl !== undefined) dbUpdates.profile_photo_url = updates.profilePhotoUrl;

      const [resident] = await db
        .update(residents)
        .set(dbUpdates)
        .where(
          and(
            eq(residents.id, residentId),
            eq(residents.org_id, orgId), // Ensure tenant isolation
            isNull(residents.deleted_at)
          )
        )
        .returning();

      if (!resident) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Resident not found' });
      }

      return resident;
    }),

  /**
   * Soft delete resident
   */
  delete: protectedProcedure
    .input(z.object({
      residentId: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      const orgId = (ctx as any).orgId as string;

      const [resident] = await db
        .update(residents)
        .set({
          deleted_at: new Date(),
          updated_at: new Date(),
          updated_by: ctx.user!.id,
        })
        .where(
          and(
            eq(residents.id, input.residentId),
            eq(residents.org_id, orgId), // Ensure tenant isolation
            isNull(residents.deleted_at)
          )
        )
        .returning();

      if (!resident) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Resident not found' });
      }

      return { success: true };
    }),

  /**
   * Get current user's resident profile (for PWA)
   * Uses scopeType/scopeId from auth context to find the linked resident
   */
  getMyProfile: protectedProcedure
    .query(async ({ ctx }) => {
      const orgId = (ctx as any).orgId as string;
      const scopeType = ctx.user?.scopeType;
      const scopeId = ctx.user?.scopeId;

      // If user is scoped to a resident, use that ID
      if (scopeType !== 'resident' || !scopeId) {
        return null;
      }

      const [resident] = await db
        .select()
        .from(residents)
        .where(
          and(
            eq(residents.id, scopeId),
            eq(residents.org_id, orgId),
            isNull(residents.deleted_at)
          )
        )
        .limit(1);

      if (!resident) return null;

      // Get current admission
      const [currentAdmission] = await db
        .select({
          id: admissions.id,
          status: admissions.status,
          admission_date: admissions.admission_date,
          planned_discharge_date: admissions.planned_discharge_date,
          house_id: admissions.house_id,
          bed_id: admissions.bed_id,
          house_name: houses.name,
          bed_name: beds.name,
        })
        .from(admissions)
        .leftJoin(houses, eq(houses.id, admissions.house_id))
        .leftJoin(beds, eq(beds.id, admissions.bed_id))
        .where(
          and(
            eq(admissions.resident_id, scopeId),
            isNull(admissions.deleted_at)
          )
        )
        .orderBy(desc(admissions.created_at))
        .limit(1);

      return {
        ...resident,
        currentAdmission: currentAdmission ?? null,
      };
    }),

  /**
   * Get resident stats for current org
   */
  getStats: protectedProcedure
    .query(async ({ ctx }) => {
      const orgId = (ctx as any).orgId as string;

      // Total residents
      const [totalResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(residents)
        .where(
          and(
            eq(residents.org_id, orgId),
            isNull(residents.deleted_at)
          )
        );

      // Active (with active admission)
      const [activeResult] = await db
        .select({ count: sql<number>`count(DISTINCT ${residents.id})::int` })
        .from(residents)
        .innerJoin(
          admissions,
          and(
            eq(admissions.resident_id, residents.id),
            eq(admissions.status, 'active'),
            isNull(admissions.deleted_at)
          )
        )
        .where(
          and(
            eq(residents.org_id, orgId),
            isNull(residents.deleted_at)
          )
        );

      // Pending intake
      const [pendingResult] = await db
        .select({ count: sql<number>`count(DISTINCT ${residents.id})::int` })
        .from(residents)
        .innerJoin(
          admissions,
          and(
            eq(admissions.resident_id, residents.id),
            eq(admissions.status, 'pending'),
            isNull(admissions.deleted_at)
          )
        )
        .where(
          and(
            eq(residents.org_id, orgId),
            isNull(residents.deleted_at)
          )
        );

      return {
        total: totalResult?.count ?? 0,
        active: activeResult?.count ?? 0,
        pending: pendingResult?.count ?? 0,
        discharged: (totalResult?.count ?? 0) - (activeResult?.count ?? 0) - (pendingResult?.count ?? 0),
      };
    }),
});

/**
 * Admission Router
 * Intake workflow, document collection, consent management at admission
 *
 * Sprint 11-12: Admissions CRM
 * Source: docs/06_ROADMAP.md Sprint 7-8 (ADM-02, ADM-06, ADM-07, ADM-08)
 */

import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { db } from '../db/client';
import { residents, admissions, residentContacts } from '../db/schema/residents';
import { houses, beds } from '../db/schema/orgs';
import { documents, documentTemplates, signatures } from '../db/schema/documents';
import { consents, patientNotices } from '../db/schema/compliance';
import { users } from '../db/schema/users';
import { eq, and, isNull, sql, desc, asc, inArray } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

// Intake checklist items
const INTAKE_CHECKLIST_ITEMS = [
  { id: 'personal_info', label: 'Personal Information', required: true },
  { id: 'emergency_contacts', label: 'Emergency Contacts', required: true },
  { id: 'insurance_info', label: 'Insurance Information', required: false },
  { id: 'photo_id', label: 'Photo ID Upload', required: true },
  { id: 'insurance_card', label: 'Insurance Card Upload', required: false },
  { id: 'court_documents', label: 'Court Documents', required: false },
  { id: 'part2_consent', label: 'Part 2 Consent Form', required: true },
  { id: 'privacy_notice', label: 'Privacy Notice Acknowledgment', required: true },
  { id: 'house_rules', label: 'House Rules Agreement', required: true },
  { id: 'financial_agreement', label: 'Financial Agreement', required: true },
  { id: 'intake_form', label: 'Intake Assessment Form', required: true },
] as const;

export const admissionRouter = router({
  /**
   * List admissions with filtering
   */
  list: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      status: z.enum(['pending', 'active', 'on_hold', 'completed', 'terminated']).optional(),
      houseId: z.string().uuid().optional(),
      limit: z.number().int().min(1).max(100).default(50),
      offset: z.number().int().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const conditions = [
        eq(admissions.org_id, input.orgId),
        isNull(admissions.deleted_at),
      ];

      if (input.status) {
        conditions.push(eq(admissions.status, input.status));
      }
      if (input.houseId) {
        conditions.push(eq(admissions.house_id, input.houseId));
      }

      const result = await db
        .select({
          id: admissions.id,
          resident_id: admissions.resident_id,
          house_id: admissions.house_id,
          bed_id: admissions.bed_id,
          status: admissions.status,
          admission_date: admissions.admission_date,
          planned_discharge_date: admissions.planned_discharge_date,
          actual_discharge_date: admissions.actual_discharge_date,
          move_in_checklist: admissions.move_in_checklist,
          created_at: admissions.created_at,
          resident_first_name: residents.first_name,
          resident_last_name: residents.last_name,
          house_name: houses.name,
        })
        .from(admissions)
        .innerJoin(residents, eq(admissions.resident_id, residents.id))
        .innerJoin(houses, eq(admissions.house_id, houses.id))
        .where(and(...conditions))
        .orderBy(desc(admissions.created_at))
        .limit(input.limit)
        .offset(input.offset);

      return result;
    }),

  /**
   * Get admission by ID with full details
   */
  getById: protectedProcedure
    .input(z.object({
      admissionId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      const [admission] = await db
        .select({
          id: admissions.id,
          org_id: admissions.org_id,
          resident_id: admissions.resident_id,
          house_id: admissions.house_id,
          bed_id: admissions.bed_id,
          status: admissions.status,
          admission_date: admissions.admission_date,
          planned_discharge_date: admissions.planned_discharge_date,
          actual_discharge_date: admissions.actual_discharge_date,
          discharge_reason: admissions.discharge_reason,
          move_in_checklist: admissions.move_in_checklist,
          move_out_checklist: admissions.move_out_checklist,
          case_manager_id: admissions.case_manager_id,
          notes: admissions.notes,
          created_at: admissions.created_at,
          updated_at: admissions.updated_at,
          resident_first_name: residents.first_name,
          resident_last_name: residents.last_name,
          resident_email: residents.email,
          resident_phone: residents.phone,
          resident_dob: residents.date_of_birth,
          house_name: houses.name,
          bed_name: beds.name,
        })
        .from(admissions)
        .innerJoin(residents, eq(admissions.resident_id, residents.id))
        .innerJoin(houses, eq(admissions.house_id, houses.id))
        .leftJoin(beds, eq(admissions.bed_id, beds.id))
        .where(
          and(
            eq(admissions.id, input.admissionId),
            isNull(admissions.deleted_at)
          )
        )
        .limit(1);

      if (!admission) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Admission not found' });
      }

      return admission;
    }),

  /**
   * Get intake checklist status for an admission
   * ADM-06: Document collection at intake
   */
  getIntakeChecklist: protectedProcedure
    .input(z.object({
      admissionId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      const [admission] = await db
        .select({
          id: admissions.id,
          resident_id: admissions.resident_id,
          move_in_checklist: admissions.move_in_checklist,
        })
        .from(admissions)
        .where(eq(admissions.id, input.admissionId))
        .limit(1);

      if (!admission) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Admission not found' });
      }

      const checklist = (admission.move_in_checklist as Record<string, boolean>) || {};

      // Get documents for this resident
      const docs = await db
        .select({
          id: documents.id,
          document_type: documents.document_type,
          status: documents.status,
          title: documents.title,
        })
        .from(documents)
        .where(
          and(
            eq(documents.resident_id, admission.resident_id),
            isNull(documents.deleted_at)
          )
        );

      // Get consents for this resident
      const consentList = await db
        .select({
          id: consents.id,
          consent_type: consents.consent_type,
          status: consents.status,
        })
        .from(consents)
        .where(
          and(
            eq(consents.resident_id, admission.resident_id),
            isNull(consents.deleted_at)
          )
        );

      // Build checklist items with status
      const items = INTAKE_CHECKLIST_ITEMS.map(item => {
        let completed = checklist[item.id] === true;

        // Check specific completions based on item type
        if (item.id === 'part2_consent') {
          completed = consentList.some(c => c.status === 'active');
        } else if (item.id === 'privacy_notice') {
          // Check if patient notice document exists and is signed
          completed = docs.some(d => d.document_type === 'consent_form' && d.status === 'signed');
        } else if (item.id === 'house_rules') {
          completed = docs.some(d => d.document_type === 'house_rules' && d.status === 'signed');
        } else if (item.id === 'financial_agreement') {
          completed = docs.some(d => d.document_type === 'financial_agreement' && d.status === 'signed');
        } else if (item.id === 'intake_form') {
          completed = docs.some(d => d.document_type === 'intake_form' && d.status === 'signed');
        }

        return {
          ...item,
          completed,
        };
      });

      const requiredItems = items.filter(i => i.required);
      const completedRequired = requiredItems.filter(i => i.completed).length;
      const progress = requiredItems.length > 0
        ? Math.round((completedRequired / requiredItems.length) * 100)
        : 0;

      return {
        items,
        progress,
        canComplete: completedRequired === requiredItems.length,
        documents: docs,
        consents: consentList,
      };
    }),

  /**
   * Update intake checklist item
   * ADM-06: Document collection at intake
   */
  updateChecklistItem: protectedProcedure
    .input(z.object({
      admissionId: z.string().uuid(),
      itemId: z.string(),
      completed: z.boolean(),
    }))
    .mutation(async ({ input, ctx }) => {
      const [admission] = await db
        .select()
        .from(admissions)
        .where(eq(admissions.id, input.admissionId))
        .limit(1);

      if (!admission) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Admission not found' });
      }

      const checklist = (admission.move_in_checklist as Record<string, boolean>) || {};
      checklist[input.itemId] = input.completed;

      const [updated] = await db
        .update(admissions)
        .set({
          move_in_checklist: checklist,
          updated_at: new Date(),
          updated_by: ctx.user!.id,
        })
        .where(eq(admissions.id, input.admissionId))
        .returning();

      return updated;
    }),

  /**
   * Create admission directly (not from lead)
   */
  create: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      residentId: z.string().uuid(),
      houseId: z.string().uuid(),
      admissionDate: z.string(),
      bedId: z.string().uuid().optional(),
      plannedDischargeDate: z.string().optional(),
      caseManagerId: z.string().uuid().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const [admission] = await db
        .insert(admissions)
        .values({
          org_id: input.orgId,
          resident_id: input.residentId,
          house_id: input.houseId,
          bed_id: input.bedId,
          admission_date: input.admissionDate,
          planned_discharge_date: input.plannedDischargeDate,
          case_manager_id: input.caseManagerId,
          notes: input.notes,
          status: 'pending',
          move_in_checklist: {},
          created_by: ctx.user!.id,
        })
        .returning();

      return admission;
    }),

  /**
   * Update admission
   */
  update: protectedProcedure
    .input(z.object({
      admissionId: z.string().uuid(),
      houseId: z.string().uuid().optional(),
      bedId: z.string().uuid().nullable().optional(),
      status: z.enum(['pending', 'active', 'on_hold', 'completed', 'terminated']).optional(),
      plannedDischargeDate: z.string().nullable().optional(),
      caseManagerId: z.string().uuid().nullable().optional(),
      notes: z.string().nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { admissionId, houseId, bedId, plannedDischargeDate, caseManagerId, ...rest } = input;

      const [admission] = await db
        .update(admissions)
        .set({
          ...rest,
          house_id: houseId,
          bed_id: bedId,
          planned_discharge_date: plannedDischargeDate,
          case_manager_id: caseManagerId,
          updated_at: new Date(),
          updated_by: ctx.user!.id,
        })
        .where(
          and(
            eq(admissions.id, admissionId),
            isNull(admissions.deleted_at)
          )
        )
        .returning();

      if (!admission) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Admission not found' });
      }

      return admission;
    }),

  /**
   * Complete intake and activate admission
   * ADM-08: Part 2 consent at intake
   */
  completeIntake: protectedProcedure
    .input(z.object({
      admissionId: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Get admission with checklist
      const [admission] = await db
        .select()
        .from(admissions)
        .where(
          and(
            eq(admissions.id, input.admissionId),
            isNull(admissions.deleted_at)
          )
        )
        .limit(1);

      if (!admission) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Admission not found' });
      }

      if (admission.status !== 'pending') {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Intake can only be completed for pending admissions',
        });
      }

      // Check for active Part 2 consent (required)
      const [activeConsent] = await db
        .select()
        .from(consents)
        .where(
          and(
            eq(consents.resident_id, admission.resident_id),
            eq(consents.status, 'active'),
            isNull(consents.deleted_at)
          )
        )
        .limit(1);

      if (!activeConsent) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'At least one active Part 2 consent is required before completing intake',
        });
      }

      // Activate admission
      const [updated] = await db
        .update(admissions)
        .set({
          status: 'active',
          updated_at: new Date(),
          updated_by: ctx.user!.id,
        })
        .where(eq(admissions.id, input.admissionId))
        .returning();

      // Update bed to occupied if assigned
      if (admission.bed_id) {
        await db
          .update(beds)
          .set({
            status: 'occupied',
            updated_at: new Date(),
            updated_by: ctx.user!.id,
          })
          .where(eq(beds.id, admission.bed_id));
      }

      return updated;
    }),

  /**
   * Create emergency contact for resident
   */
  addEmergencyContact: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      residentId: z.string().uuid(),
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      relationship: z.string().min(1),
      phone: z.string().optional(),
      email: z.string().email().optional(),
      isEmergencyContact: z.boolean().default(true),
      canReceiveUpdates: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      const [contact] = await db
        .insert(residentContacts)
        .values({
          org_id: input.orgId,
          resident_id: input.residentId,
          first_name: input.firstName,
          last_name: input.lastName,
          relationship: input.relationship,
          phone: input.phone,
          email: input.email,
          is_emergency_contact: input.isEmergencyContact,
          can_receive_updates: input.canReceiveUpdates,
          created_by: ctx.user!.id,
        })
        .returning();

      return contact;
    }),

  /**
   * Get emergency contacts for resident
   */
  getContacts: protectedProcedure
    .input(z.object({
      residentId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      const contacts = await db
        .select()
        .from(residentContacts)
        .where(
          and(
            eq(residentContacts.resident_id, input.residentId),
            isNull(residentContacts.deleted_at)
          )
        )
        .orderBy(desc(residentContacts.is_emergency_contact), asc(residentContacts.first_name));

      return contacts;
    }),

  /**
   * Get admission stats for dashboard
   */
  getStats: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      const stats = await db
        .select({
          status: admissions.status,
          count: sql<number>`count(*)::int`,
        })
        .from(admissions)
        .where(
          and(
            eq(admissions.org_id, input.orgId),
            isNull(admissions.deleted_at)
          )
        )
        .groupBy(admissions.status);

      const result: Record<string, number> = {
        pending: 0,
        active: 0,
        on_hold: 0,
        completed: 0,
        terminated: 0,
      };

      for (const row of stats) {
        result[row.status] = row.count;
      }

      // Get this month's new admissions
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const [monthlyAdmissions] = await db
        .select({
          count: sql<number>`count(*)::int`,
        })
        .from(admissions)
        .where(
          and(
            eq(admissions.org_id, input.orgId),
            sql`${admissions.created_at} >= ${startOfMonth}`,
            isNull(admissions.deleted_at)
          )
        );

      return {
        ...result,
        total: Object.values(result).reduce((sum, n) => sum + n, 0),
        thisMonth: monthlyAdmissions?.count ?? 0,
      };
    }),

  /**
   * Get required documents for intake
   */
  getRequiredDocuments: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      // Get document templates marked for intake
      const templates = await db
        .select()
        .from(documentTemplates)
        .where(
          and(
            eq(documentTemplates.org_id, input.orgId),
            eq(documentTemplates.is_active, true),
            sql`${documentTemplates.document_type} IN ('intake_form', 'resident_agreement', 'house_rules', 'consent_form', 'financial_agreement')`
          )
        )
        .orderBy(documentTemplates.document_type, documentTemplates.name);

      return templates;
    }),
});

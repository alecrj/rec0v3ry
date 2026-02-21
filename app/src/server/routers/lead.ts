/**
 * Lead Router
 * CRM pipeline management for prospective residents
 *
 * Sprint 11-12: Admissions CRM
 * Source: docs/06_ROADMAP.md Sprint 7 (ADM-01, ADM-11)
 */

import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { db } from '../db/client';
import { leads, residents, admissions } from '../db/schema/residents';
import { organizations, houses, beds } from '../db/schema/orgs';
import { invoices, invoiceLineItems } from '../db/schema/payments';
import { rateConfigs } from '../db/schema/payment-extended';
import { conversations, conversationMembers, messages } from '../db/schema/messaging';
import { users } from '../db/schema/users';
import { eq, and, isNull, sql, desc, asc, inArray, count } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import crypto from 'crypto';

// Lead status pipeline order
const PIPELINE_STAGES = [
  'new',
  'contacted',
  'qualified',
  'touring',
  'applied',
  'accepted',
  'deposit_pending',
  'converted',
  'lost',
] as const;

export const leadRouter = router({
  /**
   * Get pipeline stats (counts per stage)
   * ADM-01: Lead tracking / CRM pipeline
   */
  getPipelineStats: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      const stats = await db
        .select({
          status: leads.status,
          count: sql<number>`count(*)::int`,
        })
        .from(leads)
        .where(
          and(
            eq(leads.org_id, input.orgId),
            isNull(leads.deleted_at)
          )
        )
        .groupBy(leads.status);

      // Build result with all stages
      const result: Record<string, number> = {};
      for (const stage of PIPELINE_STAGES) {
        result[stage] = 0;
      }
      for (const row of stats) {
        result[row.status] = row.count;
      }

      // Calculate conversion rate (converted / total non-lost)
      const total = Object.values(result).reduce((sum, n) => sum + n, 0);
      const converted = result.converted || 0;
      const lost = result.lost || 0;
      const conversionRate = total - lost > 0
        ? Math.round((converted / (total - lost)) * 100)
        : 0;

      return {
        stages: result,
        total,
        conversionRate,
      };
    }),

  /**
   * List leads by pipeline stage
   * ADM-01: Lead tracking / CRM pipeline
   */
  list: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      status: z.enum(PIPELINE_STAGES).optional(),
      housePreferenceId: z.string().uuid().optional(),
      source: z.string().optional(),
      limit: z.number().int().min(1).max(100).default(50),
      offset: z.number().int().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const conditions = [
        eq(leads.org_id, input.orgId),
        isNull(leads.deleted_at),
      ];

      if (input.status) {
        conditions.push(eq(leads.status, input.status));
      }
      if (input.housePreferenceId) {
        conditions.push(eq(leads.house_preference_id, input.housePreferenceId));
      }
      if (input.source) {
        conditions.push(eq(leads.source, input.source));
      }

      const result = await db
        .select({
          id: leads.id,
          first_name: leads.first_name,
          last_name: leads.last_name,
          email: leads.email,
          phone: leads.phone,
          status: leads.status,
          source: leads.source,
          preferred_move_in_date: leads.preferred_move_in_date,
          house_preference_id: leads.house_preference_id,
          notes: leads.notes,
          converted_to_resident_id: leads.converted_to_resident_id,
          converted_at: leads.converted_at,
          lost_reason: leads.lost_reason,
          created_at: leads.created_at,
          updated_at: leads.updated_at,
          house_name: houses.name,
        })
        .from(leads)
        .leftJoin(houses, eq(leads.house_preference_id, houses.id))
        .where(and(...conditions))
        .orderBy(desc(leads.created_at))
        .limit(input.limit)
        .offset(input.offset);

      return result;
    }),

  /**
   * Get leads grouped by pipeline stage (for Kanban)
   * ADM-01: Lead tracking / CRM pipeline
   */
  getKanban: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      excludeTerminal: z.boolean().default(true), // Exclude converted/lost by default
    }))
    .query(async ({ input }) => {
      const conditions = [
        eq(leads.org_id, input.orgId),
        isNull(leads.deleted_at),
      ];

      if (input.excludeTerminal) {
        conditions.push(
          sql`${leads.status} NOT IN ('converted', 'lost')`
        );
      }

      const allLeads = await db
        .select({
          id: leads.id,
          first_name: leads.first_name,
          last_name: leads.last_name,
          email: leads.email,
          phone: leads.phone,
          status: leads.status,
          source: leads.source,
          preferred_move_in_date: leads.preferred_move_in_date,
          house_preference_id: leads.house_preference_id,
          notes: leads.notes,
          created_at: leads.created_at,
          house_name: houses.name,
        })
        .from(leads)
        .leftJoin(houses, eq(leads.house_preference_id, houses.id))
        .where(and(...conditions))
        .orderBy(asc(leads.created_at));

      // Group by status
      const kanban: Record<string, typeof allLeads> = {};
      const activeStages = input.excludeTerminal
        ? PIPELINE_STAGES.filter(s => s !== 'converted' && s !== 'lost')
        : PIPELINE_STAGES;

      for (const stage of activeStages) {
        kanban[stage] = [];
      }
      for (const lead of allLeads) {
        if (kanban[lead.status]) {
          kanban[lead.status].push(lead);
        }
      }

      return kanban;
    }),

  /**
   * Get lead by ID
   */
  getById: protectedProcedure
    .input(z.object({
      leadId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      const [lead] = await db
        .select({
          id: leads.id,
          org_id: leads.org_id,
          first_name: leads.first_name,
          last_name: leads.last_name,
          email: leads.email,
          phone: leads.phone,
          status: leads.status,
          source: leads.source,
          referral_source_id: leads.referral_source_id,
          preferred_move_in_date: leads.preferred_move_in_date,
          house_preference_id: leads.house_preference_id,
          notes: leads.notes,
          converted_to_resident_id: leads.converted_to_resident_id,
          converted_at: leads.converted_at,
          lost_reason: leads.lost_reason,
          created_at: leads.created_at,
          updated_at: leads.updated_at,
          house_name: houses.name,
        })
        .from(leads)
        .leftJoin(houses, eq(leads.house_preference_id, houses.id))
        .where(
          and(
            eq(leads.id, input.leadId),
            isNull(leads.deleted_at)
          )
        )
        .limit(1);

      if (!lead) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead not found' });
      }

      return lead;
    }),

  /**
   * Create new lead
   */
  create: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      firstName: z.string().min(1).max(255),
      lastName: z.string().min(1).max(255),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      source: z.string().optional(),
      referralSourceId: z.string().uuid().optional(),
      preferredMoveInDate: z.string().optional(),
      housePreferenceId: z.string().uuid().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const [lead] = await db
        .insert(leads)
        .values({
          org_id: input.orgId,
          first_name: input.firstName,
          last_name: input.lastName,
          email: input.email,
          phone: input.phone,
          source: input.source,
          referral_source_id: input.referralSourceId,
          preferred_move_in_date: input.preferredMoveInDate,
          house_preference_id: input.housePreferenceId,
          notes: input.notes,
          status: 'new',
          created_by: ctx.user!.id,
        })
        .returning();

      return lead;
    }),

  /**
   * Update lead
   */
  update: protectedProcedure
    .input(z.object({
      leadId: z.string().uuid(),
      firstName: z.string().min(1).max(255).optional(),
      lastName: z.string().min(1).max(255).optional(),
      email: z.string().email().nullable().optional(),
      phone: z.string().nullable().optional(),
      source: z.string().nullable().optional(),
      referralSourceId: z.string().uuid().nullable().optional(),
      preferredMoveInDate: z.string().nullable().optional(),
      housePreferenceId: z.string().uuid().nullable().optional(),
      notes: z.string().nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { leadId, firstName, lastName, preferredMoveInDate, housePreferenceId, referralSourceId, ...rest } = input;

      const [lead] = await db
        .update(leads)
        .set({
          ...rest,
          first_name: firstName,
          last_name: lastName,
          preferred_move_in_date: preferredMoveInDate,
          house_preference_id: housePreferenceId,
          referral_source_id: referralSourceId,
          updated_at: new Date(),
          updated_by: ctx.user!.id,
        })
        .where(
          and(
            eq(leads.id, leadId),
            isNull(leads.deleted_at)
          )
        )
        .returning();

      if (!lead) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead not found' });
      }

      return lead;
    }),

  /**
   * Update lead status (move through pipeline)
   * ADM-01: Lead tracking / CRM pipeline
   */
  updateStatus: protectedProcedure
    .input(z.object({
      leadId: z.string().uuid(),
      status: z.enum(PIPELINE_STAGES),
      lostReason: z.string().optional(), // Required when status = lost
    }))
    .mutation(async ({ input, ctx }) => {
      if (input.status === 'lost' && !input.lostReason) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Lost reason is required when marking lead as lost',
        });
      }

      const [lead] = await db
        .update(leads)
        .set({
          status: input.status,
          lost_reason: input.status === 'lost' ? input.lostReason : null,
          updated_at: new Date(),
          updated_by: ctx.user!.id,
        })
        .where(
          and(
            eq(leads.id, input.leadId),
            isNull(leads.deleted_at)
          )
        )
        .returning();

      if (!lead) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead not found' });
      }

      return lead;
    }),

  /**
   * Convert lead to resident — one-click comprehensive admission
   * G2-1: Creates resident, admission, assigns bed, creates invoice, sends welcome message
   */
  convertToResident: protectedProcedure
    .input(z.object({
      leadId: z.string().uuid(),
      houseId: z.string().uuid(),
      admissionDate: z.string(),
      bedId: z.string().uuid().optional(),
      dateOfBirth: z.string(),
      caseManagerId: z.string().uuid().optional(),
      generateInvoice: z.boolean().default(true),
      sendDocuments: z.boolean().default(true),
      monthlyRentAmount: z.string().optional(), // Decimal string, e.g. "800.00"
    }))
    .mutation(async ({ input, ctx }) => {
      const orgId = (ctx as any).orgId as string;
      const userId = ctx.user!.id;

      // Get lead
      const [lead] = await db
        .select()
        .from(leads)
        .where(
          and(
            eq(leads.id, input.leadId),
            isNull(leads.deleted_at)
          )
        )
        .limit(1);

      if (!lead) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead not found' });
      }

      if (lead.status === 'converted') {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Lead has already been converted',
        });
      }

      // Create resident
      const [resident] = await db
        .insert(residents)
        .values({
          org_id: lead.org_id,
          first_name: lead.first_name,
          last_name: lead.last_name,
          email: lead.email,
          phone: lead.phone,
          date_of_birth: input.dateOfBirth,
          referral_source: lead.source,
          referral_contact_id: lead.referral_source_id,
          notes: lead.notes,
          created_by: userId,
        })
        .returning();

      // Create admission with status 'active' (one-click = approved)
      const [admission] = await db
        .insert(admissions)
        .values({
          org_id: lead.org_id,
          resident_id: resident.id,
          house_id: input.houseId,
          bed_id: input.bedId || null,
          admission_date: input.admissionDate,
          case_manager_id: input.caseManagerId || null,
          status: 'active',
          created_by: userId,
        })
        .returning();

      // Assign bed: mark bed as occupied if bedId provided
      if (input.bedId) {
        await db
          .update(beds)
          .set({
            status: 'occupied',
            updated_at: new Date(),
            updated_by: userId,
          })
          .where(eq(beds.id, input.bedId));
      }

      // Generate first month's invoice if requested
      let invoice = null;
      if (input.generateInvoice) {
        // Try to find rent rate config for this house, else use provided amount or default $0
        let rentAmount = input.monthlyRentAmount ? parseFloat(input.monthlyRentAmount) : null;

        if (!rentAmount) {
          // Look up rate config for this house
          const [rateConfig] = await db
            .select()
            .from(rateConfigs)
            .where(
              and(
                eq(rateConfigs.org_id, orgId),
                eq(rateConfigs.house_id, input.houseId),
                eq(rateConfigs.payment_type, 'rent'),
                isNull(rateConfigs.effective_until),
              )
            )
            .limit(1);

          if (rateConfig) {
            rentAmount = parseFloat(rateConfig.amount);
          }
        }

        if (rentAmount && rentAmount > 0) {
          // Get org slug for invoice number
          const [org] = await db
            .select({ slug: organizations.slug })
            .from(organizations)
            .where(eq(organizations.id, orgId))
            .limit(1);

          const [countResult] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(invoices)
            .where(and(eq(invoices.org_id, orgId), isNull(invoices.deleted_at)));
          const invoiceCount = countResult?.count || 0;
          const invoiceNumber = `INV-${(org?.slug || 'ORG').toUpperCase()}-${(invoiceCount + 1).toString().padStart(5, '0')}`;

          const issueDate = input.admissionDate;
          // Due date = 30 days after admission
          const dueDateObj = new Date(input.admissionDate);
          dueDateObj.setDate(dueDateObj.getDate() + 30);
          const dueDate = dueDateObj.toISOString().split('T')[0];

          const [newInvoice] = await db
            .insert(invoices)
            .values({
              org_id: orgId,
              resident_id: resident.id,
              admission_id: admission.id,
              invoice_number: invoiceNumber,
              status: 'pending',
              issue_date: issueDate,
              due_date: dueDate,
              subtotal: rentAmount.toFixed(2),
              tax_amount: '0',
              total: rentAmount.toFixed(2),
              amount_paid: '0',
              amount_due: rentAmount.toFixed(2),
              notes: 'First month rent — generated at move-in',
              created_by: userId,
              updated_by: userId,
            })
            .returning();

          await db
            .insert(invoiceLineItems)
            .values({
              invoice_id: newInvoice.id,
              description: 'Monthly Rent',
              payment_type: 'rent',
              quantity: 1,
              unit_price: rentAmount.toFixed(2),
              amount: rentAmount.toFixed(2),
              start_date: issueDate,
              end_date: dueDate,
            });

          invoice = newInvoice;
        }
      }

      // Send welcome system message
      // Create a direct conversation between staff (ctx.user) and resident
      const [conversation] = await db
        .insert(conversations)
        .values({
          org_id: orgId,
          conversation_type: 'direct',
          title: `Welcome — ${lead.first_name} ${lead.last_name}`,
          created_by: userId,
        })
        .returning();

      // Add staff user as member
      await db.insert(conversationMembers).values({
        org_id: orgId,
        conversation_id: conversation.id,
        user_id: userId,
      });

      // Add resident as member
      await db.insert(conversationMembers).values({
        org_id: orgId,
        conversation_id: conversation.id,
        resident_id: resident.id,
      });

      // Send welcome message
      const welcomeText = `Welcome to RecoveryOS, ${lead.first_name}! Your admission has been confirmed. Please download the RecoveryOS app to complete your intake, sign documents, and stay connected with your house. We're glad you're here.`;

      await db.insert(messages).values({
        org_id: orgId,
        conversation_id: conversation.id,
        sender_user_id: userId,
        content: welcomeText,
        is_system_message: true,
      });

      // Update lead as converted
      await db
        .update(leads)
        .set({
          status: 'converted',
          converted_to_resident_id: resident.id,
          converted_at: new Date(),
          updated_at: new Date(),
          updated_by: userId,
        })
        .where(eq(leads.id, input.leadId));

      return {
        lead,
        resident,
        admission,
        invoice,
        conversationId: conversation.id,
      };
    }),

  /**
   * Send app invite to resident
   * G2-2: Generate invite link for resident self-signup
   */
  sendInvite: protectedProcedure
    .input(z.object({
      residentId: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      const orgId = (ctx as any).orgId as string;

      // Verify resident exists and belongs to this org
      const [resident] = await db
        .select()
        .from(residents)
        .where(
          and(
            eq(residents.id, input.residentId),
            eq(residents.org_id, orgId),
            isNull(residents.deleted_at)
          )
        )
        .limit(1);

      if (!resident) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Resident not found' });
      }

      // Generate a secure invite token (32 random bytes as hex)
      const inviteToken = crypto.randomBytes(32).toString('hex');

      // Store token in resident notes as metadata (no schema migration needed)
      // Format: [INVITE_TOKEN:<token>:<iso-timestamp>]
      const inviteMarker = `[INVITE_TOKEN:${inviteToken}:${new Date().toISOString()}]`;
      const existingNotes = resident.notes || '';
      // Remove any previous invite token from notes
      const cleanedNotes = existingNotes.replace(/\[INVITE_TOKEN:[^\]]+\]/g, '').trim();
      const updatedNotes = cleanedNotes ? `${cleanedNotes}\n${inviteMarker}` : inviteMarker;

      await db
        .update(residents)
        .set({
          notes: updatedNotes,
          updated_at: new Date(),
          updated_by: ctx.user!.id,
        })
        .where(eq(residents.id, input.residentId));

      // Build invite link
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.recoveryos.com';
      const inviteLink = `${baseUrl}/register?invite=${inviteToken}&resident=${input.residentId}`;

      return {
        inviteToken,
        inviteLink,
        residentId: input.residentId,
        sentAt: new Date().toISOString(),
      };
    }),

  /**
   * Get referral source stats
   * ADM-11: Referral source tracking
   */
  getReferralStats: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      const stats = await db
        .select({
          source: leads.source,
          count: sql<number>`count(*)::int`,
          converted: sql<number>`count(case when ${leads.status} = 'converted' then 1 end)::int`,
        })
        .from(leads)
        .where(
          and(
            eq(leads.org_id, input.orgId),
            isNull(leads.deleted_at),
            sql`${leads.source} IS NOT NULL`
          )
        )
        .groupBy(leads.source)
        .orderBy(desc(sql`count(*)`));

      return stats.map(s => ({
        source: s.source,
        count: s.count,
        converted: s.converted,
        conversionRate: s.count > 0 ? Math.round((s.converted / s.count) * 100) : 0,
      }));
    }),

  /**
   * Quick create lead (orgId from ctx, for dashboard modal)
   */
  quickCreate: protectedProcedure
    .input(z.object({
      firstName: z.string().min(1).max(255),
      lastName: z.string().min(1).max(255),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      dob: z.string().optional(),
      source: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const orgId = (ctx as unknown as { orgId: string }).orgId;
      const notes = input.dob ? `DOB: ${input.dob}` : undefined;
      const [lead] = await db
        .insert(leads)
        .values({
          org_id: orgId,
          first_name: input.firstName,
          last_name: input.lastName,
          email: input.email,
          phone: input.phone,
          notes,
          source: input.source || 'manual',
          status: 'new',
          created_by: ctx.user!.id,
        })
        .returning();
      return lead;
    }),

  /**
   * Delete lead (soft delete)
   */
  delete: protectedProcedure
    .input(z.object({
      leadId: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      const [lead] = await db
        .update(leads)
        .set({
          deleted_at: new Date(),
          updated_by: ctx.user!.id,
        })
        .where(eq(leads.id, input.leadId))
        .returning();

      return lead;
    }),
});

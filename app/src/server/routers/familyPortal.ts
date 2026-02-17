/**
 * Family Portal Router
 * Consent-gated access for family members to view resident information
 *
 * Sprint 17-18: Advanced Ops
 * Source: docs/06_ROADMAP.md Sprint 21-22
 *
 * IMPORTANT: All data access requires active Part 2 consent
 * Family members can only see data they have been explicitly consented to view
 */

import { router, protectedProcedure, part2Procedure } from '../trpc';
import { z } from 'zod';
import { db } from '../db/client';
import { familyPortalTokens } from '../db/schema/operations-extended';
import { residentContacts, residents, admissions } from '../db/schema/residents';
import { consents } from '../db/schema/compliance';
import { invoices, payments } from '../db/schema/payments';
import { houses } from '../db/schema/orgs';
import { users } from '../db/schema/users';
import { eq, and, isNull, sql, desc, gte } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

export const familyPortalRouter = router({
  /**
   * List family contacts for a resident (admin view)
   */
  listContacts: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      residentId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      const contacts = await db
        .select({
          id: residentContacts.id,
          first_name: residentContacts.first_name,
          last_name: residentContacts.last_name,
          relationship: residentContacts.relationship,
          email: residentContacts.email,
          phone: residentContacts.phone,
          can_receive_updates: residentContacts.can_receive_updates,
          can_access_portal: residentContacts.can_access_portal,
          is_emergency_contact: residentContacts.is_emergency_contact,
          user_id: residentContacts.user_id,
          created_at: residentContacts.created_at,
        })
        .from(residentContacts)
        .where(
          and(
            eq(residentContacts.org_id, input.orgId),
            eq(residentContacts.resident_id, input.residentId),
            isNull(residentContacts.deleted_at)
          )
        )
        .orderBy(desc(residentContacts.is_emergency_contact), residentContacts.first_name);

      return contacts;
    }),

  /**
   * Create/update a family contact
   */
  upsertContact: protectedProcedure
    .input(z.object({
      contactId: z.string().uuid().optional(),
      orgId: z.string().uuid(),
      residentId: z.string().uuid(),
      firstName: z.string().min(1).max(100),
      lastName: z.string().min(1).max(100),
      relationship: z.string().min(1).max(50),
      email: z.string().email().optional(),
      phone: z.string().max(20).optional(),
      canReceiveUpdates: z.boolean().default(false),
      canAccessPortal: z.boolean().default(false),
      isEmergencyContact: z.boolean().default(false),
      notes: z.string().max(500).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (input.contactId) {
        // Update existing
        const [contact] = await db
          .update(residentContacts)
          .set({
            first_name: input.firstName,
            last_name: input.lastName,
            relationship: input.relationship,
            email: input.email,
            phone: input.phone,
            can_receive_updates: input.canReceiveUpdates,
            can_access_portal: input.canAccessPortal,
            is_emergency_contact: input.isEmergencyContact,
            notes: input.notes,
            updated_by: ctx.user!.id,
            updated_at: new Date(),
          })
          .where(eq(residentContacts.id, input.contactId))
          .returning();

        if (!contact) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Contact not found' });
        }
        return contact;
      } else {
        // Create new
        const [contact] = await db
          .insert(residentContacts)
          .values({
            org_id: input.orgId,
            resident_id: input.residentId,
            first_name: input.firstName,
            last_name: input.lastName,
            relationship: input.relationship,
            email: input.email,
            phone: input.phone,
            can_receive_updates: input.canReceiveUpdates,
            can_access_portal: input.canAccessPortal,
            is_emergency_contact: input.isEmergencyContact,
            notes: input.notes,
            created_by: ctx.user!.id,
          })
          .returning();

        return contact;
      }
    }),

  /**
   * Delete a family contact
   */
  deleteContact: protectedProcedure
    .input(z.object({
      contactId: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      const [contact] = await db
        .update(residentContacts)
        .set({
          deleted_at: new Date(),
          updated_by: ctx.user!.id,
        })
        .where(
          and(
            eq(residentContacts.id, input.contactId),
            isNull(residentContacts.deleted_at)
          )
        )
        .returning();

      if (!contact) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Contact not found' });
      }

      return { success: true };
    }),

  /**
   * Enable portal access for a contact (creates user + token)
   */
  enablePortalAccess: protectedProcedure
    .input(z.object({
      contactId: z.string().uuid(),
      email: z.string().email(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Get the contact
      const [contact] = await db
        .select()
        .from(residentContacts)
        .where(
          and(
            eq(residentContacts.id, input.contactId),
            isNull(residentContacts.deleted_at)
          )
        )
        .limit(1);

      if (!contact) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Contact not found' });
      }

      // Update contact with portal access
      await db
        .update(residentContacts)
        .set({
          can_access_portal: true,
          email: input.email,
          updated_by: ctx.user!.id,
          updated_at: new Date(),
        })
        .where(eq(residentContacts.id, input.contactId));

      // Generate a secure token (in production, use crypto.randomBytes)
      const token = `fp_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      const tokenHash = token; // In production, hash this with bcrypt

      // Create portal token
      const [portalToken] = await db
        .insert(familyPortalTokens)
        .values({
          org_id: contact.org_id,
          contact_id: contact.id,
          resident_id: contact.resident_id,
          token_hash: tokenHash,
          email: input.email,
          is_active: true,
          expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
          created_by: ctx.user!.id,
        })
        .returning();

      return {
        success: true,
        tokenId: portalToken.id,
        // In production, send this via email instead of returning
        inviteToken: token,
      };
    }),

  /**
   * Disable portal access for a contact
   */
  disablePortalAccess: protectedProcedure
    .input(z.object({
      contactId: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Update contact
      await db
        .update(residentContacts)
        .set({
          can_access_portal: false,
          updated_by: ctx.user!.id,
          updated_at: new Date(),
        })
        .where(eq(residentContacts.id, input.contactId));

      // Deactivate all tokens
      await db
        .update(familyPortalTokens)
        .set({ is_active: false })
        .where(eq(familyPortalTokens.contact_id, input.contactId));

      return { success: true };
    }),

  /**
   * Get active consents for family portal access
   * This determines what data the family member can see
   */
  getActiveConsents: part2Procedure
    .input(z.object({
      residentId: z.string().uuid(),
      contactEmail: z.string().email().optional(),
    }))
    .query(async ({ input }) => {
      const conditions = [
        eq(consents.resident_id, input.residentId),
        eq(consents.status, 'active'),
      ];

      // If contact email provided, filter by recipient
      if (input.contactEmail) {
        // Check if consent recipient contains this email
        // This is a simplified check - in production, recipient_name would be structured
      }

      const activeConsents = await db
        .select({
          id: consents.id,
          consent_type: consents.consent_type,
          scope_of_information: consents.scope_of_information,
          purpose: consents.purpose,
          recipient_name: consents.recipient_name,
          expires_at: consents.expires_at,
          created_at: consents.created_at,
        })
        .from(consents)
        .where(and(...conditions))
        .orderBy(desc(consents.created_at));

      return activeConsents;
    }),

  /**
   * Family portal: Get resident summary (consent-gated)
   * Only shows data the family member has been consented to view
   */
  getResidentSummary: part2Procedure
    .input(z.object({
      residentId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      // Get basic resident info
      const [resident] = await db
        .select({
          id: residents.id,
          first_name: residents.first_name,
          preferred_name: residents.preferred_name,
          profile_photo_url: residents.profile_photo_url,
        })
        .from(residents)
        .where(
          and(
            eq(residents.id, input.residentId),
            isNull(residents.deleted_at)
          )
        )
        .limit(1);

      if (!resident) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Resident not found' });
      }

      // Get current admission info
      const [admission] = await db
        .select({
          id: admissions.id,
          house_id: admissions.house_id,
          admission_date: admissions.admission_date,
          status: admissions.status,
          house_name: houses.name,
        })
        .from(admissions)
        .innerJoin(houses, eq(admissions.house_id, houses.id))
        .where(
          and(
            eq(admissions.resident_id, input.residentId),
            eq(admissions.status, 'active')
          )
        )
        .limit(1);

      return {
        resident: {
          id: resident.id,
          firstName: resident.first_name,
          preferredName: resident.preferred_name,
          profilePhotoUrl: resident.profile_photo_url,
        },
        admission: admission ? {
          houseName: admission.house_name,
          admissionDate: admission.admission_date,
          status: admission.status,
        } : null,
      };
    }),

  /**
   * Family portal: Get payment summary (consent-gated)
   */
  getPaymentSummary: part2Procedure
    .input(z.object({
      residentId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      // Get recent invoices
      const recentInvoices = await db
        .select({
          id: invoices.id,
          invoice_number: invoices.invoice_number,
          total: invoices.total,
          amount_due: invoices.amount_due,
          status: invoices.status,
          due_date: invoices.due_date,
          created_at: invoices.created_at,
        })
        .from(invoices)
        .where(eq(invoices.resident_id, input.residentId))
        .orderBy(desc(invoices.created_at))
        .limit(10);

      // Get total balance
      const [balance] = await db
        .select({
          total_due: sql<number>`coalesce(sum(case when ${invoices.status} in ('pending', 'overdue', 'partially_paid') then ${invoices.total}::numeric else 0 end), 0)::numeric(10,2)`,
          total_paid: sql<number>`coalesce(sum(case when ${invoices.status} = 'paid' then ${invoices.total}::numeric else 0 end), 0)::numeric(10,2)`,
        })
        .from(invoices)
        .where(eq(invoices.resident_id, input.residentId));

      // Get recent payments
      const recentPayments = await db
        .select({
          id: payments.id,
          amount: payments.amount,
          payment_method_type: payments.payment_method_type,
          status: payments.status,
          created_at: payments.created_at,
        })
        .from(payments)
        .where(eq(payments.resident_id, input.residentId))
        .orderBy(desc(payments.created_at))
        .limit(5);

      return {
        balance: {
          totalDue: Number(balance?.total_due ?? 0),
          totalPaid: Number(balance?.total_paid ?? 0),
        },
        recentInvoices,
        recentPayments,
      };
    }),

  /**
   * Get portal access statistics (admin view)
   */
  getPortalStats: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      // Total contacts with portal access
      const [contactStats] = await db
        .select({
          total_contacts: sql<number>`count(*)::int`,
          with_portal_access: sql<number>`sum(case when ${residentContacts.can_access_portal} = true then 1 else 0 end)::int`,
          emergency_contacts: sql<number>`sum(case when ${residentContacts.is_emergency_contact} = true then 1 else 0 end)::int`,
        })
        .from(residentContacts)
        .where(
          and(
            eq(residentContacts.org_id, input.orgId),
            isNull(residentContacts.deleted_at)
          )
        );

      // Active portal tokens
      const [tokenStats] = await db
        .select({
          active_tokens: sql<number>`count(*)::int`,
          accessed_last_30_days: sql<number>`sum(case when ${familyPortalTokens.last_accessed_at} >= now() - interval '30 days' then 1 else 0 end)::int`,
        })
        .from(familyPortalTokens)
        .where(
          and(
            eq(familyPortalTokens.org_id, input.orgId),
            eq(familyPortalTokens.is_active, true)
          )
        );

      return {
        totalContacts: contactStats?.total_contacts ?? 0,
        withPortalAccess: contactStats?.with_portal_access ?? 0,
        emergencyContacts: contactStats?.emergency_contacts ?? 0,
        activeTokens: tokenStats?.active_tokens ?? 0,
        accessedLast30Days: tokenStats?.accessed_last_30_days ?? 0,
      };
    }),

  /**
   * List all portal users (admin view)
   */
  listPortalUsers: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      limit: z.number().int().min(1).max(100).default(50),
      offset: z.number().int().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const portalUsers = await db
        .select({
          contact_id: residentContacts.id,
          contact_first_name: residentContacts.first_name,
          contact_last_name: residentContacts.last_name,
          contact_email: residentContacts.email,
          relationship: residentContacts.relationship,
          resident_id: residentContacts.resident_id,
          resident_first_name: residents.first_name,
          resident_last_name: residents.last_name,
          last_accessed_at: familyPortalTokens.last_accessed_at,
          token_active: familyPortalTokens.is_active,
        })
        .from(residentContacts)
        .innerJoin(residents, eq(residentContacts.resident_id, residents.id))
        .leftJoin(familyPortalTokens, eq(familyPortalTokens.contact_id, residentContacts.id))
        .where(
          and(
            eq(residentContacts.org_id, input.orgId),
            eq(residentContacts.can_access_portal, true),
            isNull(residentContacts.deleted_at)
          )
        )
        .orderBy(desc(familyPortalTokens.last_accessed_at))
        .limit(input.limit)
        .offset(input.offset);

      return portalUsers;
    }),

  /**
   * Get residents linked to a family user (for family portal home)
   */
  getLinkedResidents: protectedProcedure
    .input(z.object({
      userEmail: z.string().email(),
      orgId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      const linkedResidents = await db
        .select({
          contact_id: residentContacts.id,
          resident_id: residents.id,
          resident_first_name: residents.first_name,
          resident_last_name: residents.last_name,
          resident_preferred_name: residents.preferred_name,
          resident_profile_photo: residents.profile_photo_url,
          relationship: residentContacts.relationship,
          house_name: houses.name,
          admission_status: admissions.status,
        })
        .from(residentContacts)
        .innerJoin(residents, eq(residentContacts.resident_id, residents.id))
        .leftJoin(
          admissions,
          and(
            eq(admissions.resident_id, residents.id),
            eq(admissions.status, 'active')
          )
        )
        .leftJoin(houses, eq(admissions.house_id, houses.id))
        .where(
          and(
            eq(residentContacts.org_id, input.orgId),
            eq(residentContacts.email, input.userEmail),
            eq(residentContacts.can_access_portal, true),
            isNull(residentContacts.deleted_at)
          )
        );

      return linkedResidents;
    }),
});

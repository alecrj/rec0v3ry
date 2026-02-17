/**
 * Occupancy Router
 * Bed assignments, transfers, waitlist, move-out, capacity reporting
 *
 * Sprint 9-10: Org + Occupancy
 * Source: docs/06_ROADMAP.md Sprint 6 (OCC-01 through OCC-08)
 */

import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { db } from '../db/client';
import { organizations, properties, houses, rooms, beds } from '../db/schema/orgs';
import { residents, admissions } from '../db/schema/residents';
import { waitlistEntries, bedTransfers, discharges } from '../db/schema/resident-tracking';
import { eq, and, isNull, sql, desc, asc, or, gte, lte, isNotNull, inArray } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

export const occupancyRouter = router({
  /**
   * Get occupancy dashboard stats for an org
   * OCC-06: Capacity reporting
   */
  getDashboardStats: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      propertyId: z.string().uuid().optional(),
      houseId: z.string().uuid().optional(),
    }))
    .query(async ({ input }) => {
      // Build conditions based on filters
      const houseConditions = [
        eq(houses.org_id, input.orgId),
        isNull(houses.deleted_at),
      ];
      if (input.propertyId) {
        houseConditions.push(eq(houses.property_id, input.propertyId));
      }
      if (input.houseId) {
        houseConditions.push(eq(houses.id, input.houseId));
      }

      // Get house IDs matching filters
      const matchingHouses = await db
        .select({ id: houses.id })
        .from(houses)
        .where(and(...houseConditions));

      const houseIds = matchingHouses.map(h => h.id);
      if (houseIds.length === 0) {
        return {
          total_beds: 0,
          available_beds: 0,
          occupied_beds: 0,
          reserved_beds: 0,
          maintenance_beds: 0,
          out_of_service_beds: 0,
          occupancy_rate: 0,
          total_capacity: 0,
          total_houses: 0,
          total_properties: 0,
          active_residents: 0,
          waitlist_count: 0,
        };
      }

      // Get bed stats
      const bedStats = await db
        .select({
          total_beds: sql<number>`count(${beds.id})::int`,
          available_beds: sql<number>`count(case when ${beds.status} = 'available' then 1 end)::int`,
          occupied_beds: sql<number>`count(case when ${beds.status} = 'occupied' then 1 end)::int`,
          reserved_beds: sql<number>`count(case when ${beds.status} = 'reserved' then 1 end)::int`,
          maintenance_beds: sql<number>`count(case when ${beds.status} = 'maintenance' then 1 end)::int`,
          out_of_service_beds: sql<number>`count(case when ${beds.status} = 'out_of_service' then 1 end)::int`,
        })
        .from(beds)
        .innerJoin(rooms, eq(beds.room_id, rooms.id))
        .where(
          and(
            inArray(rooms.house_id, houseIds),
            isNull(beds.deleted_at),
            isNull(rooms.deleted_at)
          )
        );

      // Get house/property counts
      const houseStats = await db
        .select({
          total_houses: sql<number>`count(distinct ${houses.id})::int`,
          total_properties: sql<number>`count(distinct ${houses.property_id})::int`,
          total_capacity: sql<number>`coalesce(sum(${houses.capacity}), 0)::int`,
        })
        .from(houses)
        .where(and(...houseConditions));

      // Get active residents count
      const [residentStats] = await db
        .select({
          active_residents: sql<number>`count(*)::int`,
        })
        .from(admissions)
        .where(
          and(
            inArray(admissions.house_id, houseIds),
            eq(admissions.status, 'active'),
            isNull(admissions.deleted_at)
          )
        );

      // Get waitlist count
      const [waitlistStats] = await db
        .select({
          waitlist_count: sql<number>`count(*)::int`,
        })
        .from(waitlistEntries)
        .where(
          and(
            eq(waitlistEntries.org_id, input.orgId),
            isNull(waitlistEntries.removed_at),
            or(
              isNull(waitlistEntries.house_id),
              inArray(waitlistEntries.house_id, houseIds)
            )
          )
        );

      const stats = bedStats[0];
      const usableBeds = (stats?.total_beds ?? 0) - (stats?.out_of_service_beds ?? 0) - (stats?.maintenance_beds ?? 0);

      return {
        total_beds: stats?.total_beds ?? 0,
        available_beds: stats?.available_beds ?? 0,
        occupied_beds: stats?.occupied_beds ?? 0,
        reserved_beds: stats?.reserved_beds ?? 0,
        maintenance_beds: stats?.maintenance_beds ?? 0,
        out_of_service_beds: stats?.out_of_service_beds ?? 0,
        occupancy_rate: usableBeds > 0 ? Math.round(((stats?.occupied_beds ?? 0) / usableBeds) * 100) : 0,
        total_capacity: houseStats[0]?.total_capacity ?? 0,
        total_houses: houseStats[0]?.total_houses ?? 0,
        total_properties: houseStats[0]?.total_properties ?? 0,
        active_residents: residentStats?.active_residents ?? 0,
        waitlist_count: waitlistStats?.waitlist_count ?? 0,
      };
    }),

  /**
   * Get bed grid data for visual display
   * OCC-01: Bed-level tracking
   * OCC-02: Occupancy dashboard
   */
  getBedGrid: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      propertyId: z.string().uuid().optional(),
      houseId: z.string().uuid().optional(),
    }))
    .query(async ({ input }) => {
      // Build house conditions
      const houseConditions = [
        eq(houses.org_id, input.orgId),
        isNull(houses.deleted_at),
      ];
      if (input.propertyId) {
        houseConditions.push(eq(houses.property_id, input.propertyId));
      }
      if (input.houseId) {
        houseConditions.push(eq(houses.id, input.houseId));
      }

      // Get houses with property info
      const houseList = await db
        .select({
          id: houses.id,
          name: houses.name,
          property_id: houses.property_id,
          property_name: properties.name,
          capacity: houses.capacity,
          gender_restriction: houses.gender_restriction,
        })
        .from(houses)
        .innerJoin(properties, eq(houses.property_id, properties.id))
        .where(and(...houseConditions))
        .orderBy(properties.name, houses.name);

      if (houseList.length === 0) return [];

      const houseIds = houseList.map(h => h.id);

      // Get all rooms for these houses
      const roomList = await db
        .select({
          id: rooms.id,
          house_id: rooms.house_id,
          name: rooms.name,
          floor: rooms.floor,
          capacity: rooms.capacity,
        })
        .from(rooms)
        .where(
          and(
            inArray(rooms.house_id, houseIds),
            isNull(rooms.deleted_at)
          )
        )
        .orderBy(rooms.floor, rooms.name);

      const roomIds = roomList.map(r => r.id);
      if (roomIds.length === 0) {
        return houseList.map(house => ({
          ...house,
          rooms: [],
          stats: { total: 0, available: 0, occupied: 0, reserved: 0, maintenance: 0 },
        }));
      }

      // Get all beds with resident info
      const bedList = await db
        .select({
          id: beds.id,
          room_id: beds.room_id,
          name: beds.name,
          status: beds.status,
          notes: beds.notes,
        })
        .from(beds)
        .where(
          and(
            inArray(beds.room_id, roomIds),
            isNull(beds.deleted_at)
          )
        )
        .orderBy(beds.name);

      // Get current bed assignments (active admissions with bed_id)
      const bedAssignments = await db
        .select({
          bed_id: admissions.bed_id,
          resident_id: admissions.resident_id,
          resident_first_name: residents.first_name,
          resident_last_name: residents.last_name,
          admission_date: admissions.admission_date,
        })
        .from(admissions)
        .innerJoin(residents, eq(admissions.resident_id, residents.id))
        .where(
          and(
            isNotNull(admissions.bed_id),
            eq(admissions.status, 'active'),
            isNull(admissions.deleted_at)
          )
        );

      // Map bed assignments by bed_id
      const assignmentsByBed = bedAssignments.reduce((acc, a) => {
        if (a.bed_id) acc[a.bed_id] = a;
        return acc;
      }, {} as Record<string, typeof bedAssignments[0]>);

      // Group beds by room
      const bedsByRoom = bedList.reduce((acc, bed) => {
        if (!acc[bed.room_id]) acc[bed.room_id] = [];
        acc[bed.room_id].push({
          ...bed,
          resident: assignmentsByBed[bed.id] ?? null,
        });
        return acc;
      }, {} as Record<string, Array<typeof bedList[0] & { resident: typeof bedAssignments[0] | null }>>);

      // Group rooms by house
      const roomsByHouse = roomList.reduce((acc, room) => {
        if (!acc[room.house_id]) acc[room.house_id] = [];
        acc[room.house_id].push({
          ...room,
          beds: bedsByRoom[room.id] ?? [],
        });
        return acc;
      }, {} as Record<string, Array<typeof roomList[0] & { beds: Array<typeof bedList[0] & { resident: typeof bedAssignments[0] | null }> }>>);

      // Assemble final structure
      return houseList.map(house => {
        const houseRooms = roomsByHouse[house.id] ?? [];
        const allBeds = houseRooms.flatMap(r => r.beds);
        return {
          ...house,
          rooms: houseRooms,
          stats: {
            total: allBeds.length,
            available: allBeds.filter(b => b.status === 'available').length,
            occupied: allBeds.filter(b => b.status === 'occupied').length,
            reserved: allBeds.filter(b => b.status === 'reserved').length,
            maintenance: allBeds.filter(b => b.status === 'maintenance' || b.status === 'out_of_service').length,
          },
        };
      });
    }),

  /**
   * Assign resident to bed
   * OCC-03: Bed assignment
   */
  assignBed: protectedProcedure
    .input(z.object({
      admissionId: z.string().uuid(),
      bedId: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Verify bed is available
      const [bed] = await db
        .select()
        .from(beds)
        .where(
          and(
            eq(beds.id, input.bedId),
            isNull(beds.deleted_at)
          )
        )
        .limit(1);

      if (!bed) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Bed not found' });
      }

      if (bed.status !== 'available' && bed.status !== 'reserved') {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: `Bed is not available (current status: ${bed.status})`,
        });
      }

      // Verify admission exists and is active/pending
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

      if (admission.status !== 'active' && admission.status !== 'pending') {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: `Cannot assign bed to admission with status: ${admission.status}`,
        });
      }

      // If resident has existing bed, release it
      if (admission.bed_id && admission.bed_id !== input.bedId) {
        await db
          .update(beds)
          .set({
            status: 'available',
            updated_at: new Date(),
            updated_by: ctx.user!.id,
          })
          .where(eq(beds.id, admission.bed_id));

        // Record transfer
        await db
          .insert(bedTransfers)
          .values({
            org_id: admission.org_id,
            resident_id: admission.resident_id,
            admission_id: admission.id,
            from_bed_id: admission.bed_id,
            to_bed_id: input.bedId,
            transfer_date: new Date(),
            reason: 'Bed assignment change',
            approved_by: ctx.user!.id,
            created_by: ctx.user!.id,
          });
      }

      // Update admission with bed assignment
      const [updatedAdmission] = await db
        .update(admissions)
        .set({
          bed_id: input.bedId,
          updated_at: new Date(),
          updated_by: ctx.user!.id,
        })
        .where(eq(admissions.id, input.admissionId))
        .returning();

      // Update bed status to occupied
      await db
        .update(beds)
        .set({
          status: 'occupied',
          updated_at: new Date(),
          updated_by: ctx.user!.id,
        })
        .where(eq(beds.id, input.bedId));

      return updatedAdmission;
    }),

  /**
   * Transfer resident between beds
   * OCC-04: Bed transfer
   */
  transferBed: protectedProcedure
    .input(z.object({
      admissionId: z.string().uuid(),
      fromBedId: z.string().uuid(),
      toBedId: z.string().uuid(),
      reason: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Verify from bed matches current assignment
      const [admission] = await db
        .select()
        .from(admissions)
        .where(
          and(
            eq(admissions.id, input.admissionId),
            eq(admissions.status, 'active'),
            isNull(admissions.deleted_at)
          )
        )
        .limit(1);

      if (!admission) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Active admission not found' });
      }

      if (admission.bed_id !== input.fromBedId) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Resident is not currently assigned to the specified from-bed',
        });
      }

      // Verify to bed is available
      const [toBed] = await db
        .select()
        .from(beds)
        .where(
          and(
            eq(beds.id, input.toBedId),
            isNull(beds.deleted_at)
          )
        )
        .limit(1);

      if (!toBed) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Destination bed not found' });
      }

      if (toBed.status !== 'available' && toBed.status !== 'reserved') {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: `Destination bed is not available (current status: ${toBed.status})`,
        });
      }

      // Record transfer
      const [transfer] = await db
        .insert(bedTransfers)
        .values({
          org_id: admission.org_id,
          resident_id: admission.resident_id,
          admission_id: admission.id,
          from_bed_id: input.fromBedId,
          to_bed_id: input.toBedId,
          transfer_date: new Date(),
          reason: input.reason,
          notes: input.notes,
          approved_by: ctx.user!.id,
          created_by: ctx.user!.id,
        })
        .returning();

      // Release old bed
      await db
        .update(beds)
        .set({
          status: 'available',
          updated_at: new Date(),
          updated_by: ctx.user!.id,
        })
        .where(eq(beds.id, input.fromBedId));

      // Occupy new bed
      await db
        .update(beds)
        .set({
          status: 'occupied',
          updated_at: new Date(),
          updated_by: ctx.user!.id,
        })
        .where(eq(beds.id, input.toBedId));

      // Update admission
      await db
        .update(admissions)
        .set({
          bed_id: input.toBedId,
          updated_at: new Date(),
          updated_by: ctx.user!.id,
        })
        .where(eq(admissions.id, input.admissionId));

      return transfer;
    }),

  /**
   * Get transfer history for a resident
   */
  getTransferHistory: protectedProcedure
    .input(z.object({
      residentId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      const transfers = await db
        .select({
          id: bedTransfers.id,
          from_bed_id: bedTransfers.from_bed_id,
          to_bed_id: bedTransfers.to_bed_id,
          transfer_date: bedTransfers.transfer_date,
          reason: bedTransfers.reason,
          notes: bedTransfers.notes,
          created_at: bedTransfers.created_at,
        })
        .from(bedTransfers)
        .where(eq(bedTransfers.resident_id, input.residentId))
        .orderBy(desc(bedTransfers.transfer_date));

      return transfers;
    }),

  /**
   * List waitlist entries
   */
  listWaitlist: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      houseId: z.string().uuid().optional(),
      status: z.enum(['new', 'contacted', 'qualified', 'touring', 'applied', 'accepted', 'deposit_pending', 'converted', 'lost']).optional(),
    }))
    .query(async ({ input }) => {
      const conditions = [
        eq(waitlistEntries.org_id, input.orgId),
        isNull(waitlistEntries.removed_at),
      ];

      if (input.houseId) {
        conditions.push(eq(waitlistEntries.house_id, input.houseId));
      }
      if (input.status) {
        conditions.push(eq(waitlistEntries.status, input.status));
      }

      const entries = await db
        .select({
          id: waitlistEntries.id,
          resident_id: waitlistEntries.resident_id,
          house_id: waitlistEntries.house_id,
          status: waitlistEntries.status,
          priority: waitlistEntries.priority,
          requested_move_in_date: waitlistEntries.requested_move_in_date,
          added_at: waitlistEntries.added_at,
          notes: waitlistEntries.notes,
          resident_first_name: residents.first_name,
          resident_last_name: residents.last_name,
          house_name: houses.name,
        })
        .from(waitlistEntries)
        .innerJoin(residents, eq(waitlistEntries.resident_id, residents.id))
        .leftJoin(houses, eq(waitlistEntries.house_id, houses.id))
        .where(and(...conditions))
        .orderBy(
          sql`case ${waitlistEntries.priority} when 'urgent' then 1 when 'high' then 2 when 'normal' then 3 when 'low' then 4 else 5 end`,
          asc(waitlistEntries.added_at)
        );

      return entries;
    }),

  /**
   * Add to waitlist
   */
  addToWaitlist: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      residentId: z.string().uuid(),
      houseId: z.string().uuid().optional(),
      priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
      requestedMoveInDate: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Check if already on waitlist
      const [existing] = await db
        .select()
        .from(waitlistEntries)
        .where(
          and(
            eq(waitlistEntries.resident_id, input.residentId),
            isNull(waitlistEntries.removed_at)
          )
        )
        .limit(1);

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Resident is already on the waitlist',
        });
      }

      const [entry] = await db
        .insert(waitlistEntries)
        .values({
          org_id: input.orgId,
          resident_id: input.residentId,
          house_id: input.houseId,
          priority: input.priority,
          requested_move_in_date: input.requestedMoveInDate,
          notes: input.notes,
          created_by: ctx.user!.id,
        })
        .returning();

      return entry;
    }),

  /**
   * Update waitlist entry
   */
  updateWaitlistEntry: protectedProcedure
    .input(z.object({
      entryId: z.string().uuid(),
      houseId: z.string().uuid().nullable().optional(),
      priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
      status: z.enum(['new', 'contacted', 'qualified', 'touring', 'applied', 'accepted', 'deposit_pending', 'converted', 'lost']).optional(),
      requestedMoveInDate: z.string().nullable().optional(),
      notes: z.string().nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { entryId, requestedMoveInDate, ...updates } = input;

      const [entry] = await db
        .update(waitlistEntries)
        .set({
          ...updates,
          requested_move_in_date: requestedMoveInDate,
          updated_at: new Date(),
          updated_by: ctx.user!.id,
        })
        .where(eq(waitlistEntries.id, entryId))
        .returning();

      return entry;
    }),

  /**
   * Remove from waitlist
   */
  removeFromWaitlist: protectedProcedure
    .input(z.object({
      entryId: z.string().uuid(),
      reason: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const [entry] = await db
        .update(waitlistEntries)
        .set({
          removed_at: new Date(),
          removal_reason: input.reason,
          updated_at: new Date(),
          updated_by: ctx.user!.id,
        })
        .where(eq(waitlistEntries.id, input.entryId))
        .returning();

      return entry;
    }),

  /**
   * Process move-out
   * OCC-08: Move-out processing
   */
  processMoveOut: protectedProcedure
    .input(z.object({
      admissionId: z.string().uuid(),
      dischargeDate: z.string(),
      dischargeType: z.enum(['successful_completion', 'voluntary', 'involuntary', 'transfer', 'other']),
      dischargeReason: z.string().optional(),
      dischargeNotes: z.string().optional(),
      aftercarePlan: z.string().optional(),
      securityDepositReturned: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      // Get admission
      const [admission] = await db
        .select()
        .from(admissions)
        .where(
          and(
            eq(admissions.id, input.admissionId),
            eq(admissions.status, 'active'),
            isNull(admissions.deleted_at)
          )
        )
        .limit(1);

      if (!admission) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Active admission not found' });
      }

      // Create discharge record
      const [discharge] = await db
        .insert(discharges)
        .values({
          org_id: admission.org_id,
          admission_id: admission.id,
          resident_id: admission.resident_id,
          discharge_date: input.dischargeDate,
          discharge_type: input.dischargeType,
          discharge_reason: input.dischargeReason,
          discharge_notes: input.dischargeNotes,
          aftercare_plan: input.aftercarePlan,
          security_deposit_returned: input.securityDepositReturned,
          created_by: ctx.user!.id,
        })
        .returning();

      // Update admission status
      await db
        .update(admissions)
        .set({
          status: 'completed',
          actual_discharge_date: input.dischargeDate,
          discharge_reason: input.dischargeReason,
          updated_at: new Date(),
          updated_by: ctx.user!.id,
        })
        .where(eq(admissions.id, input.admissionId));

      // Release bed if assigned
      if (admission.bed_id) {
        await db
          .update(beds)
          .set({
            status: 'available',
            updated_at: new Date(),
            updated_by: ctx.user!.id,
          })
          .where(eq(beds.id, admission.bed_id));
      }

      return discharge;
    }),

  /**
   * Get occupancy trends over time
   * OCC-06: Capacity reporting
   */
  getOccupancyTrends: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      propertyId: z.string().uuid().optional(),
      houseId: z.string().uuid().optional(),
      days: z.number().int().min(7).max(365).default(30),
    }))
    .query(async ({ input }) => {
      // For trends, we calculate based on admission/discharge dates
      // This is a simplified version - a production system would use a time-series approach
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);

      // Get house IDs matching filters
      const houseConditions = [
        eq(houses.org_id, input.orgId),
        isNull(houses.deleted_at),
      ];
      if (input.propertyId) {
        houseConditions.push(eq(houses.property_id, input.propertyId));
      }
      if (input.houseId) {
        houseConditions.push(eq(houses.id, input.houseId));
      }

      const matchingHouses = await db
        .select({
          id: houses.id,
          capacity: houses.capacity,
        })
        .from(houses)
        .where(and(...houseConditions));

      const totalCapacity = matchingHouses.reduce((sum, h) => sum + h.capacity, 0);
      const houseIds = matchingHouses.map(h => h.id);

      if (houseIds.length === 0) {
        return {
          capacity: 0,
          data: [],
        };
      }

      // Get admissions in the period
      const recentAdmissions = await db
        .select({
          admission_date: admissions.admission_date,
          actual_discharge_date: admissions.actual_discharge_date,
          status: admissions.status,
        })
        .from(admissions)
        .where(
          and(
            inArray(admissions.house_id, houseIds),
            isNull(admissions.deleted_at),
            or(
              gte(admissions.admission_date, startDate.toISOString().split('T')[0]),
              and(
                eq(admissions.status, 'active'),
                isNull(admissions.actual_discharge_date)
              )
            )
          )
        );

      // Generate daily data points (simplified - just current count for now)
      // A real implementation would reconstruct historical state
      const currentOccupied = recentAdmissions.filter(a => a.status === 'active').length;

      return {
        capacity: totalCapacity,
        current_occupancy: currentOccupied,
        occupancy_rate: totalCapacity > 0 ? Math.round((currentOccupied / totalCapacity) * 100) : 0,
        period_days: input.days,
      };
    }),

  /**
   * Get available beds for assignment
   */
  getAvailableBeds: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      houseId: z.string().uuid().optional(),
      genderRestriction: z.enum(['male', 'female', 'coed']).optional(),
    }))
    .query(async ({ input }) => {
      const houseConditions = [
        eq(houses.org_id, input.orgId),
        isNull(houses.deleted_at),
      ];

      if (input.houseId) {
        houseConditions.push(eq(houses.id, input.houseId));
      }
      if (input.genderRestriction) {
        houseConditions.push(
          or(
            eq(houses.gender_restriction, input.genderRestriction),
            eq(houses.gender_restriction, 'coed'),
            isNull(houses.gender_restriction)
          )!
        );
      }

      const availableBeds = await db
        .select({
          bed_id: beds.id,
          bed_name: beds.name,
          bed_status: beds.status,
          room_id: rooms.id,
          room_name: rooms.name,
          room_floor: rooms.floor,
          house_id: houses.id,
          house_name: houses.name,
          property_id: properties.id,
          property_name: properties.name,
          gender_restriction: houses.gender_restriction,
        })
        .from(beds)
        .innerJoin(rooms, eq(beds.room_id, rooms.id))
        .innerJoin(houses, eq(rooms.house_id, houses.id))
        .innerJoin(properties, eq(houses.property_id, properties.id))
        .where(
          and(
            ...houseConditions,
            or(eq(beds.status, 'available'), eq(beds.status, 'reserved')),
            isNull(beds.deleted_at),
            isNull(rooms.deleted_at)
          )
        )
        .orderBy(properties.name, houses.name, rooms.name, beds.name);

      return availableBeds;
    }),
});

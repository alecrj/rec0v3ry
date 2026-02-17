/**
 * Organization Router
 * Handles organization management and settings
 */

import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { db } from '../db/client';
import { organizations, properties, houses, rooms, beds } from '../db/schema/orgs';
import { eq, and, isNull, sql } from 'drizzle-orm';

export const orgRouter = router({
  /**
   * Get current organization details
   * Permission: org:read
   */
  getById: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
    }))
    .query(async ({ input, ctx }) => {
      const conditions = [
        eq(organizations.id, input.orgId),
        isNull(organizations.deleted_at),
      ];

      const [org] = await db
        .select()
        .from(organizations)
        .where(and(...conditions))
        .limit(1);

      if (!org) {
        throw new Error('Organization not found');
      }

      return org;
    }),

  /**
   * Update organization settings
   * Permission: org:update
   */
  update: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      name: z.string().optional(),
      settings: z.record(z.string(), z.any()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) {
        throw new Error('User not authenticated');
      }

      const [updated] = await db
        .update(organizations)
        .set({
          name: input.name,
          settings: input.settings,
          updated_at: new Date(),
          updated_by: ctx.user!.id,
        })
        .where(eq(organizations.id, input.orgId))
        .returning();

      return updated;
    }),

  /**
   * List properties with house counts
   * Permission: property:read
   */
  listProperties: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      const result = await db
        .select({
          id: properties.id,
          name: properties.name,
          address_line1: properties.address_line1,
          address_line2: properties.address_line2,
          city: properties.city,
          state: properties.state,
          zip: properties.zip,
          phone: properties.phone,
          email: properties.email,
          created_at: properties.created_at,
          house_count: sql<number>`count(${houses.id})::int`,
        })
        .from(properties)
        .leftJoin(
          houses,
          and(
            eq(houses.property_id, properties.id),
            isNull(houses.deleted_at)
          )
        )
        .where(
          and(
            eq(properties.org_id, input.orgId),
            isNull(properties.deleted_at)
          )
        )
        .groupBy(properties.id);

      return result;
    }),

  /**
   * Create property
   * Permission: property:create
   */
  createProperty: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      name: z.string(),
      address_line1: z.string(),
      address_line2: z.string().optional(),
      city: z.string(),
      state: z.string(),
      zip: z.string(),
      phone: z.string().optional(),
      email: z.string().email().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const [property] = await db
        .insert(properties)
        .values({
          org_id: input.orgId,
          name: input.name,
          address_line1: input.address_line1,
          address_line2: input.address_line2,
          city: input.city,
          state: input.state,
          zip: input.zip,
          phone: input.phone,
          email: input.email,
          created_by: ctx.user!.id,
        })
        .returning();

      return property;
    }),

  /**
   * List houses with room/bed counts and occupancy
   * Permission: house:read
   */
  listHouses: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      propertyId: z.string().uuid().optional(),
    }))
    .query(async ({ input }) => {
      const conditions = [
        eq(houses.org_id, input.orgId),
        isNull(houses.deleted_at),
      ];

      if (input.propertyId) {
        conditions.push(eq(houses.property_id, input.propertyId));
      }

      const result = await db
        .select({
          id: houses.id,
          property_id: houses.property_id,
          name: houses.name,
          capacity: houses.capacity,
          gender_restriction: houses.gender_restriction,
          address_line1: houses.address_line1,
          city: houses.city,
          state: houses.state,
          zip: houses.zip,
          created_at: houses.created_at,
          room_count: sql<number>`count(distinct ${rooms.id})::int`,
          bed_count: sql<number>`count(distinct ${beds.id})::int`,
          occupied_beds: sql<number>`count(distinct case when ${beds.status} = 'occupied' then ${beds.id} end)::int`,
        })
        .from(houses)
        .leftJoin(
          rooms,
          and(
            eq(rooms.house_id, houses.id),
            isNull(rooms.deleted_at)
          )
        )
        .leftJoin(
          beds,
          and(
            eq(beds.room_id, rooms.id),
            isNull(beds.deleted_at)
          )
        )
        .where(and(...conditions))
        .groupBy(houses.id);

      return result;
    }),

  /**
   * Create house
   * Permission: house:create
   */
  createHouse: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      propertyId: z.string().uuid(),
      name: z.string(),
      capacity: z.number().int().positive(),
      genderRestriction: z.enum(['male', 'female', 'coed']).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const [house] = await db
        .insert(houses)
        .values({
          org_id: input.orgId,
          property_id: input.propertyId,
          name: input.name,
          capacity: input.capacity,
          gender_restriction: input.genderRestriction,
          created_by: ctx.user!.id,
        })
        .returning();

      return house;
    }),

  /**
   * List rooms for a house with bed details
   */
  listRooms: protectedProcedure
    .input(z.object({
      houseId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      const result = await db
        .select({
          id: rooms.id,
          house_id: rooms.house_id,
          name: rooms.name,
          floor: rooms.floor,
          capacity: rooms.capacity,
          created_at: rooms.created_at,
          bed_count: sql<number>`count(${beds.id})::int`,
          available_beds: sql<number>`count(case when ${beds.status} = 'available' then 1 end)::int`,
        })
        .from(rooms)
        .leftJoin(
          beds,
          and(
            eq(beds.room_id, rooms.id),
            isNull(beds.deleted_at)
          )
        )
        .where(
          and(
            eq(rooms.house_id, input.houseId),
            isNull(rooms.deleted_at)
          )
        )
        .groupBy(rooms.id);

      return result;
    }),

  /**
   * Create room
   */
  createRoom: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      houseId: z.string().uuid(),
      name: z.string(),
      floor: z.number().int().optional(),
      capacity: z.number().int().positive(),
    }))
    .mutation(async ({ input, ctx }) => {
      const [room] = await db
        .insert(rooms)
        .values({
          org_id: input.orgId,
          house_id: input.houseId,
          name: input.name,
          floor: input.floor,
          capacity: input.capacity,
          created_by: ctx.user!.id,
        })
        .returning();

      return room;
    }),

  /**
   * List beds for a room
   */
  listBeds: protectedProcedure
    .input(z.object({
      roomId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      const result = await db
        .select()
        .from(beds)
        .where(
          and(
            eq(beds.room_id, input.roomId),
            isNull(beds.deleted_at)
          )
        );

      return result;
    }),

  /**
   * Create bed
   */
  createBed: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      roomId: z.string().uuid(),
      name: z.string(),
      status: z.enum(['available', 'occupied', 'reserved', 'maintenance', 'out_of_service']).default('available'),
    }))
    .mutation(async ({ input, ctx }) => {
      const [bed] = await db
        .insert(beds)
        .values({
          org_id: input.orgId,
          room_id: input.roomId,
          name: input.name,
          status: input.status,
          created_by: ctx.user!.id,
        })
        .returning();

      return bed;
    }),

  /**
   * Update bed status
   */
  updateBedStatus: protectedProcedure
    .input(z.object({
      bedId: z.string().uuid(),
      status: z.enum(['available', 'occupied', 'reserved', 'maintenance', 'out_of_service']),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const [bed] = await db
        .update(beds)
        .set({
          status: input.status,
          notes: input.notes,
          updated_at: new Date(),
          updated_by: ctx.user!.id,
        })
        .where(eq(beds.id, input.bedId))
        .returning();

      return bed;
    }),
});

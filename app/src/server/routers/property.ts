/**
 * Property Router
 * Full CRUD for properties and houses
 *
 * Sprint 9-10: Org + Occupancy
 * Source: docs/06_ROADMAP.md Sprint 5 (ORG-05, ORG-06)
 */

import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { db } from '../db/client';
import { organizations, properties, houses, rooms, beds } from '../db/schema/orgs';
import { admissions } from '../db/schema/residents';
import { eq, and, isNull, sql, desc, count } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

export const propertyRouter = router({
  /**
   * Get property by ID with house count and occupancy stats
   */
  getById: protectedProcedure
    .input(z.object({
      propertyId: z.string().uuid(),
    }))
    .query(async ({ input, ctx }) => {
      const [property] = await db
        .select({
          id: properties.id,
          org_id: properties.org_id,
          name: properties.name,
          address_line1: properties.address_line1,
          address_line2: properties.address_line2,
          city: properties.city,
          state: properties.state,
          zip: properties.zip,
          phone: properties.phone,
          email: properties.email,
          settings: properties.settings,
          created_at: properties.created_at,
          updated_at: properties.updated_at,
        })
        .from(properties)
        .where(
          and(
            eq(properties.id, input.propertyId),
            isNull(properties.deleted_at)
          )
        )
        .limit(1);

      if (!property) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Property not found',
        });
      }

      // Get house stats
      const houseStats = await db
        .select({
          total_houses: sql<number>`count(distinct ${houses.id})::int`,
          total_capacity: sql<number>`coalesce(sum(${houses.capacity}), 0)::int`,
        })
        .from(houses)
        .where(
          and(
            eq(houses.property_id, input.propertyId),
            isNull(houses.deleted_at)
          )
        );

      // Get bed stats
      const bedStats = await db
        .select({
          total_beds: sql<number>`count(${beds.id})::int`,
          available_beds: sql<number>`count(case when ${beds.status} = 'available' then 1 end)::int`,
          occupied_beds: sql<number>`count(case when ${beds.status} = 'occupied' then 1 end)::int`,
          reserved_beds: sql<number>`count(case when ${beds.status} = 'reserved' then 1 end)::int`,
          maintenance_beds: sql<number>`count(case when ${beds.status} = 'maintenance' then 1 end)::int`,
        })
        .from(beds)
        .innerJoin(rooms, eq(beds.room_id, rooms.id))
        .innerJoin(houses, eq(rooms.house_id, houses.id))
        .where(
          and(
            eq(houses.property_id, input.propertyId),
            isNull(beds.deleted_at),
            isNull(rooms.deleted_at),
            isNull(houses.deleted_at)
          )
        );

      return {
        ...property,
        stats: {
          total_houses: houseStats[0]?.total_houses ?? 0,
          total_capacity: houseStats[0]?.total_capacity ?? 0,
          total_beds: bedStats[0]?.total_beds ?? 0,
          available_beds: bedStats[0]?.available_beds ?? 0,
          occupied_beds: bedStats[0]?.occupied_beds ?? 0,
          reserved_beds: bedStats[0]?.reserved_beds ?? 0,
          maintenance_beds: bedStats[0]?.maintenance_beds ?? 0,
          occupancy_rate: bedStats[0]?.total_beds
            ? Math.round((bedStats[0].occupied_beds / bedStats[0].total_beds) * 100)
            : 0,
        },
      };
    }),

  /**
   * List all properties with stats
   */
  list: protectedProcedure
    .query(async ({ ctx }) => {
      const orgId = (ctx as any).orgId as string;

      const result = await db
        .select({
          id: properties.id,
          org_id: properties.org_id,
          name: properties.name,
          address_line1: properties.address_line1,
          address_line2: properties.address_line2,
          city: properties.city,
          state: properties.state,
          zip: properties.zip,
          phone: properties.phone,
          email: properties.email,
          created_at: properties.created_at,
          house_count: sql<number>`count(distinct ${houses.id})::int`,
          total_capacity: sql<number>`coalesce(sum(${houses.capacity}), 0)::int`,
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
            eq(properties.org_id, orgId),
            isNull(properties.deleted_at)
          )
        )
        .groupBy(properties.id)
        .orderBy(desc(properties.created_at));

      return result;
    }),

  /**
   * Create property
   */
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      address_line1: z.string().min(1),
      address_line2: z.string().optional(),
      city: z.string().min(1),
      state: z.string().min(2).max(10),
      zip: z.string().min(3).max(10),
      phone: z.string().optional(),
      email: z.string().email().optional(),
      settings: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const orgId = (ctx as any).orgId as string;

      console.log('[property.create] Starting:', {
        name: input.name,
        orgId,
        userId: ctx.user?.id,
        state: input.state,
        zip: input.zip,
      });

      const [property] = await db
        .insert(properties)
        .values({
          org_id: orgId,
          name: input.name,
          address_line1: input.address_line1,
          address_line2: input.address_line2,
          city: input.city,
          state: input.state,
          zip: input.zip,
          phone: input.phone,
          email: input.email,
          settings: input.settings,
          created_by: ctx.user!.id,
        })
        .returning();

      console.log('[property.create] Success:', property.id);
      return property;
    }),

  /**
   * Update property
   */
  update: protectedProcedure
    .input(z.object({
      propertyId: z.string().uuid(),
      name: z.string().min(1).max(255).optional(),
      address_line1: z.string().min(1).optional(),
      address_line2: z.string().nullable().optional(),
      city: z.string().min(1).optional(),
      state: z.string().min(2).max(2).optional(),
      zip: z.string().min(5).max(10).optional(),
      phone: z.string().nullable().optional(),
      email: z.string().email().nullable().optional(),
      settings: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { propertyId, ...updates } = input;

      const [property] = await db
        .update(properties)
        .set({
          ...updates,
          updated_at: new Date(),
          updated_by: ctx.user!.id,
        })
        .where(
          and(
            eq(properties.id, propertyId),
            isNull(properties.deleted_at)
          )
        )
        .returning();

      if (!property) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Property not found',
        });
      }

      return property;
    }),

  /**
   * Archive property (soft delete)
   */
  archive: protectedProcedure
    .input(z.object({
      propertyId: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Check for active houses
      const [activeHouses] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(houses)
        .where(
          and(
            eq(houses.property_id, input.propertyId),
            isNull(houses.deleted_at)
          )
        );

      if (activeHouses && activeHouses.count > 0) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: `Cannot archive property with ${activeHouses.count} active house(s). Archive or delete houses first.`,
        });
      }

      const [property] = await db
        .update(properties)
        .set({
          deleted_at: new Date(),
          updated_by: ctx.user!.id,
        })
        .where(eq(properties.id, input.propertyId))
        .returning();

      return property;
    }),

  /**
   * Get house by ID with full details
   */
  getHouse: protectedProcedure
    .input(z.object({
      houseId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      const [house] = await db
        .select({
          id: houses.id,
          org_id: houses.org_id,
          property_id: houses.property_id,
          name: houses.name,
          capacity: houses.capacity,
          bathrooms: houses.bathrooms,
          gender_restriction: houses.gender_restriction,
          address_line1: houses.address_line1,
          address_line2: houses.address_line2,
          city: houses.city,
          state: houses.state,
          zip: houses.zip,
          phone: houses.phone,
          settings: houses.settings,
          created_at: houses.created_at,
          updated_at: houses.updated_at,
          property_name: properties.name,
        })
        .from(houses)
        .innerJoin(properties, eq(houses.property_id, properties.id))
        .where(
          and(
            eq(houses.id, input.houseId),
            isNull(houses.deleted_at)
          )
        )
        .limit(1);

      if (!house) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'House not found',
        });
      }

      // Get room/bed stats
      const bedStats = await db
        .select({
          total_rooms: sql<number>`count(distinct ${rooms.id})::int`,
          total_beds: sql<number>`count(${beds.id})::int`,
          available_beds: sql<number>`count(case when ${beds.status} = 'available' then 1 end)::int`,
          occupied_beds: sql<number>`count(case when ${beds.status} = 'occupied' then 1 end)::int`,
          reserved_beds: sql<number>`count(case when ${beds.status} = 'reserved' then 1 end)::int`,
          maintenance_beds: sql<number>`count(case when ${beds.status} = 'maintenance' then 1 end)::int`,
        })
        .from(rooms)
        .leftJoin(beds, and(eq(beds.room_id, rooms.id), isNull(beds.deleted_at)))
        .where(
          and(
            eq(rooms.house_id, input.houseId),
            isNull(rooms.deleted_at)
          )
        );

      return {
        ...house,
        stats: {
          total_rooms: bedStats[0]?.total_rooms ?? 0,
          total_beds: bedStats[0]?.total_beds ?? 0,
          available_beds: bedStats[0]?.available_beds ?? 0,
          occupied_beds: bedStats[0]?.occupied_beds ?? 0,
          reserved_beds: bedStats[0]?.reserved_beds ?? 0,
          maintenance_beds: bedStats[0]?.maintenance_beds ?? 0,
          occupancy_rate: bedStats[0]?.total_beds
            ? Math.round((bedStats[0].occupied_beds / bedStats[0].total_beds) * 100)
            : 0,
        },
      };
    }),

  /**
   * Update house
   */
  updateHouse: protectedProcedure
    .input(z.object({
      houseId: z.string().uuid(),
      name: z.string().min(1).max(255).optional(),
      capacity: z.number().int().positive().optional(),
      gender_restriction: z.enum(['male', 'female', 'coed']).nullable().optional(),
      address_line1: z.string().nullable().optional(),
      address_line2: z.string().nullable().optional(),
      city: z.string().nullable().optional(),
      state: z.string().nullable().optional(),
      zip: z.string().nullable().optional(),
      phone: z.string().nullable().optional(),
      settings: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { houseId, ...updates } = input;

      const [house] = await db
        .update(houses)
        .set({
          ...updates,
          updated_at: new Date(),
          updated_by: ctx.user!.id,
        })
        .where(
          and(
            eq(houses.id, houseId),
            isNull(houses.deleted_at)
          )
        )
        .returning();

      if (!house) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'House not found',
        });
      }

      return house;
    }),

  /**
   * Archive house (soft delete)
   */
  archiveHouse: protectedProcedure
    .input(z.object({
      houseId: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Check for active residents
      const [activeAdmissions] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(admissions)
        .where(
          and(
            eq(admissions.house_id, input.houseId),
            eq(admissions.status, 'active'),
            isNull(admissions.deleted_at)
          )
        );

      if (activeAdmissions && activeAdmissions.count > 0) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: `Cannot archive house with ${activeAdmissions.count} active resident(s). Transfer or discharge residents first.`,
        });
      }

      const [house] = await db
        .update(houses)
        .set({
          deleted_at: new Date(),
          updated_by: ctx.user!.id,
        })
        .where(eq(houses.id, input.houseId))
        .returning();

      return house;
    }),

  /**
   * List houses for a property with stats
   */
  listHouses: protectedProcedure
    .input(z.object({
      propertyId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      const houseList = await db
        .select({
          id: houses.id,
          name: houses.name,
          capacity: houses.capacity,
          bathrooms: houses.bathrooms,
          gender_restriction: houses.gender_restriction,
          address_line1: houses.address_line1,
          city: houses.city,
          state: houses.state,
          zip: houses.zip,
          created_at: houses.created_at,
        })
        .from(houses)
        .where(
          and(
            eq(houses.property_id, input.propertyId),
            isNull(houses.deleted_at)
          )
        )
        .orderBy(houses.name);

      // Get stats for each house
      const houseIds = houseList.map(h => h.id);
      if (houseIds.length === 0) return [];

      // Get room and bed counts for each house
      const houseStats = await Promise.all(
        houseList.map(async (house) => {
          const stats = await db
            .select({
              room_count: sql<number>`count(distinct ${rooms.id})::int`,
              bed_count: sql<number>`count(${beds.id})::int`,
              available_beds: sql<number>`count(case when ${beds.status} = 'available' then 1 end)::int`,
              occupied_beds: sql<number>`count(case when ${beds.status} = 'occupied' then 1 end)::int`,
            })
            .from(rooms)
            .leftJoin(beds, and(eq(beds.room_id, rooms.id), isNull(beds.deleted_at)))
            .where(
              and(
                eq(rooms.house_id, house.id),
                isNull(rooms.deleted_at)
              )
            );

          return {
            ...house,
            room_count: stats[0]?.room_count ?? 0,
            bed_count: stats[0]?.bed_count ?? 0,
            available_beds: stats[0]?.available_beds ?? 0,
            occupied_beds: stats[0]?.occupied_beds ?? 0,
          };
        })
      );

      return houseStats;
    }),

  /**
   * List all houses across all properties in this org (for dropdowns)
   */
  listAllHouses: protectedProcedure
    .query(async ({ ctx }) => {
      const orgId = (ctx as any).orgId as string;

      const houseList = await db
        .select({
          id: houses.id,
          name: houses.name,
          property_name: properties.name,
          gender_restriction: houses.gender_restriction,
        })
        .from(houses)
        .innerJoin(properties, eq(houses.property_id, properties.id))
        .where(
          and(
            eq(houses.org_id, orgId),
            isNull(houses.deleted_at)
          )
        )
        .orderBy(properties.name, houses.name);

      return houseList;
    }),

  /**
   * Create house with optional rooms and beds
   */
  createHouseWithRooms: protectedProcedure
    .input(z.object({
      propertyId: z.string().uuid(),
      name: z.string().min(1),
      gender_restriction: z.enum(['male', 'female', 'coed']).optional(),
      bathrooms: z.number().int().min(0).optional(),
      address_line1: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zip: z.string().optional(),
      rooms: z.array(z.object({
        name: z.string(),
        floor: z.number().int().optional(),
        beds: z.array(z.object({
          name: z.string(),
        })),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      const orgId = (ctx as any).orgId as string;

      // Compute capacity from total beds
      const totalBeds = input.rooms.reduce((sum, r) => sum + r.beds.length, 0);

      console.log('[createHouseWithRooms] Starting:', {
        propertyId: input.propertyId,
        name: input.name,
        orgId,
        userId: ctx.user?.id,
        roomCount: input.rooms.length,
        totalBeds,
      });

      // Create house
      const [house] = await db
        .insert(houses)
        .values({
          org_id: orgId,
          property_id: input.propertyId,
          name: input.name,
          capacity: totalBeds,
          bathrooms: input.bathrooms,
          gender_restriction: input.gender_restriction,
          address_line1: input.address_line1,
          city: input.city,
          state: input.state,
          zip: input.zip,
          created_by: ctx.user!.id,
        })
        .returning();

      console.log('[createHouseWithRooms] House created:', house.id);

      // Create rooms and beds
      for (const roomInput of input.rooms) {
        const [room] = await db
          .insert(rooms)
          .values({
            org_id: orgId,
            house_id: house.id,
            name: roomInput.name,
            floor: roomInput.floor,
            capacity: roomInput.beds.length,
            created_by: ctx.user!.id,
          })
          .returning();

        if (roomInput.beds.length > 0) {
          await db
            .insert(beds)
            .values(
              roomInput.beds.map((bed) => ({
                org_id: orgId,
                room_id: room.id,
                name: bed.name,
                status: 'available' as const,
                created_by: ctx.user!.id,
              }))
            );
        }
      }

      console.log('[createHouseWithRooms] Complete:', house.id, input.rooms.length, 'rooms');
      return house;
    }),

  /**
   * Get rooms for a house with bed details
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
        })
        .from(rooms)
        .where(
          and(
            eq(rooms.house_id, input.houseId),
            isNull(rooms.deleted_at)
          )
        )
        .orderBy(rooms.floor, rooms.name);

      // Get beds for each room
      const roomIds = result.map(r => r.id);
      if (roomIds.length === 0) return [];

      const allBeds = await db
        .select()
        .from(beds)
        .where(
          and(
            sql`${beds.room_id} IN ${roomIds}`,
            isNull(beds.deleted_at)
          )
        )
        .orderBy(beds.name);

      // Group beds by room
      const bedsByRoom = allBeds.reduce((acc, bed) => {
        if (!acc[bed.room_id]) acc[bed.room_id] = [];
        acc[bed.room_id].push(bed);
        return acc;
      }, {} as Record<string, typeof allBeds>);

      return result.map(room => ({
        ...room,
        beds: bedsByRoom[room.id] ?? [],
        available_beds: (bedsByRoom[room.id] ?? []).filter(b => b.status === 'available').length,
        occupied_beds: (bedsByRoom[room.id] ?? []).filter(b => b.status === 'occupied').length,
      }));
    }),

  /**
   * Create room
   */
  createRoom: protectedProcedure
    .input(z.object({
      houseId: z.string().uuid(),
      name: z.string().min(1),
      floor: z.number().int().optional(),
      capacity: z.number().int().positive(),
    }))
    .mutation(async ({ input, ctx }) => {
      const orgId = (ctx as any).orgId as string;

      const [room] = await db
        .insert(rooms)
        .values({
          org_id: orgId,
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
   * Update room
   */
  updateRoom: protectedProcedure
    .input(z.object({
      roomId: z.string().uuid(),
      name: z.string().min(1).optional(),
      floor: z.number().int().nullable().optional(),
      capacity: z.number().int().positive().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { roomId, ...updates } = input;

      const [room] = await db
        .update(rooms)
        .set({
          ...updates,
          updated_at: new Date(),
          updated_by: ctx.user!.id,
        })
        .where(
          and(
            eq(rooms.id, roomId),
            isNull(rooms.deleted_at)
          )
        )
        .returning();

      return room;
    }),

  /**
   * Create bed
   */
  createBed: protectedProcedure
    .input(z.object({
      roomId: z.string().uuid(),
      name: z.string().min(1),
      status: z.enum(['available', 'occupied', 'reserved', 'maintenance', 'out_of_service']).default('available'),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const orgId = (ctx as any).orgId as string;

      const [bed] = await db
        .insert(beds)
        .values({
          org_id: orgId,
          room_id: input.roomId,
          name: input.name,
          status: input.status,
          notes: input.notes,
          created_by: ctx.user!.id,
        })
        .returning();

      return bed;
    }),

  /**
   * Update bed
   */
  updateBed: protectedProcedure
    .input(z.object({
      bedId: z.string().uuid(),
      name: z.string().min(1).optional(),
      status: z.enum(['available', 'occupied', 'reserved', 'maintenance', 'out_of_service']).optional(),
      notes: z.string().nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { bedId, ...updates } = input;

      const [bed] = await db
        .update(beds)
        .set({
          ...updates,
          updated_at: new Date(),
          updated_by: ctx.user!.id,
        })
        .where(
          and(
            eq(beds.id, bedId),
            isNull(beds.deleted_at)
          )
        )
        .returning();

      return bed;
    }),
});

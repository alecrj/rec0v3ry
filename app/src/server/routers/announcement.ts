/**
 * Announcement Router
 * House and org-wide announcements with read tracking
 *
 * Sprint 15-16: Messaging
 * Source: docs/06_ROADMAP.md Sprint 17-18 (MSG-03)
 */

import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { db } from '../db/client';
import { announcements } from '../db/schema/messaging';
import { announcementReads } from '../db/schema/messaging-extended';
import { houses } from '../db/schema/orgs';
import { users } from '../db/schema/users';
import { residents } from '../db/schema/residents';
import { eq, and, isNull, sql, desc, or, inArray, gte, lte } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

export const announcementRouter = router({
  /**
   * List announcements for current user
   * MSG-03: House announcements with read tracking
   */
  list: protectedProcedure
    .input(z.object({
      houseId: z.string().uuid().optional(),
      includeExpired: z.boolean().default(false),
      includeDrafts: z.boolean().default(false),
      pinnedOnly: z.boolean().default(false),
      limit: z.number().int().min(1).max(100).default(50),
      offset: z.number().int().min(0).default(0),
    }).optional())
    .query(async ({ input, ctx }) => {
      const userId = ctx.user!.id;
      const orgId = (ctx as any).orgId as string;

      const conditions = [
        eq(announcements.org_id, orgId),
        isNull(announcements.deleted_at),
      ];

      // House filter
      if (input?.houseId) {
        conditions.push(
          or(
            eq(announcements.house_id, input.houseId),
            isNull(announcements.house_id) // Org-wide
          )!
        );
      }

      // Published only (unless includeDrafts)
      if (!input?.includeDrafts) {
        conditions.push(eq(announcements.is_draft, false));
        conditions.push(sql`${announcements.published_at} IS NOT NULL`);
        conditions.push(lte(announcements.published_at, new Date()));
      }

      // Not expired (unless includeExpired)
      if (!input?.includeExpired) {
        conditions.push(
          or(
            isNull(announcements.expires_at),
            gte(announcements.expires_at, new Date())
          )!
        );
      }

      // Pinned only filter
      if (input?.pinnedOnly) {
        conditions.push(eq(announcements.is_pinned, true));
      }

      const result = await db
        .select({
          id: announcements.id,
          house_id: announcements.house_id,
          title: announcements.title,
          content: announcements.content,
          priority: announcements.priority,
          is_pinned: announcements.is_pinned,
          published_at: announcements.published_at,
          expires_at: announcements.expires_at,
          target_roles: announcements.target_roles,
          is_draft: announcements.is_draft,
          created_at: announcements.created_at,
          created_by: announcements.created_by,
          house_name: houses.name,
        })
        .from(announcements)
        .leftJoin(houses, eq(announcements.house_id, houses.id))
        .where(and(...conditions))
        .orderBy(desc(announcements.is_pinned), desc(announcements.published_at))
        .limit(input?.limit ?? 50)
        .offset(input?.offset ?? 0);

      // Get read status for each announcement
      const announcementsWithReadStatus = await Promise.all(
        result.map(async (announcement) => {
          // Check if user has read this announcement
          const [read] = await db
            .select()
            .from(announcementReads)
            .where(
              and(
                eq(announcementReads.announcement_id, announcement.id),
                eq(announcementReads.user_id, userId)
              )
            )
            .limit(1);

          // Get total read count
          const [readCount] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(announcementReads)
            .where(eq(announcementReads.announcement_id, announcement.id));

          return {
            ...announcement,
            isRead: !!read,
            readAt: read?.read_at || null,
            readCount: readCount?.count ?? 0,
            scope: announcement.house_id ? 'house' : 'organization',
          };
        })
      );

      return announcementsWithReadStatus;
    }),

  /**
   * Get announcement by ID
   */
  getById: protectedProcedure
    .input(z.object({
      announcementId: z.string().uuid(),
    }))
    .query(async ({ input, ctx }) => {
      const userId = ctx.user!.id;

      const [announcement] = await db
        .select({
          id: announcements.id,
          org_id: announcements.org_id,
          house_id: announcements.house_id,
          title: announcements.title,
          content: announcements.content,
          priority: announcements.priority,
          is_pinned: announcements.is_pinned,
          published_at: announcements.published_at,
          expires_at: announcements.expires_at,
          target_roles: announcements.target_roles,
          is_draft: announcements.is_draft,
          created_at: announcements.created_at,
          created_by: announcements.created_by,
          house_name: houses.name,
        })
        .from(announcements)
        .leftJoin(houses, eq(announcements.house_id, houses.id))
        .where(
          and(
            eq(announcements.id, input.announcementId),
            isNull(announcements.deleted_at)
          )
        )
        .limit(1);

      if (!announcement) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Announcement not found' });
      }

      // Check if user has read
      const [read] = await db
        .select()
        .from(announcementReads)
        .where(
          and(
            eq(announcementReads.announcement_id, input.announcementId),
            eq(announcementReads.user_id, userId)
          )
        )
        .limit(1);

      // Get all readers
      const readers = await db
        .select({
          user_id: announcementReads.user_id,
          resident_id: announcementReads.resident_id,
          read_at: announcementReads.read_at,
          user_first_name: users.first_name,
          user_last_name: users.last_name,
          resident_first_name: residents.first_name,
          resident_last_name: residents.last_name,
        })
        .from(announcementReads)
        .leftJoin(users, eq(announcementReads.user_id, users.id))
        .leftJoin(residents, eq(announcementReads.resident_id, residents.id))
        .where(eq(announcementReads.announcement_id, input.announcementId))
        .orderBy(desc(announcementReads.read_at));

      return {
        ...announcement,
        isRead: !!read,
        readAt: read?.read_at || null,
        readers: readers.map(r => ({
          userId: r.user_id,
          residentId: r.resident_id,
          name: r.user_first_name
            ? `${r.user_first_name} ${r.user_last_name}`
            : r.resident_first_name
              ? `${r.resident_first_name} ${r.resident_last_name}`
              : 'Unknown',
          readAt: r.read_at,
        })),
      };
    }),

  /**
   * Create announcement
   * MSG-03: Broadcast to all house residents
   */
  create: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      houseId: z.string().uuid().optional(), // Null = org-wide
      title: z.string().min(1).max(255),
      content: z.string().min(1).max(50000),
      priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
      isPinned: z.boolean().default(false),
      publishAt: z.string().optional(), // ISO date - null means publish now
      expiresAt: z.string().optional(), // ISO date
      targetRoles: z.array(z.string()).optional(), // Specific roles to target
      isDraft: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user!.id;

      const [announcement] = await db
        .insert(announcements)
        .values({
          org_id: input.orgId,
          house_id: input.houseId,
          title: input.title,
          content: input.content,
          priority: input.priority,
          is_pinned: input.isPinned,
          published_at: input.isDraft ? null : (input.publishAt ? new Date(input.publishAt) : new Date()),
          expires_at: input.expiresAt ? new Date(input.expiresAt) : null,
          target_roles: input.targetRoles ? JSON.stringify(input.targetRoles) : null,
          is_draft: input.isDraft,
          created_by: userId,
        })
        .returning();

      // TODO: Send push notifications to targeted users (MSG-05)

      return announcement;
    }),

  /**
   * Update announcement
   */
  update: protectedProcedure
    .input(z.object({
      announcementId: z.string().uuid(),
      title: z.string().min(1).max(255).optional(),
      content: z.string().min(1).max(50000).optional(),
      priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
      isPinned: z.boolean().optional(),
      publishAt: z.string().nullable().optional(),
      expiresAt: z.string().nullable().optional(),
      targetRoles: z.array(z.string()).nullable().optional(),
      isDraft: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user!.id;
      const { announcementId, publishAt, expiresAt, targetRoles, isPinned, isDraft, ...rest } = input;

      const updateData: Record<string, unknown> = {
        ...rest,
        is_pinned: isPinned,
        is_draft: isDraft,
        updated_at: new Date(),
        updated_by: userId,
      };

      if (publishAt !== undefined) {
        updateData.published_at = publishAt ? new Date(publishAt) : null;
      }
      if (expiresAt !== undefined) {
        updateData.expires_at = expiresAt ? new Date(expiresAt) : null;
      }
      if (targetRoles !== undefined) {
        updateData.target_roles = targetRoles ? JSON.stringify(targetRoles) : null;
      }

      const [announcement] = await db
        .update(announcements)
        .set(updateData)
        .where(
          and(
            eq(announcements.id, announcementId),
            isNull(announcements.deleted_at)
          )
        )
        .returning();

      if (!announcement) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Announcement not found' });
      }

      return announcement;
    }),

  /**
   * Publish a draft announcement
   */
  publish: protectedProcedure
    .input(z.object({
      announcementId: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user!.id;

      const [announcement] = await db
        .update(announcements)
        .set({
          is_draft: false,
          published_at: new Date(),
          updated_at: new Date(),
          updated_by: userId,
        })
        .where(
          and(
            eq(announcements.id, input.announcementId),
            eq(announcements.is_draft, true),
            isNull(announcements.deleted_at)
          )
        )
        .returning();

      if (!announcement) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Draft announcement not found' });
      }

      // TODO: Send push notifications

      return announcement;
    }),

  /**
   * Delete announcement (soft delete)
   */
  delete: protectedProcedure
    .input(z.object({
      announcementId: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user!.id;

      const [announcement] = await db
        .update(announcements)
        .set({
          deleted_at: new Date(),
          updated_by: userId,
        })
        .where(
          and(
            eq(announcements.id, input.announcementId),
            isNull(announcements.deleted_at)
          )
        )
        .returning();

      if (!announcement) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Announcement not found' });
      }

      return { success: true };
    }),

  /**
   * Mark announcement as read
   * MSG-03: Read tracking
   */
  markRead: protectedProcedure
    .input(z.object({
      announcementId: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user!.id;

      // Get announcement to get org_id
      const [announcement] = await db
        .select({ org_id: announcements.org_id })
        .from(announcements)
        .where(eq(announcements.id, input.announcementId))
        .limit(1);

      if (!announcement) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Announcement not found' });
      }

      // Check if already read
      const [existing] = await db
        .select()
        .from(announcementReads)
        .where(
          and(
            eq(announcementReads.announcement_id, input.announcementId),
            eq(announcementReads.user_id, userId)
          )
        )
        .limit(1);

      if (existing) {
        return { success: true, alreadyRead: true };
      }

      // Mark as read
      await db.insert(announcementReads).values({
        org_id: announcement.org_id,
        announcement_id: input.announcementId,
        user_id: userId,
      });

      return { success: true, alreadyRead: false };
    }),

  /**
   * Get unread announcements count
   */
  getUnreadCount: protectedProcedure
    .input(z.object({
      houseId: z.string().uuid().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      const userId = ctx.user!.id;
      const orgId = (ctx as any).orgId as string;

      // Get all published, non-expired announcements
      const conditions = [
        eq(announcements.org_id, orgId),
        eq(announcements.is_draft, false),
        isNull(announcements.deleted_at),
        sql`${announcements.published_at} IS NOT NULL`,
        lte(announcements.published_at, new Date()),
        or(
          isNull(announcements.expires_at),
          gte(announcements.expires_at, new Date())
        )!,
      ];

      if (input?.houseId) {
        conditions.push(
          or(
            eq(announcements.house_id, input.houseId),
            isNull(announcements.house_id)
          )!
        );
      }

      const allAnnouncements = await db
        .select({ id: announcements.id })
        .from(announcements)
        .where(and(...conditions));

      if (allAnnouncements.length === 0) {
        return { count: 0 };
      }

      // Get read announcements
      const readAnnouncements = await db
        .select({ announcement_id: announcementReads.announcement_id })
        .from(announcementReads)
        .where(
          and(
            eq(announcementReads.user_id, userId),
            inArray(announcementReads.announcement_id, allAnnouncements.map(a => a.id))
          )
        );

      const readIds = new Set(readAnnouncements.map(r => r.announcement_id));
      const unreadCount = allAnnouncements.filter(a => !readIds.has(a.id)).length;

      return { count: unreadCount };
    }),

  /**
   * Pin/unpin announcement
   */
  togglePin: protectedProcedure
    .input(z.object({
      announcementId: z.string().uuid(),
      pinned: z.boolean(),
    }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user!.id;

      const [announcement] = await db
        .update(announcements)
        .set({
          is_pinned: input.pinned,
          updated_at: new Date(),
          updated_by: userId,
        })
        .where(
          and(
            eq(announcements.id, input.announcementId),
            isNull(announcements.deleted_at)
          )
        )
        .returning();

      if (!announcement) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Announcement not found' });
      }

      return { success: true };
    }),

  /**
   * Get announcement stats
   */
  getStats: protectedProcedure
    .input(z.object({
      houseId: z.string().uuid().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      const orgId = (ctx as any).orgId as string;
      const conditions = [
        eq(announcements.org_id, orgId),
        isNull(announcements.deleted_at),
      ];

      if (input?.houseId) {
        conditions.push(
          or(
            eq(announcements.house_id, input.houseId),
            isNull(announcements.house_id)
          )!
        );
      }

      // Total announcements
      const [total] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(announcements)
        .where(and(...conditions, eq(announcements.is_draft, false)));

      // Active announcements
      const [active] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(announcements)
        .where(
          and(
            ...conditions,
            eq(announcements.is_draft, false),
            sql`${announcements.published_at} IS NOT NULL`,
            lte(announcements.published_at, new Date()),
            or(
              isNull(announcements.expires_at),
              gte(announcements.expires_at, new Date())
            )!
          )
        );

      // Drafts
      const [drafts] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(announcements)
        .where(and(...conditions, eq(announcements.is_draft, true)));

      // By priority
      const byPriority = await db
        .select({
          priority: announcements.priority,
          count: sql<number>`count(*)::int`,
        })
        .from(announcements)
        .where(and(...conditions, eq(announcements.is_draft, false)))
        .groupBy(announcements.priority);

      return {
        total: total?.count ?? 0,
        active: active?.count ?? 0,
        drafts: drafts?.count ?? 0,
        byPriority: byPriority.reduce((acc, p) => {
          acc[p.priority ?? 'normal'] = p.count;
          return acc;
        }, {} as Record<string, number>),
      };
    }),
});

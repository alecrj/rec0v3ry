/**
 * Conversation Router
 * Manages conversations: DMs, group chats, house channels
 *
 * Sprint 15-16: Messaging
 * Source: docs/06_ROADMAP.md Sprint 17-18 (MSG-01, MSG-02, MSG-07)
 */

import { router, protectedProcedure, part2Procedure } from '../trpc';
import { z } from 'zod';
import { db } from '../db/client';
import { conversations, conversationMembers, messages } from '../db/schema/messaging';
import { users } from '../db/schema/users';
import { residents } from '../db/schema/residents';
import { houses } from '../db/schema/orgs';
import { consents } from '../db/schema/compliance';
import { eq, and, isNull, sql, desc, or, inArray } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

export const conversationRouter = router({
  /**
   * List conversations for current user
   */
  list: protectedProcedure
    .input(z.object({
      conversationType: z.enum(['direct', 'group', 'announcement']).optional(),
      includeArchived: z.boolean().default(false),
      limit: z.number().int().min(1).max(100).default(50),
      offset: z.number().int().min(0).default(0),
    }).optional())
    .query(async ({ input, ctx }) => {
      const userId = ctx.user!.id;
      const orgId = (ctx as any).orgId as string;

      // Get conversations where user is a member
      const memberConversationIds = await db
        .select({ conversationId: conversationMembers.conversation_id })
        .from(conversationMembers)
        .where(
          and(
            eq(conversationMembers.org_id, orgId),
            eq(conversationMembers.user_id, userId),
            isNull(conversationMembers.left_at)
          )
        );

      if (memberConversationIds.length === 0) {
        return [];
      }

      const conversationIds = memberConversationIds.map(m => m.conversationId);

      const conditions = [
        inArray(conversations.id, conversationIds),
        eq(conversations.org_id, orgId),
      ];

      if (input?.conversationType) {
        conditions.push(eq(conversations.conversation_type, input.conversationType));
      }
      if (!input?.includeArchived) {
        conditions.push(eq(conversations.is_archived, false));
      }

      const result = await db
        .select({
          id: conversations.id,
          conversation_type: conversations.conversation_type,
          title: conversations.title,
          house_id: conversations.house_id,
          is_archived: conversations.is_archived,
          sensitivity_level: conversations.sensitivity_level,
          created_at: conversations.created_at,
          updated_at: conversations.updated_at,
          house_name: houses.name,
        })
        .from(conversations)
        .leftJoin(houses, eq(conversations.house_id, houses.id))
        .where(and(...conditions))
        .orderBy(desc(conversations.updated_at))
        .limit(input?.limit ?? 50)
        .offset(input?.offset ?? 0);

      // Get last message and unread count for each conversation
      const conversationsWithMeta = await Promise.all(
        result.map(async (conv) => {
          // Last message
          const [lastMessage] = await db
            .select({
              id: messages.id,
              content: messages.content,
              sent_at: messages.sent_at,
              sender_user_id: messages.sender_user_id,
            })
            .from(messages)
            .where(
              and(
                eq(messages.conversation_id, conv.id),
                isNull(messages.deleted_at)
              )
            )
            .orderBy(desc(messages.sent_at))
            .limit(1);

          // Unread count
          const membership = await db
            .select({ last_read_at: conversationMembers.last_read_at })
            .from(conversationMembers)
            .where(
              and(
                eq(conversationMembers.conversation_id, conv.id),
                eq(conversationMembers.user_id, userId)
              )
            )
            .limit(1);

          let unreadCount = 0;
          if (membership[0]) {
            const lastRead = membership[0].last_read_at;
            const unreadConditions = [
              eq(messages.conversation_id, conv.id),
              isNull(messages.deleted_at),
            ];
            if (lastRead) {
              // Messages after last read
              const [count] = await db
                .select({ count: sql<number>`count(*)::int` })
                .from(messages)
                .where(
                  and(
                    ...unreadConditions,
                    sql`${messages.sent_at} > ${lastRead}`
                  )
                );
              unreadCount = count?.count ?? 0;
            } else {
              // All messages are unread
              const [count] = await db
                .select({ count: sql<number>`count(*)::int` })
                .from(messages)
                .where(and(...unreadConditions));
              unreadCount = count?.count ?? 0;
            }
          }

          // Get other members for DM title
          let otherMemberName: string | null = null;
          if (conv.conversation_type === 'direct' && !conv.title) {
            const otherMembers = await db
              .select({
                user_first_name: users.first_name,
                user_last_name: users.last_name,
                resident_first_name: residents.first_name,
                resident_last_name: residents.last_name,
              })
              .from(conversationMembers)
              .leftJoin(users, eq(conversationMembers.user_id, users.id))
              .leftJoin(residents, eq(conversationMembers.resident_id, residents.id))
              .where(
                and(
                  eq(conversationMembers.conversation_id, conv.id),
                  sql`${conversationMembers.user_id} != ${userId}`,
                  isNull(conversationMembers.left_at)
                )
              )
              .limit(1);

            if (otherMembers[0]) {
              const m = otherMembers[0];
              otherMemberName = m.user_first_name
                ? `${m.user_first_name} ${m.user_last_name}`
                : m.resident_first_name
                  ? `${m.resident_first_name} ${m.resident_last_name}`
                  : null;
            }
          }

          return {
            ...conv,
            displayTitle: conv.title || otherMemberName || 'Conversation',
            lastMessage: lastMessage ? {
              content: lastMessage.content.substring(0, 100),
              sentAt: lastMessage.sent_at,
            } : null,
            unreadCount,
          };
        })
      );

      return conversationsWithMeta;
    }),

  /**
   * Get conversation by ID with members
   */
  getById: protectedProcedure
    .input(z.object({
      conversationId: z.string().uuid(),
    }))
    .query(async ({ input, ctx }) => {
      const userId = ctx.user!.id;

      // Verify user is a member
      const [membership] = await db
        .select()
        .from(conversationMembers)
        .where(
          and(
            eq(conversationMembers.conversation_id, input.conversationId),
            eq(conversationMembers.user_id, userId),
            isNull(conversationMembers.left_at)
          )
        )
        .limit(1);

      if (!membership) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not a member of this conversation' });
      }

      const [conversation] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, input.conversationId))
        .limit(1);

      if (!conversation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Conversation not found' });
      }

      // Get members
      const members = await db
        .select({
          id: conversationMembers.id,
          user_id: conversationMembers.user_id,
          resident_id: conversationMembers.resident_id,
          joined_at: conversationMembers.joined_at,
          is_muted: conversationMembers.is_muted,
          user_first_name: users.first_name,
          user_last_name: users.last_name,
          user_email: users.email,
          resident_first_name: residents.first_name,
          resident_last_name: residents.last_name,
        })
        .from(conversationMembers)
        .leftJoin(users, eq(conversationMembers.user_id, users.id))
        .leftJoin(residents, eq(conversationMembers.resident_id, residents.id))
        .where(
          and(
            eq(conversationMembers.conversation_id, input.conversationId),
            isNull(conversationMembers.left_at)
          )
        );

      return {
        ...conversation,
        members: members.map(m => ({
          id: m.id,
          userId: m.user_id,
          residentId: m.resident_id,
          name: m.user_first_name
            ? `${m.user_first_name} ${m.user_last_name}`
            : m.resident_first_name
              ? `${m.resident_first_name} ${m.resident_last_name}`
              : 'Unknown',
          email: m.user_email,
          joinedAt: m.joined_at,
          isMuted: m.is_muted,
        })),
      };
    }),

  /**
   * Create a new conversation (DM or group)
   * MSG-01: Direct messages
   * MSG-02: Group chat
   */
  create: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      conversationType: z.enum(['direct', 'group']),
      title: z.string().max(255).optional(),
      houseId: z.string().uuid().optional(),
      memberUserIds: z.array(z.string().uuid()).optional(),
      memberResidentIds: z.array(z.string().uuid()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user!.id;

      // For DM, check if conversation already exists
      if (input.conversationType === 'direct') {
        const otherUserId = input.memberUserIds?.[0];
        const otherResidentId = input.memberResidentIds?.[0];

        if (!otherUserId && !otherResidentId) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'DM requires exactly one other participant' });
        }

        // Check for existing DM
        const existingDms = await db
          .select({ conversationId: conversationMembers.conversation_id })
          .from(conversationMembers)
          .innerJoin(conversations, eq(conversationMembers.conversation_id, conversations.id))
          .where(
            and(
              eq(conversationMembers.user_id, userId),
              eq(conversations.conversation_type, 'direct'),
              eq(conversations.org_id, input.orgId),
              isNull(conversationMembers.left_at)
            )
          );

        for (const dm of existingDms) {
          const otherMember = await db
            .select()
            .from(conversationMembers)
            .where(
              and(
                eq(conversationMembers.conversation_id, dm.conversationId),
                isNull(conversationMembers.left_at),
                otherUserId
                  ? eq(conversationMembers.user_id, otherUserId)
                  : eq(conversationMembers.resident_id, otherResidentId!)
              )
            )
            .limit(1);

          if (otherMember.length > 0) {
            // Return existing conversation
            return { id: dm.conversationId, existing: true };
          }
        }
      }

      // Create conversation
      const [conversation] = await db
        .insert(conversations)
        .values({
          org_id: input.orgId,
          conversation_type: input.conversationType,
          title: input.title,
          house_id: input.houseId,
          created_by: userId,
        })
        .returning();

      // Add creator as member
      await db.insert(conversationMembers).values({
        org_id: input.orgId,
        conversation_id: conversation!.id,
        user_id: userId,
      });

      // Add other members
      const memberValues: Array<{
        org_id: string;
        conversation_id: string;
        user_id?: string;
        resident_id?: string;
      }> = [];

      if (input.memberUserIds) {
        for (const memberId of input.memberUserIds) {
          memberValues.push({
            org_id: input.orgId,
            conversation_id: conversation!.id,
            user_id: memberId,
          });
        }
      }

      if (input.memberResidentIds) {
        for (const residentId of input.memberResidentIds) {
          memberValues.push({
            org_id: input.orgId,
            conversation_id: conversation!.id,
            resident_id: residentId,
          });
        }
      }

      if (memberValues.length > 0) {
        await db.insert(conversationMembers).values(memberValues);
      }

      return { id: conversation!.id, existing: false };
    }),

  /**
   * Create house conversation (all residents + staff)
   * MSG-02: Group chat for house
   */
  createHouseConversation: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      houseId: z.string().uuid(),
      title: z.string().max(255).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user!.id;

      // Check if house conversation exists
      const [existing] = await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.org_id, input.orgId),
            eq(conversations.house_id, input.houseId),
            eq(conversations.conversation_type, 'group'),
            eq(conversations.is_archived, false)
          )
        )
        .limit(1);

      if (existing) {
        return { id: existing.id, existing: true };
      }

      // Get house info
      const [house] = await db
        .select()
        .from(houses)
        .where(eq(houses.id, input.houseId))
        .limit(1);

      if (!house) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'House not found' });
      }

      // Create conversation
      const [conversation] = await db
        .insert(conversations)
        .values({
          org_id: input.orgId,
          conversation_type: 'group',
          title: input.title || `${house.name} Chat`,
          house_id: input.houseId,
          created_by: userId,
        })
        .returning();

      // Add creator
      await db.insert(conversationMembers).values({
        org_id: input.orgId,
        conversation_id: conversation!.id,
        user_id: userId,
      });

      return { id: conversation!.id, existing: false };
    }),

  /**
   * Add member to conversation
   */
  addMember: protectedProcedure
    .input(z.object({
      conversationId: z.string().uuid(),
      userId: z.string().uuid().optional(),
      residentId: z.string().uuid().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const currentUserId = ctx.user!.id;

      if (!input.userId && !input.residentId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Must provide userId or residentId' });
      }

      // Verify current user is a member
      const [membership] = await db
        .select()
        .from(conversationMembers)
        .where(
          and(
            eq(conversationMembers.conversation_id, input.conversationId),
            eq(conversationMembers.user_id, currentUserId),
            isNull(conversationMembers.left_at)
          )
        )
        .limit(1);

      if (!membership) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not a member of this conversation' });
      }

      // Check if already a member
      const existingConditions = [
        eq(conversationMembers.conversation_id, input.conversationId),
        isNull(conversationMembers.left_at),
      ];
      if (input.userId) {
        existingConditions.push(eq(conversationMembers.user_id, input.userId));
      } else {
        existingConditions.push(eq(conversationMembers.resident_id, input.residentId!));
      }

      const [existing] = await db
        .select()
        .from(conversationMembers)
        .where(and(...existingConditions))
        .limit(1);

      if (existing) {
        return { success: true, message: 'Already a member' };
      }

      // Add member
      await db.insert(conversationMembers).values({
        org_id: membership.org_id,
        conversation_id: input.conversationId,
        user_id: input.userId,
        resident_id: input.residentId,
      });

      return { success: true };
    }),

  /**
   * Leave conversation
   */
  leave: protectedProcedure
    .input(z.object({
      conversationId: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user!.id;

      const [updated] = await db
        .update(conversationMembers)
        .set({ left_at: new Date() })
        .where(
          and(
            eq(conversationMembers.conversation_id, input.conversationId),
            eq(conversationMembers.user_id, userId),
            isNull(conversationMembers.left_at)
          )
        )
        .returning();

      if (!updated) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Membership not found' });
      }

      return { success: true };
    }),

  /**
   * Archive conversation
   */
  archive: protectedProcedure
    .input(z.object({
      conversationId: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      const [updated] = await db
        .update(conversations)
        .set({ is_archived: true, updated_at: new Date() })
        .where(eq(conversations.id, input.conversationId))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Conversation not found' });
      }

      return { success: true };
    }),

  /**
   * Toggle mute for conversation
   */
  toggleMute: protectedProcedure
    .input(z.object({
      conversationId: z.string().uuid(),
      muted: z.boolean(),
    }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user!.id;

      const [updated] = await db
        .update(conversationMembers)
        .set({ is_muted: input.muted })
        .where(
          and(
            eq(conversationMembers.conversation_id, input.conversationId),
            eq(conversationMembers.user_id, userId),
            isNull(conversationMembers.left_at)
          )
        )
        .returning();

      if (!updated) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Membership not found' });
      }

      return { success: true };
    }),

  /**
   * Check family/sponsor messaging consent
   * MSG-07: Family/sponsor messaging requires Part 2 consent
   */
  checkFamilyConsent: part2Procedure
    .input(z.object({
      orgId: z.string().uuid(),
      residentId: z.string().uuid(),
      familyUserId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      // Check for active consent that designates this family member
      const activeConsent = await db
        .select()
        .from(consents)
        .where(
          and(
            eq(consents.resident_id, input.residentId),
            eq(consents.status, 'active'),
            sql`${consents.expires_at} IS NULL OR ${consents.expires_at} > NOW()`
          )
        )
        .limit(1);

      if (!activeConsent.length) {
        return {
          hasConsent: false,
          reason: 'No active Part 2 consent from resident',
        };
      }

      // TODO: Check if consent specifically designates this family member
      // For now, any active consent allows family messaging

      return {
        hasConsent: true,
        consentId: activeConsent[0]!.id,
        expiresAt: activeConsent[0]!.expires_at,
      };
    }),
});

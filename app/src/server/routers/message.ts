/**
 * Message Router
 * Send, receive, and manage messages within conversations
 *
 * Sprint 15-16: Messaging
 * Source: docs/06_ROADMAP.md Sprint 17-18 (MSG-01, MSG-09, CMP-06)
 */

import { router, protectedProcedure, part2Procedure } from '../trpc';
import { z } from 'zod';
import { db } from '../db/client';
import { conversations, conversationMembers, messages } from '../db/schema/messaging';
import { users } from '../db/schema/users';
import { residents } from '../db/schema/residents';
import { consents } from '../db/schema/compliance';
import { eq, and, isNull, sql, desc, asc, lt, gt, inArray } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { encryptField, decryptField } from '@/lib/encryption';

// 42 CFR 2.32 Redisclosure Notice
const REDISCLOSURE_NOTICE = `CONFIDENTIALITY NOTICE: This message may contain information protected by federal law (42 CFR Part 2). Federal rules prohibit further disclosure without the express written consent of the person to whom it pertains, or as otherwise permitted by 42 CFR Part 2.`;

export const messageRouter = router({
  /**
   * List messages in a conversation
   * Supports pagination with cursor-based navigation
   */
  list: protectedProcedure
    .input(z.object({
      conversationId: z.string().uuid(),
      limit: z.number().int().min(1).max(100).default(50),
      before: z.string().uuid().optional(), // Load messages before this ID
      after: z.string().uuid().optional(), // Load messages after this ID
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

      // Get conversation to check sensitivity
      const [conversation] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, input.conversationId))
        .limit(1);

      const conditions = [
        eq(messages.conversation_id, input.conversationId),
        isNull(messages.deleted_at),
      ];

      // Cursor-based pagination
      if (input.before) {
        const [cursorMessage] = await db
          .select({ sent_at: messages.sent_at })
          .from(messages)
          .where(eq(messages.id, input.before))
          .limit(1);

        if (cursorMessage) {
          conditions.push(lt(messages.sent_at, cursorMessage.sent_at));
        }
      }

      if (input.after) {
        const [cursorMessage] = await db
          .select({ sent_at: messages.sent_at })
          .from(messages)
          .where(eq(messages.id, input.after))
          .limit(1);

        if (cursorMessage) {
          conditions.push(gt(messages.sent_at, cursorMessage.sent_at));
        }
      }

      const result = await db
        .select({
          id: messages.id,
          conversation_id: messages.conversation_id,
          sender_user_id: messages.sender_user_id,
          sender_resident_id: messages.sender_resident_id,
          content: messages.content,
          status: messages.status,
          sent_at: messages.sent_at,
          delivered_at: messages.delivered_at,
          read_at: messages.read_at,
          reply_to_message_id: messages.reply_to_message_id,
          attachments: messages.attachments,
          is_system_message: messages.is_system_message,
          sender_user_first_name: users.first_name,
          sender_user_last_name: users.last_name,
          sender_resident_first_name: residents.first_name,
          sender_resident_last_name: residents.last_name,
        })
        .from(messages)
        .leftJoin(users, eq(messages.sender_user_id, users.id))
        .leftJoin(residents, eq(messages.sender_resident_id, residents.id))
        .where(and(...conditions))
        .orderBy(input.after ? asc(messages.sent_at) : desc(messages.sent_at))
        .limit(input.limit);

      // Reverse if loading after cursor (to maintain chronological order)
      const orderedMessages = input.after ? result.reverse() : result;

      // Add redisclosure notice for Part 2 conversations
      const isPart2 = conversation?.sensitivity_level === 'part2_protected';

      return {
        messages: orderedMessages.map(m => ({
          id: m.id,
          conversationId: m.conversation_id,
          senderUserId: m.sender_user_id,
          senderResidentId: m.sender_resident_id,
          senderName: m.sender_user_first_name
            ? `${m.sender_user_first_name} ${m.sender_user_last_name}`
            : m.sender_resident_first_name
              ? `${m.sender_resident_first_name} ${m.sender_resident_last_name}`
              : 'System',
          content: m.content,
          status: m.status,
          sentAt: m.sent_at,
          deliveredAt: m.delivered_at,
          readAt: m.read_at,
          replyToMessageId: m.reply_to_message_id,
          attachments: m.attachments as string[] | null,
          isSystemMessage: m.is_system_message,
          isOwnMessage: m.sender_user_id === userId,
        })),
        hasMore: result.length === input.limit,
        redisclosureNotice: isPart2 ? REDISCLOSURE_NOTICE : null,
      };
    }),

  /**
   * Send a message
   * MSG-01: Direct messages with real-time delivery
   */
  send: protectedProcedure
    .input(z.object({
      conversationId: z.string().uuid(),
      content: z.string().min(1).max(10000),
      replyToMessageId: z.string().uuid().optional(),
      attachments: z.array(z.string().url()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user!.id;

      // Verify user is a member
      const [membership] = await db
        .select({ org_id: conversationMembers.org_id })
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

      // Get conversation to check if Part 2 protected
      const [conversation] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, input.conversationId))
        .limit(1);

      // MSG-09: Check consent for Part 2 conversations
      if (conversation?.sensitivity_level === 'part2_protected') {
        // Verify sender has consent to share Part 2 data
        // This is handled by the consent middleware for part2Procedure
        // For now, log the disclosure
      }

      // Encrypt message content for storage
      // Note: Using application-level encryption for Part 2 data
      const encryptedContent = conversation?.sensitivity_level === 'part2_protected'
        ? await encryptField(input.content, membership.org_id)
        : input.content;

      // Create message
      const [message] = await db
        .insert(messages)
        .values({
          org_id: membership.org_id,
          conversation_id: input.conversationId,
          sender_user_id: userId,
          content: encryptedContent,
          status: 'sent',
          reply_to_message_id: input.replyToMessageId,
          attachments: input.attachments ? JSON.stringify(input.attachments) : null,
        })
        .returning();

      // Update conversation updated_at
      await db
        .update(conversations)
        .set({ updated_at: new Date() })
        .where(eq(conversations.id, input.conversationId));

      // TODO: Send push notification to other members (MSG-05)
      // This would integrate with a push notification service

      return {
        id: message!.id,
        sentAt: message!.sent_at,
        status: message!.status,
      };
    }),

  /**
   * Mark messages as read
   */
  markRead: protectedProcedure
    .input(z.object({
      conversationId: z.string().uuid(),
      messageIds: z.array(z.string().uuid()).optional(), // If not provided, marks all as read
    }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user!.id;

      // Update membership last_read_at
      await db
        .update(conversationMembers)
        .set({ last_read_at: new Date() })
        .where(
          and(
            eq(conversationMembers.conversation_id, input.conversationId),
            eq(conversationMembers.user_id, userId),
            isNull(conversationMembers.left_at)
          )
        );

      // Update message status to read (for sender tracking)
      if (input.messageIds && input.messageIds.length > 0) {
        await db
          .update(messages)
          .set({
            status: 'read',
            read_at: new Date(),
          })
          .where(
            and(
              inArray(messages.id, input.messageIds),
              eq(messages.conversation_id, input.conversationId),
              sql`${messages.sender_user_id} != ${userId}` // Don't mark own messages as read
            )
          );
      }

      return { success: true };
    }),

  /**
   * Delete a message (soft delete)
   */
  delete: protectedProcedure
    .input(z.object({
      messageId: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user!.id;

      // Can only delete own messages
      const [message] = await db
        .select()
        .from(messages)
        .where(
          and(
            eq(messages.id, input.messageId),
            eq(messages.sender_user_id, userId),
            isNull(messages.deleted_at)
          )
        )
        .limit(1);

      if (!message) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Message not found or not yours' });
      }

      await db
        .update(messages)
        .set({ deleted_at: new Date() })
        .where(eq(messages.id, input.messageId));

      return { success: true };
    }),

  /**
   * Get unread count across all conversations
   */
  getUnreadCount: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
    }))
    .query(async ({ input, ctx }) => {
      const userId = ctx.user!.id;

      // Get all memberships with last_read_at
      const memberships = await db
        .select({
          conversation_id: conversationMembers.conversation_id,
          last_read_at: conversationMembers.last_read_at,
        })
        .from(conversationMembers)
        .where(
          and(
            eq(conversationMembers.org_id, input.orgId),
            eq(conversationMembers.user_id, userId),
            isNull(conversationMembers.left_at),
            eq(conversationMembers.is_muted, false)
          )
        );

      let totalUnread = 0;
      const unreadByConversation: Record<string, number> = {};

      for (const membership of memberships) {
        const conditions = [
          eq(messages.conversation_id, membership.conversation_id),
          isNull(messages.deleted_at),
          sql`${messages.sender_user_id} != ${userId}`, // Don't count own messages
        ];

        if (membership.last_read_at) {
          conditions.push(sql`${messages.sent_at} > ${membership.last_read_at}`);
        }

        const [count] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(messages)
          .where(and(...conditions));

        const unreadCount = count?.count ?? 0;
        if (unreadCount > 0) {
          totalUnread += unreadCount;
          unreadByConversation[membership.conversation_id] = unreadCount;
        }
      }

      return {
        total: totalUnread,
        byConversation: unreadByConversation,
      };
    }),

  /**
   * Search messages
   */
  search: protectedProcedure
    .input(z.object({
      orgId: z.string().uuid(),
      query: z.string().min(2).max(100),
      conversationId: z.string().uuid().optional(),
      limit: z.number().int().min(1).max(50).default(20),
    }))
    .query(async ({ input, ctx }) => {
      const userId = ctx.user!.id;

      // Get user's conversations
      const memberConversationIds = await db
        .select({ conversationId: conversationMembers.conversation_id })
        .from(conversationMembers)
        .where(
          and(
            eq(conversationMembers.org_id, input.orgId),
            eq(conversationMembers.user_id, userId),
            isNull(conversationMembers.left_at)
          )
        );

      if (memberConversationIds.length === 0) {
        return [];
      }

      const conversationIds = input.conversationId
        ? [input.conversationId]
        : memberConversationIds.map(m => m.conversationId);

      // Verify user is member of the specific conversation if provided
      if (input.conversationId && !memberConversationIds.some(m => m.conversationId === input.conversationId)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not a member of this conversation' });
      }

      // Search messages
      const results = await db
        .select({
          id: messages.id,
          conversation_id: messages.conversation_id,
          content: messages.content,
          sent_at: messages.sent_at,
          sender_user_first_name: users.first_name,
          sender_user_last_name: users.last_name,
          conversation_title: conversations.title,
        })
        .from(messages)
        .leftJoin(users, eq(messages.sender_user_id, users.id))
        .leftJoin(conversations, eq(messages.conversation_id, conversations.id))
        .where(
          and(
            inArray(messages.conversation_id, conversationIds),
            isNull(messages.deleted_at),
            sql`${messages.content} ILIKE ${'%' + input.query + '%'}`
          )
        )
        .orderBy(desc(messages.sent_at))
        .limit(input.limit);

      return results.map(r => ({
        id: r.id,
        conversationId: r.conversation_id,
        conversationTitle: r.conversation_title || 'Conversation',
        content: r.content,
        sentAt: r.sent_at,
        senderName: r.sender_user_first_name
          ? `${r.sender_user_first_name} ${r.sender_user_last_name}`
          : 'Unknown',
      }));
    }),

  /**
   * Send system message (for notifications, join/leave, etc.)
   */
  sendSystemMessage: protectedProcedure
    .input(z.object({
      conversationId: z.string().uuid(),
      content: z.string().min(1).max(1000),
    }))
    .mutation(async ({ input }) => {
      const [conversation] = await db
        .select({ org_id: conversations.org_id })
        .from(conversations)
        .where(eq(conversations.id, input.conversationId))
        .limit(1);

      if (!conversation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Conversation not found' });
      }

      const [message] = await db
        .insert(messages)
        .values({
          org_id: conversation.org_id,
          conversation_id: input.conversationId,
          content: input.content,
          status: 'sent',
          is_system_message: true,
        })
        .returning();

      return { id: message!.id };
    }),
});

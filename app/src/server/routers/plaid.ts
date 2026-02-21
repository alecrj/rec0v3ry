/**
 * Plaid Router
 *
 * Bank account connection and transaction sync via Plaid.
 * Supports sandbox mode for development.
 *
 * G2-13: Plaid Link end-to-end
 * G2-14: Card-to-house mapping
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { db } from '../db/client';
import { plaidItems, plaidTransactions, expenses, expenseCategories } from '../db/schema/expenses';
import { houses } from '../db/schema/orgs';
import { eq, and, isNull, desc, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { plaidClient } from '@/lib/plaid';
import { CountryCode, Products } from 'plaid';
import { autoCategorizeMerchant, extractMerchantName, DEFAULT_CATEGORIES } from '@/lib/auto-categorize';

/**
 * Ensure default expense categories exist for the org
 */
async function ensureCategories(orgId: string) {
  const existing = await db
    .select({ name: expenseCategories.name })
    .from(expenseCategories)
    .where(eq(expenseCategories.org_id, orgId));

  const existingNames = new Set(existing.map((c) => c.name));
  const toInsert = DEFAULT_CATEGORIES.filter((c) => !existingNames.has(c.name));

  if (toInsert.length > 0) {
    await db.insert(expenseCategories).values(
      toInsert.map((c) => ({
        org_id: orgId,
        name: c.name,
        color: c.color,
        is_default: true,
      }))
    );
  }
}

export const plaidRouter = router({
  /**
   * Create a Plaid Link token to open the Plaid UI
   */
  createLinkToken: protectedProcedure
    .meta({ permission: 'plaid_connection:create', resource: 'plaid_connection' })
    .mutation(async ({ ctx }) => {
      const userId = ctx.user!.id;

      const response = await plaidClient.linkTokenCreate({
        user: { client_user_id: userId },
        client_name: 'RecoveryOS',
        products: [Products.Transactions],
        country_codes: [CountryCode.Us],
        language: 'en',
      });

      return { linkToken: response.data.link_token };
    }),

  /**
   * Exchange public token (from Plaid Link success) for access token
   * and save the connected account
   */
  exchangeToken: protectedProcedure
    .meta({ permission: 'plaid_connection:create', resource: 'plaid_connection' })
    .input(z.object({
      public_token: z.string(),
      institution_id: z.string().optional(),
      institution_name: z.string().optional(),
      account_id: z.string(), // Plaid account ID (not stored, used to identify the account)
      account_name: z.string().optional(),
      account_mask: z.string().optional(),
      account_type: z.string().optional(),
      account_subtype: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const orgId = (ctx as unknown as { orgId: string }).orgId;
      const userId = ctx.user!.id;

      // Exchange public token for access token
      const exchangeResponse = await plaidClient.itemPublicTokenExchange({
        public_token: input.public_token,
      });

      const accessToken = exchangeResponse.data.access_token;
      const plaidItemId = exchangeResponse.data.item_id;

      // Check if this item is already connected (by plaid_item_id)
      const existing = await db
        .select({ id: plaidItems.id })
        .from(plaidItems)
        .where(
          and(
            eq(plaidItems.org_id, orgId),
            eq(plaidItems.plaid_item_id, plaidItemId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // Update the existing connection
        await db
          .update(plaidItems)
          .set({
            access_token: accessToken,
            institution_id: input.institution_id,
            institution_name: input.institution_name,
            account_name: input.account_name,
            account_mask: input.account_mask,
            account_type: input.account_subtype ?? input.account_type, // store subtype in account_type
            is_active: true,
          })
          .where(eq(plaidItems.id, existing[0].id));

        return { id: existing[0].id, status: 'updated' };
      }

      // Insert new connection
      const [newItem] = await db
        .insert(plaidItems)
        .values({
          org_id: orgId,
          plaid_item_id: plaidItemId,
          access_token: accessToken,
          institution_id: input.institution_id,
          institution_name: input.institution_name,
          account_name: input.account_name,
          account_mask: input.account_mask,
          account_type: input.account_subtype ?? input.account_type,
          created_by: userId,
        })
        .returning();

      // Ensure default categories exist
      await ensureCategories(orgId);

      return { id: newItem.id, status: 'created' };
    }),

  /**
   * Get all connected Plaid accounts for the org
   */
  getConnections: protectedProcedure
    .meta({ permission: 'plaid_connection:read', resource: 'plaid_connection' })
    .query(async ({ ctx }) => {
      const orgId = (ctx as unknown as { orgId: string }).orgId;

      const connections = await db
        .select({
          id: plaidItems.id,
          institution_name: plaidItems.institution_name,
          account_name: plaidItems.account_name,
          account_mask: plaidItems.account_mask,
          account_type: plaidItems.account_type,
          account_subtype: plaidItems.account_type, // stored in account_type
          default_house_id: plaidItems.default_house_id,
          last_synced_at: plaidItems.last_synced_at,
          is_active: plaidItems.is_active,
          created_at: plaidItems.created_at,
          house_name: houses.name,
        })
        .from(plaidItems)
        .leftJoin(houses, eq(plaidItems.default_house_id, houses.id))
        .where(
          and(
            eq(plaidItems.org_id, orgId),
            eq(plaidItems.is_active, true)
          )
        )
        .orderBy(desc(plaidItems.created_at));

      return connections;
    }),

  /**
   * Update a connection's default house assignment (G2-14)
   */
  updateConnection: protectedProcedure
    .meta({ permission: 'plaid_connection:update', resource: 'plaid_connection' })
    .input(z.object({
      connectionId: z.string().uuid(),
      default_house_id: z.string().uuid().nullable(),
    }))
    .mutation(async ({ input, ctx }) => {
      const orgId = (ctx as unknown as { orgId: string }).orgId;

      const [updated] = await db
        .update(plaidItems)
        .set({
          default_house_id: input.default_house_id,
        })
        .where(
          and(
            eq(plaidItems.id, input.connectionId),
            eq(plaidItems.org_id, orgId)
          )
        )
        .returning();

      if (!updated) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Connection not found' });
      }

      return updated;
    }),

  /**
   * Remove a Plaid connection (soft-disable)
   */
  removeConnection: protectedProcedure
    .meta({ permission: 'plaid_connection:delete', resource: 'plaid_connection' })
    .input(z.object({
      connectionId: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      const orgId = (ctx as unknown as { orgId: string }).orgId;

      const [item] = await db
        .select({ access_token: plaidItems.access_token })
        .from(plaidItems)
        .where(
          and(
            eq(plaidItems.id, input.connectionId),
            eq(plaidItems.org_id, orgId)
          )
        )
        .limit(1);

      if (!item) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Connection not found' });
      }

      // Remove from Plaid (best effort)
      try {
        await plaidClient.itemRemove({ access_token: item.access_token });
      } catch {
        // Don't fail if Plaid call fails — we still deactivate locally
      }

      await db
        .update(plaidItems)
        .set({ is_active: false })
        .where(eq(plaidItems.id, input.connectionId));

      return { success: true };
    }),

  /**
   * Sync transactions from Plaid for a specific connection using cursor-based sync
   */
  syncTransactions: protectedProcedure
    .meta({ permission: 'plaid_connection:update', resource: 'plaid_connection' })
    .input(z.object({
      connectionId: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      const orgId = (ctx as unknown as { orgId: string }).orgId;

      const [item] = await db
        .select()
        .from(plaidItems)
        .where(
          and(
            eq(plaidItems.id, input.connectionId),
            eq(plaidItems.org_id, orgId),
            eq(plaidItems.is_active, true)
          )
        )
        .limit(1);

      if (!item) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Connection not found' });
      }

      // Ensure categories exist
      await ensureCategories(orgId);

      // Fetch org categories for auto-categorization
      const categories = await db
        .select({ id: expenseCategories.id, name: expenseCategories.name })
        .from(expenseCategories)
        .where(eq(expenseCategories.org_id, orgId));

      const categoryByName = new Map(categories.map((c) => [c.name, c.id]));

      let imported = 0;
      let skipped = 0;
      let cursor = item.cursor ?? undefined;
      let hasMore = true;

      while (hasMore) {
        const syncResponse = await plaidClient.transactionsSync({
          access_token: item.access_token,
          cursor,
        });

        const { added, modified, removed, next_cursor, has_more } = syncResponse.data;
        cursor = next_cursor;
        hasMore = has_more;

        for (const tx of added) {
          // Skip credits (income) — Plaid uses positive = expense, negative = income
          if (tx.amount <= 0) continue;
          if (tx.pending) continue; // skip pending

          // Check if already imported
          const existing = await db
            .select({ id: plaidTransactions.id })
            .from(plaidTransactions)
            .where(eq(plaidTransactions.plaid_transaction_id, tx.transaction_id))
            .limit(1);

          if (existing.length > 0) {
            skipped++;
            continue;
          }

          const merchantName = tx.merchant_name ?? extractMerchantName(tx.name ?? '');
          const houseId = item.default_house_id ?? null;

          // Auto-categorize
          let categoryId: string | null = null;
          const match = autoCategorizeMerchant(merchantName);
          if (match) {
            categoryId = categoryByName.get(match.categoryName) ?? null;
          }

          // Insert raw plaid transaction
          const [newTx] = await db
            .insert(plaidTransactions)
            .values({
              org_id: orgId,
              plaid_item_id: item.id,
              plaid_transaction_id: tx.transaction_id,
              amount: String(Math.abs(tx.amount)),
              merchant_name: merchantName,
              name: tx.name,
              category: tx.personal_finance_category
                ? [tx.personal_finance_category.primary]
                : (tx.category ?? null),
              date: tx.date,
              pending: false,
              assigned_house_id: houseId,
              assigned_category_id: categoryId,
              status: 'unassigned',
            })
            .returning();

          // Create linked expense record
          const [expenseRecord] = await db
            .insert(expenses)
            .values({
              org_id: orgId,
              house_id: houseId,
              category_id: categoryId,
              amount: String(Math.abs(tx.amount)),
              description: tx.name,
              vendor: merchantName,
              expense_date: tx.date,
              source: 'plaid',
              plaid_transaction_id: newTx.id,
              created_by: item.created_by ?? undefined,
            })
            .returning();

          // Link expense back to transaction
          await db
            .update(plaidTransactions)
            .set({ expense_id: expenseRecord.id })
            .where(eq(plaidTransactions.id, newTx.id));

          imported++;
        }

        // Handle modifications
        for (const tx of modified) {
          await db
            .update(plaidTransactions)
            .set({
              amount: String(Math.abs(tx.amount)),
              name: tx.name,
              pending: tx.pending,
            })
            .where(eq(plaidTransactions.plaid_transaction_id, tx.transaction_id));
        }

        // Handle removals
        for (const tx of removed) {
          const [found] = await db
            .select({ id: plaidTransactions.id, expense_id: plaidTransactions.expense_id })
            .from(plaidTransactions)
            .where(eq(plaidTransactions.plaid_transaction_id, tx.transaction_id))
            .limit(1);

          if (found) {
            await db.delete(plaidTransactions).where(eq(plaidTransactions.id, found.id));
            if (found.expense_id) {
              await db
                .update(expenses)
                .set({ deleted_at: new Date() })
                .where(eq(expenses.id, found.expense_id));
            }
          }
        }
      }

      // Update cursor and last synced timestamp
      await db
        .update(plaidItems)
        .set({ cursor, last_synced_at: new Date() })
        .where(eq(plaidItems.id, item.id));

      return { imported, skipped };
    }),

  /**
   * List unassigned Plaid transactions for review
   */
  listTransactions: protectedProcedure
    .meta({ permission: 'plaid_connection:read', resource: 'plaid_connection' })
    .input(z.object({
      connectionId: z.string().uuid().optional(),
      status: z.enum(['unassigned', 'assigned', 'ignored']).optional(),
      limit: z.number().min(1).max(200).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input, ctx }) => {
      const orgId = (ctx as unknown as { orgId: string }).orgId;

      const conditions = [eq(plaidTransactions.org_id, orgId)];

      if (input.connectionId) {
        conditions.push(eq(plaidTransactions.plaid_item_id, input.connectionId));
      }
      if (input.status) {
        conditions.push(eq(plaidTransactions.status, input.status));
      }

      const txs = await db
        .select({
          id: plaidTransactions.id,
          plaid_transaction_id: plaidTransactions.plaid_transaction_id,
          amount: plaidTransactions.amount,
          date: plaidTransactions.date,
          name: plaidTransactions.name,
          merchant_name: plaidTransactions.merchant_name,
          category: plaidTransactions.category,
          pending: plaidTransactions.pending,
          assigned_house_id: plaidTransactions.assigned_house_id,
          assigned_category_id: plaidTransactions.assigned_category_id,
          expense_id: plaidTransactions.expense_id,
          status: plaidTransactions.status,
          house_name: houses.name,
        })
        .from(plaidTransactions)
        .leftJoin(houses, eq(plaidTransactions.assigned_house_id, houses.id))
        .where(and(...conditions))
        .orderBy(desc(plaidTransactions.date))
        .limit(input.limit)
        .offset(input.offset);

      const [total] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(plaidTransactions)
        .where(and(...conditions));

      return { transactions: txs, total: total?.count ?? 0 };
    }),

  /**
   * Auto-assign house to unassigned transactions based on plaid item default
   */
  autoAssign: protectedProcedure
    .meta({ permission: 'plaid_connection:update', resource: 'plaid_connection' })
    .mutation(async ({ ctx }) => {
      const orgId = (ctx as unknown as { orgId: string }).orgId;

      // Get all active items with a default house
      const items = await db
        .select({ id: plaidItems.id, default_house_id: plaidItems.default_house_id })
        .from(plaidItems)
        .where(
          and(
            eq(plaidItems.org_id, orgId),
            eq(plaidItems.is_active, true),
            sql`${plaidItems.default_house_id} IS NOT NULL`
          )
        );

      let updated = 0;

      for (const item of items) {
        if (!item.default_house_id) continue;

        // Update unassigned transactions
        await db
          .update(plaidTransactions)
          .set({ assigned_house_id: item.default_house_id, status: 'assigned' })
          .where(
            and(
              eq(plaidTransactions.plaid_item_id, item.id),
              isNull(plaidTransactions.assigned_house_id)
            )
          );

        // Also update linked expense records
        await db.execute(sql`
          UPDATE expenses e
          SET house_id = ${item.default_house_id}
          FROM plaid_transactions pt
          WHERE e.id = pt.expense_id
            AND pt.plaid_item_id = ${item.id}
            AND e.house_id IS NULL
            AND e.org_id = ${orgId}
        `);

        updated++;
      }

      return { items_processed: updated };
    }),
});

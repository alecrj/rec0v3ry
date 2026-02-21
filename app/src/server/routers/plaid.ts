/**
 * Plaid Router
 *
 * Bank connection and transaction sync for automated expense tracking.
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { plaidClient } from '../../lib/plaid';
import { plaidItems, plaidTransactions, expenses, expenseCategories } from '../db/schema/expenses';
import { eq, and, desc, isNull } from 'drizzle-orm';
import { CountryCode, Products } from 'plaid';
import { autoCategorize, resolveCategory } from '../lib/auto-categorize';

export const plaidRouter = router({
  // Create Link token for frontend
  createLinkToken: protectedProcedure
    .meta({ permission: 'expense:manage', resource: 'expense' })
    .mutation(async ({ ctx }) => {
      const orgId = (ctx as unknown as { orgId: string }).orgId;

      const response = await plaidClient.linkTokenCreate({
        user: {
          client_user_id: orgId,
        },
        client_name: 'RecoveryOS',
        products: [Products.Transactions],
        country_codes: [CountryCode.Us],
        language: 'en',
      });

      return { linkToken: response.data.link_token };
    }),

  // Exchange public token for access token
  exchangeToken: protectedProcedure
    .meta({ permission: 'expense:manage', resource: 'expense' })
    .input(z.object({
      publicToken: z.string(),
      institutionName: z.string().optional(),
      institutionId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const orgId = (ctx as unknown as { orgId: string }).orgId;
      const userId = (ctx as unknown as { userId: string }).userId;

      // Exchange token
      const exchangeResponse = await plaidClient.itemPublicTokenExchange({
        public_token: input.publicToken,
      });

      const accessToken = exchangeResponse.data.access_token;
      const itemId = exchangeResponse.data.item_id;

      // Get account info
      const accountsResponse = await plaidClient.accountsGet({
        access_token: accessToken,
      });

      const account = accountsResponse.data.accounts[0]; // Use first account
      const institution = accountsResponse.data.item.institution_id;

      // Save to database
      const [plaidItem] = await ctx.db
        .insert(plaidItems)
        .values({
          org_id: orgId,
          plaid_item_id: itemId,
          access_token: accessToken, // TODO: Encrypt in production
          institution_name: input.institutionName || institution || 'Bank Account',
          institution_id: input.institutionId || institution,
          account_name: `${account.name} ****${account.mask}`,
          account_mask: account.mask || null,
          account_type: account.type || null,
          is_active: true,
          created_by: userId,
        })
        .returning();

      return plaidItem;
    }),

  // Get connected accounts
  getConnections: protectedProcedure
    .meta({ permission: 'expense:read', resource: 'expense' })
    .query(async ({ ctx }) => {
      const orgId = (ctx as unknown as { orgId: string }).orgId;

      return ctx.db.query.plaidItems.findMany({
        where: and(eq(plaidItems.org_id, orgId), eq(plaidItems.is_active, true)),
        orderBy: [desc(plaidItems.created_at)],
      });
    }),

  // Remove connection
  removeConnection: protectedProcedure
    .meta({ permission: 'expense:manage', resource: 'expense' })
    .input(z.object({ plaidItemId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = (ctx as unknown as { orgId: string }).orgId;

      // Get item
      const item = await ctx.db.query.plaidItems.findFirst({
        where: and(eq(plaidItems.id, input.plaidItemId), eq(plaidItems.org_id, orgId)),
      });

      if (!item) throw new Error('Plaid connection not found');

      // Remove from Plaid
      await plaidClient.itemRemove({ access_token: item.access_token });

      // Mark inactive
      await ctx.db
        .update(plaidItems)
        .set({ is_active: false })
        .where(eq(plaidItems.id, input.plaidItemId));

      return { success: true };
    }),

  // Sync transactions
  syncTransactions: protectedProcedure
    .meta({ permission: 'expense:manage', resource: 'expense' })
    .input(z.object({ plaidItemId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = (ctx as unknown as { orgId: string }).orgId;

      // Get item
      const item = await ctx.db.query.plaidItems.findFirst({
        where: and(eq(plaidItems.id, input.plaidItemId), eq(plaidItems.org_id, orgId)),
      });

      if (!item) throw new Error('Plaid connection not found');

      // Sync transactions
      let cursor = item.cursor || undefined;
      let hasMore = true;
      let newTransactions = 0;

      while (hasMore) {
        const response = await plaidClient.transactionsSync({
          access_token: item.access_token,
          cursor,
        });

        const { added, modified, removed, next_cursor, has_more } = response.data;

        // Insert new transactions
        for (const tx of added) {
          // Only positive amounts (expenses) — skip income/refunds
          if (tx.amount <= 0) continue;

          await ctx.db
            .insert(plaidTransactions)
            .values({
              org_id: orgId,
              plaid_item_id: item.id,
              plaid_transaction_id: tx.transaction_id,
              amount: tx.amount.toString(),
              merchant_name: tx.merchant_name || null,
              name: tx.name,
              category: tx.category || null,
              date: tx.date,
              pending: tx.pending,
              status: 'unassigned',
            })
            .onConflictDoNothing(); // Skip if already exists

          newTransactions++;
        }

        // Update cursor
        cursor = next_cursor;
        hasMore = has_more;
      }

      // Save final cursor
      await ctx.db
        .update(plaidItems)
        .set({ cursor, last_synced_at: new Date() })
        .where(eq(plaidItems.id, input.plaidItemId));

      return { newTransactions };
    }),

  // List transactions (for review page)
  listTransactions: protectedProcedure
    .meta({ permission: 'expense:read', resource: 'expense' })
    .input(z.object({
      status: z.enum(['unassigned', 'assigned', 'ignored']).optional(),
      limit: z.number().min(1).max(200).default(50),
    }).optional())
    .query(async ({ ctx, input }) => {
      const orgId = (ctx as unknown as { orgId: string }).orgId;

      const conditions = [eq(plaidTransactions.org_id, orgId)];
      if (input?.status) conditions.push(eq(plaidTransactions.status, input.status));

      return ctx.db.query.plaidTransactions.findMany({
        where: and(...conditions),
        with: {
          plaidItem: { columns: { institution_name: true, account_name: true } },
          house: { columns: { id: true, name: true } },
          category: { columns: { id: true, name: true, color: true } },
        },
        orderBy: [desc(plaidTransactions.date)],
        limit: input?.limit || 50,
      });
    }),

  // Auto-assign transaction
  autoAssign: protectedProcedure
    .meta({ permission: 'expense:manage', resource: 'expense' })
    .input(z.object({
      transactionId: z.string().uuid(),
      houseId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      const orgId = (ctx as unknown as { orgId: string }).orgId;
      const userId = (ctx as unknown as { userId: string }).userId;

      // Get transaction
      const transaction = await ctx.db.query.plaidTransactions.findFirst({
        where: and(
          eq(plaidTransactions.id, input.transactionId),
          eq(plaidTransactions.org_id, orgId)
        ),
      });

      if (!transaction) throw new Error('Transaction not found');

      // Get org categories
      const orgCategories = await ctx.db.query.expenseCategories.findMany({
        where: eq(expenseCategories.org_id, orgId),
        columns: { id: true, name: true },
      });

      // Auto-categorize
      const plaidCat = Array.isArray(transaction.category)
        ? (transaction.category as string[])
        : [];
      const suggestedCategoryName = autoCategorize(
        transaction.merchant_name || transaction.name,
        plaidCat
      );

      const categoryId = suggestedCategoryName
        ? resolveCategory(suggestedCategoryName, orgCategories)
        : null;

      // Create expense
      const [expense] = await ctx.db
        .insert(expenses)
        .values({
          org_id: orgId,
          house_id: input.houseId,
          category_id: categoryId,
          amount: transaction.amount,
          description: transaction.name,
          vendor: transaction.merchant_name || null,
          expense_date: transaction.date,
          source: 'plaid',
          plaid_transaction_id: transaction.plaid_transaction_id,
          created_by: userId,
        })
        .returning();

      // Update transaction
      await ctx.db
        .update(plaidTransactions)
        .set({
          assigned_house_id: input.houseId,
          assigned_category_id: categoryId,
          expense_id: expense.id,
          status: 'assigned',
        })
        .where(eq(plaidTransactions.id, input.transactionId));

      return { expense, categoryId };
    }),
});

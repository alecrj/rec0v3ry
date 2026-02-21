/**
 * Expense Router
 *
 * Manual expense entry, category management, and P&L per house.
 *
 * G2-15: Auto-categorization
 * G2-16: P&L per house
 * G2-17: Manual expense entry
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { db } from '../db/client';
import {
  expenses,
  expenseCategories,
} from '../db/schema/expenses';
import { houses } from '../db/schema/orgs';
import { eq, and, isNull, desc, gte, lte, sql, asc } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { DEFAULT_CATEGORIES, autoCategorizeMerchant } from '@/lib/auto-categorize';

/**
 * Ensure default expense categories exist for the org
 */
async function ensureDefaultCategories(orgId: string) {
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

export const expenseRouter = router({
  /**
   * Get all expense categories for the org (seeding defaults if needed)
   */
  getCategories: protectedProcedure
    .meta({ permission: 'expense:read', resource: 'expense' })
    .query(async ({ ctx }) => {
      const orgId = (ctx as unknown as { orgId: string }).orgId;

      // Ensure defaults exist
      await ensureDefaultCategories(orgId);

      const categories = await db
        .select()
        .from(expenseCategories)
        .where(eq(expenseCategories.org_id, orgId))
        .orderBy(asc(expenseCategories.name));

      return categories;
    }),

  /**
   * Create a custom expense category
   */
  createCategory: protectedProcedure
    .meta({ permission: 'expense:create', resource: 'expense' })
    .input(z.object({
      name: z.string().min(1).max(100),
      color: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const orgId = (ctx as unknown as { orgId: string }).orgId;

      const [category] = await db
        .insert(expenseCategories)
        .values({
          org_id: orgId,
          name: input.name,
          color: input.color,
          is_default: false,
        })
        .returning();

      return category;
    }),

  /**
   * List expenses with filters
   */
  list: protectedProcedure
    .meta({ permission: 'expense:read', resource: 'expense' })
    .input(z.object({
      houseId: z.string().uuid().optional(),
      categoryId: z.string().uuid().optional(),
      startDate: z.string().optional(), // YYYY-MM-DD
      endDate: z.string().optional(), // YYYY-MM-DD
      limit: z.number().min(1).max(200).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input, ctx }) => {
      const orgId = (ctx as unknown as { orgId: string }).orgId;

      const conditions = [
        eq(expenses.org_id, orgId),
        isNull(expenses.deleted_at),
      ];

      if (input.houseId) conditions.push(eq(expenses.house_id, input.houseId));
      if (input.categoryId) conditions.push(eq(expenses.category_id, input.categoryId));
      if (input.startDate) conditions.push(gte(expenses.expense_date, input.startDate));
      if (input.endDate) conditions.push(lte(expenses.expense_date, input.endDate));

      const rows = await db
        .select({
          id: expenses.id,
          amount: expenses.amount,
          expense_date: expenses.expense_date,
          description: expenses.description,
          vendor: expenses.vendor,
          receipt_url: expenses.receipt_url,
          source: expenses.source,
          created_at: expenses.created_at,
          house_id: expenses.house_id,
          house_name: houses.name,
          category_id: expenses.category_id,
          category_name: expenseCategories.name,
          category_color: expenseCategories.color,
        })
        .from(expenses)
        .leftJoin(houses, eq(expenses.house_id, houses.id))
        .leftJoin(expenseCategories, eq(expenses.category_id, expenseCategories.id))
        .where(and(...conditions))
        .orderBy(desc(expenses.expense_date))
        .limit(input.limit)
        .offset(input.offset);

      const [total] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(expenses)
        .where(and(...conditions));

      return { expenses: rows, total: total?.count ?? 0 };
    }),

  /**
   * Create a manual expense entry (G2-17)
   */
  create: protectedProcedure
    .meta({ permission: 'expense:create', resource: 'expense' })
    .input(z.object({
      amount: z.string().min(1), // Decimal string
      expense_date: z.string(), // YYYY-MM-DD
      description: z.string().optional(),
      vendor: z.string().optional(),
      category_id: z.string().uuid().optional(),
      house_id: z.string().uuid().optional(),
      receipt_url: z.string().url().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const orgId = (ctx as unknown as { orgId: string }).orgId;
      const userId = ctx.user!.id;

      const [expense] = await db
        .insert(expenses)
        .values({
          org_id: orgId,
          amount: input.amount,
          expense_date: input.expense_date,
          description: input.description ?? '',
          vendor: input.vendor,
          category_id: input.category_id,
          house_id: input.house_id,
          receipt_url: input.receipt_url,
          source: 'manual',
          created_by: userId,
        })
        .returning();

      return expense;
    }),

  /**
   * Update an expense (change category, house, etc.)
   */
  update: protectedProcedure
    .meta({ permission: 'expense:update', resource: 'expense' })
    .input(z.object({
      expenseId: z.string().uuid(),
      amount: z.string().optional(),
      expense_date: z.string().optional(),
      description: z.string().nullable().optional(),
      vendor: z.string().nullable().optional(),
      category_id: z.string().uuid().nullable().optional(),
      house_id: z.string().uuid().nullable().optional(),
      receipt_url: z.string().url().nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const orgId = (ctx as unknown as { orgId: string }).orgId;
      const { expenseId, ...updates } = input;

      const updateData: Record<string, unknown> = {};
      if (updates.amount !== undefined) updateData.amount = updates.amount;
      if (updates.expense_date !== undefined) updateData.expense_date = updates.expense_date;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.vendor !== undefined) updateData.vendor = updates.vendor;
      if (updates.category_id !== undefined) updateData.category_id = updates.category_id;
      if (updates.house_id !== undefined) updateData.house_id = updates.house_id;
      if (updates.receipt_url !== undefined) updateData.receipt_url = updates.receipt_url;

      const [expense] = await db
        .update(expenses)
        .set(updateData)
        .where(
          and(
            eq(expenses.id, expenseId),
            eq(expenses.org_id, orgId),
            isNull(expenses.deleted_at)
          )
        )
        .returning();

      if (!expense) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Expense not found' });
      }

      return expense;
    }),

  /**
   * Delete an expense (soft delete)
   */
  delete: protectedProcedure
    .meta({ permission: 'expense:delete', resource: 'expense' })
    .input(z.object({
      expenseId: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      const orgId = (ctx as unknown as { orgId: string }).orgId;

      await db
        .update(expenses)
        .set({ deleted_at: new Date() })
        .where(
          and(
            eq(expenses.id, input.expenseId),
            eq(expenses.org_id, orgId)
          )
        );

      return { success: true };
    }),

  /**
   * Suggest a category for a merchant/vendor name (G2-15)
   */
  suggestCategory: protectedProcedure
    .meta({ permission: 'expense:read', resource: 'expense' })
    .input(z.object({
      merchant_name: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      const orgId = (ctx as unknown as { orgId: string }).orgId;

      // Try pattern matching
      const match = autoCategorizeMerchant(input.merchant_name);
      if (match) {
        const [category] = await db
          .select({ id: expenseCategories.id, name: expenseCategories.name })
          .from(expenseCategories)
          .where(
            and(
              eq(expenseCategories.org_id, orgId),
              eq(expenseCategories.name, match.categoryName)
            )
          )
          .limit(1);

        if (category) {
          return { category_id: category.id, category_name: category.name, confidence: match.confidence };
        }
      }

      return null;
    }),

  /**
   * P&L per house (G2-16)
   * Revenue (from payments for residents in each house) - Expenses = Profit
   */
  getPandL: protectedProcedure
    .meta({ permission: 'expense:read', resource: 'expense' })
    .input(z.object({
      startDate: z.string(), // YYYY-MM-DD
      endDate: z.string(), // YYYY-MM-DD
      houseId: z.string().uuid().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const orgId = (ctx as unknown as { orgId: string }).orgId;

      // Get all houses for the org
      const allHouses = await db
        .select({ id: houses.id, name: houses.name })
        .from(houses)
        .where(and(eq(houses.org_id, orgId), isNull(houses.deleted_at)));

      const houseList = input.houseId
        ? allHouses.filter((h) => h.id === input.houseId)
        : allHouses;

      const houseIds = houseList.map((h) => h.id);
      if (houseIds.length === 0) {
        return { overall: { revenue: '0', expenses: '0', profit: '0' }, houses: [] };
      }

      // Build a safe parameterized house_id list for SQL
      const houseIdList = houseIds.map((id) => `'${id}'`).join(',');

      // Revenue per house: sum of succeeded payments for residents with active admissions at each house
      const revenueRows = await db.execute<{ house_id: string; revenue: string }>(sql`
        SELECT
          a.house_id,
          COALESCE(SUM(p.amount), 0)::text AS revenue
        FROM payments p
        INNER JOIN invoices i ON p.invoice_id = i.id
        INNER JOIN admissions a ON i.admission_id = a.id
        WHERE p.org_id = ${orgId}
          AND p.status = 'succeeded'
          AND p.deleted_at IS NULL
          AND p.payment_date >= ${input.startDate}::date
          AND p.payment_date <= ${input.endDate}::date
          AND a.house_id = ANY(ARRAY[${sql.raw(houseIdList)}]::uuid[])
        GROUP BY a.house_id
      `);

      const revenueByHouse = new Map<string, number>(
        (revenueRows.rows as Array<{ house_id: string; revenue: string }>).map((r) => [
          r.house_id,
          parseFloat(r.revenue),
        ])
      );

      // Expenses per house
      const expenseRows = await db
        .select({
          house_id: expenses.house_id,
          total: sql<string>`COALESCE(SUM(${expenses.amount}), 0)::text`,
        })
        .from(expenses)
        .where(
          and(
            eq(expenses.org_id, orgId),
            isNull(expenses.deleted_at),
            gte(expenses.expense_date, input.startDate),
            lte(expenses.expense_date, input.endDate),
            sql`${expenses.house_id} = ANY(ARRAY[${sql.raw(houseIdList)}]::uuid[])`
          )
        )
        .groupBy(expenses.house_id);

      const expensesByHouse = new Map<string, number>(
        expenseRows
          .filter((r) => r.house_id !== null)
          .map((r) => [r.house_id as string, parseFloat(r.total)])
      );

      // Expenses by category per house
      const categoryRows = await db
        .select({
          house_id: expenses.house_id,
          category_name: expenseCategories.name,
          category_color: expenseCategories.color,
          total: sql<string>`COALESCE(SUM(${expenses.amount}), 0)::text`,
        })
        .from(expenses)
        .leftJoin(expenseCategories, eq(expenses.category_id, expenseCategories.id))
        .where(
          and(
            eq(expenses.org_id, orgId),
            isNull(expenses.deleted_at),
            gte(expenses.expense_date, input.startDate),
            lte(expenses.expense_date, input.endDate),
            sql`${expenses.house_id} = ANY(ARRAY[${sql.raw(houseIdList)}]::uuid[])`
          )
        )
        .groupBy(expenses.house_id, expenseCategories.name, expenseCategories.color);

      // Group category breakdown by house
      const categoryByHouse = new Map<
        string,
        Array<{ category: string; color: string | null; total: number }>
      >();
      for (const row of categoryRows) {
        if (!row.house_id) continue;
        const list = categoryByHouse.get(row.house_id) ?? [];
        list.push({
          category: row.category_name ?? 'Uncategorized',
          color: row.category_color,
          total: parseFloat(row.total),
        });
        categoryByHouse.set(row.house_id, list);
      }

      // Build per-house results
      const houseResults = houseList.map((house) => {
        const revenue = revenueByHouse.get(house.id) ?? 0;
        const expenseTotal = expensesByHouse.get(house.id) ?? 0;
        const profit = revenue - expenseTotal;

        return {
          house_id: house.id,
          house_name: house.name,
          revenue: revenue.toFixed(2),
          expenses: expenseTotal.toFixed(2),
          profit: profit.toFixed(2),
          categories: categoryByHouse.get(house.id) ?? [],
        };
      });

      // Overall totals
      const totalRevenue = houseResults.reduce((s, h) => s + parseFloat(h.revenue), 0);
      const totalExpenses = houseResults.reduce((s, h) => s + parseFloat(h.expenses), 0);
      const totalProfit = totalRevenue - totalExpenses;

      return {
        overall: {
          revenue: totalRevenue.toFixed(2),
          expenses: totalExpenses.toFixed(2),
          profit: totalProfit.toFixed(2),
        },
        houses: houseResults,
      };
    }),
});

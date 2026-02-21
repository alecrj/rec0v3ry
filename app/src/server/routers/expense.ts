/**
 * Expense Router
 *
 * CRUD for manual expenses, expense categories, P&L queries.
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { expenses, expenseCategories } from '../db/schema/expenses';
import { houses } from '../db/schema/orgs';
import { payments } from '../db/schema/payments';
import { eq, and, desc, gte, lte, isNull, sql } from 'drizzle-orm';

export const expenseRouter = router({
  // Create manual expense
  create: protectedProcedure
    .meta({ permission: 'expense:create', resource: 'expense' })
    .input(z.object({
      houseId: z.string().uuid().optional(),
      categoryId: z.string().uuid().optional(),
      amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid amount'),
      description: z.string().min(1).max(500),
      vendor: z.string().max(200).optional(),
      expenseDate: z.string(), // YYYY-MM-DD
      receiptUrl: z.string().url().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const orgId = (ctx as unknown as { orgId: string }).orgId;
      const userId = (ctx as unknown as { userId: string }).userId;

      const [expense] = await ctx.db
        .insert(expenses)
        .values({
          org_id: orgId,
          house_id: input.houseId || null,
          category_id: input.categoryId || null,
          amount: input.amount,
          description: input.description,
          vendor: input.vendor || null,
          expense_date: input.expenseDate,
          receipt_url: input.receiptUrl || null,
          source: 'manual',
          created_by: userId,
        })
        .returning();

      return expense;
    }),

  // List expenses (filterable)
  list: protectedProcedure
    .meta({ permission: 'expense:read', resource: 'expense' })
    .input(z.object({
      houseId: z.string().uuid().optional(),
      categoryId: z.string().uuid().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const orgId = (ctx as unknown as { orgId: string }).orgId;

      const conditions = [eq(expenses.org_id, orgId), isNull(expenses.deleted_at)];
      if (input?.houseId) conditions.push(eq(expenses.house_id, input.houseId));
      if (input?.categoryId) conditions.push(eq(expenses.category_id, input.categoryId));
      if (input?.startDate) conditions.push(gte(expenses.expense_date, input.startDate));
      if (input?.endDate) conditions.push(lte(expenses.expense_date, input.endDate));

      return ctx.db.query.expenses.findMany({
        where: and(...conditions),
        with: {
          house: { columns: { id: true, name: true } },
          category: { columns: { id: true, name: true, color: true } },
        },
        orderBy: [desc(expenses.expense_date)],
        limit: 200,
      });
    }),

  // Update expense
  update: protectedProcedure
    .meta({ permission: 'expense:update', resource: 'expense' })
    .input(z.object({
      id: z.string().uuid(),
      houseId: z.string().uuid().optional(),
      categoryId: z.string().uuid().optional(),
      amount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
      description: z.string().min(1).max(500).optional(),
      vendor: z.string().max(200).optional(),
      expenseDate: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const orgId = (ctx as unknown as { orgId: string }).orgId;
      const { id, ...updates } = input;

      const values: Record<string, unknown> = {};
      if (updates.houseId !== undefined) values.house_id = updates.houseId;
      if (updates.categoryId !== undefined) values.category_id = updates.categoryId;
      if (updates.amount !== undefined) values.amount = updates.amount;
      if (updates.description !== undefined) values.description = updates.description;
      if (updates.vendor !== undefined) values.vendor = updates.vendor;
      if (updates.expenseDate !== undefined) values.expense_date = updates.expenseDate;

      const [updated] = await ctx.db
        .update(expenses)
        .set(values)
        .where(and(eq(expenses.id, id), eq(expenses.org_id, orgId)))
        .returning();

      return updated;
    }),

  // Delete expense (soft)
  delete: protectedProcedure
    .meta({ permission: 'expense:delete', resource: 'expense' })
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = (ctx as unknown as { orgId: string }).orgId;

      await ctx.db
        .update(expenses)
        .set({ deleted_at: new Date() })
        .where(and(eq(expenses.id, input.id), eq(expenses.org_id, orgId)));

      return { success: true };
    }),

  // List expense categories (auto-seeds defaults if none exist)
  getCategories: protectedProcedure
    .meta({ permission: 'expense:read', resource: 'expense' })
    .query(async ({ ctx }) => {
      const orgId = (ctx as unknown as { orgId: string }).orgId;

      const existing = await ctx.db.query.expenseCategories.findMany({
        where: eq(expenseCategories.org_id, orgId),
        orderBy: [expenseCategories.sort_order, expenseCategories.name],
      });

      if (existing.length > 0) return existing;

      // Seed defaults
      const defaults = [
        { name: 'Rent/Mortgage', icon: 'home', color: '#6366f1', sort_order: '1' },
        { name: 'Utilities', icon: 'zap', color: '#f59e0b', sort_order: '2' },
        { name: 'Repairs & Maintenance', icon: 'wrench', color: '#ef4444', sort_order: '3' },
        { name: 'Supplies', icon: 'package', color: '#8b5cf6', sort_order: '4' },
        { name: 'Food', icon: 'utensils', color: '#22c55e', sort_order: '5' },
        { name: 'Insurance', icon: 'shield', color: '#3b82f6', sort_order: '6' },
        { name: 'Payroll/Staff', icon: 'users', color: '#ec4899', sort_order: '7' },
        { name: 'Marketing', icon: 'megaphone', color: '#14b8a6', sort_order: '8' },
        { name: 'Legal/Professional', icon: 'scale', color: '#64748b', sort_order: '9' },
        { name: 'Other', icon: 'circle', color: '#71717a', sort_order: '10' },
      ];

      const seeded = await ctx.db
        .insert(expenseCategories)
        .values(defaults.map((d) => ({ ...d, org_id: orgId, is_default: true })))
        .returning();

      return seeded;
    }),

  // Get P&L for date range
  getPandL: protectedProcedure
    .meta({ permission: 'report:read', resource: 'report' })
    .input(z.object({
      houseId: z.string().uuid().optional(),
      startDate: z.string(),
      endDate: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const orgId = (ctx as unknown as { orgId: string }).orgId;

      // Revenue: payments received in period
      const revenueConditions = [
        eq(payments.org_id, orgId),
        isNull(payments.deleted_at),
        eq(payments.status, 'succeeded'),
        gte(payments.payment_date, new Date(input.startDate)),
        lte(payments.payment_date, new Date(input.endDate)),
      ];

      const allPayments = await ctx.db.query.payments.findMany({
        where: and(...revenueConditions),
      });
      const totalRevenue = allPayments.reduce((s, p) => s + parseFloat(p.amount), 0);

      // Expenses in period
      const expenseConditions = [
        eq(expenses.org_id, orgId),
        isNull(expenses.deleted_at),
        gte(expenses.expense_date, input.startDate),
        lte(expenses.expense_date, input.endDate),
      ];
      if (input.houseId) expenseConditions.push(eq(expenses.house_id, input.houseId));

      const allExpenses = await ctx.db.query.expenses.findMany({
        where: and(...expenseConditions),
        with: {
          category: { columns: { id: true, name: true, color: true } },
          house: { columns: { id: true, name: true } },
        },
      });
      const totalExpenses = allExpenses.reduce((s, e) => s + parseFloat(e.amount), 0);

      // Category breakdown
      const categoryMap = new Map<string, { name: string; color: string | null; total: number }>();
      for (const e of allExpenses) {
        const catName = e.category?.name || 'Uncategorized';
        const catColor = e.category?.color || null;
        const existing = categoryMap.get(catName);
        if (existing) {
          existing.total += parseFloat(e.amount);
        } else {
          categoryMap.set(catName, { name: catName, color: catColor, total: parseFloat(e.amount) });
        }
      }

      // House breakdown
      const houseMap = new Map<string, { name: string; revenue: number; expenses: number }>();

      // Get houses
      const orgHouses = await ctx.db.query.houses.findMany({
        where: and(eq(houses.org_id, orgId), isNull(houses.deleted_at)),
      });

      for (const h of orgHouses) {
        const houseExpenseTotal = allExpenses
          .filter((e) => e.house_id === h.id)
          .reduce((s, e) => s + parseFloat(e.amount), 0);

        houseMap.set(h.id, {
          name: h.name,
          revenue: 0, // payments don't always have house_id — would need invoice → house mapping
          expenses: houseExpenseTotal,
        });
      }

      return {
        revenue: Math.round(totalRevenue * 100) / 100,
        expenses: Math.round(totalExpenses * 100) / 100,
        profit: Math.round((totalRevenue - totalExpenses) * 100) / 100,
        categoryBreakdown: Array.from(categoryMap.values())
          .map((c) => ({ ...c, total: Math.round(c.total * 100) / 100 }))
          .sort((a, b) => b.total - a.total),
        houseBreakdown: Array.from(houseMap.values())
          .map((h) => ({
            ...h,
            revenue: Math.round(h.revenue * 100) / 100,
            expenses: Math.round(h.expenses * 100) / 100,
            profit: Math.round((h.revenue - h.expenses) * 100) / 100,
          })),
      };
    }),

  // Monthly summary for trends
  getMonthlySummary: protectedProcedure
    .meta({ permission: 'report:read', resource: 'report' })
    .input(z.object({
      months: z.number().min(1).max(24).default(6),
      houseId: z.string().uuid().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const orgId = (ctx as unknown as { orgId: string }).orgId;
      const now = new Date();
      const monthsAgo = new Date(now.getFullYear(), now.getMonth() - input.months, 1);

      const expenseConditions = [
        eq(expenses.org_id, orgId),
        isNull(expenses.deleted_at),
        gte(expenses.expense_date, monthsAgo.toISOString().split('T')[0]),
      ];
      if (input.houseId) expenseConditions.push(eq(expenses.house_id, input.houseId));

      const allExpenses = await ctx.db.query.expenses.findMany({
        where: and(...expenseConditions),
      });

      // Group by month
      const monthMap = new Map<string, number>();
      for (const e of allExpenses) {
        const month = e.expense_date.substring(0, 7); // YYYY-MM
        monthMap.set(month, (monthMap.get(month) || 0) + parseFloat(e.amount));
      }

      return Array.from(monthMap.entries())
        .map(([month, total]) => ({ month, total: Math.round(total * 100) / 100 }))
        .sort((a, b) => a.month.localeCompare(b.month));
    }),
});

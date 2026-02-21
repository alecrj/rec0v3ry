/**
 * Cron: Weekly P&L Report
 * Schedule: Monday at 8:00 AM UTC
 *
 * Checks if 'weekly_pnl' automation is enabled per org.
 * Computes last 7 days: revenue (payments) - expenses per house.
 * Formats readable digest with house names and totals.
 * Sends as system message to org owner.
 * Logs results to automation_logs and updates automation_configs.
 */

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { db } from '@/server/db/client';
import { organizations, houses } from '@/server/db/schema/orgs';
import { payments } from '@/server/db/schema/payments';
import { admissions } from '@/server/db/schema/residents';
import { expenses } from '@/server/db/schema/expenses';
import { automationConfigs, automationLogs } from '@/server/db/schema/automations';
import { conversations, messages } from '@/server/db/schema/messaging';
import { eq, and, isNull, gte, lte, sql } from 'drizzle-orm';

function verifyCronSecret(headersList: Headers): boolean {
  const auth = headersList.get('authorization');
  if (!process.env.CRON_SECRET) return true; // Allow in dev
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

async function sendSystemMessage(orgId: string, title: string, content: string) {
  let conv = await db.query.conversations.findFirst({
    where: and(
      eq(conversations.org_id, orgId),
      eq(conversations.conversation_type, 'direct'),
      eq(conversations.title, title)
    ),
  });

  if (!conv) {
    const [newConv] = await db
      .insert(conversations)
      .values({
        org_id: orgId,
        conversation_type: 'direct',
        title,
        sensitivity_level: 'internal',
        created_by: 'system',
      })
      .returning();
    conv = newConv;
  }

  await db.insert(messages).values({
    org_id: orgId,
    conversation_id: conv!.id,
    content,
    is_system_message: true,
    status: 'sent',
  });
}

export async function GET(req: Request) {
  const headersList = await headers();
  if (!verifyCronSecret(headersList)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekAgoDate = weekAgo.toISOString().split('T')[0]!;
  const todayDate = now.toISOString().split('T')[0]!;

  const weekLabel = `${weekAgo.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  const results: { orgId: string; orgName: string; revenue: number; expenses: number; profit: number; errors: number }[] = [];
  let totalErrors = 0;
  let skipped = 0;

  const forceOrgId = headersList.get('x-force-org-id');

  try {
    const orgs = forceOrgId
      ? await db.select().from(organizations).where(eq(organizations.id, forceOrgId))
      : await db.select().from(organizations).where(isNull(organizations.deleted_at));

    for (const org of orgs) {
      const [autoConfig] = await db
        .select()
        .from(automationConfigs)
        .where(
          and(
            eq(automationConfigs.org_id, org.id),
            eq(automationConfigs.automation_key, 'weekly_pnl'),
            eq(automationConfigs.enabled, true)
          )
        )
        .limit(1);

      if (!autoConfig && !forceOrgId) {
        skipped++;
        continue;
      }

      let orgRevenue = 0;
      let orgExpenses = 0;
      let errors = 0;

      try {
        // Get all houses for this org
        const orgHouses = await db
          .select()
          .from(houses)
          .where(and(eq(houses.org_id, org.id), isNull(houses.deleted_at)));

        const houseLines: string[] = [];

        for (const house of orgHouses) {
          try {
            // Revenue: sum of completed payments from residents in this house
            // Join via admissions to get house-level payments
            const houseAdmissions = await db
              .select({ residentId: admissions.resident_id })
              .from(admissions)
              .where(
                and(
                  eq(admissions.org_id, org.id),
                  eq(admissions.house_id, house.id),
                  isNull(admissions.deleted_at)
                )
              );

            let houseRevenue = 0;

            if (houseAdmissions.length > 0) {
              const residentIds = houseAdmissions.map((a) => a.residentId);

              // Sum payments for residents in this house in the past 7 days
              const revenueResult = await db
                .select({
                  total: sql<string>`COALESCE(SUM(${payments.amount}::numeric), 0)`,
                })
                .from(payments)
                .where(
                  and(
                    eq(payments.org_id, org.id),
                    eq(payments.status, 'succeeded'),
                    gte(payments.payment_date, weekAgo),
                    lte(payments.payment_date, now)
                  )
                );

              // Filter by house residents — sum only payments from this house's residents
              // Since payments don't have house_id directly, use resident_id filter
              const houseRevenueResult = await db
                .select({
                  total: sql<string>`COALESCE(SUM(${payments.amount}::numeric), 0)`,
                })
                .from(payments)
                .innerJoin(admissions, and(
                  eq(admissions.resident_id, payments.resident_id),
                  eq(admissions.house_id, house.id),
                  eq(admissions.org_id, org.id),
                  isNull(admissions.deleted_at)
                ))
                .where(
                  and(
                    eq(payments.org_id, org.id),
                    eq(payments.status, 'succeeded'),
                    gte(payments.payment_date, weekAgo),
                    lte(payments.payment_date, now)
                  )
                );

              houseRevenue = parseFloat(houseRevenueResult[0]?.total ?? '0');
            }

            // Expenses: sum of expenses for this house in the past 7 days
            const expenseResult = await db
              .select({
                total: sql<string>`COALESCE(SUM(${expenses.amount}::numeric), 0)`,
              })
              .from(expenses)
              .where(
                and(
                  eq(expenses.org_id, org.id),
                  eq(expenses.house_id, house.id),
                  isNull(expenses.deleted_at),
                  gte(expenses.expense_date, weekAgoDate),
                  lte(expenses.expense_date, todayDate)
                )
              );

            const houseExpenses = parseFloat(expenseResult[0]?.total ?? '0');
            const houseProfit = houseRevenue - houseExpenses;

            orgRevenue += houseRevenue;
            orgExpenses += houseExpenses;

            const profitStr = houseProfit >= 0
              ? `+${formatCurrency(houseProfit)}`
              : `-${formatCurrency(Math.abs(houseProfit))}`;

            houseLines.push(
              `${house.name}`,
              `  Revenue:  ${formatCurrency(houseRevenue)}`,
              `  Expenses: ${formatCurrency(houseExpenses)}`,
              `  Profit:   ${profitStr}`,
            );
          } catch (houseErr) {
            console.error(`[Cron] Weekly P&L failed for house ${house.id}:`, houseErr);
            errors++;
          }
        }

        // Org-level expenses (no house_id)
        const orgLevelExpenses = await db
          .select({
            total: sql<string>`COALESCE(SUM(${expenses.amount}::numeric), 0)`,
          })
          .from(expenses)
          .where(
            and(
              eq(expenses.org_id, org.id),
              isNull(expenses.house_id),
              isNull(expenses.deleted_at),
              gte(expenses.expense_date, weekAgoDate),
              lte(expenses.expense_date, todayDate)
            )
          );

        const orgLevelExpenseTotal = parseFloat(orgLevelExpenses[0]?.total ?? '0');
        orgExpenses += orgLevelExpenseTotal;

        if (orgLevelExpenseTotal > 0) {
          houseLines.push('');
          houseLines.push(`Org-level expenses: ${formatCurrency(orgLevelExpenseTotal)}`);
        }

        const orgProfit = orgRevenue - orgExpenses;
        const profitStr = orgProfit >= 0
          ? `+${formatCurrency(orgProfit)}`
          : `-${formatCurrency(Math.abs(orgProfit))}`;

        // Build digest
        const digestLines = [
          `Weekly P&L Report — ${weekLabel}`,
          `${org.name}`,
          '',
          ...houseLines,
          '',
          '─'.repeat(32),
          `Total Revenue:  ${formatCurrency(orgRevenue)}`,
          `Total Expenses: ${formatCurrency(orgExpenses)}`,
          `Net Profit:     ${profitStr}`,
        ];

        await sendSystemMessage(org.id, 'Weekly P&L', digestLines.join('\n'));
      } catch (orgErr: any) {
        console.error(`[Cron] Weekly P&L failed for org ${org.id}:`, orgErr);
        errors++;
      }

      const orgProfit = orgRevenue - orgExpenses;

      // Log to automation_logs
      await db.insert(automationLogs).values({
        org_id: org.id,
        automation_key: 'weekly_pnl',
        status: errors > 0 ? 'error' : 'success',
        message: `P&L sent: Revenue ${formatCurrency(orgRevenue)}, Expenses ${formatCurrency(orgExpenses)}, Profit ${formatCurrency(orgProfit)}`,
        details: { revenue: orgRevenue, expenses: orgExpenses, profit: orgProfit, errors },
      });

      // Update automation_configs last run
      if (autoConfig) {
        await db
          .update(automationConfigs)
          .set({
            last_run_at: now,
            last_run_status: errors > 0 ? 'error' : 'success',
            last_run_message: `P&L: ${formatCurrency(orgRevenue)} revenue, ${formatCurrency(orgProfit)} profit`,
            run_count: sql`${automationConfigs.run_count} + 1`,
          })
          .where(eq(automationConfigs.id, autoConfig.id));
      }

      totalErrors += errors;
      results.push({ orgId: org.id, orgName: org.name, revenue: orgRevenue, expenses: orgExpenses, profit: orgProfit, errors });
    }

    return NextResponse.json({
      success: true,
      errors: totalErrors,
      skipped,
      results,
      timestamp: now.toISOString(),
    });
  } catch (error: any) {
    console.error('[Cron] Weekly P&L failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

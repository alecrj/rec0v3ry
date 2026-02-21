/**
 * Cron: Apply Late Fees
 * Schedule: Daily at 10:00 AM UTC
 *
 * Checks if 'late_payment_escalation' automation is enabled per org.
 * Checks org late fee settings, applies fees to overdue invoices past grace period.
 * Creates invoice line items and sends in-app notifications.
 * Logs results to automation_logs and updates automation_configs.
 */

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { db } from '@/server/db/client';
import { invoices, invoiceLineItems } from '@/server/db/schema/payments';
import { organizations } from '@/server/db/schema/orgs';
import { automationConfigs, automationLogs } from '@/server/db/schema/automations';
import { conversations, conversationMembers, messages } from '@/server/db/schema/messaging';
import { eq, and, isNull, lt, sql } from 'drizzle-orm';

function verifyCronSecret(headersList: Headers): boolean {
  const auth = headersList.get('authorization');
  if (!process.env.CRON_SECRET) return true; // Allow in dev
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

interface LateFeeSettings {
  enabled: boolean;
  type: 'flat' | 'percentage';
  amount: string;
  percentage: string;
  gracePeriodDays: number;
}

function getLateFeeSettings(settings: any): LateFeeSettings {
  const payment = settings?.payment;
  return {
    enabled: payment?.lateFeesEnabled ?? false,
    type: payment?.lateFeeType ?? 'flat',
    amount: payment?.lateFeeAmount ?? '25',
    percentage: payment?.lateFeePercentage ?? '5',
    gracePeriodDays: payment?.gracePeriodDays ?? 5,
  };
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

async function sendSystemMessage(orgId: string, residentId: string, content: string) {
  const existing = await db
    .select({ id: conversations.id })
    .from(conversations)
    .innerJoin(conversationMembers, eq(conversationMembers.conversation_id, conversations.id))
    .where(
      and(
        eq(conversations.org_id, orgId),
        eq(conversations.conversation_type, 'direct'),
        eq(conversationMembers.resident_id, residentId),
        eq(conversations.title, 'Payment Reminders'),
      )
    )
    .limit(1);

  let conversationId: string;

  if (existing.length > 0) {
    conversationId = existing[0]!.id;
  } else {
    const [conv] = await db
      .insert(conversations)
      .values({
        org_id: orgId,
        conversation_type: 'direct',
        title: 'Payment Reminders',
        sensitivity_level: 'internal',
        created_by: 'system',
      })
      .returning();
    conversationId = conv!.id;

    await db.insert(conversationMembers).values({
      org_id: orgId,
      conversation_id: conversationId,
      resident_id: residentId,
    });
  }

  await db.insert(messages).values({
    org_id: orgId,
    conversation_id: conversationId,
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
  let totalApplied = 0;
  let totalErrors = 0;
  let skipped = 0;

  // Check if forced to run for a specific org (manual trigger from runNow)
  const forceOrgId = headersList.get('x-force-org-id');

  try {
    const orgs = forceOrgId
      ? await db.select().from(organizations).where(eq(organizations.id, forceOrgId))
      : await db.select().from(organizations).where(isNull(organizations.deleted_at));

    for (const org of orgs) {
      // Check if automation is enabled in automation_configs
      const [autoConfig] = await db
        .select()
        .from(automationConfigs)
        .where(
          and(
            eq(automationConfigs.org_id, org.id),
            eq(automationConfigs.automation_key, 'late_payment_escalation'),
            eq(automationConfigs.enabled, true)
          )
        )
        .limit(1);

      if (!autoConfig && !forceOrgId) {
        skipped++;
        continue;
      }

      const feeSettings = getLateFeeSettings(org.settings);

      if (!feeSettings.enabled && !forceOrgId) {
        skipped++;
        continue;
      }

      let applied = 0;
      let errors = 0;

      // Find overdue invoices past grace period that haven't had a late fee this month
      const graceCutoff = new Date(now.getTime() - feeSettings.gracePeriodDays * 24 * 60 * 60 * 1000);
      const graceCutoffStr = graceCutoff.toISOString().split('T')[0]!;
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      const overdueInvoices = await db
        .select()
        .from(invoices)
        .where(
          and(
            eq(invoices.org_id, org.id),
            eq(invoices.status, 'pending'),
            isNull(invoices.deleted_at),
            lt(invoices.due_date, graceCutoffStr),
          )
        );

      for (const invoice of overdueInvoices) {
        try {
          // Check if late fee already applied this month
          const metadata = (invoice.metadata as any) || {};
          if (metadata.lastLateFeeMonth === currentMonth) continue;

          // Calculate fee
          let feeAmount: number;
          const invoiceTotal = parseFloat(invoice.total ?? '0');
          if (feeSettings.type === 'flat') {
            feeAmount = parseFloat(feeSettings.amount);
          } else {
            feeAmount = invoiceTotal * (parseFloat(feeSettings.percentage) / 100);
          }

          feeAmount = Math.round(feeAmount * 100) / 100;

          if (feeAmount <= 0) continue;

          // Apply late fee as invoice line item + update totals
          await db.transaction(async (tx) => {
            await tx.insert(invoiceLineItems).values({
              invoice_id: invoice.id,
              description: `Late Fee — ${currentMonth}`,
              payment_type: 'late_fee',
              quantity: 1,
              unit_price: String(feeAmount),
              amount: String(feeAmount),
            });

            const newTotal = invoiceTotal + feeAmount;
            const amountPaid = parseFloat(invoice.amount_paid ?? '0');
            const newAmountDue = newTotal - amountPaid;

            await tx
              .update(invoices)
              .set({
                subtotal: String(parseFloat(invoice.subtotal ?? '0') + feeAmount),
                total: String(newTotal),
                amount_due: String(newAmountDue),
                status: 'overdue',
                metadata: { ...metadata, lastLateFeeMonth: currentMonth },
                updated_by: 'system',
              })
              .where(eq(invoices.id, invoice.id));
          });

          // Notify resident
          if (invoice.resident_id) {
            await sendSystemMessage(
              org.id,
              invoice.resident_id,
              `A late fee of ${formatCurrency(feeAmount)} has been applied to your account. Your total outstanding balance is now ${formatCurrency(parseFloat(invoice.amount_due ?? '0') + feeAmount)}. Please pay as soon as possible.`
            );
          }

          applied++;
        } catch (err) {
          console.error(`[Cron] Late fee failed for invoice ${invoice.id}:`, err);
          errors++;
        }
      }

      // Log to automation_logs
      await db.insert(automationLogs).values({
        org_id: org.id,
        automation_key: 'late_payment_escalation',
        status: errors > 0 ? 'error' : applied > 0 ? 'success' : 'skipped',
        message: `Applied ${applied} late fees, ${errors} errors`,
        details: { applied, errors, invoicesChecked: overdueInvoices.length },
      });

      // Update automation_configs last run
      if (autoConfig) {
        await db
          .update(automationConfigs)
          .set({
            last_run_at: now,
            last_run_status: errors > 0 ? 'error' : applied > 0 ? 'success' : 'skipped',
            last_run_message: `Applied ${applied} late fees`,
            run_count: sql`${automationConfigs.run_count} + 1`,
          })
          .where(eq(automationConfigs.id, autoConfig.id));
      }

      totalApplied += applied;
      totalErrors += errors;
    }

    return NextResponse.json({
      success: true,
      applied: totalApplied,
      errors: totalErrors,
      skipped,
      timestamp: now.toISOString(),
    });
  } catch (error: any) {
    console.error('[Cron] Apply late fees failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * Cron: Send Payment Reminders
 * Schedule: Daily at 9:00 AM UTC
 *
 * Checks if 'rent_reminders' automation is enabled per org.
 * Reads org payment settings (days before, day of, days after).
 * Sends in-app system messages instead of email.
 * Logs results to automation_logs and updates automation_configs.
 */

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { db } from '@/server/db/client';
import { invoices } from '@/server/db/schema/payments';
import { residents } from '@/server/db/schema/residents';
import { organizations } from '@/server/db/schema/orgs';
import { automationConfigs, automationLogs } from '@/server/db/schema/automations';
import { conversations, conversationMembers, messages } from '@/server/db/schema/messaging';
import { eq, and, isNull, lte, gte, inArray, sql } from 'drizzle-orm';

function verifyCronSecret(headersList: Headers): boolean {
  const auth = headersList.get('authorization');
  if (!process.env.CRON_SECRET) return true; // Allow in dev
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

interface PaymentSettings {
  reminders?: {
    enabled?: boolean;
    daysBefore?: number;
    dayOf?: boolean;
    daysAfter?: number[];
  };
}

function getOrgPaymentSettings(settings: any): PaymentSettings['reminders'] {
  const payment = settings?.payment;
  if (!payment) return { enabled: false, daysBefore: 3, dayOf: true, daysAfter: [1, 7] };
  return {
    enabled: payment.remindersEnabled ?? false,
    daysBefore: payment.reminderDaysBefore ?? 3,
    dayOf: payment.reminderDayOf ?? true,
    daysAfter: payment.reminderDaysAfter ?? [1, 7],
  };
}

async function sendSystemMessage(orgId: string, residentId: string, content: string) {
  // Find or create a system conversation with this resident
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

function formatCurrency(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
}

export async function GET(req: Request) {
  const headersList = await headers();
  if (!verifyCronSecret(headersList)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const today = now.toISOString().split('T')[0]!;
  const perOrgResults: { orgId: string; orgName: string; sent: number; errors: number }[] = [];
  let totalSent = 0;
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
            eq(automationConfigs.automation_key, 'rent_reminders'),
            eq(automationConfigs.enabled, true)
          )
        )
        .limit(1);

      if (!autoConfig && !forceOrgId) {
        skipped++;
        continue;
      }

      const reminderSettings = getOrgPaymentSettings(org.settings);
      let sent = 0;
      let errors = 0;

      // Get all pending/overdue invoices for this org
      const orgInvoices = await db
        .select()
        .from(invoices)
        .where(
          and(
            eq(invoices.org_id, org.id),
            inArray(invoices.status, ['pending', 'overdue']),
            isNull(invoices.deleted_at),
          )
        );

      for (const invoice of orgInvoices) {
        try {
          if (!invoice.resident_id || !invoice.due_date) continue;

          const dueDate = new Date(invoice.due_date);
          const diffDays = Math.round((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          let shouldSend = false;
          let messageContent = '';
          const amount = formatCurrency(invoice.amount_due);
          const dueDateStr = dueDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

          // Check: days before due
          if (diffDays > 0 && diffDays === reminderSettings?.daysBefore) {
            shouldSend = true;
            messageContent = `Your rent of ${amount} is due on ${dueDateStr}. Tap here to pay now.`;
          }

          // Check: day of
          if (diffDays === 0 && reminderSettings?.dayOf) {
            shouldSend = true;
            messageContent = `Your rent of ${amount} is due today. Please pay to stay current.`;
          }

          // Check: days after (overdue)
          if (diffDays < 0 && reminderSettings?.daysAfter) {
            const daysOverdue = Math.abs(diffDays);
            if (reminderSettings.daysAfter.includes(daysOverdue)) {
              shouldSend = true;
              if (daysOverdue === 1) {
                messageContent = `Your rent of ${amount} was due yesterday. Please pay as soon as possible.`;
              } else {
                messageContent = `You are ${daysOverdue} days past due. ${amount} is outstanding. Please pay to avoid late fees.`;
              }
            }
          }

          if (shouldSend) {
            await sendSystemMessage(org.id, invoice.resident_id, messageContent);
            sent++;
          }
        } catch (err) {
          console.error(`[Cron] Reminder failed for invoice ${invoice.id}:`, err);
          errors++;
        }
      }

      // Log to automation_logs
      await db.insert(automationLogs).values({
        org_id: org.id,
        automation_key: 'rent_reminders',
        status: errors > 0 ? 'error' : sent > 0 ? 'success' : 'skipped',
        message: `Sent ${sent} reminders, ${errors} errors, ${orgInvoices.length} invoices checked`,
        details: { sent, errors, invoicesChecked: orgInvoices.length },
      });

      // Update automation_configs last run
      if (autoConfig) {
        await db
          .update(automationConfigs)
          .set({
            last_run_at: now,
            last_run_status: errors > 0 ? 'error' : sent > 0 ? 'success' : 'skipped',
            last_run_message: `Sent ${sent} reminders`,
            run_count: sql`${automationConfigs.run_count} + 1`,
          })
          .where(eq(automationConfigs.id, autoConfig.id));
      }

      totalSent += sent;
      totalErrors += errors;
      perOrgResults.push({ orgId: org.id, orgName: org.name, sent, errors });
    }

    return NextResponse.json({
      success: true,
      sent: totalSent,
      errors: totalErrors,
      skipped,
      results: perOrgResults,
      timestamp: now.toISOString(),
    });
  } catch (error: any) {
    console.error('[Cron] Send reminders failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

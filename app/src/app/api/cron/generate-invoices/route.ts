/**
 * Cron: Generate Monthly Invoices
 * Schedule: 1st of each month at 8:00 AM UTC
 *
 * Creates invoices for all active admissions based on their house rate.
 * Deduplicates: skips residents already invoiced this month.
 * Logs results to automation_logs and updates automation_configs.
 */

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { db } from '@/server/db/client';
import { invoices, invoiceLineItems } from '@/server/db/schema/payments';
import { rateConfigs } from '@/server/db/schema/payment-extended';
import { admissions } from '@/server/db/schema/residents';
import { organizations } from '@/server/db/schema/orgs';
import { automationConfigs, automationLogs } from '@/server/db/schema/automations';
import { eq, and, isNull, gte, lte, sql } from 'drizzle-orm';

function verifyCronSecret(headersList: Headers): boolean {
  const auth = headersList.get('authorization');
  if (!process.env.CRON_SECRET) return true; // Allow in dev
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(req: Request) {
  const headersList = await headers();
  if (!verifyCronSecret(headersList)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const monthLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const issueDate = now.toISOString().split('T')[0]!;
  const dueDate = new Date(now.getFullYear(), now.getMonth(), 15).toISOString().split('T')[0]!;

  // Date range for dedup check: first to last day of current month
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]!;
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]!;

  let totalCreated = 0;
  let totalErrors = 0;
  let totalSkipped = 0;

  const forceOrgId = headersList.get('x-force-org-id');

  try {
    const orgs = forceOrgId
      ? await db.select().from(organizations).where(eq(organizations.id, forceOrgId))
      : await db.select().from(organizations).where(isNull(organizations.deleted_at));

    for (const org of orgs) {
      // Check automation config (invoice generation may run without this config, but log it if present)
      const [autoConfig] = await db
        .select()
        .from(automationConfigs)
        .where(
          and(
            eq(automationConfigs.org_id, org.id),
            eq(automationConfigs.automation_key, 'invoice_generation'),
            eq(automationConfigs.enabled, true)
          )
        )
        .limit(1);

      let created = 0;
      let errors = 0;
      let skipped = 0;

      // Get active admissions for this org
      const activeAdmissions = await db
        .select()
        .from(admissions)
        .where(
          and(
            eq(admissions.org_id, org.id),
            eq(admissions.status, 'active'),
            isNull(admissions.deleted_at)
          )
        );

      for (const admission of activeAdmissions) {
        try {
          // DEDUP: Check if invoice already exists for this resident this month
          const existingInvoice = await db
            .select({ id: invoices.id })
            .from(invoices)
            .where(
              and(
                eq(invoices.org_id, org.id),
                eq(invoices.resident_id, admission.resident_id),
                isNull(invoices.deleted_at),
                gte(invoices.issue_date, monthStart),
                lte(invoices.issue_date, monthEnd),
              )
            )
            .limit(1);

          if (existingInvoice.length > 0) {
            skipped++;
            continue; // Already invoiced this month
          }

          // Find monthly rate for this house (or org default)
          let rate = await db.query.rateConfigs.findFirst({
            where: and(
              eq(rateConfigs.org_id, org.id),
              eq(rateConfigs.house_id, admission.house_id),
              eq(rateConfigs.is_active, true),
              eq(rateConfigs.billing_frequency, 'monthly')
            ),
          });

          if (!rate) {
            // Try org-level rate
            rate = await db.query.rateConfigs.findFirst({
              where: and(
                eq(rateConfigs.org_id, org.id),
                isNull(rateConfigs.house_id),
                eq(rateConfigs.is_active, true),
                eq(rateConfigs.billing_frequency, 'monthly')
              ),
            });
          }

          if (!rate) {
            skipped++;
            continue; // No rate configured, skip
          }

          // Generate invoice number
          const countResult = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(invoices)
            .where(and(eq(invoices.org_id, org.id), isNull(invoices.deleted_at)));
          const invoiceCount = countResult[0]?.count || 0;
          const invoiceNumber = `INV-${org.slug.toUpperCase()}-${(invoiceCount + 1).toString().padStart(5, '0')}`;

          const amount = rate.amount;

          // Create invoice + line item
          await db.transaction(async (tx) => {
            const [inv] = await tx
              .insert(invoices)
              .values({
                org_id: org.id,
                resident_id: admission.resident_id,
                admission_id: admission.id,
                invoice_number: invoiceNumber,
                status: 'pending',
                issue_date: issueDate,
                due_date: dueDate,
                subtotal: amount,
                tax_amount: '0',
                total: amount,
                amount_paid: '0',
                amount_due: amount,
                notes: `Auto-generated for ${monthLabel}`,
                created_by: 'system',
                updated_by: 'system',
              })
              .returning();

            await tx.insert(invoiceLineItems).values({
              invoice_id: inv!.id,
              description: `Monthly Rent - ${monthLabel}`,
              payment_type: 'rent',
              quantity: 1,
              unit_price: amount,
              amount: amount,
            });
          });

          created++;
        } catch (err) {
          console.error(`[Cron] Invoice generation failed for admission ${admission.id}:`, err);
          errors++;
        }
      }

      // Log to automation_logs
      await db.insert(automationLogs).values({
        org_id: org.id,
        automation_key: 'invoice_generation',
        status: errors > 0 ? 'error' : created > 0 ? 'success' : 'skipped',
        message: `Created ${created} invoices, ${skipped} skipped (already invoiced or no rate), ${errors} errors`,
        details: { created, skipped, errors, month: monthLabel },
      });

      // Update automation_configs if config row exists
      if (autoConfig) {
        await db
          .update(automationConfigs)
          .set({
            last_run_at: now,
            last_run_status: errors > 0 ? 'error' : created > 0 ? 'success' : 'skipped',
            last_run_message: `Created ${created} invoices for ${monthLabel}`,
            run_count: sql`${automationConfigs.run_count} + 1`,
          })
          .where(eq(automationConfigs.id, autoConfig.id));
      }

      totalCreated += created;
      totalErrors += errors;
      totalSkipped += skipped;
    }

    return NextResponse.json({
      success: true,
      created: totalCreated,
      skipped: totalSkipped,
      errors: totalErrors,
      month: monthLabel,
      timestamp: now.toISOString(),
    });
  } catch (error: any) {
    console.error('[Cron] Generate invoices failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

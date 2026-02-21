/**
 * Cron: Generate Monthly Invoices
 * Schedule: 1st of each month at 8:00 AM UTC
 *
 * Creates invoices for all active admissions based on their house rate.
 */

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { db } from '@/server/db/client';
import { invoices, invoiceLineItems } from '@/server/db/schema/payments';
import { rateConfigs } from '@/server/db/schema/payment-extended';
import { admissions, residents } from '@/server/db/schema/residents';
import { organizations } from '@/server/db/schema/orgs';
import { eq, and, isNull, sql } from 'drizzle-orm';

function verifyCronSecret(headersList: Headers): boolean {
  const auth = headersList.get('authorization');
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

  let created = 0;
  let errors = 0;

  try {
    // Get all orgs
    const orgs = await db.select().from(organizations).where(isNull(organizations.deleted_at));

    for (const org of orgs) {
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

          if (!rate) continue; // No rate configured, skip

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
              invoice_id: inv.id,
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
    }

    return NextResponse.json({
      success: true,
      created,
      errors,
      month: monthLabel,
    });
  } catch (error: any) {
    console.error('[Cron] Generate invoices failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

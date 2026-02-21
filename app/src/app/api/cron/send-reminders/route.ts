/**
 * Cron: Send Payment Reminders
 * Schedule: Daily at 9:00 AM UTC
 *
 * Sends reminder emails for invoices due within 3 days or overdue.
 */

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { db } from '@/server/db/client';
import { invoices } from '@/server/db/schema/payments';
import { residents } from '@/server/db/schema/residents';
import { organizations } from '@/server/db/schema/orgs';
import { eq, and, isNull, lte, gte } from 'drizzle-orm';
import { sendPaymentReminderEmail } from '@/lib/email';

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
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  let sent = 0;
  let errors = 0;

  try {
    // Find pending invoices that are due within 3 days or overdue
    const pendingInvoices = await db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.status, 'pending'),
          isNull(invoices.deleted_at),
          lte(invoices.due_date, threeDaysFromNow.toISOString().split('T')[0]!)
        )
      );

    for (const invoice of pendingInvoices) {
      try {
        if (!invoice.resident_id) continue;

        const resident = await db.query.residents.findFirst({
          where: eq(residents.id, invoice.resident_id),
          columns: { first_name: true, last_name: true, email: true },
        });

        if (!resident?.email) continue;

        const org = await db.query.organizations.findFirst({
          where: eq(organizations.id, invoice.org_id),
          columns: { name: true },
        });

        if (!org) continue;

        const dueDate = invoice.due_date ? new Date(invoice.due_date) : null;
        const isOverdue = dueDate ? dueDate < now : false;

        await sendPaymentReminderEmail({
          to: resident.email,
          recipientName: `${resident.first_name} ${resident.last_name}`,
          invoiceNumber: invoice.invoice_number,
          amount: invoice.amount_due,
          dueDate: dueDate?.toLocaleDateString() ?? 'N/A',
          isOverdue,
          orgName: org.name,
        });

        sent++;
      } catch (err) {
        console.error(`[Cron] Reminder failed for invoice ${invoice.id}:`, err);
        errors++;
      }
    }

    return NextResponse.json({
      success: true,
      sent,
      errors,
      invoicesChecked: pendingInvoices.length,
    });
  } catch (error: any) {
    console.error('[Cron] Send reminders failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * Cron: Daily Digest
 * Schedule: Daily at configured time (default 7:00 AM)
 *
 * Checks if 'daily_digest' automation is enabled per org.
 * Pulls dashboard stats (beds filled, revenue, outstanding, new applicants).
 * Creates system message to all org owners/managers.
 * Logs results to automation_logs and updates automation_configs.
 */

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { db } from '@/server/db/client';
import { organizations } from '@/server/db/schema/orgs';
import { beds } from '@/server/db/schema/orgs';
import { invoices } from '@/server/db/schema/payments';
import { admissions } from '@/server/db/schema/residents';
import { leads } from '@/server/db/schema/residents';
import { automationConfigs, automationLogs } from '@/server/db/schema/automations';
import { conversations, messages } from '@/server/db/schema/messaging';
import { users } from '@/server/db/schema/users';
import { eq, and, isNull, gte, sql, inArray } from 'drizzle-orm';

function verifyCronSecret(headersList: Headers): boolean {
  const auth = headersList.get('authorization');
  if (!process.env.CRON_SECRET) return true; // Allow in dev
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export async function GET(req: Request) {
  const headersList = await headers();
  if (!verifyCronSecret(headersList)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const results: { orgId: string; orgName: string; status: string }[] = [];

  // Check if forced to run for a specific org (manual trigger)
  const forceOrgId = headersList.get('x-force-org-id');

  try {
    const orgs = forceOrgId
      ? await db.select().from(organizations).where(eq(organizations.id, forceOrgId))
      : await db.select().from(organizations).where(isNull(organizations.deleted_at));

    for (const org of orgs) {
      // Check if automation is enabled
      const [autoConfig] = await db
        .select()
        .from(automationConfigs)
        .where(
          and(
            eq(automationConfigs.org_id, org.id),
            eq(automationConfigs.automation_key, 'daily_digest'),
            eq(automationConfigs.enabled, true)
          )
        )
        .limit(1);

      if (!autoConfig && !forceOrgId) continue;

      try {
        // Gather stats

        // 1. Bed occupancy
        const bedStats = await db
          .select({
            total: sql<number>`count(*)::int`,
            occupied: sql<number>`count(*) filter (where ${beds.status} = 'occupied')::int`,
          })
          .from(beds)
          .where(
            and(
              eq(beds.org_id, org.id),
              isNull(beds.deleted_at)
            )
          );

        const totalBeds = bedStats[0]?.total ?? 0;
        const occupiedBeds = bedStats[0]?.occupied ?? 0;
        const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

        // 2. Outstanding invoices
        const invoiceStats = await db
          .select({
            totalOutstanding: sql<string>`COALESCE(SUM(${invoices.amount_due}::numeric), 0)`,
            count: sql<number>`count(*)::int`,
          })
          .from(invoices)
          .where(
            and(
              eq(invoices.org_id, org.id),
              isNull(invoices.deleted_at),
              inArray(invoices.status, ['pending', 'overdue', 'partially_paid']),
              gte(sql`${invoices.amount_due}::numeric`, sql`0.01`)
            )
          );

        const outstanding = parseFloat(invoiceStats[0]?.totalOutstanding ?? '0');
        const invoiceCount = invoiceStats[0]?.count ?? 0;

        // 3. Active admissions count
        const [admissionCount] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(admissions)
          .where(
            and(
              eq(admissions.org_id, org.id),
              eq(admissions.status, 'active'),
              isNull(admissions.deleted_at)
            )
          );

        // 4. New leads today
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        const [newLeadCount] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(leads)
          .where(
            and(
              eq(leads.org_id, org.id),
              gte(leads.created_at, startOfDay)
            )
          );

        // Build digest message
        const digestLines = [
          `Good morning! Here's your daily summary for ${org.name}:`,
          '',
          `Beds: ${occupiedBeds}/${totalBeds} occupied (${occupancyRate}%)`,
          `Active Residents: ${admissionCount?.count ?? 0}`,
          `Outstanding: ${formatCurrency(outstanding)} across ${invoiceCount} invoices`,
          `New Applicants Today: ${newLeadCount?.count ?? 0}`,
        ];

        // Empty beds = lost revenue calculation
        const emptyBeds = totalBeds - occupiedBeds;
        if (emptyBeds > 0) {
          // Rough estimate: assume average monthly rate
          digestLines.push('');
          digestLines.push(`${emptyBeds} empty bed${emptyBeds > 1 ? 's' : ''} -- potential revenue opportunity.`);
        }

        const digestContent = digestLines.join('\n');

        // Find or create daily digest conversation
        let digestConv = await db.query.conversations.findFirst({
          where: and(
            eq(conversations.org_id, org.id),
            eq(conversations.conversation_type, 'direct'),
            eq(conversations.title, 'Daily Digest')
          ),
        });

        if (!digestConv) {
          const [newConv] = await db
            .insert(conversations)
            .values({
              org_id: org.id,
              conversation_type: 'direct',
              title: 'Daily Digest',
              sensitivity_level: 'internal',
            })
            .returning();
          digestConv = newConv;
        }

        // Insert system message
        await db.insert(messages).values({
          org_id: org.id,
          conversation_id: digestConv!.id,
          content: digestContent,
          is_system_message: true,
          status: 'sent',
        });

        // Log to automation_logs
        await db.insert(automationLogs).values({
          org_id: org.id,
          automation_key: 'daily_digest',
          status: 'success',
          message: `Digest sent: ${occupiedBeds}/${totalBeds} beds, ${formatCurrency(outstanding)} outstanding`,
          details: {
            totalBeds,
            occupiedBeds,
            occupancyRate,
            outstanding,
            invoiceCount,
            activeResidents: admissionCount?.count ?? 0,
            newLeads: newLeadCount?.count ?? 0,
          },
        });

        // Update automation_configs
        if (autoConfig) {
          await db
            .update(automationConfigs)
            .set({
              last_run_at: now,
              last_run_status: 'success',
              last_run_message: `Digest sent: ${occupancyRate}% occupancy, ${formatCurrency(outstanding)} outstanding`,
              run_count: sql`${automationConfigs.run_count} + 1`,
            })
            .where(eq(automationConfigs.id, autoConfig.id));
        }

        results.push({ orgId: org.id, orgName: org.name, status: 'success' });
      } catch (err: any) {
        console.error(`[Cron] Daily digest failed for org ${org.id}:`, err);

        // Log error
        await db.insert(automationLogs).values({
          org_id: org.id,
          automation_key: 'daily_digest',
          status: 'error',
          message: err.message,
        });

        if (autoConfig) {
          await db
            .update(automationConfigs)
            .set({
              last_run_at: now,
              last_run_status: 'error',
              last_run_message: err.message,
              run_count: sql`${automationConfigs.run_count} + 1`,
            })
            .where(eq(automationConfigs.id, autoConfig.id));
        }

        results.push({ orgId: org.id, orgName: org.name, status: 'error' });
      }
    }

    return NextResponse.json({
      success: true,
      results,
      timestamp: now.toISOString(),
    });
  } catch (error: any) {
    console.error('[Cron] Daily digest failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

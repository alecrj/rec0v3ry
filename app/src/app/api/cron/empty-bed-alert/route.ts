/**
 * Cron: Empty Bed Alert
 * Schedule: Daily at 11:00 AM UTC
 *
 * Checks if 'empty_bed_alert' automation is enabled per org.
 * Finds beds with status='available' that have been empty for 24+ hours.
 * Calculates lost revenue: count × house monthly rate / 30 (per day).
 * Sends system message to org owner with summary.
 * Also checks waitlist and notes if there are pending applicants.
 * Logs results to automation_logs and updates automation_configs.
 */

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { db } from '@/server/db/client';
import { organizations, houses, beds, rooms } from '@/server/db/schema/orgs';
import { automationConfigs, automationLogs } from '@/server/db/schema/automations';
import { conversations, messages } from '@/server/db/schema/messaging';
import { waitlistEntries } from '@/server/db/schema/resident-tracking';
import { rateConfigs } from '@/server/db/schema/payment-extended';
import { eq, and, isNull, lt, sql } from 'drizzle-orm';

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
  const cutoff24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const results: { orgId: string; orgName: string; emptyBeds: number; lostRevenue: number; errors: number }[] = [];
  let totalEmpty = 0;
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
            eq(automationConfigs.automation_key, 'empty_bed_alert'),
            eq(automationConfigs.enabled, true)
          )
        )
        .limit(1);

      if (!autoConfig && !forceOrgId) {
        skipped++;
        continue;
      }

      let emptyBedCount = 0;
      let totalLostRevenue = 0;
      let errors = 0;

      try {
        // Find available beds that have been empty for 24+ hours
        // beds.updated_at reflects when status last changed
        const emptyBeds = await db
          .select({
            id: beds.id,
            name: beds.name,
            roomId: beds.room_id,
            updatedAt: beds.updated_at,
          })
          .from(beds)
          .where(
            and(
              eq(beds.org_id, org.id),
              eq(beds.status, 'available'),
              isNull(beds.deleted_at),
              lt(beds.updated_at, cutoff24h)
            )
          );

        if (emptyBeds.length === 0) {
          // No empty beds — log as skipped
          await db.insert(automationLogs).values({
            org_id: org.id,
            automation_key: 'empty_bed_alert',
            status: 'skipped',
            message: 'No beds have been empty for 24+ hours',
            details: { emptyBeds: 0, lostRevenue: 0 },
          });

          if (autoConfig) {
            await db
              .update(automationConfigs)
              .set({
                last_run_at: now,
                last_run_status: 'skipped',
                last_run_message: 'No beds empty for 24+ hours',
                run_count: sql`${automationConfigs.run_count} + 1`,
              })
              .where(eq(automationConfigs.id, autoConfig.id));
          }

          results.push({ orgId: org.id, orgName: org.name, emptyBeds: 0, lostRevenue: 0, errors: 0 });
          continue;
        }

        // Get house info for each empty bed via room join
        // Build a map of roomId -> houseId
        const roomIds = [...new Set(emptyBeds.map((b) => b.roomId))];
        const roomRows = await db
          .select({ id: rooms.id, houseId: rooms.house_id })
          .from(rooms)
          .where(isNull(rooms.deleted_at));

        const roomToHouse = new Map(roomRows.map((r) => [r.id, r.houseId]));

        // Group empty beds by house
        const bedsByHouse = new Map<string, typeof emptyBeds>();
        for (const bed of emptyBeds) {
          const houseId = roomToHouse.get(bed.roomId);
          if (!houseId) continue;
          const existing = bedsByHouse.get(houseId) ?? [];
          existing.push(bed);
          bedsByHouse.set(houseId, existing);
        }

        const houseLines: string[] = [];

        for (const [houseId, houseBeds] of bedsByHouse) {
          try {
            const [house] = await db
              .select()
              .from(houses)
              .where(and(eq(houses.id, houseId), eq(houses.org_id, org.id)))
              .limit(1);

            if (!house) continue;

            // Get monthly rate for this house
            let rate = await db.query.rateConfigs.findFirst({
              where: and(
                eq(rateConfigs.org_id, org.id),
                eq(rateConfigs.house_id, houseId),
                eq(rateConfigs.is_active, true),
                eq(rateConfigs.billing_frequency, 'monthly')
              ),
            });

            if (!rate) {
              rate = await db.query.rateConfigs.findFirst({
                where: and(
                  eq(rateConfigs.org_id, org.id),
                  isNull(rateConfigs.house_id),
                  eq(rateConfigs.is_active, true),
                  eq(rateConfigs.billing_frequency, 'monthly')
                ),
              });
            }

            const monthlyRate = rate ? parseFloat(rate.amount) : 0;
            const dailyRate = monthlyRate / 30;

            // Calculate days empty per bed and total lost revenue
            let houseLostRevenue = 0;
            for (const bed of houseBeds) {
              const daysEmpty = Math.floor((now.getTime() - bed.updatedAt.getTime()) / (1000 * 60 * 60 * 24));
              houseLostRevenue += daysEmpty * dailyRate;
            }

            totalLostRevenue += houseLostRevenue;
            emptyBedCount += houseBeds.length;

            const daysStr = houseBeds.map((b) => {
              const days = Math.floor((now.getTime() - b.updatedAt.getTime()) / (1000 * 60 * 60 * 24));
              return `  - ${b.name}: ${days} day${days !== 1 ? 's' : ''} empty`;
            });

            houseLines.push(
              `${house.name}: ${houseBeds.length} empty bed${houseBeds.length !== 1 ? 's' : ''}`,
              ...daysStr,
              monthlyRate > 0 ? `  Lost revenue: ${formatCurrency(houseLostRevenue)}` : `  (No rate configured)`
            );
          } catch (houseErr) {
            console.error(`[Cron] Empty bed alert failed for house ${houseId}:`, houseErr);
            errors++;
          }
        }

        // Check waitlist for this org
        const waitlistCount = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(waitlistEntries)
          .where(
            and(
              eq(waitlistEntries.org_id, org.id),
              eq(waitlistEntries.status, 'new')
            )
          );

        const pendingWaitlist = waitlistCount[0]?.count ?? 0;

        // Build alert message
        const alertLines = [
          `Empty Bed Alert — ${emptyBedCount} bed${emptyBedCount !== 1 ? 's' : ''} available for 24+ hours`,
          '',
          ...houseLines,
          '',
          `Total estimated lost revenue: ${formatCurrency(totalLostRevenue)}`,
        ];

        if (pendingWaitlist > 0) {
          alertLines.push('');
          alertLines.push(`Waitlist: ${pendingWaitlist} applicant${pendingWaitlist !== 1 ? 's' : ''} waiting for a bed. Consider reaching out.`);
        }

        await sendSystemMessage(org.id, 'Empty Bed Alert', alertLines.join('\n'));
      } catch (orgErr: any) {
        console.error(`[Cron] Empty bed alert failed for org ${org.id}:`, orgErr);
        errors++;
      }

      // Log to automation_logs
      await db.insert(automationLogs).values({
        org_id: org.id,
        automation_key: 'empty_bed_alert',
        status: errors > 0 ? 'error' : emptyBedCount > 0 ? 'success' : 'skipped',
        message: `${emptyBedCount} empty beds found, ${formatCurrency(totalLostRevenue)} in lost revenue`,
        details: { emptyBeds: emptyBedCount, lostRevenue: totalLostRevenue, errors },
      });

      // Update automation_configs last run
      if (autoConfig) {
        await db
          .update(automationConfigs)
          .set({
            last_run_at: now,
            last_run_status: errors > 0 ? 'error' : emptyBedCount > 0 ? 'success' : 'skipped',
            last_run_message: `${emptyBedCount} empty beds, ${formatCurrency(totalLostRevenue)} lost revenue`,
            run_count: sql`${automationConfigs.run_count} + 1`,
          })
          .where(eq(automationConfigs.id, autoConfig.id));
      }

      totalEmpty += emptyBedCount;
      totalErrors += errors;
      results.push({ orgId: org.id, orgName: org.name, emptyBeds: emptyBedCount, lostRevenue: totalLostRevenue, errors });
    }

    return NextResponse.json({
      success: true,
      emptyBeds: totalEmpty,
      errors: totalErrors,
      skipped,
      results,
      timestamp: now.toISOString(),
    });
  } catch (error: any) {
    console.error('[Cron] Empty bed alert failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

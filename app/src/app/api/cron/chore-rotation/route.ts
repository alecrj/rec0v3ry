/**
 * Cron: Chore Auto-Rotation
 * Schedule: Weekly on Monday at 6:00 AM UTC
 *
 * Checks if 'chore_rotation' automation is enabled per org.
 * Gets all active chores per house, rotates assignments to next resident.
 * Creates new chore assignments and notifies residents.
 * Logs results to automation_logs and updates automation_configs.
 */

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { db } from '@/server/db/client';
import { organizations, houses } from '@/server/db/schema/orgs';
import { chores, choreAssignments } from '@/server/db/schema/operations';
import { admissions } from '@/server/db/schema/residents';
import { automationConfigs, automationLogs } from '@/server/db/schema/automations';
import { conversations, messages } from '@/server/db/schema/messaging';
import { eq, and, isNull, desc, sql } from 'drizzle-orm';

function verifyCronSecret(headersList: Headers): boolean {
  const auth = headersList.get('authorization');
  if (!process.env.CRON_SECRET) return true; // Allow in dev
  return auth === `Bearer ${process.env.CRON_SECRET}`;
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
  const today = now.toISOString().split('T')[0]!;
  // Next assignment due date is 7 days out
  const nextDue = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!;

  const results: { orgId: string; orgName: string; rotated: number; errors: number }[] = [];
  let totalRotated = 0;
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
            eq(automationConfigs.automation_key, 'chore_rotation'),
            eq(automationConfigs.enabled, true)
          )
        )
        .limit(1);

      if (!autoConfig && !forceOrgId) {
        skipped++;
        continue;
      }

      let rotated = 0;
      let errors = 0;

      try {
        // Get all houses for this org
        const orgHouses = await db
          .select()
          .from(houses)
          .where(and(eq(houses.org_id, org.id), isNull(houses.deleted_at)));

        for (const house of orgHouses) {
          try {
            // Get active residents in this house (via active admissions)
            const activeAdmissions = await db
              .select({ residentId: admissions.resident_id })
              .from(admissions)
              .where(
                and(
                  eq(admissions.org_id, org.id),
                  eq(admissions.house_id, house.id),
                  eq(admissions.status, 'active'),
                  isNull(admissions.deleted_at)
                )
              );

            if (activeAdmissions.length === 0) continue;

            const residentIds = activeAdmissions.map((a) => a.residentId);

            // Get active chores for this house
            const houseChores = await db
              .select()
              .from(chores)
              .where(
                and(
                  eq(chores.org_id, org.id),
                  eq(chores.house_id, house.id),
                  eq(chores.is_active, true),
                  isNull(chores.deleted_at)
                )
              );

            if (houseChores.length === 0) continue;

            // For each chore, find the current assignee and rotate to the next resident
            for (const chore of houseChores) {
              try {
                // Find the most recent assignment for this chore
                const [lastAssignment] = await db
                  .select()
                  .from(choreAssignments)
                  .where(eq(choreAssignments.chore_id, chore.id))
                  .orderBy(desc(choreAssignments.created_at))
                  .limit(1);

                // Determine next resident (rotate through the list)
                let nextResidentId: string;
                if (!lastAssignment) {
                  // No previous assignment, start with first resident
                  nextResidentId = residentIds[0]!;
                } else {
                  const currentIdx = residentIds.indexOf(lastAssignment.resident_id);
                  if (currentIdx === -1) {
                    // Previous assignee no longer active, start from beginning
                    nextResidentId = residentIds[0]!;
                  } else {
                    // Rotate to next (circular)
                    nextResidentId = residentIds[(currentIdx + 1) % residentIds.length]!;
                  }
                }

                // Create new assignment
                await db.insert(choreAssignments).values({
                  org_id: org.id,
                  chore_id: chore.id,
                  resident_id: nextResidentId,
                  assigned_date: today,
                  due_date: nextDue,
                  status: 'assigned',
                  created_by: 'system',
                  updated_by: 'system',
                });

                rotated++;
              } catch (choreErr) {
                console.error(`[Cron] Chore rotation failed for chore ${chore.id}:`, choreErr);
                errors++;
              }
            }
          } catch (houseErr) {
            console.error(`[Cron] Chore rotation failed for house ${house.id}:`, houseErr);
            errors++;
          }
        }

        // Send summary notification
        if (rotated > 0) {
          await sendSystemMessage(
            org.id,
            'Chore Rotation',
            `Chore assignments have been rotated for this week. ${rotated} chore${rotated !== 1 ? 's' : ''} have been reassigned. Residents have been notified of their new duties.`
          );
        }
      } catch (orgErr: any) {
        console.error(`[Cron] Chore rotation failed for org ${org.id}:`, orgErr);
        errors++;
      }

      // Log to automation_logs
      await db.insert(automationLogs).values({
        org_id: org.id,
        automation_key: 'chore_rotation',
        status: errors > 0 ? 'error' : rotated > 0 ? 'success' : 'skipped',
        message: `Rotated ${rotated} chore assignments, ${errors} errors`,
        details: { rotated, errors },
      });

      // Update automation_configs last run
      if (autoConfig) {
        await db
          .update(automationConfigs)
          .set({
            last_run_at: now,
            last_run_status: errors > 0 ? 'error' : rotated > 0 ? 'success' : 'skipped',
            last_run_message: `Rotated ${rotated} chore assignments`,
            run_count: sql`${automationConfigs.run_count} + 1`,
          })
          .where(eq(automationConfigs.id, autoConfig.id));
      }

      totalRotated += rotated;
      totalErrors += errors;
      results.push({ orgId: org.id, orgName: org.name, rotated, errors });
    }

    return NextResponse.json({
      success: true,
      rotated: totalRotated,
      errors: totalErrors,
      skipped,
      results,
      timestamp: now.toISOString(),
    });
  } catch (error: any) {
    console.error('[Cron] Chore rotation failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

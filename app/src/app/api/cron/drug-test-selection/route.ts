/**
 * Cron: Random Drug Test Selection
 * Schedule: Weekly (configurable via automation settings)
 *
 * Checks if 'random_drug_test' automation is enabled per org.
 * Reads settings: { frequency, selectionPercent }.
 * Randomly selects X% of active residents per house.
 * Creates drug_test records with status='scheduled'.
 * Notifies house manager via system message.
 * Logs results to automation_logs and updates automation_configs.
 */

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { db } from '@/server/db/client';
import { organizations, houses } from '@/server/db/schema/orgs';
import { drugTests } from '@/server/db/schema/operations';
import { admissions } from '@/server/db/schema/residents';
import { automationConfigs, automationLogs } from '@/server/db/schema/automations';
import { conversations, messages } from '@/server/db/schema/messaging';
import { eq, and, isNull, sql } from 'drizzle-orm';

function verifyCronSecret(headersList: Headers): boolean {
  const auth = headersList.get('authorization');
  if (!process.env.CRON_SECRET) return true; // Allow in dev
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

interface DrugTestSettings {
  frequency?: string;
  selectionPercent?: number;
}

function getSettings(settings: unknown): DrugTestSettings {
  const s = settings as Record<string, unknown> | null | undefined;
  return {
    frequency: (s?.frequency as string) ?? 'weekly',
    selectionPercent: (s?.selectionPercent as number) ?? 25,
  };
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

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return shuffled;
}

export async function GET(req: Request) {
  const headersList = await headers();
  if (!verifyCronSecret(headersList)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const results: { orgId: string; orgName: string; selected: number; errors: number }[] = [];
  let totalSelected = 0;
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
            eq(automationConfigs.automation_key, 'random_drug_test'),
            eq(automationConfigs.enabled, true)
          )
        )
        .limit(1);

      if (!autoConfig && !forceOrgId) {
        skipped++;
        continue;
      }

      const settings = getSettings(autoConfig?.settings);
      const selectionPercent = Math.max(1, Math.min(100, settings.selectionPercent ?? 25));

      let selected = 0;
      let errors = 0;

      try {
        // Get all houses for this org
        const orgHouses = await db
          .select()
          .from(houses)
          .where(and(eq(houses.org_id, org.id), isNull(houses.deleted_at)));

        const allSelectedNames: string[] = [];

        for (const house of orgHouses) {
          try {
            // Get active residents in this house
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

            // Randomly select X% (minimum 1 if there are residents)
            const countToSelect = Math.max(1, Math.round(residentIds.length * (selectionPercent / 100)));
            const shuffled = shuffleArray(residentIds);
            const selectedResidents = shuffled.slice(0, countToSelect);

            // Create drug test records for selected residents
            for (const residentId of selectedResidents) {
              try {
                await db.insert(drugTests).values({
                  org_id: org.id,
                  resident_id: residentId,
                  test_type: 'urine',
                  test_date: now,
                  is_random: true,
                  notes: `Auto-scheduled by random drug test automation on ${now.toLocaleDateString()}`,
                  created_by: 'system',
                  updated_by: 'system',
                });
                selected++;
              } catch (resErr) {
                console.error(`[Cron] Drug test creation failed for resident ${residentId}:`, resErr);
                errors++;
              }
            }

            allSelectedNames.push(`${house.name}: ${selectedResidents.length} resident${selectedResidents.length !== 1 ? 's' : ''} selected`);
          } catch (houseErr) {
            console.error(`[Cron] Drug test selection failed for house ${house.id}:`, houseErr);
            errors++;
          }
        }

        // Notify house manager / org owner
        if (selected > 0) {
          const summaryLines = [
            `Random drug test selection complete for this week:`,
            '',
            ...allSelectedNames,
            '',
            `Total: ${selected} resident${selected !== 1 ? 's' : ''} selected for testing (${selectionPercent}% selection rate).`,
            `Please schedule tests at your earliest convenience.`,
          ];

          await sendSystemMessage(
            org.id,
            'Drug Test Selection',
            summaryLines.join('\n')
          );
        }
      } catch (orgErr: any) {
        console.error(`[Cron] Drug test selection failed for org ${org.id}:`, orgErr);
        errors++;
      }

      // Log to automation_logs
      await db.insert(automationLogs).values({
        org_id: org.id,
        automation_key: 'random_drug_test',
        status: errors > 0 ? 'error' : selected > 0 ? 'success' : 'skipped',
        message: `Selected ${selected} residents for drug testing, ${errors} errors`,
        details: { selected, errors, selectionPercent },
      });

      // Update automation_configs last run
      if (autoConfig) {
        await db
          .update(automationConfigs)
          .set({
            last_run_at: now,
            last_run_status: errors > 0 ? 'error' : selected > 0 ? 'success' : 'skipped',
            last_run_message: `Selected ${selected} residents for drug testing`,
            run_count: sql`${automationConfigs.run_count} + 1`,
          })
          .where(eq(automationConfigs.id, autoConfig.id));
      }

      totalSelected += selected;
      totalErrors += errors;
      results.push({ orgId: org.id, orgName: org.name, selected, errors });
    }

    return NextResponse.json({
      success: true,
      selected: totalSelected,
      errors: totalErrors,
      skipped,
      results,
      timestamp: now.toISOString(),
    });
  } catch (error: any) {
    console.error('[Cron] Drug test selection failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

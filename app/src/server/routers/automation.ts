/**
 * Automation Router
 *
 * Manages automation configs and logs for per-org toggleable automations.
 * Each automation is defined in AUTOMATION_DEFINITIONS and can be enabled/disabled per org.
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { db } from '../db/client';
import { automationConfigs, automationLogs } from '../db/schema/automations';
import { eq, and, desc, sql } from 'drizzle-orm';

// ─── Automation Definitions ─────────────────────────────
// Static registry of all available automations.
// DB rows in automation_configs only exist once toggled/configured.

export interface AutomationDefinition {
  key: string;
  name: string;
  description: string;
  icon: string;
  category: 'payments' | 'operations' | 'occupancy' | 'reports' | 'admissions';
  defaultSettings: Record<string, unknown>;
}

export const AUTOMATION_DEFINITIONS: AutomationDefinition[] = [
  { key: 'daily_digest', name: 'Daily Digest', description: 'Morning summary of business metrics', icon: 'sunrise', category: 'reports', defaultSettings: { sendTime: '07:00' } },
  { key: 'rent_reminders', name: 'Rent Reminders', description: 'Automatic payment reminders before and after due dates', icon: 'bell', category: 'payments', defaultSettings: {} },
  { key: 'payment_receipt', name: 'Payment Receipt', description: 'Send confirmation when payment is received', icon: 'check', category: 'payments', defaultSettings: {} },
  { key: 'empty_bed_alert', name: 'Empty Bed Alert', description: 'Alert when a bed is vacated with lost revenue calculation', icon: 'bed', category: 'occupancy', defaultSettings: {} },
  { key: 'late_payment_escalation', name: 'Late Payment Escalation', description: 'Escalating messages for overdue payments', icon: 'alert-triangle', category: 'payments', defaultSettings: {} },
  { key: 'random_drug_test', name: 'Random Drug Test Selection', description: 'Randomly select residents for drug testing', icon: 'flask-conical', category: 'operations', defaultSettings: { frequency: 'weekly', selectionPercent: 25 } },
  { key: 'chore_rotation', name: 'Chore Auto-Rotation', description: 'Weekly automatic chore assignment rotation', icon: 'refresh-cw', category: 'operations', defaultSettings: { rotationDay: 'monday' } },
  { key: 'meeting_compliance', name: 'Meeting Compliance Check', description: 'Alert when residents are behind on required meetings', icon: 'calendar', category: 'operations', defaultSettings: {} },
  { key: 'weekly_pnl', name: 'Weekly P&L Report', description: 'Monday morning profit & loss summary per house', icon: 'trending-up', category: 'reports', defaultSettings: { sendDay: 'monday', sendTime: '08:00' } },
  { key: 'new_applicant_alert', name: 'New Applicant Alert', description: 'Instant notification when someone applies', icon: 'user-plus', category: 'admissions', defaultSettings: {} },
  { key: 'waitlist_notification', name: 'Waitlist Notification', description: 'Auto-notify top waitlist person when bed opens', icon: 'list', category: 'occupancy', defaultSettings: {} },
];

const AUTOMATION_KEYS = AUTOMATION_DEFINITIONS.map((d) => d.key);

// ─── Router ─────────────────────────────────────────────

export const automationRouter = router({
  /**
   * List all automations for this org.
   * Merges static definitions with any DB config rows.
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const orgId = (ctx as any).orgId as string;

    const configs = await db
      .select()
      .from(automationConfigs)
      .where(eq(automationConfigs.org_id, orgId));

    const configMap = new Map(configs.map((c) => [c.automation_key, c]));

    return AUTOMATION_DEFINITIONS.map((def) => {
      const cfg = configMap.get(def.key);
      return {
        ...def,
        enabled: cfg?.enabled ?? false,
        settings: (cfg?.settings as Record<string, unknown>) ?? def.defaultSettings,
        lastRunAt: cfg?.last_run_at?.toISOString() ?? null,
        lastRunStatus: cfg?.last_run_status ?? null,
        lastRunMessage: cfg?.last_run_message ?? null,
        runCount: cfg?.run_count ?? 0,
      };
    });
  }),

  /**
   * Toggle an automation on or off (upsert).
   */
  toggle: protectedProcedure
    .input(
      z.object({
        key: z.string().refine((k) => AUTOMATION_KEYS.includes(k), { message: 'Unknown automation key' }),
        enabled: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;

      const def = AUTOMATION_DEFINITIONS.find((d) => d.key === input.key)!;

      // Upsert: insert or update
      const existing = await db
        .select()
        .from(automationConfigs)
        .where(
          and(
            eq(automationConfigs.org_id, orgId),
            eq(automationConfigs.automation_key, input.key)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(automationConfigs)
          .set({ enabled: input.enabled, updated_at: new Date() })
          .where(eq(automationConfigs.id, existing[0].id));
      } else {
        await db.insert(automationConfigs).values({
          org_id: orgId,
          automation_key: input.key,
          enabled: input.enabled,
          settings: def.defaultSettings,
        });
      }

      return { key: input.key, enabled: input.enabled };
    }),

  /**
   * Get settings for a specific automation.
   */
  getSettings: protectedProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;
      const def = AUTOMATION_DEFINITIONS.find((d) => d.key === input.key);
      if (!def) return { key: input.key, settings: {} };

      const [cfg] = await db
        .select()
        .from(automationConfigs)
        .where(
          and(
            eq(automationConfigs.org_id, orgId),
            eq(automationConfigs.automation_key, input.key)
          )
        )
        .limit(1);

      return {
        key: input.key,
        settings: (cfg?.settings as Record<string, unknown>) ?? def.defaultSettings,
      };
    }),

  /**
   * Update settings for a specific automation (upsert).
   */
  updateSettings: protectedProcedure
    .input(
      z.object({
        key: z.string().refine((k) => AUTOMATION_KEYS.includes(k), { message: 'Unknown automation key' }),
        settings: z.record(z.string(), z.unknown()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;

      const existing = await db
        .select()
        .from(automationConfigs)
        .where(
          and(
            eq(automationConfigs.org_id, orgId),
            eq(automationConfigs.automation_key, input.key)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(automationConfigs)
          .set({ settings: input.settings, updated_at: new Date() })
          .where(eq(automationConfigs.id, existing[0].id));
      } else {
        await db.insert(automationConfigs).values({
          org_id: orgId,
          automation_key: input.key,
          enabled: false,
          settings: input.settings,
        });
      }

      return { key: input.key, settings: input.settings };
    }),

  /**
   * Get recent automation run logs (paginated).
   */
  getLog: protectedProcedure
    .input(
      z.object({
        key: z.string().optional(), // filter by automation key
        limit: z.number().min(1).max(100).default(25),
        cursor: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;

      const conditions = [eq(automationLogs.org_id, orgId)];

      if (input.key) {
        conditions.push(eq(automationLogs.automation_key, input.key));
      }

      if (input.cursor) {
        conditions.push(sql`${automationLogs.id} > ${input.cursor}`);
      }

      const items = await db
        .select()
        .from(automationLogs)
        .where(and(...conditions))
        .orderBy(desc(automationLogs.ran_at))
        .limit(input.limit + 1);

      const hasMore = items.length > input.limit;
      const results = hasMore ? items.slice(0, input.limit) : items;

      return {
        items: results.map((r) => ({
          id: r.id,
          automationKey: r.automation_key,
          status: r.status,
          message: r.message,
          details: r.details,
          ranAt: r.ran_at.toISOString(),
        })),
        nextCursor: hasMore ? results[results.length - 1]?.id : null,
      };
    }),

  /**
   * Manually trigger an automation run (for testing).
   * This just logs an entry; actual logic lives in cron routes.
   */
  runNow: protectedProcedure
    .input(
      z.object({
        key: z.string().refine((k) => AUTOMATION_KEYS.includes(k), { message: 'Unknown automation key' }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;

      // Trigger the appropriate cron endpoint internally
      const cronMap: Record<string, string> = {
        rent_reminders: '/api/cron/send-reminders',
        late_payment_escalation: '/api/cron/apply-late-fees',
        daily_digest: '/api/cron/daily-digest',
        chore_rotation: '/api/cron/chore-rotation',
        random_drug_test: '/api/cron/drug-test-selection',
        empty_bed_alert: '/api/cron/empty-bed-alert',
        weekly_pnl: '/api/cron/weekly-pnl',
        invoice_generation: '/api/cron/generate-invoices',
      };

      const cronPath = cronMap[input.key];

      if (cronPath) {
        // Call our own cron route via internal URL
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        try {
          const res = await fetch(`${baseUrl}${cronPath}`, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${process.env.CRON_SECRET}`,
              'x-force-org-id': orgId,
            },
          });
          const data = await res.json();
          return { triggered: true, result: data };
        } catch (err: any) {
          return { triggered: false, error: err.message };
        }
      }

      // For automations without a cron route yet, log a manual trigger
      await db.insert(automationLogs).values({
        org_id: orgId,
        automation_key: input.key,
        status: 'skipped',
        message: 'Manual trigger — cron handler not yet implemented',
      });

      // Update last run
      const existing = await db
        .select()
        .from(automationConfigs)
        .where(
          and(
            eq(automationConfigs.org_id, orgId),
            eq(automationConfigs.automation_key, input.key)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(automationConfigs)
          .set({
            last_run_at: new Date(),
            last_run_status: 'skipped',
            last_run_message: 'Manual trigger — cron handler not yet implemented',
            run_count: sql`${automationConfigs.run_count} + 1`,
          })
          .where(eq(automationConfigs.id, existing[0].id));
      }

      return { triggered: false, message: 'Automation does not have a cron handler yet' };
    }),
});

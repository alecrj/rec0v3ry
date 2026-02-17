/**
 * Reporting Router
 *
 * Dashboard queries and data export for all reporting modules.
 * Source: docs/06_ROADMAP.md Sprint 19 (Reporting + Dashboards)
 *
 * Features:
 * - RPT-01: Occupancy dashboard
 * - RPT-02: Financial dashboard
 * - RPT-03: Operations dashboard
 * - RPT-05: Compliance dashboard
 * - RPT-11: Data export (CSV, JSON)
 * - CMP-07: Accounting of disclosures report
 * - CMP-10: Compliance officer dashboard
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { beds, houses, properties } from '../db/schema/orgs';
import { residents, admissions, leads } from '../db/schema/residents';
import { invoices, payments, ledgerEntries, ledgerAccounts } from '../db/schema/payments';
import { chores, choreAssignments, meetings, meetingAttendance, drugTests, incidents, passes } from '../db/schema/operations';
import { consents, consentDisclosures, breachIncidents } from '../db/schema/compliance';
import { auditLogs } from '../db/schema/audit';
import { eq, and, desc, gte, lte, sql, count, sum, isNull, isNotNull, inArray, ne, or } from 'drizzle-orm';

/**
 * Date range input schema (reusable)
 */
const dateRangeSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

/**
 * Export format schema
 */
const exportFormatSchema = z.enum(['csv', 'json', 'pdf']);

/**
 * Reporting router
 */
export const reportingRouter = router({
  // ============================================================
  // OCCUPANCY DASHBOARD (RPT-01)
  // ============================================================

  /**
   * Get occupancy summary
   * Returns bed counts, occupancy rate, trends
   */
  getOccupancySummary: protectedProcedure
    .meta({ permission: 'report:read', resource: 'report' })
    .input(z.object({
      propertyId: z.string().uuid().optional(),
      houseId: z.string().uuid().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const orgId = (ctx as unknown as { orgId: string }).orgId;
      const propertyFilter = input?.propertyId;
      const houseFilter = input?.houseId;

      // Build bed conditions
      const bedConditions = [eq(beds.org_id, orgId), isNull(beds.deleted_at)];

      // Get all beds with house info
      const allBeds = await ctx.db.query.beds.findMany({
        where: and(...bedConditions),
        with: {
          room: {
            with: {
              house: true,
            },
          },
        },
      });

      // Filter by property/house if specified
      const filteredBeds = allBeds.filter((bed) => {
        if (houseFilter && bed.room.house_id !== houseFilter) return false;
        if (propertyFilter && bed.room.house.property_id !== propertyFilter) return false;
        return true;
      });

      // Count by status
      const statusCounts = {
        available: 0,
        occupied: 0,
        reserved: 0,
        maintenance: 0,
        out_of_service: 0,
      };

      for (const bed of filteredBeds) {
        const status = bed.status as keyof typeof statusCounts;
        if (status in statusCounts) {
          statusCounts[status]++;
        }
      }

      const totalBeds = filteredBeds.length;
      const occupiedBeds = statusCounts.occupied;
      const occupancyRate = totalBeds > 0 ? (occupiedBeds / totalBeds) * 100 : 0;

      // Get waitlist count (leads in 'accepted' status waiting for bed)
      const [waitlistResult] = await ctx.db
        .select({ count: count() })
        .from(leads)
        .where(
          and(
            eq(leads.org_id, orgId),
            eq(leads.status, 'accepted'),
            isNull(leads.deleted_at),
            isNull(leads.converted_to_resident_id)
          )
        );

      // Get active admissions for avg length of stay calculation
      const activeAdmissions = await ctx.db.query.admissions.findMany({
        where: and(
          eq(admissions.org_id, orgId),
          eq(admissions.status, 'active'),
          isNull(admissions.deleted_at)
        ),
      });

      // Calculate avg length of stay (days)
      const today = new Date();
      let totalDays = 0;
      for (const admission of activeAdmissions) {
        const admissionDate = new Date(admission.admission_date);
        const days = Math.floor((today.getTime() - admissionDate.getTime()) / (1000 * 60 * 60 * 24));
        totalDays += days;
      }
      const avgLengthOfStay = activeAdmissions.length > 0 ? Math.round(totalDays / activeAdmissions.length) : 0;

      return {
        totalBeds,
        occupiedBeds,
        availableBeds: statusCounts.available,
        reservedBeds: statusCounts.reserved,
        maintenanceBeds: statusCounts.maintenance,
        outOfServiceBeds: statusCounts.out_of_service,
        occupancyRate: Math.round(occupancyRate * 10) / 10,
        waitlistCount: waitlistResult?.count || 0,
        activeResidents: activeAdmissions.length,
        avgLengthOfStayDays: avgLengthOfStay,
      };
    }),

  /**
   * Get occupancy trends over time
   */
  getOccupancyTrends: protectedProcedure
    .meta({ permission: 'report:read', resource: 'report' })
    .input(z.object({
      startDate: z.string().datetime(),
      endDate: z.string().datetime(),
      groupBy: z.enum(['day', 'week', 'month']).default('day'),
    }))
    .query(async ({ ctx, input }) => {
      const orgId = (ctx as unknown as { orgId: string }).orgId;
      const startDate = new Date(input.startDate);
      const endDate = new Date(input.endDate);

      // Get admissions and discharges in date range
      const admissionsInRange = await ctx.db.query.admissions.findMany({
        where: and(
          eq(admissions.org_id, orgId),
          isNull(admissions.deleted_at),
          or(
            and(gte(admissions.admission_date, startDate.toISOString().split('T')[0]!), lte(admissions.admission_date, endDate.toISOString().split('T')[0]!)),
            and(isNotNull(admissions.actual_discharge_date), gte(admissions.actual_discharge_date, startDate.toISOString().split('T')[0]!), lte(admissions.actual_discharge_date, endDate.toISOString().split('T')[0]!))
          )
        ),
      });

      // Get total beds for occupancy calculation
      const [bedsResult] = await ctx.db
        .select({ count: count() })
        .from(beds)
        .where(and(eq(beds.org_id, orgId), isNull(beds.deleted_at)));

      const totalBeds = bedsResult?.count || 1;

      // Group by date
      const dateFormat = input.groupBy === 'month' ? 'YYYY-MM' : input.groupBy === 'week' ? 'YYYY-WW' : 'YYYY-MM-DD';

      // Build trend data points
      const trendData: { date: string; moveIns: number; moveOuts: number; netChange: number }[] = [];
      const current = new Date(startDate);

      while (current <= endDate) {
        const dateStr = current.toISOString().split('T')[0]!;

        // Count move-ins and move-outs for this date
        const moveIns = admissionsInRange.filter(a => a.admission_date === dateStr).length;
        const moveOuts = admissionsInRange.filter(a => a.actual_discharge_date === dateStr).length;

        trendData.push({
          date: dateStr,
          moveIns,
          moveOuts,
          netChange: moveIns - moveOuts,
        });

        // Increment based on groupBy
        if (input.groupBy === 'month') {
          current.setMonth(current.getMonth() + 1);
        } else if (input.groupBy === 'week') {
          current.setDate(current.getDate() + 7);
        } else {
          current.setDate(current.getDate() + 1);
        }
      }

      return {
        trends: trendData,
        totalBeds,
        dateRange: { startDate: input.startDate, endDate: input.endDate },
      };
    }),

  /**
   * Get occupancy by property/house
   */
  getOccupancyByLocation: protectedProcedure
    .meta({ permission: 'report:read', resource: 'report' })
    .query(async ({ ctx }) => {
      const orgId = (ctx as unknown as { orgId: string }).orgId;

      // Get all houses with their beds
      const allHouses = await ctx.db.query.houses.findMany({
        where: and(eq(houses.org_id, orgId), isNull(houses.deleted_at)),
        with: {
          property: true,
          rooms: {
            with: {
              beds: true,
            },
          },
        },
      });

      const byHouse = allHouses.map((house) => {
        const allBeds = house.rooms.flatMap((r) => r.beds);
        const totalBeds = allBeds.length;
        const occupiedBeds = allBeds.filter((b) => b.status === 'occupied').length;
        const occupancyRate = totalBeds > 0 ? (occupiedBeds / totalBeds) * 100 : 0;

        return {
          houseId: house.id,
          houseName: house.name,
          propertyId: house.property_id,
          propertyName: house.property.name,
          totalBeds,
          occupiedBeds,
          availableBeds: totalBeds - occupiedBeds,
          occupancyRate: Math.round(occupancyRate * 10) / 10,
        };
      });

      // Aggregate by property
      const propertyMap = new Map<string, { id: string; name: string; totalBeds: number; occupiedBeds: number }>();
      for (const house of byHouse) {
        const existing = propertyMap.get(house.propertyId) || {
          id: house.propertyId,
          name: house.propertyName,
          totalBeds: 0,
          occupiedBeds: 0,
        };
        existing.totalBeds += house.totalBeds;
        existing.occupiedBeds += house.occupiedBeds;
        propertyMap.set(house.propertyId, existing);
      }

      const byProperty = Array.from(propertyMap.values()).map((p) => ({
        ...p,
        availableBeds: p.totalBeds - p.occupiedBeds,
        occupancyRate: p.totalBeds > 0 ? Math.round((p.occupiedBeds / p.totalBeds) * 100 * 10) / 10 : 0,
      }));

      return { byHouse, byProperty };
    }),

  // ============================================================
  // FINANCIAL DASHBOARD (RPT-02)
  // ============================================================

  /**
   * Get financial summary
   * Revenue, collections, outstanding, aging buckets
   */
  getFinancialSummary: protectedProcedure
    .meta({ permission: 'report:read', resource: 'report' })
    .input(dateRangeSchema)
    .query(async ({ ctx, input }) => {
      const orgId = (ctx as unknown as { orgId: string }).orgId;
      const startDate = new Date(input.startDate);
      const endDate = new Date(input.endDate);

      // Get invoices in date range
      const invoicesInRange = await ctx.db.query.invoices.findMany({
        where: and(
          eq(invoices.org_id, orgId),
          isNull(invoices.deleted_at),
          gte(invoices.issue_date, startDate.toISOString().split('T')[0]!),
          lte(invoices.issue_date, endDate.toISOString().split('T')[0]!)
        ),
      });

      // Get payments in date range
      const paymentsInRange = await ctx.db.query.payments.findMany({
        where: and(
          eq(payments.org_id, orgId),
          isNull(payments.deleted_at),
          eq(payments.status, 'succeeded'),
          gte(payments.payment_date, startDate),
          lte(payments.payment_date, endDate)
        ),
      });

      // Calculate totals
      const totalInvoiced = invoicesInRange.reduce((sum, inv) => sum + parseFloat(inv.total), 0);
      const totalCollected = paymentsInRange.reduce((sum, pay) => sum + parseFloat(pay.amount), 0);
      const collectionRate = totalInvoiced > 0 ? (totalCollected / totalInvoiced) * 100 : 0;

      // Get all outstanding invoices (overdue)
      const today = new Date().toISOString().split('T')[0]!;
      const overdueInvoices = await ctx.db.query.invoices.findMany({
        where: and(
          eq(invoices.org_id, orgId),
          isNull(invoices.deleted_at),
          inArray(invoices.status, ['pending', 'overdue']),
          lte(invoices.due_date, today)
        ),
      });

      // Calculate aging buckets
      const now = new Date();
      const aging = {
        current: 0, // 0-30 days
        days31_60: 0,
        days61_90: 0,
        days90Plus: 0,
      };

      for (const inv of overdueInvoices) {
        const dueDate = new Date(inv.due_date);
        const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        const amountDue = parseFloat(inv.amount_due);

        if (daysOverdue <= 30) {
          aging.current += amountDue;
        } else if (daysOverdue <= 60) {
          aging.days31_60 += amountDue;
        } else if (daysOverdue <= 90) {
          aging.days61_90 += amountDue;
        } else {
          aging.days90Plus += amountDue;
        }
      }

      const totalOutstanding = aging.current + aging.days31_60 + aging.days61_90 + aging.days90Plus;

      return {
        totalInvoiced: Math.round(totalInvoiced * 100) / 100,
        totalCollected: Math.round(totalCollected * 100) / 100,
        collectionRate: Math.round(collectionRate * 10) / 10,
        totalOutstanding: Math.round(totalOutstanding * 100) / 100,
        overdueInvoiceCount: overdueInvoices.length,
        aging: {
          current: Math.round(aging.current * 100) / 100,
          days31_60: Math.round(aging.days31_60 * 100) / 100,
          days61_90: Math.round(aging.days61_90 * 100) / 100,
          days90Plus: Math.round(aging.days90Plus * 100) / 100,
        },
        dateRange: { startDate: input.startDate, endDate: input.endDate },
      };
    }),

  /**
   * Get revenue trends over time
   */
  getRevenueTrends: protectedProcedure
    .meta({ permission: 'report:read', resource: 'report' })
    .input(z.object({
      startDate: z.string().datetime(),
      endDate: z.string().datetime(),
      groupBy: z.enum(['day', 'week', 'month']).default('month'),
    }))
    .query(async ({ ctx, input }) => {
      const orgId = (ctx as unknown as { orgId: string }).orgId;

      // Get payments grouped by date
      const paymentsResult = await ctx.db.query.payments.findMany({
        where: and(
          eq(payments.org_id, orgId),
          isNull(payments.deleted_at),
          eq(payments.status, 'succeeded'),
          gte(payments.payment_date, new Date(input.startDate)),
          lte(payments.payment_date, new Date(input.endDate))
        ),
        orderBy: [payments.payment_date],
      });

      // Group by period
      const periodMap = new Map<string, number>();

      for (const payment of paymentsResult) {
        const date = payment.payment_date;
        let periodKey: string;

        if (input.groupBy === 'month') {
          periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        } else if (input.groupBy === 'week') {
          // Get ISO week number
          const d = new Date(date);
          d.setHours(0, 0, 0, 0);
          d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
          const week1 = new Date(d.getFullYear(), 0, 4);
          const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
          periodKey = `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
        } else {
          periodKey = date.toISOString().split('T')[0]!;
        }

        const existing = periodMap.get(periodKey) || 0;
        periodMap.set(periodKey, existing + parseFloat(payment.amount));
      }

      const trends = Array.from(periodMap.entries())
        .map(([period, amount]) => ({ period, amount: Math.round(amount * 100) / 100 }))
        .sort((a, b) => a.period.localeCompare(b.period));

      return {
        trends,
        dateRange: { startDate: input.startDate, endDate: input.endDate },
      };
    }),

  /**
   * Get top delinquent accounts
   */
  getTopDelinquent: protectedProcedure
    .meta({ permission: 'report:read', resource: 'report' })
    .input(z.object({ limit: z.number().min(1).max(50).default(10) }))
    .query(async ({ ctx, input }) => {
      const orgId = (ctx as unknown as { orgId: string }).orgId;

      // Get overdue invoices grouped by resident
      const overdueInvoices = await ctx.db.query.invoices.findMany({
        where: and(
          eq(invoices.org_id, orgId),
          isNull(invoices.deleted_at),
          inArray(invoices.status, ['pending', 'overdue']),
          lte(invoices.due_date, new Date().toISOString().split('T')[0]!)
        ),
        with: {
          resident: {
            columns: {
              id: true,
              first_name: true,
              last_name: true,
            },
          },
        },
      });

      // Group by resident
      const residentMap = new Map<string, { resident: { id: string; first_name: string; last_name: string }; totalDue: number; oldestDueDate: string; invoiceCount: number }>();

      for (const inv of overdueInvoices) {
        const existing = residentMap.get(inv.resident_id) || {
          resident: inv.resident,
          totalDue: 0,
          oldestDueDate: inv.due_date,
          invoiceCount: 0,
        };

        existing.totalDue += parseFloat(inv.amount_due);
        existing.invoiceCount++;
        if (inv.due_date < existing.oldestDueDate) {
          existing.oldestDueDate = inv.due_date;
        }

        residentMap.set(inv.resident_id, existing);
      }

      // Sort by total due and limit
      const sorted = Array.from(residentMap.values())
        .sort((a, b) => b.totalDue - a.totalDue)
        .slice(0, input.limit)
        .map((item) => ({
          residentId: item.resident.id,
          residentName: `${item.resident.first_name} ${item.resident.last_name}`,
          totalDue: Math.round(item.totalDue * 100) / 100,
          invoiceCount: item.invoiceCount,
          oldestDueDate: item.oldestDueDate,
          daysOverdue: Math.floor((Date.now() - new Date(item.oldestDueDate).getTime()) / (1000 * 60 * 60 * 24)),
        }));

      return { delinquentAccounts: sorted };
    }),

  // ============================================================
  // OPERATIONS DASHBOARD (RPT-03)
  // ============================================================

  /**
   * Get operations summary
   * Chore completion, meeting attendance, incidents, drug tests
   */
  getOperationsSummary: protectedProcedure
    .meta({ permission: 'report:read', resource: 'report' })
    .input(dateRangeSchema)
    .query(async ({ ctx, input }) => {
      const orgId = (ctx as unknown as { orgId: string }).orgId;
      const startDate = new Date(input.startDate);
      const endDate = new Date(input.endDate);

      // Chore completion rate
      const choreAssignmentsInRange = await ctx.db.query.choreAssignments.findMany({
        where: and(
          eq(choreAssignments.org_id, orgId),
          gte(choreAssignments.due_date, startDate.toISOString().split('T')[0]!),
          lte(choreAssignments.due_date, endDate.toISOString().split('T')[0]!)
        ),
      });

      const totalChores = choreAssignmentsInRange.length;
      const completedChores = choreAssignmentsInRange.filter((c) => c.status === 'completed' || c.status === 'verified').length;
      const choreCompletionRate = totalChores > 0 ? (completedChores / totalChores) * 100 : 0;

      // Meeting attendance rate
      const meetingAttendanceInRange = await ctx.db.query.meetingAttendance.findMany({
        where: eq(meetingAttendance.org_id, orgId),
        with: {
          meeting: true,
        },
      });

      const filteredAttendance = meetingAttendanceInRange.filter((a) => {
        const meetingDate = a.meeting.scheduled_at;
        return meetingDate >= startDate && meetingDate <= endDate;
      });

      const totalAttendanceRecords = filteredAttendance.length;
      const attendedCount = filteredAttendance.filter((a) => a.attended).length;
      const meetingAttendanceRate = totalAttendanceRecords > 0 ? (attendedCount / totalAttendanceRecords) * 100 : 0;

      // Incident counts by severity
      const incidentsInRange = await ctx.db.query.incidents.findMany({
        where: and(
          eq(incidents.org_id, orgId),
          isNull(incidents.deleted_at),
          gte(incidents.occurred_at, startDate),
          lte(incidents.occurred_at, endDate)
        ),
      });

      const incidentsBySeverity = {
        low: incidentsInRange.filter((i) => i.severity === 'low').length,
        medium: incidentsInRange.filter((i) => i.severity === 'medium').length,
        high: incidentsInRange.filter((i) => i.severity === 'high').length,
        critical: incidentsInRange.filter((i) => i.severity === 'critical').length,
      };

      // Drug test summary
      const drugTestsInRange = await ctx.db.query.drugTests.findMany({
        where: and(
          eq(drugTests.org_id, orgId),
          isNull(drugTests.deleted_at),
          gte(drugTests.test_date, startDate),
          lte(drugTests.test_date, endDate)
        ),
      });

      const totalDrugTests = drugTestsInRange.length;
      const negativeTests = drugTestsInRange.filter((t) => t.result === 'negative').length;
      const positiveTests = drugTestsInRange.filter((t) => t.result === 'positive').length;
      const pendingTests = drugTestsInRange.filter((t) => t.result === 'pending' || !t.result).length;

      // Pass statistics
      const passesInRange = await ctx.db.query.passes.findMany({
        where: and(
          eq(passes.org_id, orgId),
          isNull(passes.deleted_at),
          gte(passes.start_time, startDate),
          lte(passes.start_time, endDate)
        ),
      });

      const totalPasses = passesInRange.length;
      const approvedPasses = passesInRange.filter((p) => p.status === 'approved' || p.status === 'completed').length;
      const violatedPasses = passesInRange.filter((p) => p.was_violated).length;

      return {
        chores: {
          total: totalChores,
          completed: completedChores,
          completionRate: Math.round(choreCompletionRate * 10) / 10,
        },
        meetings: {
          totalAttendanceRecords,
          attended: attendedCount,
          attendanceRate: Math.round(meetingAttendanceRate * 10) / 10,
        },
        incidents: {
          total: incidentsInRange.length,
          bySeverity: incidentsBySeverity,
        },
        drugTests: {
          total: totalDrugTests,
          negative: negativeTests,
          positive: positiveTests,
          pending: pendingTests,
          positiveRate: totalDrugTests > 0 ? Math.round((positiveTests / totalDrugTests) * 100 * 10) / 10 : 0,
        },
        passes: {
          total: totalPasses,
          approved: approvedPasses,
          violated: violatedPasses,
          violationRate: approvedPasses > 0 ? Math.round((violatedPasses / approvedPasses) * 100 * 10) / 10 : 0,
        },
        dateRange: { startDate: input.startDate, endDate: input.endDate },
      };
    }),

  /**
   * Get chore completion by house
   */
  getChoreCompletionByHouse: protectedProcedure
    .meta({ permission: 'report:read', resource: 'report' })
    .input(dateRangeSchema)
    .query(async ({ ctx, input }) => {
      const orgId = (ctx as unknown as { orgId: string }).orgId;
      const startDate = new Date(input.startDate);
      const endDate = new Date(input.endDate);

      // Get all chore assignments with chore (for house_id)
      const assignments = await ctx.db.query.choreAssignments.findMany({
        where: and(
          eq(choreAssignments.org_id, orgId),
          gte(choreAssignments.due_date, startDate.toISOString().split('T')[0]!),
          lte(choreAssignments.due_date, endDate.toISOString().split('T')[0]!)
        ),
        with: {
          chore: {
            with: {
              house: true,
            },
          },
        },
      });

      // Group by house
      const houseMap = new Map<string, { houseName: string; total: number; completed: number }>();

      for (const assignment of assignments) {
        const houseId = assignment.chore.house_id;
        const houseName = assignment.chore.house.name;

        const existing = houseMap.get(houseId) || { houseName, total: 0, completed: 0 };
        existing.total++;
        if (assignment.status === 'completed' || assignment.status === 'verified') {
          existing.completed++;
        }
        houseMap.set(houseId, existing);
      }

      const byHouse = Array.from(houseMap.entries()).map(([houseId, data]) => ({
        houseId,
        houseName: data.houseName,
        total: data.total,
        completed: data.completed,
        completionRate: data.total > 0 ? Math.round((data.completed / data.total) * 100 * 10) / 10 : 0,
      }));

      return { byHouse };
    }),

  // ============================================================
  // COMPLIANCE DASHBOARD (RPT-05, CMP-07, CMP-10)
  // ============================================================

  /**
   * Get compliance summary
   * Consents, disclosures, audit activity, breach incidents
   */
  getComplianceSummary: protectedProcedure
    .meta({ permission: 'compliance:read', resource: 'compliance' })
    .input(dateRangeSchema.optional())
    .query(async ({ ctx, input }) => {
      const orgId = (ctx as unknown as { orgId: string }).orgId;
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      // Get all consents
      const allConsents = await ctx.db.query.consents.findMany({
        where: and(eq(consents.org_id, orgId), isNull(consents.deleted_at)),
      });

      // Consent statistics
      const activeConsents = allConsents.filter((c) => c.status === 'active').length;
      const pendingConsents = allConsents.filter((c) => c.status === 'pending').length;
      const expiredConsents = allConsents.filter((c) => c.status === 'expired').length;
      const revokedConsents = allConsents.filter((c) => c.status === 'revoked').length;

      // Expiring within 30 days
      const expiringConsents = allConsents.filter((c) => {
        if (c.status !== 'active' || !c.expires_at) return false;
        return c.expires_at <= thirtyDaysFromNow && c.expires_at > now;
      }).length;

      // Disclosure count (in date range if provided)
      let disclosureConditions = [eq(consentDisclosures.org_id, orgId)];
      if (input?.startDate && input?.endDate) {
        disclosureConditions.push(
          gte(consentDisclosures.disclosed_at, new Date(input.startDate)),
          lte(consentDisclosures.disclosed_at, new Date(input.endDate))
        );
      }
      const [disclosureResult] = await ctx.db
        .select({ count: count() })
        .from(consentDisclosures)
        .where(and(...disclosureConditions));

      // Open breach incidents
      const openBreaches = await ctx.db.query.breachIncidents.findMany({
        where: and(
          eq(breachIncidents.org_id, orgId),
          ne(breachIncidents.investigation_status, 'closed')
        ),
      });

      // Audit log count (in date range if provided)
      let auditConditions = [eq(auditLogs.org_id, orgId)];
      if (input?.startDate && input?.endDate) {
        auditConditions.push(
          gte(auditLogs.created_at, new Date(input.startDate)),
          lte(auditLogs.created_at, new Date(input.endDate))
        );
      }
      const [auditResult] = await ctx.db
        .select({ count: count() })
        .from(auditLogs)
        .where(and(...auditConditions));

      // Audit by sensitivity level (in date range if provided)
      const auditBySensitivity = await ctx.db
        .select({
          sensitivityLevel: auditLogs.sensitivity_level,
          count: count(),
        })
        .from(auditLogs)
        .where(and(...auditConditions))
        .groupBy(auditLogs.sensitivity_level);

      return {
        consents: {
          total: allConsents.length,
          active: activeConsents,
          pending: pendingConsents,
          expired: expiredConsents,
          revoked: revokedConsents,
          expiringWithin30Days: expiringConsents,
        },
        disclosures: {
          total: disclosureResult?.count || 0,
        },
        breaches: {
          open: openBreaches.length,
          byRiskLevel: {
            low: openBreaches.filter((b) => b.risk_level === 'low').length,
            medium: openBreaches.filter((b) => b.risk_level === 'medium').length,
            high: openBreaches.filter((b) => b.risk_level === 'high').length,
          },
        },
        auditActivity: {
          total: auditResult?.count || 0,
          bySensitivity: auditBySensitivity.reduce((acc, item) => {
            acc[item.sensitivityLevel] = Number(item.count);
            return acc;
          }, {} as Record<string, number>),
        },
        dateRange: input ? { startDate: input.startDate, endDate: input.endDate } : null,
      };
    }),

  /**
   * Get expiring consents list
   */
  getExpiringConsents: protectedProcedure
    .meta({ permission: 'compliance:read', resource: 'compliance' })
    .input(z.object({
      daysAhead: z.number().min(1).max(90).default(30),
      limit: z.number().min(1).max(100).default(25),
    }))
    .query(async ({ ctx, input }) => {
      const orgId = (ctx as unknown as { orgId: string }).orgId;
      const now = new Date();
      const futureDate = new Date(now.getTime() + input.daysAhead * 24 * 60 * 60 * 1000);

      const expiringConsents = await ctx.db.query.consents.findMany({
        where: and(
          eq(consents.org_id, orgId),
          isNull(consents.deleted_at),
          eq(consents.status, 'active'),
          isNotNull(consents.expires_at),
          gte(consents.expires_at, now),
          lte(consents.expires_at, futureDate)
        ),
        with: {
          resident: {
            columns: {
              id: true,
              first_name: true,
              last_name: true,
            },
          },
        },
        orderBy: [consents.expires_at],
        limit: input.limit,
      });

      return {
        consents: expiringConsents.map((c) => ({
          id: c.id,
          residentId: c.resident_id,
          residentName: `${c.resident.first_name} ${c.resident.last_name}`,
          consentType: c.consent_type,
          purpose: c.purpose,
          expiresAt: c.expires_at?.toISOString(),
          daysUntilExpiration: c.expires_at
            ? Math.floor((c.expires_at.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            : null,
        })),
      };
    }),

  /**
   * Get accounting of disclosures (CMP-07)
   * Per-resident disclosure history for compliance requests
   */
  getAccountingOfDisclosures: protectedProcedure
    .meta({ permission: 'compliance:read', resource: 'disclosure' })
    .input(z.object({
      residentId: z.string().uuid(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const orgId = (ctx as unknown as { orgId: string }).orgId;

      // Default to 6-year lookback per 42 CFR Part 2 requirements
      const sixYearsAgo = new Date();
      sixYearsAgo.setFullYear(sixYearsAgo.getFullYear() - 6);
      const startDate = input.startDate ? new Date(input.startDate) : sixYearsAgo;
      const endDate = input.endDate ? new Date(input.endDate) : new Date();

      const disclosures = await ctx.db.query.consentDisclosures.findMany({
        where: and(
          eq(consentDisclosures.org_id, orgId),
          eq(consentDisclosures.resident_id, input.residentId),
          gte(consentDisclosures.disclosed_at, startDate),
          lte(consentDisclosures.disclosed_at, endDate)
        ),
        with: {
          consent: true,
          discloser: {
            columns: {
              id: true,
              first_name: true,
              last_name: true,
            },
          },
        },
        orderBy: [desc(consentDisclosures.disclosed_at)],
      });

      return {
        residentId: input.residentId,
        dateRange: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        totalDisclosures: disclosures.length,
        disclosures: disclosures.map((d) => ({
          id: d.id,
          disclosedAt: d.disclosed_at.toISOString(),
          recipientName: d.disclosed_to_name,
          recipientOrganization: d.disclosed_to_organization,
          purpose: d.disclosure_purpose,
          informationDisclosed: d.information_disclosed,
          disclosureMethod: d.disclosure_method,
          disclosedBy: `${d.discloser.first_name} ${d.discloser.last_name}`,
          consentId: d.consent_id,
        })),
        // 42 CFR Part 2 notice
        notice: 'This record was prepared in response to a request for an accounting of disclosures pursuant to 42 CFR Part 2. This accounting includes all disclosures of protected substance use disorder patient records made in the specified time period.',
      };
    }),

  // ============================================================
  // MAIN DASHBOARD DATA
  // ============================================================

  /**
   * Get dashboard data (all-in-one for main dashboard page)
   */
  getDashboardData: protectedProcedure
    .meta({ permission: 'report:read', resource: 'report' })
    .query(async ({ ctx }) => {
      const orgId = (ctx as unknown as { orgId: string }).orgId;
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const mtdStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // === Occupancy ===
      const allBeds = await ctx.db.query.beds.findMany({
        where: and(eq(beds.org_id, orgId), isNull(beds.deleted_at)),
      });
      const totalBeds = allBeds.length;
      const occupiedBeds = allBeds.filter((b) => b.status === 'occupied').length;
      const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100 * 10) / 10 : 0;

      // === Revenue MTD ===
      const mtdPayments = await ctx.db.query.payments.findMany({
        where: and(
          eq(payments.org_id, orgId),
          isNull(payments.deleted_at),
          eq(payments.status, 'succeeded'),
          gte(payments.payment_date, mtdStart)
        ),
      });
      const revenueMTD = mtdPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

      // === Outstanding ===
      const overdueInvoices = await ctx.db.query.invoices.findMany({
        where: and(
          eq(invoices.org_id, orgId),
          isNull(invoices.deleted_at),
          inArray(invoices.status, ['pending', 'overdue']),
          lte(invoices.due_date, now.toISOString().split('T')[0]!)
        ),
      });
      const totalOutstanding = overdueInvoices.reduce((sum, i) => sum + parseFloat(i.amount_due), 0);

      // === Expiring Consents ===
      const expiringConsents = await ctx.db.query.consents.findMany({
        where: and(
          eq(consents.org_id, orgId),
          isNull(consents.deleted_at),
          eq(consents.status, 'active'),
          isNotNull(consents.expires_at),
          gte(consents.expires_at, now),
          lte(consents.expires_at, thirtyDaysFromNow)
        ),
        with: {
          resident: {
            columns: { id: true, first_name: true, last_name: true },
          },
        },
        orderBy: [consents.expires_at],
        limit: 10,
      });

      // === Recent Activity (from audit logs) ===
      const recentActivity = await ctx.db.query.auditLogs.findMany({
        where: and(
          eq(auditLogs.org_id, orgId),
          gte(auditLogs.created_at, thirtyDaysAgo)
        ),
        with: {
          actorUser: {
            columns: { id: true, first_name: true, last_name: true },
          },
        },
        orderBy: [desc(auditLogs.created_at)],
        limit: 10,
      });

      // === Action Items (various alerts) ===
      // Overdue drug tests
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

      // High priority incidents
      const openHighIncidents = await ctx.db.query.incidents.findMany({
        where: and(
          eq(incidents.org_id, orgId),
          isNull(incidents.deleted_at),
          inArray(incidents.severity, ['high', 'critical']),
          eq(incidents.follow_up_required, true)
        ),
        limit: 5,
      });

      // Pending pass requests
      const pendingPasses = await ctx.db.query.passes.findMany({
        where: and(
          eq(passes.org_id, orgId),
          isNull(passes.deleted_at),
          eq(passes.status, 'requested')
        ),
        limit: 5,
      });

      return {
        occupancy: {
          rate: occupancyRate,
          occupied: occupiedBeds,
          total: totalBeds,
        },
        revenueMTD: Math.round(revenueMTD * 100) / 100,
        outstanding: {
          total: Math.round(totalOutstanding * 100) / 100,
          invoiceCount: overdueInvoices.length,
        },
        expiringConsents: {
          count: expiringConsents.length,
          items: expiringConsents.map((c) => ({
            id: c.id,
            residentName: `${c.resident.first_name} ${c.resident.last_name}`,
            consentType: c.consent_type,
            expiresAt: c.expires_at?.toISOString(),
            daysRemaining: c.expires_at
              ? Math.floor((c.expires_at.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
              : null,
          })),
        },
        recentActivity: recentActivity.map((a) => ({
          id: a.id,
          action: a.action,
          description: a.description,
          resourceType: a.resource_type,
          actor: a.actorUser
            ? `${a.actorUser.first_name} ${a.actorUser.last_name}`
            : a.actor_type,
          timestamp: a.created_at.toISOString(),
        })),
        actionItems: {
          highPriorityIncidents: openHighIncidents.length,
          pendingPasses: pendingPasses.length,
          expiringConsents: expiringConsents.length,
        },
      };
    }),

  // ============================================================
  // DATA EXPORT (RPT-11)
  // ============================================================

  /**
   * Export report data
   * Returns formatted data for CSV/JSON export
   * Note: Part 2 exports must include redisclosure notice (handled by redisclosure middleware)
   */
  exportReport: protectedProcedure
    .meta({ permission: 'report:export', resource: 'report' })
    .input(z.object({
      reportType: z.enum(['occupancy', 'financial', 'operations', 'compliance', 'disclosures']),
      format: exportFormatSchema,
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      residentId: z.string().uuid().optional(), // For disclosure export
    }))
    .mutation(async ({ ctx, input }) => {
      const orgId = (ctx as unknown as { orgId: string }).orgId;
      const now = new Date();
      const startDate = input.startDate ? new Date(input.startDate) : new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endDate = input.endDate ? new Date(input.endDate) : now;

      // 42 CFR Part 2 Redisclosure Notice (required on all Part 2 exports)
      const redisclosureNotice = `
This record is protected by federal confidentiality rules (42 CFR Part 2). The federal rules prohibit you from making any further disclosure of this record unless further disclosure is expressly permitted by the written consent of the individual to whom it pertains or is otherwise permitted by 42 CFR Part 2. A general authorization for the release of medical or other information is NOT sufficient for this purpose.
      `.trim();

      let data: unknown;
      let fileName: string;
      let includeRedisclosureNotice = false;

      switch (input.reportType) {
        case 'occupancy': {
          const bedData = await ctx.db.query.beds.findMany({
            where: and(eq(beds.org_id, orgId), isNull(beds.deleted_at)),
            with: {
              room: {
                with: {
                  house: {
                    with: { property: true },
                  },
                },
              },
            },
          });

          data = bedData.map((b) => ({
            bedId: b.id,
            bedName: b.name,
            status: b.status,
            room: b.room.name,
            house: b.room.house.name,
            property: b.room.house.property.name,
          }));
          fileName = `occupancy_report_${now.toISOString().split('T')[0]}`;
          break;
        }

        case 'financial': {
          const invoiceData = await ctx.db.query.invoices.findMany({
            where: and(
              eq(invoices.org_id, orgId),
              isNull(invoices.deleted_at),
              gte(invoices.issue_date, startDate.toISOString().split('T')[0]!),
              lte(invoices.issue_date, endDate.toISOString().split('T')[0]!)
            ),
            with: {
              resident: {
                columns: { id: true, first_name: true, last_name: true },
              },
            },
          });

          data = invoiceData.map((i) => ({
            invoiceNumber: i.invoice_number,
            residentName: `${i.resident.first_name} ${i.resident.last_name}`,
            issueDate: i.issue_date,
            dueDate: i.due_date,
            total: i.total,
            amountPaid: i.amount_paid,
            amountDue: i.amount_due,
            status: i.status,
          }));
          fileName = `financial_report_${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}`;
          break;
        }

        case 'operations': {
          const incidentData = await ctx.db.query.incidents.findMany({
            where: and(
              eq(incidents.org_id, orgId),
              isNull(incidents.deleted_at),
              gte(incidents.occurred_at, startDate),
              lte(incidents.occurred_at, endDate)
            ),
          });

          data = incidentData.map((i) => ({
            incidentId: i.id,
            type: i.incident_type,
            severity: i.severity,
            occurredAt: i.occurred_at.toISOString(),
            location: i.location,
            followUpRequired: i.follow_up_required,
          }));
          fileName = `operations_report_${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}`;
          break;
        }

        case 'compliance': {
          const consentData = await ctx.db.query.consents.findMany({
            where: and(eq(consents.org_id, orgId), isNull(consents.deleted_at)),
            with: {
              resident: {
                columns: { id: true, first_name: true, last_name: true },
              },
            },
          });

          data = consentData.map((c) => ({
            consentId: c.id,
            residentName: `${c.resident.first_name} ${c.resident.last_name}`,
            type: c.consent_type,
            status: c.status,
            grantedAt: c.granted_at?.toISOString(),
            expiresAt: c.expires_at?.toISOString(),
            purpose: c.purpose,
          }));
          fileName = `compliance_report_${now.toISOString().split('T')[0]}`;
          includeRedisclosureNotice = true; // Consent data is Part 2 protected
          break;
        }

        case 'disclosures': {
          if (!input.residentId) {
            throw new Error('residentId is required for disclosure export');
          }

          const sixYearsAgo = new Date();
          sixYearsAgo.setFullYear(sixYearsAgo.getFullYear() - 6);

          const disclosureData = await ctx.db.query.consentDisclosures.findMany({
            where: and(
              eq(consentDisclosures.org_id, orgId),
              eq(consentDisclosures.resident_id, input.residentId),
              gte(consentDisclosures.disclosed_at, sixYearsAgo)
            ),
            with: {
              discloser: {
                columns: { first_name: true, last_name: true },
              },
            },
            orderBy: [desc(consentDisclosures.disclosed_at)],
          });

          data = disclosureData.map((d) => ({
            date: d.disclosed_at.toISOString(),
            recipient: d.disclosed_to_name,
            organization: d.disclosed_to_organization,
            purpose: d.disclosure_purpose,
            informationDisclosed: d.information_disclosed,
            method: d.disclosure_method,
            disclosedBy: `${d.discloser.first_name} ${d.discloser.last_name}`,
          }));
          fileName = `accounting_of_disclosures_${input.residentId}_${now.toISOString().split('T')[0]}`;
          includeRedisclosureNotice = true; // Disclosure data is Part 2 protected
          break;
        }
      }

      // Format output
      let output: string;
      let contentType: string;

      if (input.format === 'json') {
        const exportData = includeRedisclosureNotice
          ? { redisclosureNotice, data, exportedAt: now.toISOString() }
          : { data, exportedAt: now.toISOString() };
        output = JSON.stringify(exportData, null, 2);
        contentType = 'application/json';
      } else if (input.format === 'csv') {
        // Convert to CSV
        const rows = data as Record<string, unknown>[];
        if (rows.length === 0) {
          output = includeRedisclosureNotice ? `"${redisclosureNotice}"\n\nNo data` : 'No data';
        } else {
          const headers = Object.keys(rows[0]!);
          const csvRows = [
            includeRedisclosureNotice ? `"NOTICE: ${redisclosureNotice}"` : null,
            '',
            headers.join(','),
            ...rows.map((row) =>
              headers.map((h) => {
                const val = row[h];
                if (val === null || val === undefined) return '';
                if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
                  return `"${val.replace(/"/g, '""')}"`;
                }
                return String(val);
              }).join(',')
            ),
          ].filter(Boolean);
          output = csvRows.join('\n');
        }
        contentType = 'text/csv';
      } else {
        // PDF not implemented yet - return JSON with notice
        output = JSON.stringify({
          notice: 'PDF export not yet implemented. Please use JSON or CSV format.',
          data,
        });
        contentType = 'application/json';
      }

      return {
        fileName: `${fileName}.${input.format}`,
        contentType,
        data: output,
        recordCount: (data as unknown[]).length,
        includesRedisclosureNotice: includeRedisclosureNotice,
      };
    }),
});

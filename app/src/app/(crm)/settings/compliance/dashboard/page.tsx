"use client";

import {
  ShieldCheck,
  AlertTriangle,
  FileText,
  AlertCircle,
  UserCheck,
  Activity,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  PageContainer,
  PageHeader,
  StatCard,
  StatCardGrid,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Button,
  EmptyState,
  ErrorState,
  SkeletonTable,
} from "@/components/ui";
import { SkeletonStatCard } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function ComplianceDashboardPage() {
  const { data: summary, isLoading: summaryLoading, error } = trpc.reporting.getComplianceSummary.useQuery(undefined);

  const { data: expiringData, isLoading: expiringLoading } = trpc.reporting.getExpiringConsents.useQuery({
    daysAhead: 30,
    limit: 25,
  });

  const isLoading = summaryLoading || expiringLoading;
  const expiringConsents = expiringData?.consents ?? [];

  if (error) {
    return (
      <PageContainer>
        <Card><CardContent><ErrorState title="Failed to load compliance data" description={error.message} /></CardContent></Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Compliance Dashboard"
        description="HIPAA & 42 CFR Part 2 compliance overview"
      />

      {isLoading ? (
        <StatCardGrid columns={3}>
          <SkeletonStatCard /><SkeletonStatCard /><SkeletonStatCard />
          <SkeletonStatCard /><SkeletonStatCard /><SkeletonStatCard />
        </StatCardGrid>
      ) : (
        <>
          <StatCardGrid columns={3}>
            <StatCard
              title="Active Consents"
              value={String(summary?.consents?.active ?? 0)}
              subtitle={`${summary?.consents?.total ?? 0} total consents`}
              variant="success"
              icon={<ShieldCheck className="h-5 w-5" />}
            />
            <StatCard
              title="Expiring in 30 Days"
              value={String(summary?.consents?.expiringWithin30Days ?? 0)}
              subtitle="Renewal required soon"
              variant="warning"
              icon={<AlertTriangle className="h-5 w-5" />}
            />
            <StatCard
              title="Total Disclosures"
              value={String(summary?.disclosures?.total ?? 0)}
              subtitle="In current period"
              icon={<FileText className="h-5 w-5" />}
            />
            <StatCard
              title="Open Breach Incidents"
              value={String(summary?.breaches?.open ?? 0)}
              subtitle={summary?.breaches?.open ? "Under investigation" : "All clear"}
              variant={summary?.breaches?.open ? "error" : "success"}
              icon={<AlertCircle className="h-5 w-5" />}
            />
            <StatCard
              title="Pending Consents"
              value={String(summary?.consents?.pending ?? 0)}
              subtitle="Awaiting signature"
              variant={summary?.consents?.pending ? "warning" : "success"}
              icon={<UserCheck className="h-5 w-5" />}
            />
            <StatCard
              title="Audit Events"
              value={String(summary?.auditActivity?.total ?? 0)}
              subtitle="In current period"
              icon={<Activity className="h-5 w-5" />}
            />
          </StatCardGrid>

          {/* Expiring Consents */}
          <Card>
            <CardHeader>
              <CardTitle>Expiring Consents (Next 30 Days)</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {expiringConsents.length === 0 ? (
                <EmptyState
                  iconType="document"
                  title="No consents expiring"
                  description="No consents expiring in the next 30 days."
                />
              ) : (
                <div className="overflow-x-auto -mx-6">
                  <table className="w-full">
                    <thead>
                      <tr className="border-y border-zinc-800/50 bg-zinc-800/50">
                        <th className="text-left py-3 px-6 text-xs font-semibold uppercase tracking-wider text-zinc-500">Resident</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Type</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Expires</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Days Left</th>
                        <th className="text-left py-3 px-6 text-xs font-semibold uppercase tracking-wider text-zinc-500">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expiringConsents.map((consent) => (
                        <tr key={consent.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/50 transition-colors">
                          <td className="py-3 px-6 text-sm font-medium text-zinc-100">
                            {consent.residentName}
                          </td>
                          <td className="py-3 px-4 text-sm text-zinc-400">{consent.consentType}</td>
                          <td className="py-3 px-4 text-sm text-zinc-400">
                            {consent.expiresAt
                              ? new Date(consent.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                              : "—"}
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant={
                                (consent.daysUntilExpiration ?? 0) <= 7
                                  ? "error"
                                  : (consent.daysUntilExpiration ?? 0) <= 14
                                  ? "warning"
                                  : "success"
                              }
                              dot
                            >
                              {consent.daysUntilExpiration ?? 0} days
                            </Badge>
                          </td>
                          <td className="py-3 px-6">
                            <Button variant="ghost" size="sm" className="text-indigo-400">Renew</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Breach Alert */}
          {(summary?.breaches?.open ?? 0) > 0 && (
            <Card variant="outlined" className="border-red-500/30 bg-red-500/10">
              <CardHeader>
                <CardTitle>Open Breach Incidents</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-semibold text-red-300">
                        {summary?.breaches?.open} open incident(s)
                      </span>
                      {(summary?.breaches?.byRiskLevel?.high ?? 0) > 0 && (
                        <Badge variant="error">{summary?.breaches?.byRiskLevel?.high} High Risk</Badge>
                      )}
                      {(summary?.breaches?.byRiskLevel?.medium ?? 0) > 0 && (
                        <Badge variant="warning">{summary?.breaches?.byRiskLevel?.medium} Medium Risk</Badge>
                      )}
                    </div>
                    <p className="text-sm text-red-300">Requires immediate attention and investigation</p>
                  </div>
                  <Button variant="ghost" size="sm" className="text-red-300">View Details</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </PageContainer>
  );
}

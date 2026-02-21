"use client";

import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  PageContainer,
  PageHeader,
  StatCard,
  StatCardGrid,
  Badge,
  PriorityBadge,
  Button,
  SkeletonListItem,
} from "@/components/ui";

export const dynamic = "force-dynamic";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatTimeAgo(isoString: string) {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

function ActionItem({
  title,
  description,
  priority,
  count,
  href,
}: {
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  count?: number;
  href?: string;
}) {
  const content = (
    <div className="flex items-start gap-3 px-3 py-2.5 rounded-md hover:bg-zinc-800/50 transition-colors group cursor-pointer">
      <PriorityBadge priority={priority} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-zinc-200">{title}</p>
          {count !== undefined && count > 0 && (
            <Badge variant="default" size="sm">
              {count}
            </Badge>
          )}
        </div>
        <p className="text-sm text-zinc-500 mt-0.5">{description}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

function ActivityItem({
  actor,
  description,
  timestamp,
}: {
  actor: string;
  description: string;
  timestamp: string;
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0">
        <span className="text-xs font-semibold text-zinc-400">
          {actor.charAt(0).toUpperCase()}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-zinc-400">
          <span className="font-medium text-zinc-200">{actor}</span>{" "}
          {description}
        </p>
        <p className="text-xs text-zinc-600 mt-0.5">{formatTimeAgo(timestamp)}</p>
      </div>
    </div>
  );
}

function OnboardingChecklist({
  hasProperties,
  hasHouses,
  hasResidents,
  hasRates,
}: {
  hasProperties: boolean;
  hasHouses: boolean;
  hasResidents: boolean;
  hasRates: boolean;
}) {
  const steps = [
    { done: true, label: "Create your account", href: "#" },
    { done: hasProperties, label: "Add your first property", href: "/admin/properties" },
    { done: hasHouses, label: "Add a house with rooms and beds", href: "/admin/properties" },
    { done: hasRates, label: "Set up billing rates", href: "/billing/rates" },
    { done: hasResidents, label: "Add your first resident", href: "/residents" },
  ];
  const completedCount = steps.filter((s) => s.done).length;

  return (
    <div className="border border-zinc-800 rounded-lg p-6">
      <h2 className="text-base font-semibold text-zinc-100">Get started with RecoveryOS</h2>
      <p className="text-sm text-zinc-500 mt-1">
        Complete these steps to start managing your sober living homes.
      </p>
      <div className="mt-3 flex items-center gap-3">
        <div className="h-1.5 bg-zinc-800 rounded-full flex-1 overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all"
            style={{ width: `${(completedCount / steps.length) * 100}%` }}
          />
        </div>
        <span className="text-xs font-medium text-zinc-500 font-mono">
          {completedCount}/{steps.length}
        </span>
      </div>
      <div className="mt-4 space-y-0.5">
        {steps.map((step, i) => (
          <Link
            key={i}
            href={step.href}
            className={`flex items-center gap-3 p-2.5 rounded-md transition-colors ${
              step.done
                ? "text-zinc-600"
                : "text-zinc-200 hover:bg-zinc-800/50"
            }`}
          >
            {step.done ? (
              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
            ) : (
              <div className="h-5 w-5 rounded-full border-2 border-zinc-700 flex-shrink-0" />
            )}
            <span className={`text-sm font-medium ${step.done ? "line-through" : ""}`}>
              {step.label}
            </span>
            {!step.done && (
              <ArrowRight className="h-4 w-4 text-zinc-700 ml-auto" />
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading, error } = trpc.reporting.getDashboardData.useQuery();
  const { data: propertiesData } = trpc.property.list.useQuery();
  const { data: residentStats } = trpc.resident.getStats.useQuery();
  const { data: ratesData } = trpc.rate.list.useQuery({ activeOnly: true });

  const hasProperties = (propertiesData?.length ?? 0) > 0;
  const hasHouses = (propertiesData ?? []).some((p) => p.house_count > 0);
  const hasResidents = (residentStats?.total ?? 0) > 0;
  const hasRates = (ratesData?.length ?? 0) > 0;
  const isNewOrg = !hasProperties && !hasResidents;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const hasActionItems =
    (data?.actionItems.highPriorityIncidents || 0) > 0 ||
    (data?.actionItems.expiringConsents || 0) > 0 ||
    (data?.actionItems.pendingPasses || 0) > 0 ||
    (data?.outstanding.invoiceCount || 0) > 0;

  return (
    <PageContainer>
      {/* Greeting — large, confident */}
      <div>
        <h1 className="text-2xl font-semibold text-zinc-50 tracking-tight">{greeting}</h1>
        <p className="text-sm text-zinc-500 mt-1">Here&apos;s what&apos;s happening across your properties.</p>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-300">Error loading dashboard</p>
            <p className="text-sm text-red-400/80 mt-1">{error.message}</p>
          </div>
        </div>
      )}

      {!isLoading && isNewOrg && (
        <OnboardingChecklist
          hasProperties={hasProperties}
          hasHouses={hasHouses}
          hasResidents={hasResidents}
          hasRates={hasRates}
        />
      )}

      {/* Stats — no card wrappers, separated by dividers */}
      <div className="flex items-start gap-0 divide-x divide-zinc-800">
        <div className="flex-1 pr-6">
          <StatCard
            title="Occupancy Rate"
            value={isLoading ? "\u2014" : `${data?.occupancy.rate || 0}%`}
            subtitle={
              isLoading
                ? "Loading..."
                : `${data?.occupancy.occupied || 0} of ${data?.occupancy.total || 0} beds`
            }
            loading={isLoading}
          />
        </div>
        <div className="flex-1 px-6">
          <StatCard
            title="Revenue MTD"
            value={isLoading ? "\u2014" : formatCurrency(data?.revenueMTD || 0)}
            subtitle="Month to date"
            loading={isLoading}
          />
        </div>
        <div className="flex-1 px-6">
          <StatCard
            title="Outstanding"
            value={isLoading ? "\u2014" : formatCurrency(data?.outstanding.total || 0)}
            subtitle={
              isLoading
                ? "Loading..."
                : `${data?.outstanding.invoiceCount || 0} invoices`
            }
            loading={isLoading}
          />
        </div>
        <div className="flex-1 pl-6">
          <StatCard
            title="Expiring Consents"
            value={isLoading ? "\u2014" : String(data?.expiringConsents.count || 0)}
            subtitle="Within 30 days"
            loading={isLoading}
          />
        </div>
      </div>

      {/* Two-column: Needs Attention + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Needs Attention */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Needs Attention
            </h2>
            {!isLoading && hasActionItems && (
              <Badge variant="error" size="sm">
                {(data?.actionItems.highPriorityIncidents || 0) +
                  (data?.actionItems.expiringConsents || 0)}{" "}
                urgent
              </Badge>
            )}
          </div>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <SkeletonListItem key={i} />
              ))}
            </div>
          ) : hasActionItems ? (
            <div className="space-y-0.5">
              {(data?.actionItems.highPriorityIncidents || 0) > 0 && (
                <ActionItem
                  priority="high"
                  title="Incidents require attention"
                  description="Review and address critical incidents"
                  count={data?.actionItems.highPriorityIncidents}
                  href="/operations/incidents"
                />
              )}
              {(data?.actionItems.expiringConsents || 0) > 0 && (
                <ActionItem
                  priority="high"
                  title="Consents expiring soon"
                  description="42 CFR Part 2 renewal required"
                  count={data?.actionItems.expiringConsents}
                  href="/compliance/consents"
                />
              )}
              {(data?.actionItems.pendingPasses || 0) > 0 && (
                <ActionItem
                  priority="medium"
                  title="Pass requests pending"
                  description="Review and approve requests"
                  count={data?.actionItems.pendingPasses}
                  href="/operations/passes"
                />
              )}
              {(data?.outstanding.invoiceCount || 0) > 0 && (
                <ActionItem
                  priority="medium"
                  title="Outstanding invoices"
                  description={`${formatCurrency(data?.outstanding.total || 0)} overdue`}
                  count={data?.outstanding.invoiceCount}
                  href="/billing/invoices"
                />
              )}
            </div>
          ) : (
            <p className="text-sm text-zinc-600 py-4">All clear for today.</p>
          )}
        </div>

        {/* Recent Activity */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Recent Activity
            </h2>
            <Link
              href="/compliance/audit-log"
              className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              View all
            </Link>
          </div>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <SkeletonListItem key={i} />
              ))}
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/50 max-h-[320px] overflow-y-auto scrollbar-thin">
              {data?.recentActivity.map((activity) => (
                <ActivityItem
                  key={activity.id}
                  actor={activity.actor}
                  description={activity.description}
                  timestamp={activity.timestamp}
                />
              ))}
              {(!data?.recentActivity || data.recentActivity.length === 0) && (
                <div className="py-6 text-center">
                  <Clock className="h-5 w-5 text-zinc-700 mx-auto mb-2" />
                  <p className="text-sm text-zinc-500">No recent activity</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Expiring Consents Table */}
      {!isLoading && data?.expiringConsents.items && data.expiringConsents.items.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Expiring Consents
              </h2>
              <p className="text-xs text-zinc-600 mt-0.5">
                Requiring renewal in the next 30 days
              </p>
            </div>
            <Link href="/compliance/consents">
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-3 px-4 text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Resident
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Type
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Expires
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Status
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {data.expiringConsents.items.map((consent) => (
                  <tr
                    key={consent.id}
                    className="hover:bg-zinc-800/40 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <p className="text-sm font-medium text-zinc-200">
                        {consent.residentName}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm text-zinc-400">
                        {consent.consentType.replace(/_/g, " ")}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm text-zinc-400 font-mono">
                        {consent.expiresAt
                          ? new Date(consent.expiresAt).toLocaleDateString()
                          : "\u2014"}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          (consent.daysRemaining || 0) <= 7
                            ? "error"
                            : (consent.daysRemaining || 0) <= 14
                              ? "warning"
                              : "info"
                        }
                        dot
                      >
                        {consent.daysRemaining} days
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link href="/compliance/consents">
                        <Button variant="ghost" size="sm">
                          Renew
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

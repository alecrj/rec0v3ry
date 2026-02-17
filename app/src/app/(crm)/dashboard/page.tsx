"use client";

import { useState } from "react";
import {
  BedDouble,
  DollarSign,
  AlertCircle,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  FileText,
  Users,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

export const dynamic = "force-dynamic";

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  loading,
  variant = "default",
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: { value: string; positive: boolean };
  loading?: boolean;
  variant?: "default" | "warning" | "danger";
}) {
  const variantClasses = {
    default: "bg-blue-50 text-blue-600",
    warning: "bg-yellow-50 text-yellow-600",
    danger: "bg-red-50 text-red-600",
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6 animate-pulse">
        <div className="h-4 bg-slate-200 rounded w-1/2 mb-3"></div>
        <div className="h-8 bg-slate-200 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-slate-200 rounded w-2/3"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-600">{title}</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{value}</p>
          <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              {trend.positive ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              <span
                className={`text-sm font-medium ${
                  trend.positive ? "text-green-600" : "text-red-600"
                }`}
              >
                {trend.value}
              </span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${variantClasses[variant]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function ActionItem({
  title,
  description,
  priority,
  count,
}: {
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  count?: number;
}) {
  const priorityColors = {
    high: "bg-red-100 text-red-700 border-red-200",
    medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
    low: "bg-blue-100 text-blue-700 border-blue-200",
  };

  return (
    <div className="flex items-start gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors">
      <div
        className={`px-2 py-1 rounded text-xs font-medium ${priorityColors[priority]}`}
      >
        {priority.toUpperCase()}
        {count !== undefined && count > 0 && ` (${count})`}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-900">{title}</p>
        <p className="text-sm text-slate-600 mt-1">{description}</p>
      </div>
    </div>
  );
}

function ActivityItem({
  actor,
  action,
  description,
  timestamp,
}: {
  actor: string;
  action: string;
  description: string;
  timestamp: string;
}) {
  const formatTimeAgo = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  };

  return (
    <div className="flex items-start gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors">
      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
        <span className="text-sm font-medium text-slate-700">
          {actor.charAt(0).toUpperCase()}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-900">
          <span className="font-medium">{actor}</span>{" "}
          <span className="text-slate-600">{description}</span>
        </p>
        <p className="text-xs text-slate-500 mt-1">{formatTimeAgo(timestamp)}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading, error } = trpc.reporting.getDashboardData.useQuery();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600 mt-1">Welcome back to RecoveryOS</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-medium">Error loading dashboard data</p>
          <p className="text-sm mt-1">{error.message}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Occupancy"
          value={isLoading ? "—" : `${data?.occupancy.rate || 0}%`}
          subtitle={
            isLoading
              ? "Loading..."
              : `${data?.occupancy.occupied || 0} of ${data?.occupancy.total || 0} beds filled`
          }
          icon={BedDouble}
          loading={isLoading}
        />
        <StatCard
          title="Revenue MTD"
          value={isLoading ? "—" : formatCurrency(data?.revenueMTD || 0)}
          subtitle="Month to date collections"
          icon={DollarSign}
          loading={isLoading}
        />
        <StatCard
          title="Outstanding"
          value={isLoading ? "—" : formatCurrency(data?.outstanding.total || 0)}
          subtitle={
            isLoading
              ? "Loading..."
              : `${data?.outstanding.invoiceCount || 0} overdue invoices`
          }
          icon={AlertCircle}
          variant={
            (data?.outstanding.invoiceCount || 0) > 10
              ? "danger"
              : (data?.outstanding.invoiceCount || 0) > 5
              ? "warning"
              : "default"
          }
          loading={isLoading}
        />
        <StatCard
          title="Expiring Consents"
          value={isLoading ? "—" : String(data?.expiringConsents.count || 0)}
          subtitle="Within next 30 days"
          icon={ShieldCheck}
          variant={(data?.expiringConsents.count || 0) > 5 ? "warning" : "default"}
          loading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Action Items
          </h2>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex gap-3 p-3">
                  <div className="h-6 w-16 bg-slate-200 rounded"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                    <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {(data?.actionItems.highPriorityIncidents || 0) > 0 && (
                <ActionItem
                  priority="high"
                  title="High priority incidents require follow-up"
                  description="Review and address critical/high severity incidents"
                  count={data?.actionItems.highPriorityIncidents}
                />
              )}
              {(data?.actionItems.expiringConsents || 0) > 0 && (
                <ActionItem
                  priority="high"
                  title="Consents expiring soon"
                  description="42 CFR Part 2 consents need renewal within 30 days"
                  count={data?.actionItems.expiringConsents}
                />
              )}
              {(data?.actionItems.pendingPasses || 0) > 0 && (
                <ActionItem
                  priority="medium"
                  title="Pass requests pending approval"
                  description="Review and approve/deny pass requests"
                  count={data?.actionItems.pendingPasses}
                />
              )}
              {(data?.outstanding.invoiceCount || 0) > 0 && (
                <ActionItem
                  priority="medium"
                  title="Outstanding invoices"
                  description={`${formatCurrency(data?.outstanding.total || 0)} overdue`}
                  count={data?.outstanding.invoiceCount}
                />
              )}
              {(data?.actionItems.highPriorityIncidents || 0) === 0 &&
                (data?.actionItems.expiringConsents || 0) === 0 &&
                (data?.actionItems.pendingPasses || 0) === 0 &&
                (data?.outstanding.invoiceCount || 0) === 0 && (
                  <p className="text-sm text-slate-500 py-4 text-center">
                    No action items at this time
                  </p>
                )}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Recent Activity
          </h2>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="animate-pulse flex gap-3 p-3">
                  <div className="h-8 w-8 bg-slate-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                    <div className="h-3 bg-slate-200 rounded w-1/4"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1 max-h-[400px] overflow-y-auto">
              {data?.recentActivity.map((activity) => (
                <ActivityItem
                  key={activity.id}
                  actor={activity.actor}
                  action={activity.action}
                  description={activity.description}
                  timestamp={activity.timestamp}
                />
              ))}
              {(!data?.recentActivity || data.recentActivity.length === 0) && (
                <p className="text-sm text-slate-500 py-4 text-center">
                  No recent activity
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Expiring Consents (Next 30 Days)
          </h2>
          <a
            href="/compliance/consents"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View All
          </a>
        </div>
        {isLoading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-slate-100 rounded"></div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">
                    Resident
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">
                    Type
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">
                    Expiration Date
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">
                    Days Remaining
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {data?.expiringConsents.items.map((consent) => (
                  <tr
                    key={consent.id}
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="py-3 px-4 text-sm text-slate-900">
                      {consent.residentName}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {consent.consentType.replace(/_/g, " ")}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {consent.expiresAt
                        ? new Date(consent.expiresAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          (consent.daysRemaining || 0) <= 7
                            ? "bg-red-100 text-red-700"
                            : (consent.daysRemaining || 0) <= 14
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {consent.daysRemaining} days
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                        Renew
                      </button>
                    </td>
                  </tr>
                ))}
                {(!data?.expiringConsents.items ||
                  data.expiringConsents.items.length === 0) && (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-6 text-center text-sm text-slate-500"
                    >
                      No consents expiring in the next 30 days
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <a
          href="/reports/occupancy"
          className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <div className="p-2 bg-blue-100 rounded-lg">
            <BedDouble className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-slate-900">Occupancy Report</p>
            <p className="text-sm text-slate-500">Beds, trends, waitlist</p>
          </div>
        </a>
        <a
          href="/reports/financial"
          className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <div className="p-2 bg-green-100 rounded-lg">
            <DollarSign className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="font-medium text-slate-900">Financial Report</p>
            <p className="text-sm text-slate-500">Revenue, aging, collections</p>
          </div>
        </a>
        <a
          href="/reports/operations"
          className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <div className="p-2 bg-orange-100 rounded-lg">
            <Users className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <p className="font-medium text-slate-900">Operations Report</p>
            <p className="text-sm text-slate-500">Chores, meetings, incidents</p>
          </div>
        </a>
        <a
          href="/reports/compliance"
          className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <div className="p-2 bg-purple-100 rounded-lg">
            <ShieldCheck className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <p className="font-medium text-slate-900">Compliance Report</p>
            <p className="text-sm text-slate-500">Consents, disclosures, audit</p>
          </div>
        </a>
      </div>
    </div>
  );
}

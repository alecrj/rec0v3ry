"use client";

import { useState } from "react";
import {
  ShieldCheck,
  FileText,
  AlertTriangle,
  Clock,
  Download,
  Calendar,
  Eye,
  Lock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

export const dynamic = "force-dynamic";

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = "blue",
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: "blue" | "green" | "yellow" | "red" | "purple";
}) {
  const colorClasses = {
    blue: "bg-indigo-500/15 text-indigo-400",
    green: "bg-green-500/15 text-green-400",
    yellow: "bg-yellow-500/15 text-yellow-400",
    red: "bg-red-500/15 text-red-400",
    purple: "bg-purple-500/15 text-purple-400",
  };

  return (
    <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-400">{title}</p>
          <p className="text-2xl font-bold text-zinc-100 mt-1">{value}</p>
          <p className="text-sm text-zinc-500 mt-1">{subtitle}</p>
        </div>
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export default function ComplianceReportPage() {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date().toISOString(),
  });

  const { data: summary, isLoading: summaryLoading } =
    trpc.reporting.getComplianceSummary.useQuery(dateRange);

  const { data: expiringConsents, isLoading: expiringLoading } =
    trpc.reporting.getExpiringConsents.useQuery({ daysAhead: 30, limit: 20 });

  const exportMutation = trpc.reporting.exportReport.useMutation();

  const handleExport = async (format: "csv" | "json") => {
    const result = await exportMutation.mutateAsync({
      reportType: "compliance",
      format,
    });

    const blob = new Blob([result.data], { type: result.contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = result.fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isLoading = summaryLoading;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Compliance Report</h1>
          <p className="text-zinc-400 mt-1">
            Consents, disclosures, audit activity, and breach incidents
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg">
            <Calendar className="h-4 w-4 text-zinc-500" />
            <select
              className="text-sm bg-transparent border-none outline-none"
              value="30d"
              onChange={(e) => {
                const now = new Date();
                let start: Date;
                switch (e.target.value) {
                  case "7d":
                    start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                    break;
                  case "30d":
                    start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                    break;
                  case "90d":
                    start = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
                    break;
                  case "ytd":
                    start = new Date(now.getFullYear(), 0, 1);
                    break;
                  default:
                    start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                }
                setDateRange({
                  startDate: start.toISOString(),
                  endDate: now.toISOString(),
                });
              }}
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="ytd">Year to Date</option>
            </select>
          </div>
          <button
            onClick={() => handleExport("csv")}
            disabled={exportMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-300 bg-zinc-900 border border-zinc-700 rounded-lg hover:bg-zinc-800/40 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Part 2 Notice */}
      <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Lock className="h-5 w-5 text-indigo-400 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-indigo-200">
              42 CFR Part 2 Protected Information
            </p>
            <p className="text-sm text-indigo-300 mt-1">
              This report may contain information protected under federal confidentiality
              rules (42 CFR Part 2). Exports include the required redisclosure notice.
            </p>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Consents"
          value={isLoading ? "—" : summary?.consents.active || 0}
          subtitle={`${summary?.consents.total || 0} total`}
          icon={ShieldCheck}
          color="green"
        />
        <StatCard
          title="Expiring (30 days)"
          value={isLoading ? "—" : summary?.consents.expiringWithin30Days || 0}
          subtitle="Need renewal"
          icon={Clock}
          color={
            (summary?.consents.expiringWithin30Days || 0) > 5
              ? "yellow"
              : "green"
          }
        />
        <StatCard
          title="Disclosures"
          value={isLoading ? "—" : summary?.disclosures.total || 0}
          subtitle="In selected period"
          icon={FileText}
          color="blue"
        />
        <StatCard
          title="Open Breaches"
          value={isLoading ? "—" : summary?.breaches.open || 0}
          subtitle={`${summary?.breaches.byRiskLevel.high || 0} high risk`}
          icon={AlertTriangle}
          color={(summary?.breaches.open || 0) > 0 ? "red" : "green"}
        />
      </div>

      {/* Consent Status Breakdown */}
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
        <h2 className="text-lg font-semibold text-zinc-100 mb-4">
          Consent Status Breakdown
        </h2>
        {isLoading ? (
          <div className="animate-pulse h-24 bg-zinc-800 rounded"></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <p className="text-sm font-medium text-green-300">Active</p>
              </div>
              <p className="text-3xl font-bold text-green-200 mt-2">
                {summary?.consents.active || 0}
              </p>
            </div>
            <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-400" />
                <p className="text-sm font-medium text-yellow-300">Pending</p>
              </div>
              <p className="text-3xl font-bold text-yellow-200 mt-2">
                {summary?.consents.pending || 0}
              </p>
            </div>
            <div className="p-4 bg-zinc-800/40 rounded-lg border border-zinc-800/50">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-zinc-500" />
                <p className="text-sm font-medium text-zinc-300">Expired</p>
              </div>
              <p className="text-3xl font-bold text-zinc-100 mt-2">
                {summary?.consents.expired || 0}
              </p>
            </div>
            <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-400" />
                <p className="text-sm font-medium text-red-300">Revoked</p>
              </div>
              <p className="text-3xl font-bold text-red-200 mt-2">
                {summary?.consents.revoked || 0}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Audit Activity */}
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
        <h2 className="text-lg font-semibold text-zinc-100 mb-4">
          Audit Activity by Sensitivity Level
        </h2>
        {isLoading ? (
          <div className="animate-pulse h-24 bg-zinc-800 rounded"></div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-zinc-800/40 rounded-lg">
              <span className="text-sm font-medium text-zinc-300">Total Audit Logs</span>
              <span className="text-lg font-bold text-zinc-100">
                {summary?.auditActivity.total || 0}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {Object.entries(summary?.auditActivity.bySensitivity || {}).map(
                ([level, count]) => (
                  <div
                    key={level}
                    className={`p-3 rounded-lg border ${
                      level === "part2_protected"
                        ? "bg-purple-500/10 border-purple-500/20"
                        : level === "confidential"
                        ? "bg-red-500/10 border-red-500/20"
                        : level === "internal"
                        ? "bg-yellow-500/10 border-yellow-500/20"
                        : "bg-green-500/10 border-green-500/20"
                    }`}
                  >
                    <p
                      className={`text-xs font-medium ${
                        level === "part2_protected"
                          ? "text-purple-300"
                          : level === "confidential"
                          ? "text-red-300"
                          : level === "internal"
                          ? "text-yellow-300"
                          : "text-green-300"
                      }`}
                    >
                      {level.replace(/_/g, " ").toUpperCase()}
                    </p>
                    <p
                      className={`text-xl font-bold mt-1 ${
                        level === "part2_protected"
                          ? "text-purple-200"
                          : level === "confidential"
                          ? "text-red-200"
                          : level === "internal"
                          ? "text-yellow-200"
                          : "text-green-200"
                      }`}
                    >
                      {count}
                    </p>
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </div>

      {/* Breach Incidents */}
      {(summary?.breaches.open || 0) > 0 && (
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
          <h2 className="text-lg font-semibold text-zinc-100 mb-4">
            Open Breach Incidents
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
              <p className="text-sm font-medium text-green-300">Low Risk</p>
              <p className="text-2xl font-bold text-green-200 mt-1">
                {summary?.breaches.byRiskLevel.low || 0}
              </p>
            </div>
            <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
              <p className="text-sm font-medium text-yellow-300">Medium Risk</p>
              <p className="text-2xl font-bold text-yellow-200 mt-1">
                {summary?.breaches.byRiskLevel.medium || 0}
              </p>
            </div>
            <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
              <p className="text-sm font-medium text-red-300">High Risk</p>
              <p className="text-2xl font-bold text-red-200 mt-1">
                {summary?.breaches.byRiskLevel.high || 0}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Expiring Consents Table */}
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-zinc-100">
            Consents Expiring Within 30 Days
          </h2>
          <a
            href="/compliance/consents"
            className="text-sm text-indigo-400 hover:text-indigo-300 font-medium"
          >
            View All Consents
          </a>
        </div>
        {expiringLoading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-zinc-800 rounded"></div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-3 px-4 text-sm font-medium text-zinc-300">
                    Resident
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-zinc-300">
                    Consent Type
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-zinc-300">
                    Purpose
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-zinc-300">
                    Expires
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-zinc-300">
                    Days Left
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-zinc-300">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {expiringConsents?.consents.map((consent) => (
                  <tr
                    key={consent.id}
                    className="border-b border-zinc-800/50 hover:bg-zinc-800/40"
                  >
                    <td className="py-3 px-4 text-sm font-medium text-zinc-100">
                      {consent.residentName}
                    </td>
                    <td className="py-3 px-4 text-sm text-zinc-400">
                      {consent.consentType.replace(/_/g, " ")}
                    </td>
                    <td className="py-3 px-4 text-sm text-zinc-400 max-w-xs truncate">
                      {consent.purpose}
                    </td>
                    <td className="py-3 px-4 text-sm text-zinc-400">
                      {consent.expiresAt
                        ? new Date(consent.expiresAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          (consent.daysUntilExpiration || 0) <= 7
                            ? "bg-red-500/15 text-red-300"
                            : (consent.daysUntilExpiration || 0) <= 14
                            ? "bg-yellow-500/15 text-yellow-300"
                            : "bg-indigo-500/15 text-indigo-300"
                        }`}
                      >
                        {consent.daysUntilExpiration} days
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button className="text-sm text-indigo-400 hover:text-indigo-300 font-medium">
                        Renew
                      </button>
                    </td>
                  </tr>
                ))}
                {(!expiringConsents?.consents ||
                  expiringConsents.consents.length === 0) && (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-6 text-center text-sm text-zinc-500"
                    >
                      No consents expiring within 30 days
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <a
          href="/compliance/audit"
          className="flex items-center gap-3 p-4 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800/40 transition-colors"
        >
          <div className="p-2 bg-purple-500/15 rounded-lg">
            <Eye className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <p className="font-medium text-zinc-100">View Audit Logs</p>
            <p className="text-sm text-zinc-500">Full audit trail</p>
          </div>
        </a>
        <a
          href="/compliance/disclosures"
          className="flex items-center gap-3 p-4 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800/40 transition-colors"
        >
          <div className="p-2 bg-indigo-500/15 rounded-lg">
            <FileText className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <p className="font-medium text-zinc-100">View Disclosures</p>
            <p className="text-sm text-zinc-500">Disclosure history</p>
          </div>
        </a>
        <a
          href="/compliance/breaches"
          className="flex items-center gap-3 p-4 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800/40 transition-colors"
        >
          <div className="p-2 bg-red-500/15 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-red-400" />
          </div>
          <div>
            <p className="font-medium text-zinc-100">Breach Incidents</p>
            <p className="text-sm text-zinc-500">Manage incidents</p>
          </div>
        </a>
      </div>
    </div>
  );
}

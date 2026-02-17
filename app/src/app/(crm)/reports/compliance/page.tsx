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
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    yellow: "bg-yellow-50 text-yellow-600",
    red: "bg-red-50 text-red-600",
    purple: "bg-purple-50 text-purple-600",
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-600">{title}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
          <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
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
          <h1 className="text-2xl font-bold text-slate-900">Compliance Report</h1>
          <p className="text-slate-600 mt-1">
            Consents, disclosures, audit activity, and breach incidents
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg">
            <Calendar className="h-4 w-4 text-slate-400" />
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
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Part 2 Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Lock className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-900">
              42 CFR Part 2 Protected Information
            </p>
            <p className="text-sm text-blue-700 mt-1">
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
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Consent Status Breakdown
        </h2>
        {isLoading ? (
          <div className="animate-pulse h-24 bg-slate-100 rounded"></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-100">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <p className="text-sm font-medium text-green-700">Active</p>
              </div>
              <p className="text-3xl font-bold text-green-900 mt-2">
                {summary?.consents.active || 0}
              </p>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-100">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                <p className="text-sm font-medium text-yellow-700">Pending</p>
              </div>
              <p className="text-3xl font-bold text-yellow-900 mt-2">
                {summary?.consents.pending || 0}
              </p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-slate-500" />
                <p className="text-sm font-medium text-slate-700">Expired</p>
              </div>
              <p className="text-3xl font-bold text-slate-900 mt-2">
                {summary?.consents.expired || 0}
              </p>
            </div>
            <div className="p-4 bg-red-50 rounded-lg border border-red-100">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <p className="text-sm font-medium text-red-700">Revoked</p>
              </div>
              <p className="text-3xl font-bold text-red-900 mt-2">
                {summary?.consents.revoked || 0}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Audit Activity */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Audit Activity by Sensitivity Level
        </h2>
        {isLoading ? (
          <div className="animate-pulse h-24 bg-slate-100 rounded"></div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span className="text-sm font-medium text-slate-700">Total Audit Logs</span>
              <span className="text-lg font-bold text-slate-900">
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
                        ? "bg-purple-50 border-purple-100"
                        : level === "confidential"
                        ? "bg-red-50 border-red-100"
                        : level === "internal"
                        ? "bg-yellow-50 border-yellow-100"
                        : "bg-green-50 border-green-100"
                    }`}
                  >
                    <p
                      className={`text-xs font-medium ${
                        level === "part2_protected"
                          ? "text-purple-700"
                          : level === "confidential"
                          ? "text-red-700"
                          : level === "internal"
                          ? "text-yellow-700"
                          : "text-green-700"
                      }`}
                    >
                      {level.replace(/_/g, " ").toUpperCase()}
                    </p>
                    <p
                      className={`text-xl font-bold mt-1 ${
                        level === "part2_protected"
                          ? "text-purple-900"
                          : level === "confidential"
                          ? "text-red-900"
                          : level === "internal"
                          ? "text-yellow-900"
                          : "text-green-900"
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
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Open Breach Incidents
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-100">
              <p className="text-sm font-medium text-green-700">Low Risk</p>
              <p className="text-2xl font-bold text-green-900 mt-1">
                {summary?.breaches.byRiskLevel.low || 0}
              </p>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-100">
              <p className="text-sm font-medium text-yellow-700">Medium Risk</p>
              <p className="text-2xl font-bold text-yellow-900 mt-1">
                {summary?.breaches.byRiskLevel.medium || 0}
              </p>
            </div>
            <div className="p-4 bg-red-50 rounded-lg border border-red-100">
              <p className="text-sm font-medium text-red-700">High Risk</p>
              <p className="text-2xl font-bold text-red-900 mt-1">
                {summary?.breaches.byRiskLevel.high || 0}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Expiring Consents Table */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Consents Expiring Within 30 Days
          </h2>
          <a
            href="/compliance/consents"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View All Consents
          </a>
        </div>
        {expiringLoading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
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
                    Consent Type
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">
                    Purpose
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">
                    Expires
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">
                    Days Left
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {expiringConsents?.consents.map((consent) => (
                  <tr
                    key={consent.id}
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="py-3 px-4 text-sm font-medium text-slate-900">
                      {consent.residentName}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {consent.consentType.replace(/_/g, " ")}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600 max-w-xs truncate">
                      {consent.purpose}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {consent.expiresAt
                        ? new Date(consent.expiresAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          (consent.daysUntilExpiration || 0) <= 7
                            ? "bg-red-100 text-red-700"
                            : (consent.daysUntilExpiration || 0) <= 14
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {consent.daysUntilExpiration} days
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
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
                      className="py-6 text-center text-sm text-slate-500"
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
          className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <div className="p-2 bg-purple-100 rounded-lg">
            <Eye className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <p className="font-medium text-slate-900">View Audit Logs</p>
            <p className="text-sm text-slate-500">Full audit trail</p>
          </div>
        </a>
        <a
          href="/compliance/disclosures"
          className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <div className="p-2 bg-blue-100 rounded-lg">
            <FileText className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-slate-900">View Disclosures</p>
            <p className="text-sm text-slate-500">Disclosure history</p>
          </div>
        </a>
        <a
          href="/compliance/breaches"
          className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <div className="p-2 bg-red-100 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <p className="font-medium text-slate-900">Breach Incidents</p>
            <p className="text-sm text-slate-500">Manage incidents</p>
          </div>
        </a>
      </div>
    </div>
  );
}

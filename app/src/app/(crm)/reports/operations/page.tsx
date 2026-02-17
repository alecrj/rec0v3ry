"use client";

import { useState } from "react";
import {
  ClipboardList,
  Users,
  AlertTriangle,
  FlaskConical,
  Calendar,
  Download,
  CheckCircle,
  XCircle,
  Clock,
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
  color?: "blue" | "green" | "yellow" | "red" | "purple" | "orange";
}) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    yellow: "bg-yellow-50 text-yellow-600",
    red: "bg-red-50 text-red-600",
    purple: "bg-purple-50 text-purple-600",
    orange: "bg-orange-50 text-orange-600",
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

export default function OperationsReportPage() {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date().toISOString(),
  });

  const { data: summary, isLoading: summaryLoading } =
    trpc.reporting.getOperationsSummary.useQuery(dateRange);

  const { data: choresByHouse, isLoading: choresLoading } =
    trpc.reporting.getChoreCompletionByHouse.useQuery(dateRange);

  const exportMutation = trpc.reporting.exportReport.useMutation();

  const handleExport = async (format: "csv" | "json") => {
    const result = await exportMutation.mutateAsync({
      reportType: "operations",
      format,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
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
          <h1 className="text-2xl font-bold text-slate-900">Operations Report</h1>
          <p className="text-slate-600 mt-1">
            Chores, meetings, incidents, drug tests, and passes
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
                  case "14d":
                    start = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
                    break;
                  case "30d":
                    start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                    break;
                  case "90d":
                    start = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
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
              <option value="14d">Last 14 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
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

      {/* Summary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Chore Completion"
          value={isLoading ? "—" : `${summary?.chores.completionRate || 0}%`}
          subtitle={`${summary?.chores.completed || 0} of ${summary?.chores.total || 0} completed`}
          icon={ClipboardList}
          color={
            (summary?.chores.completionRate || 0) >= 90
              ? "green"
              : (summary?.chores.completionRate || 0) >= 70
              ? "yellow"
              : "red"
          }
        />
        <StatCard
          title="Meeting Attendance"
          value={isLoading ? "—" : `${summary?.meetings.attendanceRate || 0}%`}
          subtitle={`${summary?.meetings.attended || 0} attended`}
          icon={Users}
          color={
            (summary?.meetings.attendanceRate || 0) >= 90
              ? "green"
              : (summary?.meetings.attendanceRate || 0) >= 70
              ? "yellow"
              : "red"
          }
        />
        <StatCard
          title="Total Incidents"
          value={isLoading ? "—" : summary?.incidents.total || 0}
          subtitle={`${summary?.incidents.bySeverity.high || 0} high, ${summary?.incidents.bySeverity.critical || 0} critical`}
          icon={AlertTriangle}
          color={
            (summary?.incidents.bySeverity.critical || 0) > 0
              ? "red"
              : (summary?.incidents.bySeverity.high || 0) > 0
              ? "orange"
              : "green"
          }
        />
        <StatCard
          title="Drug Tests"
          value={isLoading ? "—" : summary?.drugTests.total || 0}
          subtitle={`${summary?.drugTests.positiveRate || 0}% positive rate`}
          icon={FlaskConical}
          color={
            (summary?.drugTests.positiveRate || 0) > 10
              ? "red"
              : (summary?.drugTests.positiveRate || 0) > 5
              ? "yellow"
              : "green"
          }
        />
      </div>

      {/* Chores & Meetings Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chore Details */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Chore Completion by House
          </h2>
          {choresLoading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-slate-100 rounded"></div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {choresByHouse?.byHouse.map((house) => (
                <div key={house.houseId} className="flex items-center gap-3">
                  <span className="w-32 text-sm font-medium text-slate-700 truncate">
                    {house.houseName}
                  </span>
                  <div className="flex-1 h-6 bg-slate-100 rounded-lg overflow-hidden">
                    <div
                      className={`h-full ${
                        house.completionRate >= 90
                          ? "bg-green-500"
                          : house.completionRate >= 70
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      } rounded-lg flex items-center justify-end pr-2`}
                      style={{ width: `${house.completionRate}%` }}
                    >
                      {house.completionRate > 20 && (
                        <span className="text-xs font-medium text-white">
                          {house.completionRate}%
                        </span>
                      )}
                    </div>
                  </div>
                  {house.completionRate <= 20 && (
                    <span className="text-sm font-medium text-slate-600 w-12 text-right">
                      {house.completionRate}%
                    </span>
                  )}
                </div>
              ))}
              {(!choresByHouse?.byHouse || choresByHouse.byHouse.length === 0) && (
                <p className="text-sm text-slate-500 text-center py-4">
                  No chore data available
                </p>
              )}
            </div>
          )}
        </div>

        {/* Meeting Summary */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Meeting Summary
          </h2>
          {isLoading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-slate-100 rounded"></div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-slate-400" />
                  <span className="text-sm font-medium text-slate-700">
                    Total Attendance Records
                  </span>
                </div>
                <span className="text-lg font-bold text-slate-900">
                  {summary?.meetings.totalAttendanceRecords || 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm font-medium text-green-700">Attended</span>
                </div>
                <span className="text-lg font-bold text-green-900">
                  {summary?.meetings.attended || 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-500" />
                  <span className="text-sm font-medium text-red-700">Missed</span>
                </div>
                <span className="text-lg font-bold text-red-900">
                  {(summary?.meetings.totalAttendanceRecords || 0) -
                    (summary?.meetings.attended || 0)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Incidents */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Incidents by Severity
        </h2>
        {isLoading ? (
          <div className="animate-pulse h-24 bg-slate-100 rounded"></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <p className="text-sm font-medium text-slate-700">Low</p>
              </div>
              <p className="text-3xl font-bold text-slate-900 mt-2">
                {summary?.incidents.bySeverity.low || 0}
              </p>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-100">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <p className="text-sm font-medium text-yellow-700">Medium</p>
              </div>
              <p className="text-3xl font-bold text-yellow-900 mt-2">
                {summary?.incidents.bySeverity.medium || 0}
              </p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <p className="text-sm font-medium text-orange-700">High</p>
              </div>
              <p className="text-3xl font-bold text-orange-900 mt-2">
                {summary?.incidents.bySeverity.high || 0}
              </p>
            </div>
            <div className="p-4 bg-red-50 rounded-lg border border-red-100">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <p className="text-sm font-medium text-red-700">Critical</p>
              </div>
              <p className="text-3xl font-bold text-red-900 mt-2">
                {summary?.incidents.bySeverity.critical || 0}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Drug Tests & Passes Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Drug Test Results */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Drug Test Results
          </h2>
          {isLoading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-slate-100 rounded"></div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-sm font-medium text-slate-700">
                  Total Tests
                </span>
                <span className="text-lg font-bold text-slate-900">
                  {summary?.drugTests.total || 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-green-700">Negative</span>
                <span className="text-lg font-bold text-green-900">
                  {summary?.drugTests.negative || 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <span className="text-sm font-medium text-red-700">Positive</span>
                <span className="text-lg font-bold text-red-900">
                  {summary?.drugTests.positive || 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <span className="text-sm font-medium text-yellow-700">Pending</span>
                <span className="text-lg font-bold text-yellow-900">
                  {summary?.drugTests.pending || 0}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Pass Statistics */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Pass Statistics
          </h2>
          {isLoading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-slate-100 rounded"></div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-sm font-medium text-slate-700">Total Passes</span>
                <span className="text-lg font-bold text-slate-900">
                  {summary?.passes.total || 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-green-700">Approved</span>
                <span className="text-lg font-bold text-green-900">
                  {summary?.passes.approved || 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <span className="text-sm font-medium text-red-700">
                  Violated ({summary?.passes.violationRate || 0}%)
                </span>
                <span className="text-lg font-bold text-red-900">
                  {summary?.passes.violated || 0}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

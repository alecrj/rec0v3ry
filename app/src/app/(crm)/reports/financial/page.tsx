"use client";

import { useState } from "react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  Download,
  Calendar,
  ChevronDown,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

export const dynamic = "force-dynamic";

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = "blue",
  trend,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: "blue" | "green" | "yellow" | "red" | "purple";
  trend?: { value: string; positive: boolean };
}) {
  const colorClasses = {
    blue: "bg-indigo-500/15 text-indigo-400",
    green: "bg-green-500/15 text-green-400",
    yellow: "bg-yellow-500/15 text-yellow-400",
    red: "bg-red-500/15 text-red-400",
    purple: "bg-purple-500/15 text-purple-400",
  };

  return (
    <div className="bg-white rounded-lg border border-zinc-200 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-400">{title}</p>
          <p className="text-2xl font-bold text-zinc-800 mt-1">{value}</p>
          <p className="text-sm text-zinc-500 mt-1">{subtitle}</p>
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
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export default function FinancialReportPage() {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
    endDate: new Date().toISOString(),
  });

  const { data: summary, isLoading: summaryLoading } =
    trpc.reporting.getFinancialSummary.useQuery(dateRange);

  const { data: trends, isLoading: trendsLoading } =
    trpc.reporting.getRevenueTrends.useQuery({
      startDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(), // 6 months
      endDate: new Date().toISOString(),
      groupBy: "month",
    });

  const { data: delinquent, isLoading: delinquentLoading } =
    trpc.reporting.getTopDelinquent.useQuery({ limit: 10 });

  const exportMutation = trpc.reporting.exportReport.useMutation();

  const handleExport = async (format: "csv" | "json") => {
    const result = await exportMutation.mutateAsync({
      reportType: "financial",
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const isLoading = summaryLoading;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-800">Financial Report</h1>
          <p className="text-zinc-400 mt-1">
            Revenue, collections, aging, and outstanding balances
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-white border border-zinc-200 rounded-lg">
            <Calendar className="h-4 w-4 text-zinc-500" />
            <select
              className="text-sm bg-transparent border-none outline-none"
              value="mtd"
              onChange={(e) => {
                const now = new Date();
                let start: Date;
                switch (e.target.value) {
                  case "mtd":
                    start = new Date(now.getFullYear(), now.getMonth(), 1);
                    break;
                  case "qtd":
                    start = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
                    break;
                  case "ytd":
                    start = new Date(now.getFullYear(), 0, 1);
                    break;
                  case "30d":
                    start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                    break;
                  case "90d":
                    start = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
                    break;
                  default:
                    start = new Date(now.getFullYear(), now.getMonth(), 1);
                }
                setDateRange({
                  startDate: start.toISOString(),
                  endDate: now.toISOString(),
                });
              }}
            >
              <option value="mtd">Month to Date</option>
              <option value="qtd">Quarter to Date</option>
              <option value="ytd">Year to Date</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
          </div>
          <button
            onClick={() => handleExport("csv")}
            disabled={exportMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-600 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-100/40 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Invoiced"
          value={isLoading ? "—" : formatCurrency(summary?.totalInvoiced || 0)}
          subtitle="In selected period"
          icon={DollarSign}
          color="blue"
        />
        <StatCard
          title="Total Collected"
          value={isLoading ? "—" : formatCurrency(summary?.totalCollected || 0)}
          subtitle="In selected period"
          icon={DollarSign}
          color="green"
        />
        <StatCard
          title="Collection Rate"
          value={isLoading ? "—" : `${summary?.collectionRate || 0}%`}
          subtitle="Collected vs invoiced"
          icon={TrendingUp}
          color={
            (summary?.collectionRate || 0) >= 90
              ? "green"
              : (summary?.collectionRate || 0) >= 70
              ? "yellow"
              : "red"
          }
        />
        <StatCard
          title="Total Outstanding"
          value={isLoading ? "—" : formatCurrency(summary?.totalOutstanding || 0)}
          subtitle={`${summary?.overdueInvoiceCount || 0} overdue invoices`}
          icon={AlertTriangle}
          color={(summary?.overdueInvoiceCount || 0) > 10 ? "red" : "yellow"}
        />
      </div>

      {/* Aging Buckets */}
      <div className="bg-white rounded-lg border border-zinc-200 p-6">
        <h2 className="text-lg font-semibold text-zinc-800 mb-4">
          Accounts Receivable Aging
        </h2>
        {isLoading ? (
          <div className="animate-pulse h-24 bg-zinc-100 rounded"></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
              <p className="text-sm font-medium text-green-600">Current (0-30 days)</p>
              <p className="text-2xl font-bold text-green-700 mt-1">
                {formatCurrency(summary?.aging.current || 0)}
              </p>
            </div>
            <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
              <p className="text-sm font-medium text-yellow-600">31-60 days</p>
              <p className="text-2xl font-bold text-yellow-700 mt-1">
                {formatCurrency(summary?.aging.days31_60 || 0)}
              </p>
            </div>
            <div className="p-4 bg-orange-500/10 rounded-lg border border-orange-500/20">
              <p className="text-sm font-medium text-orange-600">61-90 days</p>
              <p className="text-2xl font-bold text-orange-700 mt-1">
                {formatCurrency(summary?.aging.days61_90 || 0)}
              </p>
            </div>
            <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
              <p className="text-sm font-medium text-red-600">90+ days</p>
              <p className="text-2xl font-bold text-red-700 mt-1">
                {formatCurrency(summary?.aging.days90Plus || 0)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Revenue Trends */}
      <div className="bg-white rounded-lg border border-zinc-200 p-6">
        <h2 className="text-lg font-semibold text-zinc-800 mb-4">
          Monthly Revenue (Last 6 Months)
        </h2>
        {trendsLoading ? (
          <div className="animate-pulse h-48 bg-zinc-100 rounded"></div>
        ) : (
          <div className="space-y-3">
            {trends?.trends.map((month) => {
              const maxAmount = Math.max(...(trends?.trends.map((t) => t.amount) || [1]));
              const percentage = (month.amount / maxAmount) * 100;

              return (
                <div key={month.period} className="flex items-center gap-4">
                  <span className="w-20 text-sm font-medium text-zinc-400">
                    {month.period}
                  </span>
                  <div className="flex-1 h-8 bg-zinc-100 rounded-lg overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-end pr-3"
                      style={{ width: `${percentage}%` }}
                    >
                      {percentage > 30 && (
                        <span className="text-xs font-medium text-zinc-900">
                          {formatCurrency(month.amount)}
                        </span>
                      )}
                    </div>
                  </div>
                  {percentage <= 30 && (
                    <span className="text-sm font-medium text-zinc-600 w-24 text-right">
                      {formatCurrency(month.amount)}
                    </span>
                  )}
                </div>
              );
            })}
            {(!trends?.trends || trends.trends.length === 0) && (
              <p className="text-sm text-zinc-500 text-center py-4">
                No revenue data available
              </p>
            )}
          </div>
        )}
      </div>

      {/* Top Delinquent Accounts */}
      <div className="bg-white rounded-lg border border-zinc-200 p-6">
        <h2 className="text-lg font-semibold text-zinc-800 mb-4">
          Top Delinquent Accounts
        </h2>
        {delinquentLoading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-zinc-100 rounded"></div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-zinc-600">
                    Resident
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-zinc-600">
                    Amount Due
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-zinc-600">
                    Invoices
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-zinc-600">
                    Days Overdue
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-zinc-600">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {delinquent?.delinquentAccounts.map((account) => (
                  <tr
                    key={account.residentId}
                    className="border-b border-zinc-200/50 hover:bg-zinc-100/40"
                  >
                    <td className="py-3 px-4 text-sm font-medium text-zinc-800">
                      {account.residentName}
                    </td>
                    <td className="py-3 px-4 text-sm text-zinc-800 text-right font-medium">
                      {formatCurrency(account.totalDue)}
                    </td>
                    <td className="py-3 px-4 text-sm text-zinc-400 text-right">
                      {account.invoiceCount}
                    </td>
                    <td className="py-3 px-4 text-sm text-zinc-400 text-right">
                      {account.daysOverdue}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          account.daysOverdue >= 90
                            ? "bg-red-500/15 text-red-600"
                            : account.daysOverdue >= 60
                            ? "bg-orange-500/15 text-orange-600"
                            : account.daysOverdue >= 30
                            ? "bg-yellow-500/15 text-yellow-600"
                            : "bg-green-500/15 text-green-600"
                        }`}
                      >
                        {account.daysOverdue >= 90
                          ? "Critical"
                          : account.daysOverdue >= 60
                          ? "Severe"
                          : account.daysOverdue >= 30
                          ? "Overdue"
                          : "Current"}
                      </span>
                    </td>
                  </tr>
                ))}
                {(!delinquent?.delinquentAccounts ||
                  delinquent.delinquentAccounts.length === 0) && (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-6 text-center text-sm text-zinc-500"
                    >
                      No delinquent accounts found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import {
  PageContainer,
  PageHeader,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  EmptyState,
  SkeletonTable,
} from "@/components/ui";
import { TrendingUp, TrendingDown, Calendar, ArrowLeft, Filter } from "lucide-react";

export const dynamic = "force-dynamic";

const inputClass =
  "h-9 px-3 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

function getMonthRange() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start: startOfMonth.toISOString().split("T")[0],
    end: endOfMonth.toISOString().split("T")[0],
  };
}

function MoneyMetric({ label, value, variant = "default" }: {
  label: string;
  value: number;
  variant?: "default" | "success" | "danger" | "warning";
}) {
  const colorMap = {
    default: "text-zinc-100",
    success: "text-green-400",
    danger: "text-red-400",
    warning: "text-amber-400",
  };

  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-500 mb-1">{label}</p>
      <p className={`text-3xl font-semibold font-mono tracking-tight ${colorMap[variant]}`}>
        {formatCurrency(value)}
      </p>
    </div>
  );
}

function BarChart({ data, maxValue }: { data: { name: string; value: number; color: string | null }[]; maxValue: number }) {
  if (data.length === 0) {
    return <EmptyState iconType="inbox" title="No data" description="No expenses in this period" />;
  }

  return (
    <div className="space-y-3">
      {data.map((item, idx) => {
        const percent = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
        const barColor = item.color || "#71717a";

        return (
          <div key={idx}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-zinc-300">{item.name}</span>
              <span className="text-sm font-mono text-zinc-400">{formatCurrency(item.value)}</span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-500"
                style={{ width: `${percent}%`, backgroundColor: barColor }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function PandLPage() {
  const defaultRange = getMonthRange();
  const [startDate, setStartDate] = useState(defaultRange.start);
  const [endDate, setEndDate] = useState(defaultRange.end);
  const [filterHouseId, setFilterHouseId] = useState("");

  // Queries
  const { data: pnl, isLoading, refetch } = trpc.expense.getPandL.useQuery({
    startDate,
    endDate,
    houseId: filterHouseId || undefined,
  });
  const { data: allHouses } = trpc.property.listAllHouses.useQuery();

  const profit = pnl ? pnl.profit : 0;
  const profitMargin = pnl && pnl.revenue > 0 ? (pnl.profit / pnl.revenue) * 100 : 0;

  const handlePresetRange = (preset: "mtd" | "last30" | "ytd") => {
    const now = new Date();
    let start: string;
    let end: string;

    if (preset === "mtd") {
      start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      end = now.toISOString().split("T")[0];
    } else if (preset === "last30") {
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(now.getDate() - 30);
      start = thirtyDaysAgo.toISOString().split("T")[0];
      end = now.toISOString().split("T")[0];
    } else {
      // ytd
      start = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];
      end = now.toISOString().split("T")[0];
    }

    setStartDate(start);
    setEndDate(end);
  };

  return (
    <PageContainer>
      <PageHeader
        title="Profit & Loss"
        description="Revenue vs expenses with per-house and per-category breakdowns"
        actions={
          <Link href="/billing/expenses">
            <Button variant="secondary" icon={<ArrowLeft className="h-4 w-4" />}>
              Back to Expenses
            </Button>
          </Link>
        }
      />

      {/* Date Range Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Report Period</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 flex-wrap">
            <Calendar className="h-4 w-4 text-zinc-500" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={inputClass}
            />
            <span className="text-sm text-zinc-500">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={inputClass}
            />
            <div className="flex gap-2 ml-auto">
              <button
                onClick={() => handlePresetRange("mtd")}
                className="px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-indigo-400 border border-zinc-800 hover:border-indigo-500/40 rounded-lg transition-colors"
              >
                MTD
              </button>
              <button
                onClick={() => handlePresetRange("last30")}
                className="px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-indigo-400 border border-zinc-800 hover:border-indigo-500/40 rounded-lg transition-colors"
              >
                Last 30d
              </button>
              <button
                onClick={() => handlePresetRange("ytd")}
                className="px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-indigo-400 border border-zinc-800 hover:border-indigo-500/40 rounded-lg transition-colors"
              >
                YTD
              </button>
            </div>
          </div>
          {allHouses && allHouses.length > 1 && (
            <div className="flex items-center gap-3 mt-3">
              <Filter className="h-4 w-4 text-zinc-500" />
              <select
                value={filterHouseId}
                onChange={(e) => setFilterHouseId(e.target.value)}
                className={inputClass}
              >
                <option value="">All Houses</option>
                {allHouses.map((h) => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
              {filterHouseId && (
                <button
                  onClick={() => setFilterHouseId("")}
                  className="text-xs text-indigo-400 hover:text-indigo-300"
                >
                  Clear filter
                </button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* P&L Summary */}
      {isLoading ? (
        <Card>
          <CardContent className="py-8">
            <div className="grid grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-3 w-16 bg-zinc-800 rounded mb-2" />
                  <div className="h-9 w-24 bg-zinc-800 rounded" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : pnl ? (
        <>
          <Card>
            <CardContent className="py-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <MoneyMetric label="Total Revenue" value={pnl.revenue} variant="success" />
                <MoneyMetric label="Total Expenses" value={pnl.expenses} variant="danger" />
                <div>
                  <MoneyMetric
                    label="Net Profit"
                    value={profit}
                    variant={profit > 0 ? "success" : profit < 0 ? "danger" : "default"}
                  />
                  <div className="flex items-center gap-2 mt-2">
                    {profit > 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-400" />
                    ) : profit < 0 ? (
                      <TrendingDown className="h-4 w-4 text-red-400" />
                    ) : null}
                    <span className={`text-sm font-mono ${profit > 0 ? "text-green-400" : profit < 0 ? "text-red-400" : "text-zinc-500"}`}>
                      {profitMargin.toFixed(1)}% margin
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Expense Breakdown by Category */}
          {pnl.categoryBreakdown.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Expenses by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <BarChart
                  data={pnl.categoryBreakdown.map((c) => ({
                    name: c.name,
                    value: c.total,
                    color: c.color,
                  }))}
                  maxValue={Math.max(...pnl.categoryBreakdown.map((c) => c.total))}
                />
              </CardContent>
            </Card>
          )}

          {/* Per-House Breakdown */}
          {pnl.houseBreakdown.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Profit by House</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-800">
                        <th className="text-left py-3 px-4 text-xs font-medium uppercase tracking-wider text-zinc-500">House</th>
                        <th className="text-right py-3 px-4 text-xs font-medium uppercase tracking-wider text-zinc-500">Revenue</th>
                        <th className="text-right py-3 px-4 text-xs font-medium uppercase tracking-wider text-zinc-500">Expenses</th>
                        <th className="text-right py-3 px-4 text-xs font-medium uppercase tracking-wider text-zinc-500">Profit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {pnl.houseBreakdown.map((house, idx) => (
                        <tr key={idx} className="hover:bg-zinc-800/30 transition-colors">
                          <td className="py-3 px-4 text-sm font-medium text-zinc-200">{house.name}</td>
                          <td className="py-3 px-4 text-right">
                            <span className="text-sm font-semibold font-mono text-green-400">
                              {formatCurrency(house.revenue)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="text-sm font-semibold font-mono text-red-400">
                              {formatCurrency(house.expenses)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className={`text-sm font-semibold font-mono ${house.profit > 0 ? "text-green-400" : house.profit < 0 ? "text-red-400" : "text-zinc-400"}`}>
                              {formatCurrency(house.profit)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="py-8">
            <EmptyState
              iconType="inbox"
              title="No P&L data"
              description="No revenue or expenses recorded in this period"
            />
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}

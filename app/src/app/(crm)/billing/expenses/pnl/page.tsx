"use client";

/**
 * P&L Per House Page
 *
 * G2-16: P&L per house
 *
 * Shows org-wide P&L at top, then per-house breakdown with:
 * - Revenue (from payments/invoices)
 * - Expenses (categorized)
 * - Profit / Loss
 * - Category breakdown
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Home,
  Loader2,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

function formatCurrency(value: string | number): string {
  const n = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function ProfitBadge({ profit }: { profit: string }) {
  const n = parseFloat(profit);
  const isPositive = n >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 text-sm font-semibold ${
        isPositive ? "text-emerald-400" : "text-red-400"
      }`}
    >
      {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
      {isPositive ? "+" : ""}
      {formatCurrency(profit)}
    </span>
  );
}

function HouseCard({
  house,
}: {
  house: {
    house_id: string;
    house_name: string;
    revenue: string;
    expenses: string;
    profit: string;
    categories: Array<{ category: string; color: string | null; total: number }>;
  };
}) {
  const [expanded, setExpanded] = useState(false);
  const profit = parseFloat(house.profit);
  const isPositive = profit >= 0;

  return (
    <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
      {/* Summary row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 p-5 hover:bg-zinc-100 transition-colors text-left"
      >
        <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
          <Home className="h-5 w-5 text-zinc-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-zinc-900 font-semibold truncate">{house.house_name}</p>
        </div>

        {/* Stats */}
        <div className="hidden md:flex items-center gap-6 text-sm">
          <div className="text-center">
            <p className="text-zinc-500 text-xs">Revenue</p>
            <p className="text-emerald-400 font-semibold">{formatCurrency(house.revenue)}</p>
          </div>
          <div className="text-center">
            <p className="text-zinc-500 text-xs">Expenses</p>
            <p className="text-red-400 font-semibold">{formatCurrency(house.expenses)}</p>
          </div>
          <div className="text-center min-w-[80px]">
            <p className="text-zinc-500 text-xs">Profit</p>
            <ProfitBadge profit={house.profit} />
          </div>
        </div>

        {expanded ? (
          <ChevronDown className="h-4 w-4 text-zinc-500 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-zinc-500 shrink-0" />
        )}
      </button>

      {/* Mobile stats */}
      <div className="md:hidden grid grid-cols-3 gap-2 px-5 pb-4 border-t border-zinc-200">
        <div className="text-center pt-3">
          <p className="text-zinc-500 text-xs">Revenue</p>
          <p className="text-emerald-400 font-semibold text-sm">{formatCurrency(house.revenue)}</p>
        </div>
        <div className="text-center pt-3">
          <p className="text-zinc-500 text-xs">Expenses</p>
          <p className="text-red-400 font-semibold text-sm">{formatCurrency(house.expenses)}</p>
        </div>
        <div className="text-center pt-3">
          <p className="text-zinc-500 text-xs">Profit</p>
          <ProfitBadge profit={house.profit} />
        </div>
      </div>

      {/* Category breakdown */}
      {expanded && house.categories.length > 0 && (
        <div className="border-t border-zinc-200 p-5 space-y-3">
          <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wide">
            Expense Breakdown
          </p>
          <div className="space-y-2">
            {house.categories.map((cat) => {
              const pct = parseFloat(house.expenses) > 0
                ? (cat.total / parseFloat(house.expenses)) * 100
                : 0;
              return (
                <div key={cat.category} className="flex items-center gap-3">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: cat.color ?? "#6366f1" }}
                  />
                  <span className="text-sm text-zinc-600 flex-1">{cat.category}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-zinc-100 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full"
                        style={{
                          width: `${Math.min(pct, 100)}%`,
                          backgroundColor: cat.color ?? "#6366f1",
                        }}
                      />
                    </div>
                    <span className="text-sm text-zinc-400 text-right w-20">
                      {formatCurrency(cat.total)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {expanded && house.categories.length === 0 && (
        <div className="border-t border-zinc-200 p-5 text-sm text-zinc-500">
          No categorized expenses in this period.
        </div>
      )}
    </div>
  );
}

// --- Main Page ---

export default function PnLPage() {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const todayStr = today.toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate] = useState(todayStr);

  const { data, isLoading, error } = trpc.expense.getPandL.useQuery({
    startDate,
    endDate,
  });

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/billing/expenses"
          className="text-zinc-400 hover:text-zinc-900 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Profit & Loss</h1>
          <p className="text-zinc-400 mt-1">Revenue vs. expenses per house</p>
        </div>
      </div>

      {/* Date range picker */}
      <div className="flex items-center gap-3">
        <div>
          <label className="text-xs text-zinc-400 block mb-1">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-white border border-zinc-200 text-zinc-900 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="text-xs text-zinc-400 block mb-1">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-white border border-zinc-200 text-zinc-900 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-zinc-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading P&L data...
        </div>
      ) : error ? (
        <div className="text-red-400 text-sm">{error.message}</div>
      ) : data ? (
        <>
          {/* Overall summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white border border-zinc-200 rounded-xl p-5">
              <div className="flex items-center gap-2 text-zinc-400 text-sm mb-2">
                <DollarSign className="h-4 w-4 text-emerald-400" />
                Total Revenue
              </div>
              <p className="text-3xl font-bold text-emerald-400">
                {formatCurrency(data.overall.revenue)}
              </p>
            </div>
            <div className="bg-white border border-zinc-200 rounded-xl p-5">
              <div className="flex items-center gap-2 text-zinc-400 text-sm mb-2">
                <TrendingDown className="h-4 w-4 text-red-400" />
                Total Expenses
              </div>
              <p className="text-3xl font-bold text-red-400">
                {formatCurrency(data.overall.expenses)}
              </p>
            </div>
            <div className="bg-white border border-zinc-200 rounded-xl p-5">
              <div className="flex items-center gap-2 text-zinc-400 text-sm mb-2">
                {parseFloat(data.overall.profit) >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-indigo-400" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-orange-400" />
                )}
                Net Profit
              </div>
              <p
                className={`text-3xl font-bold ${
                  parseFloat(data.overall.profit) >= 0 ? "text-indigo-400" : "text-orange-400"
                }`}
              >
                {parseFloat(data.overall.profit) >= 0 ? "+" : ""}
                {formatCurrency(data.overall.profit)}
              </p>
            </div>
          </div>

          {/* Per-house breakdown */}
          {data.houses.length > 0 ? (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-zinc-900">By House</h2>
              {data.houses.map((house) => (
                <HouseCard key={house.house_id} house={house} />
              ))}
            </div>
          ) : (
            <div className="bg-white border border-zinc-200 rounded-xl p-12 text-center">
              <Home className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-zinc-900 font-semibold mb-1">No houses found</p>
              <p className="text-zinc-400 text-sm">
                Add properties and houses to see P&L breakdowns.
              </p>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

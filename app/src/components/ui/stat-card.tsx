"use client";

import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number | string;
    direction: "up" | "down" | "neutral";
    label?: string;
  };
  variant?: "default" | "success" | "warning" | "error" | "info";
  loading?: boolean;
  sparkline?: number[];
  className?: string;
  onClick?: () => void;
}

function StatCard({
  title,
  value,
  subtitle,
  trend,
  loading = false,
  className,
  onClick,
}: StatCardProps) {
  if (loading) {
    return (
      <div className={cn("py-1", className)}>
        <div className="h-3 w-16 rounded animate-shimmer mb-2" />
        <div className="h-7 w-20 rounded animate-shimmer mb-1" />
        <div className="h-3 w-24 rounded animate-shimmer" />
      </div>
    );
  }

  const TrendIcon = trend?.direction === "up" ? TrendingUp : trend?.direction === "down" ? TrendingDown : Minus;
  const trendColor =
    trend?.direction === "up"
      ? "text-green-400"
      : trend?.direction === "down"
        ? "text-red-400"
        : "text-zinc-500";

  return (
    <div
      className={cn(
        onClick && "cursor-pointer hover:opacity-80 transition-opacity",
        className
      )}
      onClick={onClick}
    >
      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{title}</p>
      <p className="text-2xl font-semibold text-zinc-50 tabular-nums font-mono mt-0.5 tracking-tight">{value}</p>
      {subtitle && <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>}
      {trend && (
        <div className="flex items-center gap-1 mt-1">
          <TrendIcon className={cn("h-3 w-3", trendColor)} />
          <span className={cn("text-xs font-medium font-mono", trendColor)}>{trend.value}</span>
          {trend.label && <span className="text-xs text-zinc-600">{trend.label}</span>}
        </div>
      )}
    </div>
  );
}

function StatCardGrid({
  children,
  columns = 4,
  className,
}: {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}) {
  const gridCols = {
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-4",
  };

  return (
    <div className={cn("grid gap-6", gridCols[columns], className)}>
      {children}
    </div>
  );
}

export { StatCard, StatCardGrid };

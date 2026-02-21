"use client";

import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Clock,
  DollarSign,
  Bed,
  Users,
  Wrench,
  ClipboardList,
  UserPlus,
  Megaphone,
  Plus,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  PageContainer,
  Badge,
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

function MoneyNumber({ label, value, variant = "default", href }: {
  label: string;
  value: string;
  variant?: "default" | "success" | "danger" | "warning";
  href?: string;
}) {
  const colorMap = {
    default: "text-zinc-100",
    success: "text-green-400",
    danger: "text-red-400",
    warning: "text-amber-400",
  };

  const content = (
    <div className={href ? "cursor-pointer group" : ""}>
      <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-500 mb-1">{label}</p>
      <p className={`text-2xl font-semibold font-mono tracking-tight ${colorMap[variant]} ${href ? "group-hover:text-indigo-400 transition-colors" : ""}`}>
        {value}
      </p>
    </div>
  );

  if (href) return <Link href={href}>{content}</Link>;
  return content;
}

function ActionRow({ icon: Icon, title, detail, href, priority = "medium" }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  detail: string;
  href: string;
  priority?: "high" | "medium" | "low";
}) {
  const dotColor = priority === "high" ? "bg-red-500" : priority === "medium" ? "bg-amber-500" : "bg-zinc-600";

  return (
    <Link href={href} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-800/50 transition-colors group">
      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`} />
      <Icon className="h-4 w-4 text-zinc-500 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-200 truncate">{title}</p>
        <p className="text-xs text-zinc-500 truncate">{detail}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
    </Link>
  );
}

function QuickAction({ icon: Icon, label, href }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-zinc-800 hover:border-indigo-500/40 hover:bg-indigo-500/5 transition-all text-sm font-medium text-zinc-300 hover:text-indigo-400"
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}

function HouseCard({ house }: {
  house: {
    id: string;
    name: string;
    beds: { occupied: number; total: number };
    revenueMTD: number;
    outstanding: number;
    lostRevenue: number;
  };
}) {
  const occupancy = house.beds.total > 0 ? Math.round((house.beds.occupied / house.beds.total) * 100) : 0;

  return (
    <Link
      href={`/occupancy/beds`}
      className="flex-shrink-0 w-[280px] p-4 rounded-xl border border-zinc-800 hover:border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800/30 transition-all snap-start"
    >
      <p className="text-sm font-semibold text-zinc-100 mb-3">{house.name}</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-600">Beds</p>
          <p className="text-lg font-semibold font-mono text-zinc-200">
            {house.beds.occupied}/{house.beds.total}
            <span className="text-xs text-zinc-500 font-normal ml-1">{occupancy}%</span>
          </p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-600">Collected</p>
          <p className="text-lg font-semibold font-mono text-green-400">{formatCurrency(house.revenueMTD)}</p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-600">Outstanding</p>
          <p className={`text-sm font-semibold font-mono ${house.outstanding > 0 ? "text-red-400" : "text-zinc-500"}`}>
            {house.outstanding > 0 ? formatCurrency(house.outstanding) : "$0"}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-600">Lost Rev</p>
          <p className={`text-sm font-semibold font-mono ${house.lostRevenue > 0 ? "text-amber-400" : "text-zinc-500"}`}>
            {house.lostRevenue > 0 ? formatCurrency(house.lostRevenue) : "$0"}
          </p>
        </div>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const { data, isLoading, error } = trpc.reporting.getDashboardData.useQuery();

  // Get MTD P&L for Profit calculation
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const today = now.toISOString().split("T")[0];
  const { data: pnl, isLoading: pnlLoading } = trpc.expense.getPandL.useQuery({
    startDate: startOfMonth,
    endDate: today,
  });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  // Build action items sorted by money impact
  const actions: { icon: React.ComponentType<{ className?: string }>; title: string; detail: string; href: string; priority: "high" | "medium" | "low"; moneyImpact: number }[] = [];

  if (data) {
    if (data.actionItems.lateRent.count > 0) {
      actions.push({
        icon: DollarSign,
        title: `${data.actionItems.lateRent.count} resident${data.actionItems.lateRent.count > 1 ? "s" : ""} late on rent`,
        detail: `${formatCurrency(data.actionItems.lateRent.totalAmount)} outstanding`,
        href: "/billing/invoices",
        priority: "high",
        moneyImpact: data.actionItems.lateRent.totalAmount,
      });
    }
    if (data.actionItems.emptyBeds.count > 0 && data.actionItems.emptyBeds.lostRevenue > 0) {
      actions.push({
        icon: Bed,
        title: `${data.actionItems.emptyBeds.count} bed${data.actionItems.emptyBeds.count > 1 ? "s" : ""} empty`,
        detail: `${formatCurrency(data.actionItems.emptyBeds.lostRevenue)}/mo lost revenue`,
        href: "/occupancy/beds",
        priority: "high",
        moneyImpact: data.actionItems.emptyBeds.lostRevenue,
      });
    }
    if (data.actionItems.pendingMaintenance > 0) {
      actions.push({
        icon: Wrench,
        title: `${data.actionItems.pendingMaintenance} maintenance request${data.actionItems.pendingMaintenance > 1 ? "s" : ""} pending`,
        detail: "Review and assign",
        href: "/operations/maintenance",
        priority: "medium",
        moneyImpact: 0,
      });
    }
    if (data.actionItems.newApplicants.count > 0) {
      actions.push({
        icon: UserPlus,
        title: `New applicant${data.actionItems.newApplicants.count > 1 ? "s" : ""}: ${data.actionItems.newApplicants.names.slice(0, 2).join(", ")}`,
        detail: `${data.actionItems.newApplicants.count} in pipeline`,
        href: "/admissions",
        priority: "medium",
        moneyImpact: 0,
      });
    }
    if (data.actionItems.incompleteChores > 0) {
      actions.push({
        icon: ClipboardList,
        title: `${data.actionItems.incompleteChores} chore${data.actionItems.incompleteChores > 1 ? "s" : ""} incomplete today`,
        detail: "Review and follow up",
        href: "/operations/chores",
        priority: "low",
        moneyImpact: 0,
      });
    }
    if (data.actionItems.pendingPasses > 0) {
      actions.push({
        icon: Users,
        title: `${data.actionItems.pendingPasses} pass request${data.actionItems.pendingPasses > 1 ? "s" : ""} pending`,
        detail: "Review and approve",
        href: "/operations/passes",
        priority: "low",
        moneyImpact: 0,
      });
    }
    // Sort by money impact (highest first), then priority
    actions.sort((a, b) => b.moneyImpact - a.moneyImpact);
  }

  return (
    <PageContainer>
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-semibold text-zinc-50 tracking-tight">{greeting}</h1>
        <p className="text-sm text-zinc-500 mt-1">Here&apos;s how your business is doing.</p>
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

      {/* B1: Money Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {isLoading || pnlLoading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-3 w-16 bg-zinc-800 rounded mb-2" />
                <div className="h-7 w-24 bg-zinc-800 rounded" />
              </div>
            ))}
          </>
        ) : (
          <>
            <MoneyNumber
              label="Collected MTD"
              value={formatCurrency(data?.money.collectedMTD || 0)}
              variant="success"
            />
            <MoneyNumber
              label="Outstanding"
              value={formatCurrency(data?.money.outstanding || 0)}
              variant={data?.money.outstanding ? "danger" : "default"}
              href="/billing/invoices"
            />
            <MoneyNumber
              label="Lost Revenue"
              value={data?.money.lostRevenue ? `${formatCurrency(data.money.lostRevenue)}/mo` : "$0"}
              variant={data?.money.lostRevenue ? "warning" : "default"}
              href="/occupancy/beds"
            />
            <MoneyNumber
              label="Profit MTD"
              value={formatCurrency(pnl?.profit || 0)}
              variant={
                !pnl ? "default" :
                pnl.profit > 0 ? "success" :
                pnl.profit < 0 ? "danger" : "default"
              }
              href="/billing/expenses/pnl"
            />
          </>
        )}
      </div>

      {/* B2: Beds Row */}
      <div className="flex items-center gap-6 py-3 border-y border-zinc-800/50">
        <div className="flex items-center gap-2">
          <Bed className="h-4 w-4 text-zinc-500" />
          <span className="text-sm text-zinc-400">Beds</span>
        </div>
        {isLoading ? (
          <div className="h-4 w-48 bg-zinc-800 rounded animate-pulse" />
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold font-mono text-zinc-100">
                {data?.occupancy.occupied}/{data?.occupancy.total}
              </span>
              <Badge variant={
                (data?.occupancy.rate || 0) >= 90 ? "success" :
                (data?.occupancy.rate || 0) >= 70 ? "warning" : "error"
              } size="sm">
                {data?.occupancy.rate}%
              </Badge>
            </div>
            {(data?.occupancy.empty || 0) > 0 && (
              <Link href="/occupancy/beds" className="text-sm text-amber-400 hover:text-amber-300 transition-colors">
                {data?.occupancy.empty} empty = {formatCurrency(data?.money.lostRevenue || 0)}/mo lost
              </Link>
            )}
          </>
        )}
      </div>

      {/* B3 + B4: Action Items + Quick Actions side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Action Items (2/3 width) */}
        <div className="lg:col-span-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
            Needs Attention
            {actions.length > 0 && (
              <span className="ml-2 text-xs font-normal text-zinc-600">({actions.length})</span>
            )}
          </h2>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <SkeletonListItem key={i} />)}
            </div>
          ) : actions.length > 0 ? (
            <div className="space-y-0.5">
              {actions.map((action, i) => (
                <ActionRow key={i} {...action} />
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm text-zinc-600">All clear. Your business is running smoothly.</p>
            </div>
          )}
        </div>

        {/* Quick Actions + Recent Activity (1/3 width) */}
        <div className="space-y-6">
          {/* B4: Quick Actions */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">Quick Actions</h2>
            <div className="grid grid-cols-1 gap-2">
              <QuickAction icon={DollarSign} label="Record Payment" href="/billing" />
              <QuickAction icon={Plus} label="Add Resident" href="/residents" />
              <QuickAction icon={Megaphone} label="Send Announcement" href="/messages/announcements" />
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">Recent Activity</h2>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <SkeletonListItem key={i} />)}
              </div>
            ) : data?.recentActivity && data.recentActivity.length > 0 ? (
              <div className="divide-y divide-zinc-800/50">
                {data.recentActivity.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="py-2.5">
                    <p className="text-sm text-zinc-400">
                      <span className="font-medium text-zinc-300">{activity.actor}</span>{" "}
                      {activity.description}
                    </p>
                    <p className="text-xs text-zinc-600 mt-0.5">{formatTimeAgo(activity.timestamp)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-4 text-center">
                <Clock className="h-4 w-4 text-zinc-700 mx-auto mb-1" />
                <p className="text-xs text-zinc-600">No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* B5: House Cards (if multiple houses) */}
      {!isLoading && data?.houseCards && data.houseCards.length > 1 && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
            Houses ({data.houseCards.length})
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-thin">
            {data.houseCards.map((house) => (
              <HouseCard key={house.id} house={house} />
            ))}
          </div>
        </div>
      )}
    </PageContainer>
  );
}

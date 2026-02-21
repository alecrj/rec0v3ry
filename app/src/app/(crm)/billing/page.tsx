"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DollarSign,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  PageContainer,
  PageHeader,
  StatCard,
  Button,
  Badge,
  SkeletonTable,
  EmptyState,
  useToast,
} from "@/components/ui";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function formatCurrency(amount: number | string) {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

function RevenueChart({ data }: { data: { month: string; amount: number }[] }) {
  if (!data || data.length === 0) return null;

  const maxAmount = Math.max(...data.map((d) => d.amount));

  return (
    <div className="flex items-end gap-2 h-32">
      {data.map((item, index) => {
        const heightPercent = maxAmount > 0 ? (item.amount / maxAmount) * 100 : 0;
        const isCurrentMonth = index === data.length - 1;

        return (
          <div key={item.month} className="flex-1 flex flex-col items-center gap-2">
            <div className="w-full flex flex-col items-center justify-end h-24">
              <span className="text-xs font-medium text-zinc-500 mb-1 font-mono">
                {formatCurrency(item.amount)}
              </span>
              <div
                className={cn(
                  "w-full rounded-t transition-all duration-300",
                  isCurrentMonth
                    ? "bg-indigo-500"
                    : "bg-zinc-700 hover:bg-zinc-600"
                )}
                style={{ height: `${Math.max(heightPercent, 4)}%` }}
              />
            </div>
            <span className={cn(
              "text-xs",
              isCurrentMonth ? "font-semibold text-indigo-400" : "text-zinc-500"
            )}>
              {item.month}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function AgingBuckets({
  buckets,
}: {
  buckets: { label: string; amount: number; color: string }[];
}) {
  const total = buckets.reduce((sum, b) => sum + b.amount, 0);

  return (
    <div className="space-y-3">
      {buckets.map((bucket) => {
        const percent = total > 0 ? (bucket.amount / total) * 100 : 0;
        return (
          <div key={bucket.label} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-500">{bucket.label}</span>
              <span className="font-medium text-zinc-200 font-mono">{formatCurrency(bucket.amount)}</span>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all duration-500", bucket.color)}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PaymentStatusBadge({ status }: { status: string }) {
  const config: Record<string, { variant: "success" | "warning" | "error" | "default"; icon: typeof CheckCircle2 }> = {
    succeeded: { variant: "success", icon: CheckCircle2 },
    completed: { variant: "success", icon: CheckCircle2 },
    pending: { variant: "warning", icon: Clock },
    failed: { variant: "error", icon: XCircle },
    refunded: { variant: "default", icon: RefreshCw },
  };

  const { variant, icon: Icon } = config[status] || { variant: "default" as const, icon: Clock };

  return (
    <Badge variant={variant} size="sm">
      <Icon className="h-3 w-3 mr-1" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

export default function BillingOverviewPage() {
  const router = useRouter();
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payForm, setPayForm] = useState({
    residentId: "",
    amount: "",
    paymentMethodType: "cash" as "cash" | "check" | "wire" | "other",
    notes: "",
  });

  const { data: residents } = trpc.resident.list.useQuery({});

  const recordPayment = trpc.payment.recordManual.useMutation({
    onSuccess: () => {
      toast("success", "Payment recorded", "The payment has been recorded successfully");
      utils.payment.list.invalidate();
      utils.reporting.getFinancialSummary.invalidate();
      utils.invoice.list.invalidate();
      setPayForm({ residentId: "", amount: "", paymentMethodType: "cash", notes: "" });
      setShowPaymentModal(false);
    },
    onError: (err) => toast("error", "Failed to record payment", err.message),
  });

  const { data: payments, isLoading: paymentsLoading } = trpc.payment.list.useQuery({
    limit: 10,
  });

  const { data: invoices, isLoading: invoicesLoading } = trpc.invoice.list.useQuery({
    limit: 100,
  });

  const startDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]!;
  const endDate = new Date().toISOString().split("T")[0]!;

  const { data: financialData, isLoading: financialLoading } = trpc.reporting.getFinancialSummary.useQuery({
    startDate,
    endDate,
  });

  // Revenue trends: last 6 months
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  const { data: revenueTrends } = trpc.reporting.getRevenueTrends.useQuery({
    startDate: sixMonthsAgo.toISOString(),
    endDate: new Date().toISOString(),
    groupBy: "month",
  });

  const isLoading = paymentsLoading || invoicesLoading || financialLoading;

  const recentPayments = payments?.items ?? [];
  const allInvoices = invoices?.items ?? [];

  const totalInvoiced = financialData?.totalInvoiced ?? 0;
  const totalCollected = financialData?.totalCollected ?? 0;
  const outstanding = financialData?.totalOutstanding ?? 0;
  const pendingCount = allInvoices.filter((i) => i.status === "pending").length;
  const overdueCount = allInvoices.filter((i) => i.status === "overdue").length;

  const revenueData = (revenueTrends?.trends ?? []).map((t) => {
    const [year, month] = t.period.split("-");
    const date = new Date(parseInt(year!), parseInt(month!) - 1);
    return {
      month: date.toLocaleDateString("en-US", { month: "short" }),
      amount: t.amount,
    };
  });

  const aging = financialData?.aging;
  const agingBuckets = [
    { label: "Current (0-30)", amount: aging?.current ?? 0, color: "bg-green-500" },
    { label: "31-60 days", amount: aging?.days31_60 ?? 0, color: "bg-amber-400" },
    { label: "61-90 days", amount: aging?.days61_90 ?? 0, color: "bg-amber-500" },
    { label: "90+ days", amount: aging?.days90Plus ?? 0, color: "bg-red-500" },
  ];

  const collectionRate = totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0;

  return (
    <PageContainer>
      <PageHeader
        title="Billing Overview"
        actions={
          <div className="flex gap-3">
            <Button variant="secondary" icon={<DollarSign className="h-4 w-4" />} onClick={() => setShowPaymentModal(true)}>
              Record Payment
            </Button>
            <Button
              variant="primary"
              icon={<Plus className="h-4 w-4" />}
              onClick={() => router.push("/billing/invoices/new")}
            >
              Create Invoice
            </Button>
          </div>
        }
      />

      {/* Stats — horizontal dividers, no cards */}
      <div className="flex items-start gap-0 divide-x divide-zinc-800">
        <div className="flex-1 pr-6">
          <StatCard
            title="Invoiced This Month"
            value={isLoading ? "\u2014" : formatCurrency(totalInvoiced)}
            subtitle={new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            loading={isLoading}
          />
        </div>
        <div className="flex-1 px-6">
          <StatCard
            title="Collected"
            value={isLoading ? "\u2014" : formatCurrency(totalCollected)}
            subtitle={`${collectionRate}% collection rate`}
            loading={isLoading}
          />
        </div>
        <div className="flex-1 px-6">
          <StatCard
            title="Outstanding"
            value={isLoading ? "\u2014" : formatCurrency(outstanding)}
            subtitle={`${pendingCount + overdueCount} invoices`}
            loading={isLoading}
          />
        </div>
        <div className="flex-1 pl-6">
          <StatCard
            title="Overdue"
            value={isLoading ? "\u2014" : String(overdueCount)}
            subtitle="Requires follow-up"
            loading={isLoading}
          />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Revenue Trend */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Revenue Trend</h2>
            <Badge variant="success" size="sm">
              +15% vs last month
            </Badge>
          </div>
          {isLoading ? (
            <div className="h-32 flex items-end gap-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex-1 bg-zinc-800 rounded-t animate-shimmer" style={{ height: `${30 + Math.random() * 60}%` }} />
              ))}
            </div>
          ) : (
            <RevenueChart data={revenueData} />
          )}
        </div>

        {/* Aging Buckets */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Aging Breakdown</h2>
            <Link href="/billing/ledger">
              <Button variant="ghost" size="sm">
                View Ledger
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between">
                    <div className="h-4 w-20 bg-zinc-800 rounded animate-shimmer" />
                    <div className="h-4 w-16 bg-zinc-800 rounded animate-shimmer" />
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full" />
                </div>
              ))}
            </div>
          ) : (
            <AgingBuckets buckets={agingBuckets} />
          )}
        </div>
      </div>

      {/* Recent Payments */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Recent Payments</h2>
            <p className="text-xs text-zinc-600 mt-0.5">Latest payment activity</p>
          </div>
          <Link href="/billing/invoices">
            <Button variant="ghost" size="sm">
              View All Invoices
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
        {isLoading ? (
          <SkeletonTable rows={5} columns={6} />
        ) : recentPayments.length === 0 ? (
          <EmptyState
            iconType="inbox"
            title="No payments yet"
            description="Payments will appear here once residents start paying invoices."
            action={{
              label: "Create Invoice",
              onClick: () => router.push("/billing/invoices/new"),
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-2.5 px-4 text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Date
                  </th>
                  <th className="text-left py-2.5 px-4 text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Resident
                  </th>
                  <th className="text-right py-2.5 px-4 text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Amount
                  </th>
                  <th className="text-left py-2.5 px-4 text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Method
                  </th>
                  <th className="text-left py-2.5 px-4 text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Status
                  </th>
                  <th className="text-left py-2.5 px-4 text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Invoice
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {recentPayments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="hover:bg-zinc-800/40 transition-colors"
                  >
                    <td className="py-3 px-4 text-sm text-zinc-400 font-mono">
                      {new Date(payment.payment_date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm font-medium text-zinc-200">
                        {payment.resident
                          ? `${payment.resident.first_name} ${payment.resident.last_name}`
                          : "\u2014"}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <p className="text-sm font-semibold text-zinc-100 font-mono">
                        {formatCurrency(parseFloat(payment.amount))}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-zinc-400 capitalize">
                        {payment.payment_method_type?.replace(/_/g, " ") || "\u2014"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <PaymentStatusBadge status={payment.status} />
                    </td>
                    <td className="py-3 px-4">
                      {payment.invoice ? (
                        <Link
                          href={`/billing/invoices/${payment.invoice.id}`}
                          className="text-sm font-mono text-indigo-400 hover:text-indigo-300 hover:underline"
                        >
                          {payment.invoice.invoice_number}
                        </Link>
                      ) : (
                        <span className="text-sm text-zinc-600">{"\u2014"}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowPaymentModal(false)} />
          <div className="relative bg-zinc-900 rounded-xl shadow-2xl w-full max-w-md mx-4 border border-zinc-800">
            <div className="p-6 border-b border-zinc-800">
              <h2 className="text-xl font-bold text-zinc-100">Record Payment</h2>
              <p className="text-sm text-zinc-500 mt-1">Manually record an offline payment</p>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!payForm.residentId || !payForm.amount) return;
                recordPayment.mutate({
                  residentId: payForm.residentId,
                  amount: payForm.amount,
                  paymentMethodType: payForm.paymentMethodType,
                  paymentDate: new Date().toISOString(),
                  notes: payForm.notes || undefined,
                });
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Resident <span className="text-red-400">*</span></label>
                <select
                  required
                  value={payForm.residentId}
                  onChange={(e) => setPayForm({ ...payForm, residentId: e.target.value })}
                  className="w-full h-10 px-3 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="">Select a resident</option>
                  {(residents?.items ?? []).map((r) => (
                    <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Amount <span className="text-red-400">*</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={payForm.amount}
                    onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                    className="w-full h-10 pl-7 pr-3 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Payment Method <span className="text-red-400">*</span></label>
                <select
                  value={payForm.paymentMethodType}
                  onChange={(e) => setPayForm({ ...payForm, paymentMethodType: e.target.value as "cash" | "check" | "wire" | "other" })}
                  className="w-full h-10 px-3 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                  <option value="wire">Wire Transfer</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Notes</label>
                <input
                  type="text"
                  value={payForm.notes}
                  onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                  className="w-full h-10 px-3 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="Optional notes"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => setShowPaymentModal(false)}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={recordPayment.isPending}>
                  {recordPayment.isPending ? "Recording..." : "Record Payment"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

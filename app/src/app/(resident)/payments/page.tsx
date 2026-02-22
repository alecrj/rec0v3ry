"use client";

import Link from "next/link";
import {
  DollarSign,
  CreditCard,
  CheckCircle,
  Clock,
  AlertCircle,
  Calendar,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function ResidentPaymentsPage() {
  const { data: userData } = trpc.user.getCurrentUser.useQuery();
  const { data: profile } = trpc.resident.getMyProfile.useQuery(
    undefined,
    { enabled: !!userData }
  );

  const residentId = userData?.scope_type === "resident" ? userData.scope_id : undefined;

  const { data: invoicesData, isLoading: invoicesLoading } = trpc.invoice.list.useQuery(
    { residentId: residentId!, status: "pending" },
    { enabled: !!residentId }
  );

  const { data: paidInvoicesData, isLoading: paidLoading } = trpc.invoice.list.useQuery(
    { residentId: residentId!, status: "paid", limit: 10 },
    { enabled: !!residentId }
  );

  const isLoading = invoicesLoading || paidLoading;
  const upcomingInvoices = invoicesData?.items ?? [];
  const recentPayments = paidInvoicesData?.items ?? [];
  const balance = upcomingInvoices.reduce(
    (sum, inv) => sum + Number(inv.total ?? 0) - Number(inv.amount_paid ?? 0),
    0
  );
  const isOverdue = upcomingInvoices.some((inv) => inv.status === "overdue");

  const getStatusIcon = (status: string) => {
    if (status === "paid") return CheckCircle;
    if (status === "pending") return Clock;
    return AlertCircle;
  };

  const getStatusColor = (status: string) => {
    if (status === "paid") return "text-green-400";
    if (status === "pending") return "text-amber-400";
    return "text-red-400";
  };

  const getStatusBg = (status: string) => {
    if (status === "paid") return "bg-green-500/15";
    if (status === "pending") return "bg-amber-500/15";
    return "bg-red-500/15";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  // No resident linked
  if (!residentId) {
    return (
      <div className="p-4 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-800">Payments</h1>
          <p className="text-zinc-400 mt-1">Manage your account and payments</p>
        </div>
        <div className="bg-[#0d9488]/10 border border-[#0d9488]/30 rounded-lg p-6 text-center">
          <DollarSign className="h-10 w-10 text-[#0d9488] mx-auto mb-3" />
          <p className="text-zinc-600">No resident account linked. Contact your house manager.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-800">Payments</h1>
        <p className="text-zinc-400 mt-1">Manage your account and payments</p>
      </div>

      <div
        className={`rounded-lg border p-6 ${
          balance === 0
            ? "bg-green-500/10 border-green-500/30"
            : isOverdue
            ? "bg-red-500/10 border-red-500/30"
            : "bg-[#0d9488]/10 border-[#0d9488]/30"
        }`}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-zinc-600 mb-1">Current Balance</p>
            <p
              className={`text-4xl font-bold ${
                balance === 0
                  ? "text-green-600"
                  : isOverdue
                  ? "text-red-600"
                  : "text-zinc-900"
              }`}
            >
              ${balance.toFixed(2)}
            </p>
            {balance > 0 && upcomingInvoices[0]?.due_date && (
              <p className="text-sm text-zinc-600 mt-2 flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Due {new Date(upcomingInvoices[0].due_date).toLocaleDateString()}
              </p>
            )}
            {balance === 0 && (
              <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                <CheckCircle className="h-4 w-4" />
                You&apos;re all paid up!
              </p>
            )}
          </div>
          <DollarSign
            className={`h-10 w-10 ${
              balance === 0
                ? "text-green-400"
                : isOverdue
                ? "text-red-400"
                : "text-[#0d9488]"
            }`}
          />
        </div>

        {balance > 0 && (
          <Link
            href="/payments/pay"
            className={`w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 ${
              isOverdue
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-[#0d9488] hover:bg-[#14b8a6] text-white"
            }`}
          >
            <DollarSign className="h-5 w-5" />
            Make Payment
          </Link>
        )}
      </div>

      {upcomingInvoices.length > 0 && (
        <div className="bg-white rounded-lg border border-zinc-200">
          <div className="p-4 border-b border-zinc-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-800">Upcoming Invoices</h2>
            <span className="text-sm text-zinc-400">{upcomingInvoices.length} pending</span>
          </div>
          <div className="divide-y divide-zinc-200/50">
            {upcomingInvoices.map((invoice) => {
              const daysUntilDue = invoice.due_date
                ? Math.ceil(
                    (new Date(invoice.due_date).getTime() - new Date().getTime()) /
                      (1000 * 60 * 60 * 24)
                  )
                : 999;
              const isUrgent = daysUntilDue <= 3;

              return (
                <div key={invoice.id} className="p-4 hover:bg-zinc-100/40 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-zinc-800 mb-1">
                        {invoice.invoice_number ?? "Invoice"}
                      </p>
                      <div className="flex items-center gap-2">
                        {invoice.due_date && (
                          <p className="text-sm text-zinc-400">
                            Due {new Date(invoice.due_date).toLocaleDateString()}
                          </p>
                        )}
                        {isUrgent && (
                          <Badge variant="error">Due soon</Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-zinc-800 text-lg">
                        ${Number(invoice.total ?? 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-zinc-200">
        <div className="p-4 border-b border-zinc-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-800">Recent Payments</h2>
          <span className="text-sm text-zinc-400">{recentPayments.length} paid</span>
        </div>
        <div className="divide-y divide-zinc-200/50">
          {recentPayments.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-sm">No payment history yet</div>
          ) : (
            recentPayments.slice(0, 4).map((payment) => {
              const StatusIcon = getStatusIcon(payment.status ?? "paid");
              const statusColor = getStatusColor(payment.status ?? "paid");
              const statusBg = getStatusBg(payment.status ?? "paid");

              return (
                <div key={payment.id} className="p-4 hover:bg-zinc-100/40 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${statusBg}`}>
                      <StatusIcon className={`h-4 w-4 ${statusColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-zinc-800 mb-1">
                        {payment.invoice_number ?? "Payment"}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-zinc-400">
                        {payment.issue_date && (
                          <span>{new Date(payment.issue_date).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-semibold text-zinc-800 text-lg">
                        ${Number(payment.total ?? 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

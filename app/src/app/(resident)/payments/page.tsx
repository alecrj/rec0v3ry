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
} from "lucide-react";

export default function ResidentPaymentsPage() {
  const balance: number = 850;
  const isOverdue: boolean = false;

  const upcomingInvoices = [
    {
      id: "1",
      description: "February 2026 Rent",
      dueDate: "2026-02-15",
      amount: 850,
      status: "pending",
    },
    {
      id: "2",
      description: "Weekly Program Fee",
      dueDate: "2026-02-19",
      amount: 50,
      status: "pending",
    },
  ];

  const recentPayments = [
    {
      id: "1",
      description: "January 2026 Rent",
      date: "2026-01-15",
      amount: 850,
      method: "Visa ••4242",
      status: "succeeded",
    },
    {
      id: "2",
      description: "Weekly Program Fee",
      date: "2026-01-12",
      amount: 50,
      method: "Visa ••4242",
      status: "succeeded",
    },
    {
      id: "3",
      description: "December 2025 Rent",
      date: "2025-12-15",
      amount: 850,
      method: "Visa ••4242",
      status: "succeeded",
    },
    {
      id: "4",
      description: "Weekly Program Fee",
      date: "2025-12-08",
      amount: 50,
      method: "Visa ••4242",
      status: "succeeded",
    },
  ];

  const getStatusIcon = (status: string) => {
    if (status === "succeeded") return CheckCircle;
    if (status === "pending") return Clock;
    return AlertCircle;
  };

  const getStatusColor = (status: string) => {
    if (status === "succeeded") return "text-green-600";
    if (status === "pending") return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Payments</h1>
        <p className="text-slate-600 mt-1">Manage your account and payments</p>
      </div>

      <div
        className={`rounded-lg border p-6 ${
          balance === 0
            ? "bg-green-50 border-green-200"
            : isOverdue
            ? "bg-red-50 border-red-200"
            : "bg-blue-50 border-blue-200"
        }`}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-700 mb-1">Current Balance</p>
            <p
              className={`text-4xl font-bold ${
                balance === 0
                  ? "text-green-900"
                  : isOverdue
                  ? "text-red-900"
                  : "text-blue-900"
              }`}
            >
              ${balance.toFixed(2)}
            </p>
            {balance > 0 && (
              <p className="text-sm text-slate-700 mt-2 flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Due Feb 15, 2026
              </p>
            )}
            {balance === 0 && (
              <p className="text-sm text-green-800 mt-2 flex items-center gap-1">
                <CheckCircle className="h-4 w-4" />
                You're all paid up!
              </p>
            )}
          </div>
          <DollarSign
            className={`h-10 w-10 ${
              balance === 0
                ? "text-green-600"
                : isOverdue
                ? "text-red-600"
                : "text-blue-600"
            }`}
          />
        </div>

        {balance > 0 && (
          <Link
            href="/payments/pay"
            className={`w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 ${
              isOverdue
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            <DollarSign className="h-5 w-5" />
            Make Payment
          </Link>
        )}
      </div>

      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Upcoming Invoices</h2>
          <span className="text-sm text-slate-600">{upcomingInvoices.length} pending</span>
        </div>
        <div className="divide-y divide-slate-100">
          {upcomingInvoices.map((invoice) => {
            const daysUntilDue = Math.ceil(
              (new Date(invoice.dueDate).getTime() - new Date().getTime()) /
                (1000 * 60 * 60 * 24)
            );
            const isUrgent = daysUntilDue <= 3;

            return (
              <div
                key={invoice.id}
                className="p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-slate-900 mb-1">
                      {invoice.description}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-slate-600">
                        Due {new Date(invoice.dueDate).toLocaleDateString()}
                      </p>
                      {isUrgent && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">
                          Due soon
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900 text-lg">
                      ${invoice.amount.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">
            Payment Method on File
          </h2>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CreditCard className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-900">Visa ••4242</p>
              <p className="text-sm text-slate-600">Expires 12/2028</p>
            </div>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium">
              Default
            </span>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900">Auto-Pay Enabled</p>
                <p className="text-xs text-blue-800 mt-1">
                  Your rent will be automatically charged on the 1st of each month
                </p>
              </div>
            </div>
          </div>

          <button className="w-full text-blue-600 hover:bg-blue-50 font-medium py-2 text-sm rounded-lg transition-colors">
            Manage Payment Methods
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Recent Payments</h2>
          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
            View All
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="divide-y divide-slate-100">
          {recentPayments.slice(0, 4).map((payment) => {
            const StatusIcon = getStatusIcon(payment.status);
            const statusColor = getStatusColor(payment.status);

            return (
              <div
                key={payment.id}
                className="p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${statusColor.replace('text-', 'bg-').replace('600', '100')}`}>
                    <StatusIcon className={`h-4 w-4 ${statusColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 mb-1">
                      {payment.description}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <span>{new Date(payment.date).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>{payment.method}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-semibold text-slate-900 text-lg">
                      ${payment.amount.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

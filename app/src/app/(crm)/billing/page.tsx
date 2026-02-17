"use client";

import {
  DollarSign,
  TrendingUp,
  CreditCard,
  AlertCircle,
  Receipt,
  ArrowUpRight,
} from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  variant?: "default" | "success" | "warning" | "danger";
}

function StatCard({ title, value, subtitle, icon: Icon, variant = "default" }: StatCardProps) {
  const variantStyles = {
    default: "bg-blue-50 text-blue-600",
    success: "bg-green-50 text-green-600",
    warning: "bg-yellow-50 text-yellow-600",
    danger: "bg-red-50 text-red-600",
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-600">{title}</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{value}</p>
          <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
        </div>
        <div className={`p-3 rounded-lg ${variantStyles[variant]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

export default function PaymentsOverviewPage() {
  const revenueData = [
    { month: "Sep", amount: 42500 },
    { month: "Oct", amount: 45200 },
    { month: "Nov", amount: 48100 },
    { month: "Dec", amount: 46800 },
    { month: "Jan", amount: 51200 },
    { month: "Feb", amount: 47500 },
  ];

  const maxRevenue = Math.max(...revenueData.map((d) => d.amount));

  const recentPayments = [
    {
      id: "1",
      date: "2026-02-12",
      resident: "Sarah Martinez",
      amount: 850,
      method: "card",
      status: "succeeded",
      invoice: "INV-2026-0234",
    },
    {
      id: "2",
      date: "2026-02-11",
      resident: "Michael Chen",
      amount: 900,
      method: "ach",
      status: "succeeded",
      invoice: "INV-2026-0233",
    },
    {
      id: "3",
      date: "2026-02-11",
      resident: "Jennifer Parker",
      amount: 850,
      method: "card",
      status: "pending",
      invoice: "INV-2026-0232",
    },
    {
      id: "4",
      date: "2026-02-10",
      resident: "Robert Thompson",
      amount: 1050,
      method: "card",
      status: "succeeded",
      invoice: "INV-2026-0231",
    },
    {
      id: "5",
      date: "2026-02-10",
      resident: "Lisa Anderson",
      amount: 250,
      method: "cash",
      status: "succeeded",
      invoice: "INV-2026-0230",
    },
    {
      id: "6",
      date: "2026-02-09",
      resident: "David Wilson",
      amount: 900,
      method: "card",
      status: "failed",
      invoice: "INV-2026-0229",
    },
  ];

  const getStatusBadge = (status: string) => {
    const styles = {
      succeeded: "bg-green-100 text-green-700",
      pending: "bg-yellow-100 text-yellow-700",
      failed: "bg-red-100 text-red-700",
      refunded: "bg-slate-100 text-slate-700",
    };
    return styles[status as keyof typeof styles] || styles.pending;
  };

  const getMethodLabel = (method: string) => {
    const labels = {
      card: "Card",
      ach: "ACH",
      cash: "Cash",
    };
    return labels[method as keyof typeof labels] || method;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payments Overview</h1>
          <p className="text-slate-600 mt-1">Revenue, collections, and payment activity</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50">
            Record Payment
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
            Create Invoice
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Revenue This Month"
          value="$47,500"
          subtitle="February 2026"
          icon={TrendingUp}
          variant="success"
        />
        <StatCard
          title="Outstanding Balance"
          value="$12,350"
          subtitle="Across 14 invoices"
          icon={DollarSign}
          variant="warning"
        />
        <StatCard
          title="Payments Collected"
          value="56"
          subtitle="This month"
          icon={CreditCard}
          variant="default"
        />
        <StatCard
          title="Overdue Invoices"
          value="3"
          subtitle="Requires follow-up"
          icon={AlertCircle}
          variant="danger"
        />
      </div>

      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Revenue Trend (Last 6 Months)</h2>
        </div>
        <div className="p-6">
          <div className="flex items-end justify-between gap-2 h-48">
            {revenueData.map((data) => (
              <div key={data.month} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex items-end justify-center h-full">
                  <div
                    className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-pointer relative group"
                    style={{
                      height: `${(data.amount / maxRevenue) * 100}%`,
                    }}
                  >
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      ${data.amount.toLocaleString()}
                    </div>
                  </div>
                </div>
                <span className="text-sm font-medium text-slate-600">{data.month}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Recent Payments</h2>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
              View All
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Date
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Resident
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Amount
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Method
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Status
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Invoice
                </th>
              </tr>
            </thead>
            <tbody>
              {recentPayments.map((payment) => (
                <tr key={payment.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 text-sm text-slate-600">
                    {new Date(payment.date).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-sm font-medium text-slate-900">
                    {payment.resident}
                  </td>
                  <td className="py-3 px-4 text-sm font-semibold text-slate-900">
                    ${payment.amount.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600">
                    {getMethodLabel(payment.method)}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(
                        payment.status
                      )}`}
                    >
                      {payment.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm font-mono text-slate-700">{payment.invoice}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

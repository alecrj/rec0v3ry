"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Send,
  XCircle,
  DollarSign,
  CheckCircle,
  Clock,
  Mail,
  FileText,
} from "lucide-react";

export default function InvoiceDetailPage() {
  const params = useParams();
  const invoiceId = params.id;

  // Mock data - in real app, fetch based on invoiceId
  const invoice = {
    id: invoiceId,
    number: "INV-2026-0234",
    status: "pending",
    issueDate: "2026-02-01",
    dueDate: "2026-02-15",
    paidDate: null,
    resident: {
      name: "Sarah Martinez",
      email: "sarah.m@example.com",
      house: "Serenity House - Room 3B",
    },
    lineItems: [
      {
        id: "1",
        description: "February 2026 Rent",
        type: "Rent",
        quantity: 1,
        unitPrice: 850,
        amount: 850,
      },
    ],
    subtotal: 850,
    tax: 0,
    total: 850,
    paid: 0,
    balance: 850,
    notes: "Monthly rent payment for February 2026. Payment is due by the 15th of the month.",
    payments: [],
    activity: [
      {
        id: "1",
        type: "created",
        date: "2026-02-01T10:00:00",
        description: "Invoice created",
        user: "System",
      },
    ],
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: "bg-slate-100 text-slate-700",
      pending: "bg-blue-100 text-blue-700",
      paid: "bg-green-100 text-green-700",
      partially_paid: "bg-yellow-100 text-yellow-700",
      overdue: "bg-red-100 text-red-700",
      void: "bg-slate-100 text-slate-500 line-through",
    };
    const labels = {
      draft: "Draft",
      pending: "Pending",
      paid: "Paid",
      partially_paid: "Partially Paid",
      overdue: "Overdue",
      void: "Void",
    };
    return {
      className: styles[status as keyof typeof styles] || styles.pending,
      label: labels[status as keyof typeof labels] || status,
    };
  };

  const badge = getStatusBadge(invoice.status);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "created":
        return FileText;
      case "sent":
        return Mail;
      case "payment":
        return DollarSign;
      case "void":
        return XCircle;
      default:
        return Clock;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/payments/invoices"
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{invoice.number}</h1>
              <span className={`px-3 py-1 rounded text-sm font-medium ${badge.className}`}>
                {badge.label}
              </span>
            </div>
            <p className="text-slate-600 mt-1">
              Created {new Date(invoice.issueDate).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          {invoice.status === "draft" && (
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2">
              <Send className="h-4 w-4" />
              Send Invoice
            </button>
          )}
          {(invoice.status === "pending" || invoice.status === "overdue" || invoice.status === "partially_paid") && (
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Record Payment
            </button>
          )}
          <button className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 flex items-center gap-2">
            <Download className="h-4 w-4" />
            Download PDF
          </button>
          {invoice.status !== "void" && invoice.status !== "paid" && (
            <button className="px-4 py-2 border border-red-300 text-red-700 rounded-lg font-medium hover:bg-red-50 flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Void
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-1">
                  Invoice Number
                </h2>
                <p className="text-xl font-bold font-mono text-slate-900">{invoice.number}</p>
              </div>
              <div className="text-right">
                <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-1">
                  Issue Date
                </h2>
                <p className="text-lg font-semibold text-slate-900">
                  {new Date(invoice.issueDate).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6 pb-6 border-b border-slate-200">
              <div>
                <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-2">
                  Due Date
                </h2>
                <p className="text-lg font-semibold text-slate-900">
                  {new Date(invoice.dueDate).toLocaleDateString()}
                </p>
              </div>
              {invoice.paidDate && (
                <div>
                  <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-2">
                    Paid Date
                  </h2>
                  <p className="text-lg font-semibold text-slate-900">
                    {new Date(invoice.paidDate).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>

            <div>
              <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-3">
                Line Items
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 text-sm font-semibold text-slate-700">
                        Description
                      </th>
                      <th className="text-left py-2 text-sm font-semibold text-slate-700">
                        Type
                      </th>
                      <th className="text-right py-2 text-sm font-semibold text-slate-700">
                        Qty
                      </th>
                      <th className="text-right py-2 text-sm font-semibold text-slate-700">
                        Unit Price
                      </th>
                      <th className="text-right py-2 text-sm font-semibold text-slate-700">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.lineItems.map((item) => (
                      <tr key={item.id} className="border-b border-slate-100">
                        <td className="py-3 text-sm text-slate-900">{item.description}</td>
                        <td className="py-3 text-sm text-slate-600">{item.type}</td>
                        <td className="py-3 text-sm text-slate-600 text-right">
                          {item.quantity}
                        </td>
                        <td className="py-3 text-sm text-slate-600 text-right">
                          ${item.unitPrice.toLocaleString()}
                        </td>
                        <td className="py-3 text-sm font-semibold text-slate-900 text-right">
                          ${item.amount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200">
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Subtotal</span>
                      <span className="font-semibold text-slate-900">
                        ${invoice.subtotal.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Tax</span>
                      <span className="font-semibold text-slate-900">
                        ${invoice.tax.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-lg font-bold pt-2 border-t border-slate-200">
                      <span className="text-slate-900">Total</span>
                      <span className="text-slate-900">${invoice.total.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Paid</span>
                      <span className="font-semibold text-green-600">
                        ${invoice.paid.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-lg font-bold pt-2 border-t border-slate-200">
                      <span className="text-slate-900">Balance Due</span>
                      <span className="text-blue-600">${invoice.balance.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {invoice.notes && (
              <div className="mt-6 pt-6 border-t border-slate-200">
                <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-2">
                  Notes
                </h2>
                <p className="text-sm text-slate-700 leading-relaxed">{invoice.notes}</p>
              </div>
            )}
          </div>

          {invoice.payments.length > 0 && (
            <div className="bg-white rounded-lg border border-slate-200">
              <div className="p-6 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900">Payment History</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                        Date
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
                        Reference
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.payments.map((payment: any) => (
                      <tr key={payment.id} className="border-b border-slate-100">
                        <td className="py-3 px-4 text-sm text-slate-600">
                          {new Date(payment.date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-sm font-semibold text-slate-900">
                          ${payment.amount.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600">{payment.method}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
                            {payment.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm font-mono text-slate-700">
                          {payment.reference}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Activity Timeline</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {invoice.activity.map((item) => {
                  const Icon = getActivityIcon(item.type);
                  return (
                    <div key={item.id} className="flex gap-3">
                      <div className="p-2 bg-slate-100 rounded-lg h-fit">
                        <Icon className="h-4 w-4 text-slate-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">{item.description}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(item.date).toLocaleString()} • {item.user}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-slate-200 p-6 sticky top-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Resident Information</h2>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                  Name
                </p>
                <p className="text-sm font-semibold text-slate-900">{invoice.resident.name}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                  Email
                </p>
                <p className="text-sm text-slate-700">{invoice.resident.email}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                  Location
                </p>
                <p className="text-sm text-slate-700">{invoice.resident.house}</p>
              </div>
            </div>

            {invoice.balance > 0 && (
              <div className="mt-6 pt-6 border-t border-slate-200">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <DollarSign className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-semibold text-blue-900">Balance Due</h3>
                      <p className="text-2xl font-bold text-blue-900 mt-1">
                        ${invoice.balance.toLocaleString()}
                      </p>
                      <p className="text-xs text-blue-800 mt-2">
                        Due by {new Date(invoice.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {invoice.status === "paid" && (
              <div className="mt-6 pt-6 border-t border-slate-200">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-semibold text-green-900">Paid in Full</h3>
                      <p className="text-xs text-green-800 mt-1">
                        Payment received on{" "}
                        {invoice.paidDate && new Date(invoice.paidDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Download,
  Send,
  XCircle,
  Calendar,
  ArrowUpRight,
} from "lucide-react";

export default function InvoicesPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const tabs = [
    { id: "all", label: "All" },
    { id: "draft", label: "Draft" },
    { id: "pending", label: "Pending" },
    { id: "paid", label: "Paid" },
    { id: "overdue", label: "Overdue" },
    { id: "void", label: "Void" },
  ];

  const invoices = [
    {
      id: "1",
      number: "INV-2026-0234",
      resident: "Sarah Martinez",
      issueDate: "2026-02-01",
      dueDate: "2026-02-15",
      amount: 850,
      paid: 850,
      balance: 0,
      status: "paid",
    },
    {
      id: "2",
      number: "INV-2026-0233",
      resident: "Michael Chen",
      issueDate: "2026-02-01",
      dueDate: "2026-02-15",
      amount: 900,
      paid: 0,
      balance: 900,
      status: "pending",
    },
    {
      id: "3",
      number: "INV-2026-0232",
      resident: "Jennifer Parker",
      issueDate: "2026-02-01",
      dueDate: "2026-02-10",
      amount: 850,
      paid: 0,
      balance: 850,
      status: "overdue",
    },
    {
      id: "4",
      number: "INV-2026-0231",
      resident: "Robert Thompson",
      issueDate: "2026-02-01",
      dueDate: "2026-02-15",
      amount: 1050,
      paid: 500,
      balance: 550,
      status: "partially_paid",
    },
    {
      id: "5",
      number: "INV-2026-0230",
      resident: "Lisa Anderson",
      issueDate: "2026-02-01",
      dueDate: "2026-02-15",
      amount: 850,
      paid: 0,
      balance: 850,
      status: "pending",
    },
    {
      id: "6",
      number: "INV-2026-0229",
      resident: "David Wilson",
      issueDate: "2026-01-28",
      dueDate: "2026-02-05",
      amount: 900,
      paid: 0,
      balance: 900,
      status: "overdue",
    },
    {
      id: "7",
      number: "INV-2026-0228",
      resident: "Emily Rodriguez",
      issueDate: "2026-02-01",
      dueDate: "2026-02-15",
      amount: 850,
      paid: 0,
      balance: 0,
      status: "void",
    },
    {
      id: "8",
      number: "INV-2026-0227",
      resident: "James Taylor",
      issueDate: "2026-01-25",
      dueDate: "2026-02-08",
      amount: 950,
      paid: 0,
      balance: 950,
      status: "draft",
    },
  ];

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

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesTab = activeTab === "all" || invoice.status === activeTab;
    const matchesSearch = invoice.resident.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.number.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
          <p className="text-slate-600 mt-1">Manage resident invoices and billing</p>
        </div>
        <Link
          href="/payments/invoices/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Invoice
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by resident name or invoice number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <button className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Date Range
            </button>
          </div>
        </div>

        <div className="border-b border-slate-200">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {filteredInvoices.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                      <input type="checkbox" className="rounded border-slate-300" />
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                      Invoice #
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                      Resident
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                      Issue Date
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                      Due Date
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">
                      Amount
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">
                      Paid
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">
                      Balance
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((invoice) => {
                    const badge = getStatusBadge(invoice.status);
                    return (
                      <tr key={invoice.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <input type="checkbox" className="rounded border-slate-300" />
                        </td>
                        <td className="py-3 px-4">
                          <Link
                            href={`/payments/invoices/${invoice.id}`}
                            className="text-sm font-mono text-blue-600 hover:text-blue-700 font-medium"
                          >
                            {invoice.number}
                          </Link>
                        </td>
                        <td className="py-3 px-4 text-sm font-medium text-slate-900">
                          {invoice.resident}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600">
                          {new Date(invoice.issueDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600">
                          {new Date(invoice.dueDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-sm text-right font-semibold text-slate-900">
                          ${invoice.amount.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-sm text-right text-slate-600">
                          ${invoice.paid.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-sm text-right font-semibold text-slate-900">
                          ${invoice.balance.toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${badge.className}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                            View
                            <ArrowUpRight className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button className="px-3 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Send Selected
                </button>
                <button className="px-3 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  Void Selected
                </button>
                <button className="px-3 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Export
                </button>
              </div>
              <p className="text-sm text-slate-600">
                Showing {filteredInvoices.length} of {invoices.length} invoices
              </p>
            </div>
          </>
        ) : (
          <div className="p-12 text-center">
            <p className="text-sm font-medium text-slate-900">No invoices found</p>
            <p className="text-sm text-slate-600 mt-1">
              {searchTerm
                ? "Try adjusting your search criteria"
                : "Create your first invoice to get started"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

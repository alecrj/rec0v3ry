"use client";

import { useState } from "react";
import {
  CheckCircle,
  Download,
  Calendar,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

export default function LedgerPage() {
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null);

  const accounts = [
    {
      id: "1",
      code: "1100",
      name: "Cash - Operating",
      type: "asset",
      debit: 125000,
      credit: 0,
      balance: 125000,
      entries: [
        {
          id: "e1",
          date: "2026-02-12",
          description: "Rent payment received - Sarah Martinez",
          debit: 850,
          credit: 0,
          reference: "INV-2026-0234",
        },
        {
          id: "e2",
          date: "2026-02-11",
          description: "Rent payment received - Michael Chen",
          debit: 900,
          credit: 0,
          reference: "INV-2026-0233",
        },
      ],
    },
    {
      id: "2",
      code: "1200",
      name: "Accounts Receivable",
      type: "asset",
      debit: 12350,
      credit: 0,
      balance: 12350,
      entries: [
        {
          id: "e3",
          date: "2026-02-01",
          description: "Invoice issued - Jennifer Parker",
          debit: 850,
          credit: 0,
          reference: "INV-2026-0232",
        },
      ],
    },
    {
      id: "3",
      code: "2100",
      name: "Security Deposits",
      type: "liability",
      debit: 0,
      credit: 28500,
      balance: -28500,
      entries: [
        {
          id: "e4",
          date: "2026-02-05",
          description: "Security deposit - New resident",
          debit: 0,
          credit: 1000,
          reference: "DEP-2026-045",
        },
      ],
    },
    {
      id: "4",
      code: "4100",
      name: "Rent Revenue",
      type: "revenue",
      debit: 0,
      credit: 47500,
      balance: -47500,
      entries: [
        {
          id: "e5",
          date: "2026-02-12",
          description: "February rent - Sarah Martinez",
          debit: 0,
          credit: 850,
          reference: "INV-2026-0234",
        },
        {
          id: "e6",
          date: "2026-02-11",
          description: "February rent - Michael Chen",
          debit: 0,
          credit: 900,
          reference: "INV-2026-0233",
        },
      ],
    },
    {
      id: "5",
      code: "4200",
      name: "Program Fees",
      type: "revenue",
      debit: 0,
      credit: 8500,
      balance: -8500,
      entries: [
        {
          id: "e7",
          date: "2026-02-10",
          description: "Monthly program fee",
          debit: 0,
          credit: 250,
          reference: "INV-2026-0225",
        },
      ],
    },
    {
      id: "6",
      code: "5100",
      name: "Utilities Expense",
      type: "expense",
      debit: 4200,
      credit: 0,
      balance: 4200,
      entries: [
        {
          id: "e8",
          date: "2026-02-08",
          description: "Electric bill - Serenity House",
          debit: 320,
          credit: 0,
          reference: "BILL-2026-034",
        },
        {
          id: "e9",
          date: "2026-02-06",
          description: "Water bill - Hope Manor",
          debit: 185,
          credit: 0,
          reference: "BILL-2026-033",
        },
      ],
    },
    {
      id: "7",
      code: "5200",
      name: "Property Maintenance",
      type: "expense",
      debit: 3150,
      credit: 0,
      balance: 3150,
      entries: [
        {
          id: "e10",
          date: "2026-02-09",
          description: "HVAC repair - Recovery Haven",
          debit: 450,
          credit: 0,
          reference: "BILL-2026-035",
        },
      ],
    },
  ];

  const totalDebits = accounts.reduce((sum, account) => sum + account.debit, 0);
  const totalCredits = accounts.reduce((sum, account) => sum + account.credit, 0);
  const isBalanced = totalDebits === totalCredits;

  const getAccountTypeBadge = (type: string) => {
    const styles = {
      asset: "bg-blue-100 text-blue-700",
      liability: "bg-orange-100 text-orange-700",
      revenue: "bg-green-100 text-green-700",
      expense: "bg-red-100 text-red-700",
    };
    return styles[type as keyof typeof styles] || styles.asset;
  };

  const toggleAccount = (accountId: string) => {
    setExpandedAccount(expandedAccount === accountId ? null : accountId);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">General Ledger</h1>
          <p className="text-slate-600 mt-1">Complete accounting ledger and trial balance</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Date Range
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export Ledger
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Trial Balance Summary</h2>
          {isBalanced && (
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm font-medium">Books are balanced</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-700 mb-1">Total Debits</p>
            <p className="text-2xl font-bold text-blue-900">
              ${totalDebits.toLocaleString()}
            </p>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <p className="text-sm font-medium text-orange-700 mb-1">Total Credits</p>
            <p className="text-2xl font-bold text-orange-900">
              ${totalCredits.toLocaleString()}
            </p>
          </div>
          <div
            className={`border rounded-lg p-4 ${
              isBalanced
                ? "bg-green-50 border-green-200"
                : "bg-red-50 border-red-200"
            }`}
          >
            <p
              className={`text-sm font-medium mb-1 ${
                isBalanced ? "text-green-700" : "text-red-700"
              }`}
            >
              Difference
            </p>
            <p
              className={`text-2xl font-bold ${
                isBalanced ? "text-green-900" : "text-red-900"
              }`}
            >
              ${Math.abs(totalDebits - totalCredits).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Chart of Accounts</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 w-8"></th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Code
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Account Name
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Type
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">
                  Debit
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">
                  Credit
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">
                  Balance
                </th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <>
                  <tr
                    key={account.id}
                    className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                    onClick={() => toggleAccount(account.id)}
                  >
                    <td className="py-3 px-4">
                      {expandedAccount === account.id ? (
                        <ChevronDown className="h-4 w-4 text-slate-600" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-600" />
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm font-mono font-semibold text-slate-900">
                        {account.code}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-slate-900">
                      {account.name}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium capitalize ${getAccountTypeBadge(
                          account.type
                        )}`}
                      >
                        {account.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-semibold text-slate-900">
                      ${account.debit.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-semibold text-slate-900">
                      ${account.credit.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-semibold text-slate-900">
                      ${Math.abs(account.balance).toLocaleString()}
                    </td>
                  </tr>
                  {expandedAccount === account.id && (
                    <tr>
                      <td colSpan={7} className="bg-slate-50 p-0">
                        <div className="p-4 border-b border-slate-200">
                          <h4 className="text-sm font-semibold text-slate-900 mb-3">
                            Recent Entries
                          </h4>
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-slate-200">
                                <th className="text-left py-2 px-3 text-xs font-semibold text-slate-600">
                                  Date
                                </th>
                                <th className="text-left py-2 px-3 text-xs font-semibold text-slate-600">
                                  Description
                                </th>
                                <th className="text-left py-2 px-3 text-xs font-semibold text-slate-600">
                                  Reference
                                </th>
                                <th className="text-right py-2 px-3 text-xs font-semibold text-slate-600">
                                  Debit
                                </th>
                                <th className="text-right py-2 px-3 text-xs font-semibold text-slate-600">
                                  Credit
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {account.entries.map((entry) => (
                                <tr key={entry.id} className="border-b border-slate-100">
                                  <td className="py-2 px-3 text-xs text-slate-600">
                                    {new Date(entry.date).toLocaleDateString()}
                                  </td>
                                  <td className="py-2 px-3 text-xs text-slate-900">
                                    {entry.description}
                                  </td>
                                  <td className="py-2 px-3 text-xs font-mono text-slate-600">
                                    {entry.reference}
                                  </td>
                                  <td className="py-2 px-3 text-xs text-right font-semibold text-slate-900">
                                    {entry.debit > 0 ? `$${entry.debit.toLocaleString()}` : "-"}
                                  </td>
                                  <td className="py-2 px-3 text-xs text-right font-semibold text-slate-900">
                                    {entry.credit > 0 ? `$${entry.credit.toLocaleString()}` : "-"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

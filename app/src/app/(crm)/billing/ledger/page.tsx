"use client";

import { useState } from "react";
import {
  CheckCircle,
  Download,
  Calendar,
  ChevronDown,
  ChevronRight,
  BookOpen,
  AlertCircle,
  X,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  PageContainer,
  PageHeader,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  StatCard,
  StatCardGrid,
  Button,
  Badge,
  SkeletonTable,
  ErrorState,
  useToast,
} from "@/components/ui";

export const dynamic = "force-dynamic";

function formatCurrency(amount: string | number) {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(num));
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function LedgerPage() {
  const { toast } = useToast();
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [appliedDateFrom, setAppliedDateFrom] = useState<string | undefined>();
  const [appliedDateTo, setAppliedDateTo] = useState<string | undefined>();

  const { data: trialBalance, isLoading: tbLoading, error: tbError } = trpc.ledger.getTrialBalance.useQuery({});
  const { data: accounts, isLoading: accLoading } = trpc.ledger.listAccounts.useQuery({});
  const { data: entries } = trpc.ledger.listEntries.useQuery(
    {
      accountId: expandedAccount!,
      dateFrom: appliedDateFrom,
      dateTo: appliedDateTo,
      limit: 50,
    },
    { enabled: !!expandedAccount }
  );

  const isLoading = tbLoading || accLoading;
  const allAccounts = accounts ?? [];
  const totalDebits = parseFloat(trialBalance?.totalDebits ?? "0");
  const totalCredits = parseFloat(trialBalance?.totalCredits ?? "0");
  const isBalanced = trialBalance?.isBalanced ?? true;

  const hasDateFilter = !!appliedDateFrom || !!appliedDateTo;

  const toggleAccount = (accountId: string) => {
    setExpandedAccount(expandedAccount === accountId ? null : accountId);
  };

  const applyDateRange = () => {
    setAppliedDateFrom(dateFrom || undefined);
    setAppliedDateTo(dateTo || undefined);
    setShowDatePicker(false);
  };

  const clearDateRange = () => {
    setDateFrom("");
    setDateTo("");
    setAppliedDateFrom(undefined);
    setAppliedDateTo(undefined);
    setShowDatePicker(false);
  };

  const handleExport = () => {
    if (allAccounts.length === 0) {
      toast("info", "Nothing to export", "No ledger accounts found.");
      return;
    }

    const rows: string[][] = [
      ["Code", "Account Name", "Type", "Debits", "Credits", "Balance"],
      ...allAccounts.map((a) => [
        a.code,
        a.name,
        a.account_type,
        a.debits,
        a.credits,
        a.balance,
      ]),
      [],
      ["", "", "TOTALS", trialBalance?.totalDebits ?? "0", trialBalance?.totalCredits ?? "0", trialBalance?.difference ?? "0"],
      ["", "", "Balanced", isBalanced ? "Yes" : "No", "", ""],
    ];

    const date = new Date().toISOString().split("T")[0];
    downloadCsv(`ledger-export-${date}.csv`, rows);
    toast("success", "Ledger exported", `${allAccounts.length} accounts exported to CSV.`);
  };

  if (tbError) {
    return (
      <PageContainer>
        <Card><CardContent><ErrorState title="Failed to load ledger" description={tbError.message} /></CardContent></Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="General Ledger"
        description="Complete accounting ledger and trial balance"
        actions={
          <div className="flex gap-3">
            <div className="relative">
              <Button
                variant="secondary"
                icon={<Calendar className="h-4 w-4" />}
                onClick={() => setShowDatePicker(!showDatePicker)}
                className={hasDateFilter ? "border-indigo-500/50" : ""}
              >
                {hasDateFilter ? "Filtered" : "Date Range"}
              </Button>
              {hasDateFilter && (
                <button
                  onClick={clearDateRange}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center"
                >
                  <X className="h-2.5 w-2.5 text-zinc-900" />
                </button>
              )}
            </div>
            <Button variant="primary" icon={<Download className="h-4 w-4" />} onClick={handleExport}>
              Export Ledger
            </Button>
          </div>
        }
      />

      {/* Date Range Picker Dropdown */}
      {showDatePicker && (
        <Card variant="outlined" className="border-indigo-500/30">
          <CardContent>
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <label className="block text-xs font-medium text-zinc-400 mb-1">From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-zinc-100 text-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-zinc-400 mb-1">To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-zinc-100 text-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              <Button variant="primary" onClick={applyDateRange}>Apply</Button>
              <Button variant="secondary" onClick={clearDateRange}>Clear</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trial Balance Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Trial Balance Summary</CardTitle>
            {!isLoading && isBalanced && (
              <Badge variant="success" dot>Books balanced</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <StatCardGrid columns={3}>
            <StatCard
              title="Total Debits"
              value={isLoading ? "—" : formatCurrency(totalDebits)}
              variant="info"
              icon={<BookOpen className="h-5 w-5" />}
              loading={isLoading}
            />
            <StatCard
              title="Total Credits"
              value={isLoading ? "—" : formatCurrency(totalCredits)}
              variant="warning"
              icon={<BookOpen className="h-5 w-5" />}
              loading={isLoading}
            />
            <StatCard
              title="Difference"
              value={isLoading ? "—" : formatCurrency(Math.abs(totalDebits - totalCredits))}
              variant={isBalanced ? "success" : "error"}
              icon={isBalanced ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
              loading={isLoading}
            />
          </StatCardGrid>
        </CardContent>
      </Card>

      {/* Chart of Accounts */}
      <Card>
        <CardHeader>
          <CardTitle>Chart of Accounts</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <SkeletonTable rows={6} columns={7} />
          ) : (
            <div className="overflow-x-auto -mx-6">
              <table className="w-full">
                <thead>
                  <tr className="border-y border-zinc-200/50 bg-zinc-100">
                    <th className="w-10 px-4" />
                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Code</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Account Name</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Type</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Debit</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Credit</th>
                    <th className="text-right py-3 px-6 text-xs font-semibold uppercase tracking-wider text-zinc-500">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {allAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-sm text-zinc-500">
                        No ledger accounts found. Initialize the chart of accounts to get started.
                      </td>
                    </tr>
                  ) : (
                    allAccounts.map((account) => {
                      const typeBadge: Record<string, "info" | "warning" | "success" | "error"> = {
                        asset: "info",
                        liability: "warning",
                        revenue: "success",
                        expense: "error",
                      };
                      return (
                        <tbody key={account.id}>
                          <tr
                            className="border-b border-zinc-200/50 hover:bg-zinc-100 cursor-pointer transition-colors"
                            onClick={() => toggleAccount(account.id)}
                          >
                            <td className="px-4 py-3">
                              {expandedAccount === account.id ? (
                                <ChevronDown className="h-4 w-4 text-zinc-500" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-zinc-500" />
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-sm font-semibold tabular-nums text-zinc-800">{account.code}</span>
                            </td>
                            <td className="py-3 px-4 text-sm font-medium text-zinc-800">{account.name}</td>
                            <td className="py-3 px-4">
                              <Badge variant={typeBadge[account.account_type] ?? "default"}>
                                {account.account_type}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-sm text-right font-medium text-zinc-800">
                              {formatCurrency(account.debits)}
                            </td>
                            <td className="py-3 px-4 text-sm text-right font-medium text-zinc-800">
                              {formatCurrency(account.credits)}
                            </td>
                            <td className="py-3 px-6 text-sm text-right font-semibold text-zinc-800">
                              {formatCurrency(account.balance)}
                            </td>
                          </tr>
                          {expandedAccount === account.id && (
                            <tr>
                              <td colSpan={7} className="bg-zinc-100 p-0">
                                <div className="p-4 border-b border-zinc-200">
                                  <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
                                    Recent Entries
                                    {hasDateFilter && (
                                      <span className="ml-2 text-indigo-400 normal-case font-normal">
                                        ({appliedDateFrom || "start"} to {appliedDateTo || "now"})
                                      </span>
                                    )}
                                  </h4>
                                  <table className="w-full">
                                    <thead>
                                      <tr className="border-b border-zinc-200">
                                        <th className="text-left py-2 px-3 text-xs font-semibold text-zinc-500">Date</th>
                                        <th className="text-left py-2 px-3 text-xs font-semibold text-zinc-500">Description</th>
                                        <th className="text-left py-2 px-3 text-xs font-semibold text-zinc-500">Reference</th>
                                        <th className="text-right py-2 px-3 text-xs font-semibold text-zinc-500">Debit</th>
                                        <th className="text-right py-2 px-3 text-xs font-semibold text-zinc-500">Credit</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {(entries?.items ?? []).length === 0 ? (
                                        <tr>
                                          <td colSpan={5} className="py-4 text-center text-xs text-zinc-500">
                                            No entries for this account
                                          </td>
                                        </tr>
                                      ) : (
                                        (entries?.items ?? []).map((entry) => {
                                          const debit = parseFloat(entry.debitAmount ?? "0");
                                          const credit = parseFloat(entry.creditAmount ?? "0");
                                          return (
                                            <tr key={entry.id} className="border-b border-zinc-200/50">
                                              <td className="py-2 px-3 text-xs text-zinc-400">
                                                {entry.transactionDate
                                                  ? new Date(entry.transactionDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                                                  : "—"}
                                              </td>
                                              <td className="py-2 px-3 text-xs text-zinc-800">{entry.description ?? "—"}</td>
                                              <td className="py-2 px-3 text-xs text-zinc-500">{entry.referenceType ?? "—"}</td>
                                              <td className="py-2 px-3 text-xs text-right font-medium text-zinc-800">
                                                {debit > 0 ? formatCurrency(debit) : "—"}
                                              </td>
                                              <td className="py-2 px-3 text-xs text-right font-medium text-zinc-800">
                                                {credit > 0 ? formatCurrency(credit) : "—"}
                                              </td>
                                            </tr>
                                          );
                                        })
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}

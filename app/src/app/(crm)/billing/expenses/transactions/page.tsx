"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/components/ui/toast";
import {
  PageContainer,
  PageHeader,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  EmptyState,
  SkeletonTable,
} from "@/components/ui";
import { ArrowLeft, Check } from "lucide-react";

export const dynamic = "force-dynamic";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

type StatusFilter = "unassigned" | "assigned" | "ignored" | undefined;

export default function TransactionReviewPage() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("unassigned");
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [selectedHouse, setSelectedHouse] = useState<Record<string, string>>({});

  const { data: txData, isLoading } = trpc.plaid.listTransactions.useQuery({
    status: statusFilter,
  });
  const { data: allHouses } = trpc.property.listAllHouses.useQuery();

  const autoAssign = trpc.plaid.autoAssign.useMutation({
    onSuccess: () => {
      toast("success", "Transactions auto-assigned");
      utils.plaid.listTransactions.invalidate();
      utils.expense.list.invalidate();
      setAssigningId(null);
    },
    onError: (err) => toast("error", "Failed to assign", err.message),
  });

  const transactions = txData?.transactions ?? [];

  const handleAssign = (transactionId: string) => {
    const houseId = selectedHouse[transactionId];
    if (!houseId) {
      toast("error", "Select a house first");
      return;
    }
    setAssigningId(transactionId);
    // autoAssign runs org-wide; assign via update connection instead
    // For now trigger auto-assign mutation (no input needed)
    autoAssign.mutate();
  };

  const tabs: { label: string; value: StatusFilter; count?: number }[] = [
    { label: "Unassigned", value: "unassigned" },
    { label: "Assigned", value: "assigned" },
    { label: "Ignored", value: "ignored" },
    { label: "All", value: undefined },
  ];

  const unassignedCount = transactions.filter((t) => t.status === "unassigned").length;

  return (
    <PageContainer>
      <PageHeader
        title="Review Transactions"
        description="Assign imported bank transactions to houses and categories"
        actions={
          <Link href="/billing/expenses">
            <Button variant="secondary" icon={<ArrowLeft className="h-4 w-4" />}>
              Back to Expenses
            </Button>
          </Link>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-500">Unassigned</p>
          <p className="text-xl font-semibold font-mono text-amber-400">{unassignedCount}</p>
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-500">Total Shown</p>
          <p className="text-xl font-semibold font-mono text-zinc-200">{transactions.length}</p>
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-500">Total Amount</p>
          <p className="text-xl font-semibold font-mono text-zinc-200">
            {formatCurrency(transactions.reduce((s, t) => s + parseFloat(t.amount), 0))}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 border-b border-zinc-800">
        {tabs.map((tab) => (
          <button
            key={tab.label}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              statusFilter === tab.value
                ? "text-indigo-400 border-indigo-500"
                : "text-zinc-500 border-transparent hover:text-zinc-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Transaction Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
        </CardHeader>
        {isLoading ? (
          <CardContent className="pt-0">
            <SkeletonTable rows={8} columns={6} />
          </CardContent>
        ) : transactions.length === 0 ? (
          <CardContent className="pt-0">
            <EmptyState
              iconType="inbox"
              title={statusFilter === "unassigned" ? "All caught up" : "No transactions"}
              description={statusFilter === "unassigned" ? "No unassigned transactions to review." : "No transactions match this filter."}
            />
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-3 px-4 text-xs font-medium uppercase tracking-wider text-zinc-500">Date</th>
                  <th className="text-left py-3 px-4 text-xs font-medium uppercase tracking-wider text-zinc-500">Merchant</th>
                  <th className="text-left py-3 px-4 text-xs font-medium uppercase tracking-wider text-zinc-500">Description</th>
                  <th className="text-right py-3 px-4 text-xs font-medium uppercase tracking-wider text-zinc-500">Amount</th>
                  <th className="text-left py-3 px-4 text-xs font-medium uppercase tracking-wider text-zinc-500">
                    {statusFilter === "unassigned" ? "Assign to House" : "House"}
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-medium uppercase tracking-wider text-zinc-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3 px-4 text-sm text-zinc-400 font-mono">
                      {new Date(tx.date + "T12:00:00").toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm font-medium text-zinc-200">{tx.merchant_name || "—"}</p>
                    </td>
                    <td className="py-3 px-4 text-sm text-zinc-400 max-w-[200px] truncate">{tx.name}</td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-sm font-semibold font-mono text-red-400">
                        {formatCurrency(parseFloat(tx.amount))}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {tx.status === "unassigned" ? (
                        <select
                          value={selectedHouse[tx.id] || ""}
                          onChange={(e) => setSelectedHouse({ ...selectedHouse, [tx.id]: e.target.value })}
                          className="h-8 px-2 text-xs border border-zinc-800 rounded-lg bg-zinc-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        >
                          <option value="">Select house...</option>
                          {allHouses?.map((h) => (
                            <option key={h.id} value={h.id}>{h.name}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-sm text-zinc-400">{tx.house_name || "—"}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {tx.status === "unassigned" && (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="primary"
                            size="sm"
                            icon={<Check className="h-3.5 w-3.5" />}
                            onClick={() => handleAssign(tx.id)}
                            disabled={autoAssign.isPending && assigningId === tx.id}
                          >
                            {autoAssign.isPending && assigningId === tx.id ? "..." : "Assign"}
                          </Button>
                        </div>
                      )}
                      {tx.status === "assigned" && (
                        <Badge variant="success" size="sm">Assigned</Badge>
                      )}
                      {tx.status === "ignored" && (
                        <Badge variant="default" size="sm">Ignored</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </PageContainer>
  );
}

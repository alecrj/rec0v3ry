"use client";

/**
 * Expenses Page
 *
 * G2-15: Auto-categorization
 * G2-17: Manual expense entry
 *
 * Lists all expenses with ability to add manual entries.
 * Each expense shows category (with auto-suggested override).
 */

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import {
  Plus,
  Receipt,
  Filter,
  Home,
  Tag,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  TrendingDown,
  Link as LinkIcon,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

// --- Add Expense Modal ---

function AddExpenseModal({
  onClose,
  onSuccess,
  categories,
  houses,
}: {
  onClose: () => void;
  onSuccess: () => void;
  categories: Array<{ id: string; name: string; color: string | null }>;
  houses: Array<{ id: string; name: string }>;
}) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [houseId, setHouseId] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [suggestedCategory, setSuggestedCategory] = useState<{
    category_id: string;
    category_name: string;
    confidence: string;
  } | null>(null);

  const utils = trpc.useUtils();
  const createMutation = trpc.expense.create.useMutation({
    onSuccess: () => {
      utils.expense.list.invalidate();
      onSuccess();
    },
  });

  const { data: suggestionData } = trpc.expense.suggestCategory.useQuery(
    { merchant_name: vendorName },
    { enabled: vendorName.length >= 2 }
  );

  useEffect(() => {
    if (suggestionData && !categoryId) {
      setSuggestedCategory(suggestionData);
      setCategoryId(suggestionData.category_id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestionData]);

  const handleVendorBlur = () => {
    // Input blur triggers re-query via vendorName state change
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !date) return;

    createMutation.mutate({
      amount,
      expense_date: date,
      description: description || undefined,
      vendor: vendorName || undefined,
      category_id: categoryId || undefined,
      house_id: houseId || undefined,
      receipt_url: receiptUrl || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-zinc-200 rounded-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-zinc-200">
          <h2 className="text-lg font-semibold text-zinc-900">Add Expense</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-900 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Amount + Date row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-zinc-400 block mb-1">
                Amount <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  className="w-full bg-zinc-100 border border-zinc-300 text-zinc-900 text-sm rounded-lg pl-7 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">
                Date <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full bg-zinc-100 border border-zinc-300 text-zinc-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Vendor Name */}
          <div>
            <label className="text-xs text-zinc-400 block mb-1">Vendor / Merchant</label>
            <input
              type="text"
              value={vendorName}
              onChange={(e) => { setVendorName(e.target.value); setSuggestedCategory(null); }}
              onBlur={handleVendorBlur}
              placeholder="e.g. Home Depot, Walmart"
              className="w-full bg-zinc-100 border border-zinc-300 text-zinc-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-zinc-400 block mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What was this expense for?"
              className="w-full bg-zinc-100 border border-zinc-300 text-zinc-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Category */}
          <div>
            <label className="text-xs text-zinc-400 block mb-1">Category</label>
            {suggestedCategory && (
              <div className="flex items-center gap-1 text-xs text-indigo-400 mb-1">
                <Tag className="h-3 w-3" />
                Auto-suggested: {suggestedCategory.category_name}
                {suggestedCategory.confidence === "learned" ? " (learned)" : ""}
              </div>
            )}
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full bg-zinc-100 border border-zinc-300 text-zinc-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select category...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* House */}
          <div>
            <label className="text-xs text-zinc-400 block mb-1">House</label>
            <select
              value={houseId}
              onChange={(e) => setHouseId(e.target.value)}
              className="w-full bg-zinc-100 border border-zinc-300 text-zinc-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">No specific house</option>
              {houses.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>

          {/* Receipt URL */}
          <div>
            <label className="text-xs text-zinc-400 block mb-1">Receipt URL (optional)</label>
            <input
              type="url"
              value={receiptUrl}
              onChange={(e) => setReceiptUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-zinc-100 border border-zinc-300 text-zinc-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {createMutation.error && (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">
              <AlertCircle className="h-4 w-4" />
              {createMutation.error.message}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-zinc-300 text-zinc-600 rounded-lg text-sm hover:bg-zinc-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || !amount || !date}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Add Expense
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Category Badge ---

function CategoryBadge({ name, color }: { name: string | null; color: string | null }) {
  if (!name) {
    return (
      <span className="text-xs text-zinc-500 italic">Uncategorized</span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
      style={{
        backgroundColor: color ? `${color}20` : "#6366f120",
        color: color ?? "#6366f1",
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full inline-block"
        style={{ backgroundColor: color ?? "#6366f1" }}
      />
      {name}
    </span>
  );
}

// --- Main Page ---

export default function ExpensesPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [filterHouse, setFilterHouse] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  const utils = trpc.useUtils();

  const { data: categoriesData } = trpc.expense.getCategories.useQuery();
  const { data: housesData } = trpc.property.listAllHouses.useQuery();

  const { data: expensesData, isLoading } = trpc.expense.list.useQuery({
    houseId: filterHouse || undefined,
    categoryId: filterCategory || undefined,
    limit: 100,
  });

  const deleteMutation = trpc.expense.delete.useMutation({
    onSuccess: () => utils.expense.list.invalidate(),
  });

  const categories = categoriesData ?? [];
  const houses = housesData ?? [];
  const expenses = expensesData?.expenses ?? [];

  const showSuccess = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // Calculate summary
  const totalAmount = expenses.reduce((sum, e) => sum + parseFloat(e.amount ?? "0"), 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Expenses</h1>
          <p className="text-zinc-400 mt-1">Track and categorize house operating expenses</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/billing/expenses/pnl"
            className="flex items-center gap-2 px-4 py-2 border border-zinc-300 text-zinc-600 rounded-lg text-sm hover:bg-zinc-100 transition-colors"
          >
            <TrendingDown className="h-4 w-4" />
            P&amp;L View
          </Link>
          <Link
            href="/settings/plaid"
            className="flex items-center gap-2 px-4 py-2 border border-zinc-300 text-zinc-600 rounded-lg text-sm hover:bg-zinc-100 transition-colors"
          >
            <LinkIcon className="h-4 w-4" />
            Bank Connections
          </Link>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Expense
          </button>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {notification}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-zinc-200 rounded-xl p-4">
          <p className="text-zinc-400 text-sm">Total Expenses</p>
          <p className="text-2xl font-bold text-zinc-900 mt-1">${totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-xl p-4">
          <p className="text-zinc-400 text-sm">Total Entries</p>
          <p className="text-2xl font-bold text-zinc-900 mt-1">{expenses.length}</p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-xl p-4">
          <p className="text-zinc-400 text-sm">Uncategorized</p>
          <p className="text-2xl font-bold text-zinc-900 mt-1">
            {expenses.filter((e) => !e.category_id).length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-zinc-500" />
        <select
          value={filterHouse}
          onChange={(e) => setFilterHouse(e.target.value)}
          className="bg-white border border-zinc-200 text-zinc-900 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Houses</option>
          {houses.map((h) => (
            <option key={h.id} value={h.id}>{h.name}</option>
          ))}
        </select>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="bg-white border border-zinc-200 text-zinc-900 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Expenses Table */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-zinc-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading expenses...
          </div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-16">
            <Receipt className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-900 font-semibold mb-1">No expenses found</p>
            <p className="text-zinc-400 text-sm mb-6">
              Add a manual expense or connect a bank account to import transactions.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add First Expense
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-100">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Date</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Vendor</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Description</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Category</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-400 uppercase tracking-wide">House</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Amount</th>
                  <th className="py-3 px-4 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr
                    key={expense.id}
                    className="border-b border-zinc-200 hover:bg-zinc-100 transition-colors"
                  >
                    <td className="py-3 px-4 text-sm text-zinc-600 whitespace-nowrap">
                      {expense.expense_date}
                    </td>
                    <td className="py-3 px-4 text-sm text-zinc-900 font-medium">
                      {expense.vendor ?? "—"}
                    </td>
                    <td className="py-3 px-4 text-sm text-zinc-400 max-w-xs truncate">
                      {expense.description ?? "—"}
                    </td>
                    <td className="py-3 px-4">
                      <CategoryBadge
                        name={expense.category_name ?? null}
                        color={expense.category_color ?? null}
                      />
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {expense.house_name ? (
                        <span className="flex items-center gap-1 text-zinc-600">
                          <Home className="h-3 w-3 text-zinc-500" />
                          {expense.house_name}
                        </span>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right text-sm font-semibold text-zinc-900 whitespace-nowrap">
                      ${parseFloat(expense.amount ?? "0").toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => {
                          if (confirm("Delete this expense?")) {
                            deleteMutation.mutate({ expenseId: expense.id });
                          }
                        }}
                        className="text-zinc-600 hover:text-red-400 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      {showAddModal && (
        <AddExpenseModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            showSuccess("Expense added successfully");
          }}
          categories={categories}
          houses={houses}
        />
      )}
    </div>
  );
}

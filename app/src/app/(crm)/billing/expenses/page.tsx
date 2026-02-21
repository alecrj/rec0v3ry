"use client";

import { useState, FormEvent } from "react";
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
import { Plus, X, Receipt, DollarSign, Filter } from "lucide-react";

export const dynamic = "force-dynamic";

const inputClass =
  "w-full h-10 px-3 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

export default function ExpensesPage() {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const [showCreate, setShowCreate] = useState(false);
  const [filterHouseId, setFilterHouseId] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState("");

  // Queries
  const { data: expenses, isLoading } = trpc.expense.list.useQuery(
    {
      houseId: filterHouseId || undefined,
      categoryId: filterCategoryId || undefined,
    }
  );
  const { data: categories } = trpc.expense.getCategories.useQuery();
  const { data: allHouses } = trpc.property.listAllHouses.useQuery();

  // Create form state
  const [form, setForm] = useState({
    amount: "",
    description: "",
    vendor: "",
    houseId: "",
    categoryId: "",
    expenseDate: new Date().toISOString().split("T")[0],
  });

  const createExpense = trpc.expense.create.useMutation({
    onSuccess: () => {
      toast("success", "Expense recorded");
      utils.expense.list.invalidate();
      setShowCreate(false);
      setForm({ amount: "", description: "", vendor: "", houseId: "", categoryId: "", expenseDate: new Date().toISOString().split("T")[0] });
    },
    onError: (err) => toast("error", "Failed to save", err.message),
  });

  const deleteExpense = trpc.expense.delete.useMutation({
    onSuccess: () => {
      toast("success", "Expense deleted");
      utils.expense.list.invalidate();
    },
    onError: (err) => toast("error", "Failed to delete", err.message),
  });

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    createExpense.mutate({
      amount: form.amount,
      description: form.description,
      vendor: form.vendor || undefined,
      houseId: form.houseId || undefined,
      categoryId: form.categoryId || undefined,
      expenseDate: form.expenseDate,
    });
  };

  // Stats
  const totalAmount = (expenses || []).reduce((s, e) => s + parseFloat(e.amount), 0);
  const thisMonth = (expenses || []).filter((e) => {
    const now = new Date();
    return e.expense_date.startsWith(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  });
  const thisMonthTotal = thisMonth.reduce((s, e) => s + parseFloat(e.amount), 0);

  return (
    <PageContainer>
      <PageHeader
        title="Expenses"
        description="Track business expenses by house"
        actions={
          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setShowCreate(true)}>
            Add Expense
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-500">This Month</p>
          <p className="text-xl font-semibold font-mono text-red-400">{formatCurrency(thisMonthTotal)}</p>
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-500">Total Shown</p>
          <p className="text-xl font-semibold font-mono text-zinc-200">{formatCurrency(totalAmount)}</p>
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-500">Count</p>
          <p className="text-xl font-semibold font-mono text-zinc-200">{expenses?.length || 0}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Filter className="h-4 w-4 text-zinc-500" />
        <select
          value={filterHouseId}
          onChange={(e) => setFilterHouseId(e.target.value)}
          className="h-9 px-3 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="">All Houses</option>
          {allHouses?.map((h) => (
            <option key={h.id} value={h.id}>{h.name}</option>
          ))}
        </select>
        <select
          value={filterCategoryId}
          onChange={(e) => setFilterCategoryId(e.target.value)}
          className="h-9 px-3 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="">All Categories</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {(filterHouseId || filterCategoryId) && (
          <button
            onClick={() => { setFilterHouseId(""); setFilterCategoryId(""); }}
            className="text-xs text-indigo-400 hover:text-indigo-300"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Expense Table */}
      <Card>
        <CardHeader>
          <CardTitle>Expense Log</CardTitle>
        </CardHeader>
        {isLoading ? (
          <CardContent className="pt-0"><SkeletonTable rows={6} columns={5} /></CardContent>
        ) : !expenses || expenses.length === 0 ? (
          <CardContent className="pt-0">
            <EmptyState
              iconType="inbox"
              title="No expenses yet"
              description="Add your first expense to start tracking."
            />
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-3 px-4 text-xs font-medium uppercase tracking-wider text-zinc-500">Date</th>
                  <th className="text-left py-3 px-4 text-xs font-medium uppercase tracking-wider text-zinc-500">Description</th>
                  <th className="text-left py-3 px-4 text-xs font-medium uppercase tracking-wider text-zinc-500">Category</th>
                  <th className="text-left py-3 px-4 text-xs font-medium uppercase tracking-wider text-zinc-500">House</th>
                  <th className="text-right py-3 px-4 text-xs font-medium uppercase tracking-wider text-zinc-500">Amount</th>
                  <th className="text-right py-3 px-4 text-xs font-medium uppercase tracking-wider text-zinc-500"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3 px-4 text-sm text-zinc-400 font-mono">
                      {new Date(expense.expense_date + "T12:00:00").toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm font-medium text-zinc-200">{expense.description}</p>
                      {expense.vendor && (
                        <p className="text-xs text-zinc-500">{expense.vendor}</p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {expense.category ? (
                        <Badge variant="default" size="sm">
                          {expense.category.name}
                        </Badge>
                      ) : (
                        <span className="text-xs text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-zinc-400">
                      {expense.house?.name || "Org-wide"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-sm font-semibold font-mono text-red-400">
                        {formatCurrency(parseFloat(expense.amount))}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => deleteExpense.mutate({ id: expense.id })}
                        className="text-xs text-zinc-600 hover:text-red-400 transition-colors"
                        disabled={deleteExpense.isPending}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative bg-zinc-900 rounded-xl shadow-2xl w-full max-w-md mx-4 border border-zinc-800">
            <div className="flex items-center justify-between p-6 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-indigo-400" />
                <h2 className="text-lg font-bold text-zinc-100">Add Expense</h2>
              </div>
              <button onClick={() => setShowCreate(false)} className="text-zinc-500 hover:text-zinc-300">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Amount *</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <input
                      type="text"
                      required
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/[^0-9.]/g, "") })}
                      className={`${inputClass} pl-8`}
                      placeholder="0.00"
                      autoFocus
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={form.expenseDate}
                    onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Description *</label>
                <input
                  type="text"
                  required
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className={inputClass}
                  placeholder="What was this expense for?"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Vendor</label>
                <input
                  type="text"
                  value={form.vendor}
                  onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                  className={inputClass}
                  placeholder="Home Depot, Amazon, etc."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Category</label>
                  <select
                    value={form.categoryId}
                    onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                    className={inputClass}
                  >
                    <option value="">Select category</option>
                    {categories?.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">House</label>
                  <select
                    value={form.houseId}
                    onChange={(e) => setForm({ ...form, houseId: e.target.value })}
                    className={inputClass}
                  >
                    <option value="">Org-wide</option>
                    {allHouses?.map((h) => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={createExpense.isPending}>
                  {createExpense.isPending ? "Saving..." : "Add Expense"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

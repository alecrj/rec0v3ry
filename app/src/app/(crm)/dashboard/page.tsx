"use client";

import { useState } from "react";
import {
  BedDouble,
  DollarSign,
  AlertCircle,
  ShieldCheck,
  TrendingUp,
  X,
  CreditCard,
  UserPlus,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

export const dynamic = "force-dynamic";

// ============================================================
// TOAST (inline, no external library)
// ============================================================

interface Toast {
  id: string;
  message: string;
  type: "success" | "error";
}

function useToastState() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: "success" | "error") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  return { toasts, success: (m: string) => addToast(m, "success"), error: (m: string) => addToast(m, "error") };
}

function ToastContainer({ toasts }: { toasts: Toast[] }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white max-w-sm ${
            t.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ============================================================
// RECORD PAYMENT MODAL (G2-7)
// ============================================================

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefilledResidentId?: string;
  prefilledAmount?: number;
  onSuccess: () => void;
  toast: { success: (m: string) => void; error: (m: string) => void };
}

function RecordPaymentModal({
  isOpen,
  onClose,
  prefilledResidentId,
  prefilledAmount,
  onSuccess,
  toast,
}: RecordPaymentModalProps) {
  const utils = trpc.useUtils();
  const { data: residents, isLoading: residentsLoading } =
    trpc.reporting.getActiveResidents.useQuery(undefined, { enabled: isOpen });

  const [residentId, setResidentId] = useState(prefilledResidentId || "");
  const [amount, setAmount] = useState(prefilledAmount ? prefilledAmount.toFixed(2) : "");
  const [method, setMethod] = useState<"cash" | "check" | "wire" | "other">("cash");
  const [methodLabel, setMethodLabel] = useState("Cash");
  const [reference, setReference] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  // When modal opens with prefill, reset form fields
  const [lastOpenKey, setLastOpenKey] = useState<string>("");
  const openKey = `${prefilledResidentId}-${prefilledAmount}-${isOpen}`;
  if (openKey !== lastOpenKey && isOpen) {
    setLastOpenKey(openKey);
    setResidentId(prefilledResidentId || "");
    setAmount(prefilledAmount ? prefilledAmount.toFixed(2) : "");
    setMethod("cash");
    setMethodLabel("Cash");
    setReference("");
    setDate(new Date().toISOString().slice(0, 10));
  }

  const mutation = trpc.payment.recordManual.useMutation({
    onSuccess: () => {
      toast.success("Payment recorded successfully");
      utils.reporting.getDashboardData.invalidate();
      utils.reporting.getOutstandingByResident.invalidate();
      onSuccess();
      onClose();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to record payment");
    },
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!residentId || !amount || !date) return;
    mutation.mutate({
      residentId,
      amount,
      paymentMethodType: method,
      paymentDate: new Date(date + "T12:00:00.000Z").toISOString(),
      notes: reference ? `Ref: ${reference}` : undefined,
    });
  };

  // Map display labels to internal values
  const methodLabels: Array<{ label: string; value: "cash" | "check" | "wire" | "other" }> = [
    { label: "Cash App", value: "other" },
    { label: "Venmo", value: "other" },
    { label: "Zelle", value: "other" },
    { label: "Cash", value: "cash" },
    { label: "Check", value: "check" },
    { label: "Money Order", value: "other" },
    { label: "Wire Transfer", value: "wire" },
    { label: "Other", value: "other" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-zinc-700">
          <div>
            <h2 className="text-lg font-semibold text-white">Record Payment</h2>
            <p className="text-sm text-zinc-400 mt-0.5">Log a manual payment from a resident</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white p-1 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Resident</label>
            {residentsLoading ? (
              <div className="h-10 bg-zinc-800 rounded-lg animate-pulse" />
            ) : (
              <select
                value={residentId}
                onChange={(e) => setResidentId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select resident...</option>
                {residents?.map((r) => (
                  <option key={r.residentId} value={r.residentId}>
                    {r.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Amount ($)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                placeholder="0.00"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Payment Method</label>
            <select
              value={methodLabel}
              onChange={(e) => {
                setMethodLabel(e.target.value);
                const found = methodLabels.find((m) => m.label === e.target.value);
                if (found) setMethod(found.value);
              }}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {methodLabels.map((m) => (
                <option key={m.label} value={m.label}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              Reference Number <span className="text-zinc-500">(optional)</span>
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Check #, transaction ID, etc."
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-zinc-600 text-zinc-300 rounded-lg font-medium hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
            >
              {mutation.isPending ? "Recording..." : "Record Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// ADD RESIDENT MODAL (G2-8)
// ============================================================

interface AddResidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  toast: { success: (m: string) => void; error: (m: string) => void };
}

function AddResidentModal({ isOpen, onClose, onSuccess, toast }: AddResidentModalProps) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dob: "",
  });

  const mutation = trpc.lead.quickCreate.useMutation({
    onSuccess: () => {
      toast.success("Resident added to pipeline successfully");
      utils.reporting.getDashboardData.invalidate();
      utils.reporting.getActiveResidents.invalidate();
      onSuccess();
      onClose();
      setForm({ firstName: "", lastName: "", email: "", phone: "", dob: "" });
    },
    onError: (err) => {
      toast.error(err.message || "Failed to add resident");
    },
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName) return;
    mutation.mutate({
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email || undefined,
      phone: form.phone || undefined,
      dob: form.dob || undefined,
      source: "manual",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-zinc-700">
          <div>
            <h2 className="text-lg font-semibold text-white">Add Resident</h2>
            <p className="text-sm text-zinc-400 mt-0.5">Create a new lead in your pipeline</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white p-1 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">First Name</label>
              <input
                type="text"
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                required
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Last Name</label>
              <input
                type="text"
                value={form.lastName}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                required
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Date of Birth</label>
              <input
                type="date"
                value={form.dob}
                onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-zinc-600 text-zinc-300 rounded-lg font-medium hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
            >
              {mutation.isPending ? "Adding..." : "Add Resident"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// OUTSTANDING BREAKDOWN (G2-9)
// ============================================================

interface OutstandingBreakdownProps {
  isOpen: boolean;
  onClose: () => void;
  onRecordPayment: (residentId: string, amount: number) => void;
  formatCurrency: (n: number) => string;
}

function OutstandingBreakdown({
  isOpen,
  onClose,
  onRecordPayment,
  formatCurrency,
}: OutstandingBreakdownProps) {
  const { data, isLoading } = trpc.reporting.getOutstandingByResident.useQuery(undefined, {
    enabled: isOpen,
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-zinc-700">
          <div>
            <h2 className="text-lg font-semibold text-white">Outstanding Balances</h2>
            <p className="text-sm text-zinc-400 mt-0.5">Residents with overdue invoices</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white p-1 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-zinc-800 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : !data || data.length === 0 ? (
            <div className="p-12 text-center text-zinc-400">No outstanding balances</div>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 bg-zinc-900 border-b border-zinc-700">
                <tr>
                  <th className="text-left py-3 px-6 text-xs font-medium text-zinc-400 uppercase tracking-wide">Resident</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-zinc-400 uppercase tracking-wide">Owed</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-zinc-400 uppercase tracking-wide">Days Overdue</th>
                  <th className="text-right py-3 px-6 text-xs font-medium text-zinc-400 uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.residentId} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                    <td className="py-4 px-6 text-sm font-medium text-white">{row.residentName}</td>
                    <td className="py-4 px-4 text-sm text-right font-semibold text-red-400">
                      {formatCurrency(row.totalOwed)}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          row.daysOverdue > 60
                            ? "bg-red-900/50 text-red-300"
                            : row.daysOverdue > 30
                            ? "bg-orange-900/50 text-orange-300"
                            : "bg-yellow-900/50 text-yellow-300"
                        }`}
                      >
                        {row.daysOverdue}d
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => {
                          onRecordPayment(row.residentId, row.totalOwed);
                          onClose();
                        }}
                        className="px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                      >
                        Record Payment
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// EMPTY STATE CHECKLIST (G2-12)
// ============================================================

interface EmptyStateProps {
  hasHouses: boolean;
  hasResidents: boolean;
  onAddResident: () => void;
}

function EmptyStateChecklist({ hasHouses, hasResidents, onAddResident }: EmptyStateProps) {
  const allDone = hasHouses && hasResidents;
  if (allDone) return null;

  const steps = [
    {
      done: hasHouses,
      label: "Add your first house",
      description: "Create a property and house to get started",
      action: <a href="/admin/properties" className="text-xs font-medium text-indigo-400 hover:text-indigo-300">Set up house &rarr;</a>,
    },
    {
      done: hasResidents,
      label: "Add your first resident",
      description: "Add a resident to your pipeline",
      action: (
        <button
          onClick={onAddResident}
          className="text-xs font-medium text-indigo-400 hover:text-indigo-300"
        >
          Add resident &rarr;
        </button>
      ),
    },
    {
      done: false,
      label: "Set your rent rates",
      description: "Configure billing rates for each house",
      action: <a href="/billing/rates" className="text-xs font-medium text-indigo-400 hover:text-indigo-300">Set rates &rarr;</a>,
    },
    {
      done: false,
      label: "Create your first invoice",
      description: "Bill a resident for rent",
      action: <a href="/billing/invoices/new" className="text-xs font-medium text-indigo-400 hover:text-indigo-300">Create invoice &rarr;</a>,
    },
  ];

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6">
      <h2 className="text-base font-semibold text-white mb-1">Get started with RecoveryOS</h2>
      <p className="text-sm text-zinc-400 mb-5">Complete these steps to set up your house</p>
      <div className="space-y-3">
        {steps.map((step, idx) => (
          <div key={idx} className="flex items-start gap-3">
            <div className="mt-0.5 flex-shrink-0">
              {step.done ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <Circle className="h-5 w-5 text-zinc-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${step.done ? "line-through text-zinc-500" : "text-white"}`}>
                {step.label}
              </p>
              {!step.done && <p className="text-xs text-zinc-500 mt-0.5">{step.description}</p>}
            </div>
            {!step.done && <div className="flex-shrink-0">{step.action}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// STAT CARD
// ============================================================

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = "default",
  loading,
  onClick,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  variant?: "default" | "warning" | "danger";
  loading?: boolean;
  onClick?: () => void;
}) {
  if (loading) {
    return (
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 animate-pulse">
        <div className="h-4 bg-zinc-700 rounded w-1/2 mb-3"></div>
        <div className="h-8 bg-zinc-700 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-zinc-700 rounded w-2/3"></div>
      </div>
    );
  }

  const iconClasses = {
    default: "bg-indigo-900/50 text-indigo-400",
    warning: "bg-yellow-900/50 text-yellow-400",
    danger: "bg-red-900/50 text-red-400",
  };

  return (
    <div
      className={`bg-zinc-900 border border-zinc-700 rounded-xl p-6 ${
        onClick ? "cursor-pointer hover:border-zinc-500 transition-colors" : ""
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-400">{title}</p>
          <p className="text-3xl font-bold text-white mt-2">{value}</p>
          <p className="text-sm text-zinc-500 mt-1">{subtitle}</p>
        </div>
        <div className={`p-3 rounded-lg ${iconClasses[variant]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
      {onClick && (
        <p className="text-xs text-indigo-400 mt-3 font-medium">Click to view breakdown &rarr;</p>
      )}
    </div>
  );
}

// ============================================================
// ACTIVITY ITEM
// ============================================================

function ActivityItem({
  actor,
  description,
  timestamp,
}: {
  actor: string;
  description: string;
  timestamp: string;
}) {
  const formatTimeAgo = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0 text-xs font-medium text-zinc-300">
        {actor.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-zinc-300">
          <span className="font-medium text-white">{actor}</span>{" "}
          <span>{description}</span>
        </p>
        <p className="text-xs text-zinc-500 mt-0.5">{formatTimeAgo(timestamp)}</p>
      </div>
    </div>
  );
}

// ============================================================
// MAIN DASHBOARD
// ============================================================

export default function DashboardPage() {
  const toast = useToastState();
  const utils = trpc.useUtils();

  const { data, isLoading, error } = trpc.reporting.getDashboardData.useQuery();

  // Modal state
  const [paymentModal, setPaymentModal] = useState<{
    open: boolean;
    residentId?: string;
    amount?: number;
  }>({ open: false });
  const [addResidentModal, setAddResidentModal] = useState(false);
  const [outstandingOpen, setOutstandingOpen] = useState(false);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const isEmpty =
    !isLoading &&
    data &&
    data.occupancy.total === 0 &&
    data.revenueMTD === 0;

  return (
    <div className="p-6 space-y-6 bg-zinc-950 min-h-screen">
      <ToastContainer toasts={toast.toasts} />

      {/* Modals */}
      <RecordPaymentModal
        isOpen={paymentModal.open}
        onClose={() => setPaymentModal({ open: false })}
        prefilledResidentId={paymentModal.residentId}
        prefilledAmount={paymentModal.amount}
        onSuccess={() => utils.reporting.getDashboardData.invalidate()}
        toast={toast}
      />
      <AddResidentModal
        isOpen={addResidentModal}
        onClose={() => setAddResidentModal(false)}
        onSuccess={() => utils.reporting.getDashboardData.invalidate()}
        toast={toast}
      />
      <OutstandingBreakdown
        isOpen={outstandingOpen}
        onClose={() => setOutstandingOpen(false)}
        onRecordPayment={(residentId, amount) =>
          setPaymentModal({ open: true, residentId, amount })
        }
        formatCurrency={formatCurrency}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-zinc-400 mt-1 text-sm">Command center for your recovery house</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setPaymentModal({ open: true })}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <CreditCard className="h-4 w-4" />
            Record Payment
          </button>
          <button
            onClick={() => setAddResidentModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            Add Resident
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 text-red-300">
          <p className="font-medium">Error loading dashboard data</p>
          <p className="text-sm mt-1 text-red-400">{error.message}</p>
        </div>
      )}

      {/* Empty State Checklist (G2-12) */}
      {isEmpty && (
        <EmptyStateChecklist
          hasHouses={data.occupancy.total > 0}
          hasResidents={(data.occupancy.occupied || 0) > 0}
          onAddResident={() => setAddResidentModal(true)}
        />
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Occupancy"
          value={isLoading ? "—" : `${data?.occupancy.rate || 0}%`}
          subtitle={
            isLoading
              ? "Loading..."
              : `${data?.occupancy.occupied || 0} of ${data?.occupancy.total || 0} beds`
          }
          icon={BedDouble}
          loading={isLoading}
        />
        <StatCard
          title="Revenue MTD"
          value={isLoading ? "—" : formatCurrency(data?.revenueMTD || 0)}
          subtitle="Month to date collections"
          icon={DollarSign}
          loading={isLoading}
        />
        <StatCard
          title="Outstanding"
          value={isLoading ? "—" : formatCurrency(data?.outstanding.total || 0)}
          subtitle={
            isLoading
              ? "Loading..."
              : `${data?.outstanding.invoiceCount || 0} overdue invoices`
          }
          icon={AlertCircle}
          variant={
            (data?.outstanding.invoiceCount || 0) > 10
              ? "danger"
              : (data?.outstanding.invoiceCount || 0) > 5
              ? "warning"
              : "default"
          }
          loading={isLoading}
          onClick={
            (data?.outstanding.invoiceCount || 0) > 0
              ? () => setOutstandingOpen(true)
              : undefined
          }
        />
        <StatCard
          title="Expiring Consents"
          value={isLoading ? "—" : String(data?.expiringConsents.count || 0)}
          subtitle="Within next 30 days"
          icon={ShieldCheck}
          variant={(data?.expiringConsents.count || 0) > 5 ? "warning" : "default"}
          loading={isLoading}
        />
      </div>

      {/* Action Items + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Action Items (G2-10) */}
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6">
          <h2 className="text-base font-semibold text-white mb-4">Action Items</h2>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex gap-3 p-3">
                  <div className="h-6 w-16 bg-zinc-700 rounded"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-zinc-700 rounded w-3/4"></div>
                    <div className="h-3 bg-zinc-700 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {/* High priority incidents */}
              {(data?.actionItems.highPriorityIncidents || 0) > 0 && (
                <div className="flex items-center justify-between p-3 bg-red-950/50 border border-red-800/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-red-900 text-red-300 rounded text-xs font-medium">HIGH</span>
                    <span className="text-sm text-white">
                      {data!.actionItems.highPriorityIncidents} critical incident{data!.actionItems.highPriorityIncidents > 1 ? "s" : ""} need follow-up
                    </span>
                  </div>
                  <a href="/operations/incidents" className="text-xs text-red-400 hover:text-red-300 font-medium whitespace-nowrap">Review &rarr;</a>
                </div>
              )}

              {/* Expiring consents */}
              {(data?.actionItems.expiringConsents || 0) > 0 && (
                <div className="flex items-center justify-between p-3 bg-yellow-950/50 border border-yellow-800/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-yellow-900 text-yellow-300 rounded text-xs font-medium">HIGH</span>
                    <span className="text-sm text-white">
                      {data!.actionItems.expiringConsents} consent{data!.actionItems.expiringConsents > 1 ? "s" : ""} expiring soon
                    </span>
                  </div>
                  <a href="/compliance/consents" className="text-xs text-yellow-400 hover:text-yellow-300 font-medium whitespace-nowrap">Renew &rarr;</a>
                </div>
              )}

              {/* Pending passes */}
              {(data?.actionItems.pendingPasses || 0) > 0 && (
                <div className="flex items-center justify-between p-3 bg-zinc-800 border border-zinc-700 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-blue-900 text-blue-300 rounded text-xs font-medium">MED</span>
                    <span className="text-sm text-white">
                      {data!.actionItems.pendingPasses} pass request{data!.actionItems.pendingPasses > 1 ? "s" : ""} pending
                    </span>
                  </div>
                  <a href="/operations/passes" className="text-xs text-indigo-400 hover:text-indigo-300 font-medium whitespace-nowrap">Review &rarr;</a>
                </div>
              )}

              {/* Outstanding invoices with send reminder button */}
              {(data?.outstanding.invoiceCount || 0) > 0 && (
                <div className="flex items-center justify-between p-3 bg-zinc-800 border border-zinc-700 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-orange-900 text-orange-300 rounded text-xs font-medium">MED</span>
                    <span className="text-sm text-white">
                      {data!.outstanding.invoiceCount} residents late on rent ({formatCurrency(data!.outstanding.total)})
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setOutstandingOpen(true)}
                      className="text-xs text-zinc-400 hover:text-white font-medium whitespace-nowrap"
                    >
                      View
                    </button>
                    <a
                      href="/billing"
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-medium whitespace-nowrap"
                    >
                      Billing &rarr;
                    </a>
                  </div>
                </div>
              )}

              {/* All clear */}
              {(data?.actionItems.highPriorityIncidents || 0) === 0 &&
                (data?.actionItems.expiringConsents || 0) === 0 &&
                (data?.actionItems.pendingPasses || 0) === 0 &&
                (data?.outstanding.invoiceCount || 0) === 0 && (
                  <div className="py-8 text-center">
                    <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-zinc-400">All clear — no action items</p>
                  </div>
                )}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6">
          <h2 className="text-base font-semibold text-white mb-4">Recent Activity</h2>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="animate-pulse flex gap-3 py-2">
                  <div className="h-7 w-7 bg-zinc-700 rounded-full flex-shrink-0"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-zinc-700 rounded w-3/4"></div>
                    <div className="h-3 bg-zinc-700 rounded w-1/4"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-zinc-800 max-h-[360px] overflow-y-auto">
              {data?.recentActivity.map((activity) => (
                <ActivityItem
                  key={activity.id}
                  actor={activity.actor}
                  description={activity.description}
                  timestamp={activity.timestamp}
                />
              ))}
              {(!data?.recentActivity || data.recentActivity.length === 0) && (
                <p className="text-sm text-zinc-500 py-6 text-center">No recent activity</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Expiring Consents Table */}
      {(data?.expiringConsents.count || 0) > 0 && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl">
          <div className="flex items-center justify-between p-6 border-b border-zinc-700">
            <h2 className="text-base font-semibold text-white">Expiring Consents (Next 30 Days)</h2>
            <a href="/compliance/consents" className="text-sm text-indigo-400 hover:text-indigo-300 font-medium">
              View All
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-700">
                  <th className="text-left py-3 px-6 text-xs font-medium text-zinc-400 uppercase tracking-wide">Resident</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-zinc-400 uppercase tracking-wide">Type</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-zinc-400 uppercase tracking-wide">Expires</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-zinc-400 uppercase tracking-wide">Days Left</th>
                  <th className="text-left py-3 px-6 text-xs font-medium text-zinc-400 uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody>
                {data?.expiringConsents.items.map((consent) => (
                  <tr key={consent.id} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                    <td className="py-3 px-6 text-sm text-white">{consent.residentName}</td>
                    <td className="py-3 px-4 text-sm text-zinc-400">{consent.consentType.replace(/_/g, " ")}</td>
                    <td className="py-3 px-4 text-sm text-zinc-400">
                      {consent.expiresAt ? new Date(consent.expiresAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          (consent.daysRemaining || 0) <= 7
                            ? "bg-red-900/50 text-red-300"
                            : (consent.daysRemaining || 0) <= 14
                            ? "bg-yellow-900/50 text-yellow-300"
                            : "bg-blue-900/50 text-blue-300"
                        }`}
                      >
                        {consent.daysRemaining}d
                      </span>
                    </td>
                    <td className="py-3 px-6">
                      <a
                        href={`/compliance/consents`}
                        className="text-sm text-indigo-400 hover:text-indigo-300 font-medium"
                      >
                        Renew
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Reports */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <a
          href="/reports/occupancy"
          className="flex items-center gap-3 p-4 bg-zinc-900 border border-zinc-700 rounded-xl hover:border-zinc-500 transition-colors"
        >
          <div className="p-2 bg-indigo-900/50 rounded-lg">
            <BedDouble className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <p className="font-medium text-white text-sm">Occupancy Report</p>
            <p className="text-xs text-zinc-500">Beds, trends, waitlist</p>
          </div>
        </a>
        <a
          href="/reports/financial"
          className="flex items-center gap-3 p-4 bg-zinc-900 border border-zinc-700 rounded-xl hover:border-zinc-500 transition-colors"
        >
          <div className="p-2 bg-green-900/50 rounded-lg">
            <DollarSign className="h-5 w-5 text-green-400" />
          </div>
          <div>
            <p className="font-medium text-white text-sm">Financial Report</p>
            <p className="text-xs text-zinc-500">Revenue, aging, collections</p>
          </div>
        </a>
        <a
          href="/reports/operations"
          className="flex items-center gap-3 p-4 bg-zinc-900 border border-zinc-700 rounded-xl hover:border-zinc-500 transition-colors"
        >
          <div className="p-2 bg-orange-900/50 rounded-lg">
            <TrendingUp className="h-5 w-5 text-orange-400" />
          </div>
          <div>
            <p className="font-medium text-white text-sm">Operations Report</p>
            <p className="text-xs text-zinc-500">Chores, meetings, incidents</p>
          </div>
        </a>
        <a
          href="/reports/compliance"
          className="flex items-center gap-3 p-4 bg-zinc-900 border border-zinc-700 rounded-xl hover:border-zinc-500 transition-colors"
        >
          <div className="p-2 bg-purple-900/50 rounded-lg">
            <ShieldCheck className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <p className="font-medium text-white text-sm">Compliance Report</p>
            <p className="text-xs text-zinc-500">Consents, disclosures, audit</p>
          </div>
        </a>
      </div>
    </div>
  );
}

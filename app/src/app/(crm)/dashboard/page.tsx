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
  Megaphone,
  MessageSquare,
  Receipt,
  QrCode,
  Users,
  Heart,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

export const dynamic = "force-dynamic";

// ============================================================
// TOAST
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
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
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
// RECORD PAYMENT MODAL
// ============================================================

function RecordPaymentModal({
  isOpen,
  onClose,
  prefilledResidentId,
  prefilledAmount,
  onSuccess,
  toast,
}: {
  isOpen: boolean;
  onClose: () => void;
  prefilledResidentId?: string;
  prefilledAmount?: number;
  onSuccess: () => void;
  toast: { success: (m: string) => void; error: (m: string) => void };
}) {
  const utils = trpc.useUtils();
  const { data: residents, isLoading: residentsLoading } = trpc.reporting.getActiveResidents.useQuery(undefined, { enabled: isOpen });
  const [residentId, setResidentId] = useState(prefilledResidentId || "");
  const [amount, setAmount] = useState(prefilledAmount ? prefilledAmount.toFixed(2) : "");
  const [method, setMethod] = useState<"cash" | "check" | "wire" | "other">("cash");
  const [methodLabel, setMethodLabel] = useState("Cash");
  const [reference, setReference] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

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
      utils.reporting.getMTDProfit.invalidate();
      onSuccess();
      onClose();
    },
    onError: (err) => toast.error(err.message || "Failed to record payment"),
  });

  if (!isOpen) return null;

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
      <div className="relative bg-white border border-zinc-200 rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-zinc-200">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Record Payment</h2>
            <p className="text-sm text-zinc-400 mt-0.5">Log a manual payment from a resident</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-900 p-1 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!residentId || !amount || !date) return;
            mutation.mutate({
              residentId,
              amount,
              paymentMethodType: method,
              paymentDate: new Date(date + "T12:00:00.000Z").toISOString(),
              notes: reference ? `Ref: ${reference}` : undefined,
            });
          }}
          className="p-6 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-zinc-600 mb-1.5">Resident</label>
            {residentsLoading ? (
              <div className="h-10 bg-zinc-100 rounded-lg animate-pulse" />
            ) : (
              <select
                value={residentId}
                onChange={(e) => setResidentId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-zinc-100 border border-zinc-300 text-zinc-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select resident...</option>
                {residents?.map((r) => (
                  <option key={r.residentId} value={r.residentId}>{r.name}</option>
                ))}
              </select>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-600 mb-1.5">Amount ($)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                placeholder="0.00"
                className="w-full px-3 py-2 bg-zinc-100 border border-zinc-300 text-zinc-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-600 mb-1.5">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3 py-2 bg-zinc-100 border border-zinc-300 text-zinc-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-600 mb-1.5">Payment Method</label>
            <select
              value={methodLabel}
              onChange={(e) => {
                setMethodLabel(e.target.value);
                const found = methodLabels.find((m) => m.label === e.target.value);
                if (found) setMethod(found.value);
              }}
              className="w-full px-3 py-2 bg-zinc-100 border border-zinc-300 text-zinc-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {methodLabels.map((m) => (
                <option key={m.label} value={m.label}>{m.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-600 mb-1.5">
              Reference Number <span className="text-zinc-500">(optional)</span>
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Check #, transaction ID, etc."
              className="w-full px-3 py-2 bg-zinc-100 border border-zinc-300 text-zinc-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-zinc-300 text-zinc-600 rounded-lg font-medium hover:bg-zinc-100 transition-colors"
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
// ADD RESIDENT MODAL
// ============================================================

function AddResidentModal({
  isOpen,
  onClose,
  onSuccess,
  toast,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  toast: { success: (m: string) => void; error: (m: string) => void };
}) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", dob: "" });

  const mutation = trpc.lead.quickCreate.useMutation({
    onSuccess: () => {
      toast.success("Resident added to pipeline successfully");
      utils.reporting.getDashboardData.invalidate();
      utils.reporting.getLeadsSummary.invalidate();
      onSuccess();
      onClose();
      setForm({ firstName: "", lastName: "", email: "", phone: "", dob: "" });
    },
    onError: (err) => toast.error(err.message || "Failed to add resident"),
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-white border border-zinc-200 rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-zinc-200">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Add Resident</h2>
            <p className="text-sm text-zinc-400 mt-0.5">Create a new lead in your pipeline</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-900 p-1 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form
          onSubmit={(e) => {
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
          }}
          className="p-6 space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-600 mb-1.5">First Name</label>
              <input
                type="text"
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                required
                className="w-full px-3 py-2 bg-zinc-100 border border-zinc-300 text-zinc-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-600 mb-1.5">Last Name</label>
              <input
                type="text"
                value={form.lastName}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                required
                className="w-full px-3 py-2 bg-zinc-100 border border-zinc-300 text-zinc-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-600 mb-1.5">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full px-3 py-2 bg-zinc-100 border border-zinc-300 text-zinc-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-600 mb-1.5">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full px-3 py-2 bg-zinc-100 border border-zinc-300 text-zinc-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-600 mb-1.5">Date of Birth</label>
              <input
                type="date"
                value={form.dob}
                onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))}
                className="w-full px-3 py-2 bg-zinc-100 border border-zinc-300 text-zinc-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-zinc-300 text-zinc-600 rounded-lg font-medium hover:bg-zinc-100 transition-colors"
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
// OUTSTANDING BREAKDOWN MODAL
// ============================================================

function OutstandingBreakdown({
  isOpen,
  onClose,
  onRecordPayment,
  formatCurrency,
}: {
  isOpen: boolean;
  onClose: () => void;
  onRecordPayment: (residentId: string, amount: number) => void;
  formatCurrency: (n: number) => string;
}) {
  const { data, isLoading } = trpc.reporting.getOutstandingByResident.useQuery(undefined, { enabled: isOpen });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-white border border-zinc-200 rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-zinc-200">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Outstanding Balances</h2>
            <p className="text-sm text-zinc-400 mt-0.5">Residents with overdue invoices</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-900 p-1 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-zinc-100 rounded-lg animate-pulse" />)}
            </div>
          ) : !data || data.length === 0 ? (
            <div className="p-12 text-center text-zinc-400">No outstanding balances</div>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 bg-white border-b border-zinc-200">
                <tr>
                  <th className="text-left py-3 px-6 text-xs font-medium text-zinc-400 uppercase tracking-wide">Resident</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-zinc-400 uppercase tracking-wide">Owed</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-zinc-400 uppercase tracking-wide">Days Overdue</th>
                  <th className="text-right py-3 px-6 text-xs font-medium text-zinc-400 uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.residentId} className="border-b border-zinc-200 hover:bg-zinc-100">
                    <td className="py-4 px-6 text-sm font-medium text-zinc-900">{row.residentName}</td>
                    <td className="py-4 px-4 text-sm text-right font-semibold text-red-400">{formatCurrency(row.totalOwed)}</td>
                    <td className="py-4 px-4 text-right">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        row.daysOverdue > 60 ? "bg-red-50 text-red-700 border border-red-200"
                          : row.daysOverdue > 30 ? "bg-orange-50 text-orange-700 border border-orange-200"
                          : "bg-yellow-50 text-yellow-700 border border-yellow-200"
                      }`}>
                        {row.daysOverdue}d
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => { onRecordPayment(row.residentId, row.totalOwed); onClose(); }}
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
// ANNOUNCE MODAL
// ============================================================

function AnnounceModal({
  isOpen,
  onClose,
  toast,
}: {
  isOpen: boolean;
  onClose: () => void;
  toast: { success: (m: string) => void; error: (m: string) => void };
}) {
  const utils = trpc.useUtils();
  const { data: userData } = trpc.user.getCurrentUser.useQuery(undefined, { enabled: isOpen });
  const [message, setMessage] = useState("");

  const mutation = trpc.announcement.create.useMutation({
    onSuccess: () => {
      toast.success("Announcement sent!");
      utils.reporting.getDashboardData.invalidate();
      onClose();
      setMessage("");
    },
    onError: (err) => toast.error(err.message || "Failed to send"),
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-white border border-zinc-200 rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-zinc-200">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Send Announcement</h2>
            <p className="text-sm text-zinc-400 mt-0.5">Broadcast to all residents</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-900 p-1 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-600 mb-1.5">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your announcement..."
              rows={4}
              className="w-full px-3 py-2 bg-zinc-100 border border-zinc-300 text-zinc-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-zinc-300 text-zinc-600 rounded-lg font-medium hover:bg-zinc-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (!message.trim() || !userData?.org_id) return;
                mutation.mutate({ orgId: userData.org_id, title: "Announcement", content: message });
              }}
              disabled={!message.trim() || mutation.isPending || !userData?.org_id}
              className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
            >
              {mutation.isPending ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// EMPTY STATE CHECKLIST
// ============================================================

function EmptyStateChecklist({
  hasHouses,
  hasResidents,
  onAddResident,
}: {
  hasHouses: boolean;
  hasResidents: boolean;
  onAddResident: () => void;
}) {
  if (hasHouses && hasResidents) return null;

  const steps = [
    {
      done: hasHouses,
      label: "Add your first house",
      description: "Create a property and house to get started",
      action: <a href="/admin/properties" className="text-xs font-medium text-indigo-400 hover:text-indigo-600">Set up house &rarr;</a>,
    },
    {
      done: hasResidents,
      label: "Add your first resident",
      description: "Add a resident to your pipeline",
      action: <button onClick={onAddResident} className="text-xs font-medium text-indigo-400 hover:text-indigo-600">Add resident &rarr;</button>,
    },
    {
      done: false,
      label: "Set your rent rates",
      description: "Configure billing rates for each house",
      action: <a href="/billing/rates" className="text-xs font-medium text-indigo-400 hover:text-indigo-600">Set rates &rarr;</a>,
    },
    {
      done: false,
      label: "Create your first invoice",
      description: "Bill a resident for rent",
      action: <a href="/billing/invoices/new" className="text-xs font-medium text-indigo-400 hover:text-indigo-600">Create invoice &rarr;</a>,
    },
  ];

  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-6">
      <h2 className="text-base font-semibold text-zinc-900 mb-1">Get started with RecoveryOS</h2>
      <p className="text-sm text-zinc-400 mb-5">Complete these steps to set up your house</p>
      <div className="space-y-3">
        {steps.map((step, idx) => (
          <div key={idx} className="flex items-start gap-3">
            <div className="mt-0.5 flex-shrink-0">
              {step.done ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Circle className="h-5 w-5 text-zinc-600" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${step.done ? "line-through text-zinc-500" : "text-zinc-900"}`}>{step.label}</p>
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
// ACTIVITY ITEM
// ============================================================

function ActivityItem({ actor, description, timestamp }: { actor: string; description: string; timestamp: string }) {
  const formatTimeAgo = (isoString: string) => {
    const date = new Date(isoString);
    const diffMs = Date.now() - date.getTime();
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
      <div className="w-7 h-7 rounded-full bg-zinc-200 flex items-center justify-center flex-shrink-0 text-xs font-medium text-zinc-600">
        {actor.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-zinc-600">
          <span className="font-medium text-zinc-900">{actor}</span>{" "}
          <span>{description}</span>
        </p>
        <p className="text-xs text-zinc-500 mt-0.5">{formatTimeAgo(timestamp)}</p>
      </div>
    </div>
  );
}

// ============================================================
// MOOD BAR (House Satisfaction)
// ============================================================

function MoodBar({ avg, count }: { avg: number | null; count: number }) {
  if (avg === null) return <span className="text-xs text-zinc-500">No data</span>;
  const pct = Math.round((avg / 5) * 100);
  const emoji = avg >= 4.5 ? "😄" : avg >= 3.5 ? "🙂" : avg >= 2.5 ? "😐" : avg >= 1.5 ? "😕" : "😢";
  const color = avg >= 4 ? "bg-emerald-500" : avg >= 3 ? "bg-green-500" : avg >= 2 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2 flex-1">
      <span className="text-lg">{emoji}</span>
      <div className="flex-1 bg-zinc-200 rounded-full h-1.5">
        <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs tabular-nums text-zinc-600 w-8 text-right">{avg.toFixed(1)}</span>
      <span className="text-xs text-zinc-500">({count})</span>
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
  const { data: leadsSummary, isLoading: leadsLoading } = trpc.reporting.getLeadsSummary.useQuery();
  const { data: houseSatisfaction, isLoading: satisfactionLoading } = trpc.reporting.getHouseSatisfaction.useQuery();
  const { data: profitData } = trpc.reporting.getMTDProfit.useQuery();

  const [paymentModal, setPaymentModal] = useState<{ open: boolean; residentId?: string; amount?: number }>({ open: false });
  const [addResidentModal, setAddResidentModal] = useState(false);
  const [outstandingOpen, setOutstandingOpen] = useState(false);
  const [announceOpen, setAnnounceOpen] = useState(false);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

  const isEmpty = !isLoading && data && data.occupancy.total === 0 && data.revenueMTD === 0;
  const emptyBeds = (data?.occupancy.total || 0) - (data?.occupancy.occupied || 0);

  return (
    <div className="p-6 space-y-6 bg-[#fafafa] min-h-screen">
      <ToastContainer toasts={toast.toasts} />

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
        onRecordPayment={(residentId, amount) => setPaymentModal({ open: true, residentId, amount })}
        formatCurrency={formatCurrency}
      />
      <AnnounceModal isOpen={announceOpen} onClose={() => setAnnounceOpen(false)} toast={toast} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Dashboard</h1>
          <p className="text-zinc-400 mt-1 text-sm">Command center for your recovery house</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
          <p className="font-medium">Error loading dashboard data</p>
          <p className="text-sm mt-1 text-red-400">{error.message}</p>
        </div>
      )}

      {isEmpty && (
        <EmptyStateChecklist
          hasHouses={data.occupancy.total > 0}
          hasResidents={(data.occupancy.occupied || 0) > 0}
          onAddResident={() => setAddResidentModal(true)}
        />
      )}

      {/* ROW 1: Money */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue MTD */}
        <div className="bg-white border border-zinc-200 rounded-xl p-5">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Revenue MTD</p>
          {isLoading ? (
            <div className="h-9 bg-zinc-200 rounded mt-2 animate-pulse" />
          ) : (
            <p className="text-3xl font-bold tabular-nums text-zinc-900 mt-2">
              {formatCurrency(data?.revenueMTD || 0)}
            </p>
          )}
          <p className="text-xs text-zinc-500 mt-1">Month to date</p>
        </div>

        {/* Collected */}
        <div className="bg-white border border-zinc-200 rounded-xl p-5">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Collected</p>
          {isLoading ? (
            <div className="h-9 bg-zinc-200 rounded mt-2 animate-pulse" />
          ) : (
            <p className="text-3xl font-bold tabular-nums text-green-400 mt-2">
              {formatCurrency(data?.revenueMTD || 0)}
            </p>
          )}
          <p className="text-xs text-zinc-500 mt-1">Payments received</p>
        </div>

        {/* Outstanding — tappable */}
        <div
          className={`bg-white border rounded-xl p-5 ${
            (data?.outstanding.invoiceCount || 0) > 0
              ? "border-red-300 cursor-pointer hover:border-red-400 transition-colors"
              : "border-zinc-200"
          }`}
          onClick={(data?.outstanding.invoiceCount || 0) > 0 ? () => setOutstandingOpen(true) : undefined}
        >
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Outstanding</p>
          {isLoading ? (
            <div className="h-9 bg-zinc-200 rounded mt-2 animate-pulse" />
          ) : (
            <p className={`text-3xl font-bold tabular-nums mt-2 ${(data?.outstanding.total || 0) > 0 ? "text-red-400" : "text-zinc-900"}`}>
              {formatCurrency(data?.outstanding.total || 0)}
            </p>
          )}
          <p className="text-xs text-zinc-500 mt-1">
            {(data?.outstanding.invoiceCount || 0) > 0
              ? `${data!.outstanding.invoiceCount} overdue — tap to view`
              : "No overdue invoices"}
          </p>
        </div>

        {/* Profit */}
        <div className="bg-white border border-zinc-200 rounded-xl p-5">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Profit MTD</p>
          {isLoading ? (
            <div className="h-9 bg-zinc-200 rounded mt-2 animate-pulse" />
          ) : (
            <p className="text-3xl font-bold tabular-nums text-emerald-400 mt-2">
              {formatCurrency(profitData?.profitMTD || data?.revenueMTD || 0)}
            </p>
          )}
          <p className="text-xs text-zinc-500 mt-1">Revenue - Expenses</p>
        </div>
      </div>

      {/* ROW 2: Beds + Leads */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Beds */}
        <div className="bg-white border border-zinc-200 rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <BedDouble className="h-4 w-4 text-indigo-400" />
                <p className="text-sm font-medium text-zinc-600">Occupancy</p>
              </div>
              {isLoading ? (
                <div className="h-8 bg-zinc-200 rounded w-40 animate-pulse" />
              ) : (
                <p className="text-2xl font-bold tabular-nums text-zinc-900">
                  {data?.occupancy.occupied || 0}/{data?.occupancy.total || 0} Beds
                  <span className="text-base text-zinc-400 font-normal ml-2">({data?.occupancy.rate || 0}%)</span>
                </p>
              )}
              {emptyBeds > 0 && (
                <p className="text-sm text-amber-400 mt-1 font-medium">
                  {emptyBeds} empty
                </p>
              )}
            </div>
            <a
              href="/residents"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-zinc-100 hover:bg-zinc-100 border border-zinc-300 text-zinc-600 rounded-lg transition-colors"
            >
              <Users className="h-3.5 w-3.5" />
              Residents
            </a>
          </div>
          {/* Occupancy bar */}
          <div className="mt-4">
            <div className="bg-zinc-200 rounded-full h-2">
              <div
                className="bg-indigo-500 h-2 rounded-full transition-all"
                style={{ width: `${data?.occupancy.rate || 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Leads pipeline */}
        <div className="bg-white border border-zinc-200 rounded-xl p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-400" />
              <p className="text-sm font-medium text-zinc-600">Leads Pipeline</p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="/leads"
                className="text-xs text-indigo-400 hover:text-indigo-600 font-medium"
              >
                View all &rarr;
              </a>
              <button
                onClick={() => setAddResidentModal(true)}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-zinc-200 hover:bg-zinc-200 border border-zinc-300 text-zinc-600 rounded-lg transition-colors"
              >
                <QrCode className="h-3 w-3" />
                Share Intake
              </button>
            </div>
          </div>
          {leadsLoading ? (
            <div className="flex gap-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-14 flex-1 bg-zinc-100 rounded-lg animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "New", value: leadsSummary?.new || 0, color: "text-blue-400" },
                { label: "Screening", value: leadsSummary?.screening || 0, color: "text-yellow-400" },
                { label: "Ready", value: leadsSummary?.ready || 0, color: "text-green-400" },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-zinc-100 rounded-lg p-3 text-center">
                  <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ROW 3: Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setPaymentModal({ open: true })}
          className="flex items-center gap-2.5 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <CreditCard className="h-4 w-4 flex-shrink-0" />
          Record Payment
        </button>
        <button
          onClick={() => setAddResidentModal(true)}
          className="flex items-center gap-2.5 px-4 py-3 bg-zinc-100 hover:bg-zinc-100 border border-zinc-300 text-zinc-900 rounded-xl text-sm font-medium transition-colors"
        >
          <UserPlus className="h-4 w-4 flex-shrink-0" />
          Add Resident
        </button>
        <button
          onClick={() => setAnnounceOpen(true)}
          className="flex items-center gap-2.5 px-4 py-3 bg-zinc-100 hover:bg-zinc-100 border border-zinc-300 text-zinc-900 rounded-xl text-sm font-medium transition-colors"
        >
          <Megaphone className="h-4 w-4 flex-shrink-0" />
          Announce
        </button>
        <a
          href="/expenses/new"
          className="flex items-center gap-2.5 px-4 py-3 bg-zinc-100 hover:bg-zinc-100 border border-zinc-300 text-zinc-900 rounded-xl text-sm font-medium transition-colors"
        >
          <Receipt className="h-4 w-4 flex-shrink-0" />
          Log Expense
        </a>
      </div>

      {/* ROW 4: Action Items + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Action Items */}
        <div className="bg-white border border-zinc-200 rounded-xl p-6">
          <h2 className="text-base font-semibold text-zinc-900 mb-4">Action Items</h2>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-zinc-100 rounded-lg animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-2">
              {(data?.actionItems.highPriorityIncidents || 0) > 0 && (
                <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">HIGH</span>
                    <span className="text-sm text-zinc-900">{data!.actionItems.highPriorityIncidents} critical incident{data!.actionItems.highPriorityIncidents > 1 ? "s" : ""} need follow-up</span>
                  </div>
                  <a href="/operations/incidents" className="text-xs text-red-500 hover:text-red-600 font-medium whitespace-nowrap">Review &rarr;</a>
                </div>
              )}
              {(data?.actionItems.expiringConsents || 0) > 0 && (
                <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">HIGH</span>
                    <span className="text-sm text-zinc-900">{data!.actionItems.expiringConsents} consent{data!.actionItems.expiringConsents > 1 ? "s" : ""} expiring soon</span>
                  </div>
                  <a href="/compliance/consents" className="text-xs text-yellow-500 hover:text-yellow-600 font-medium whitespace-nowrap">Renew &rarr;</a>
                </div>
              )}
              {(data?.actionItems.pendingPasses || 0) > 0 && (
                <div className="flex items-center justify-between p-3 bg-zinc-100 border border-zinc-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">MED</span>
                    <span className="text-sm text-zinc-900">{data!.actionItems.pendingPasses} pass request{data!.actionItems.pendingPasses > 1 ? "s" : ""} pending</span>
                  </div>
                  <a href="/operations/passes" className="text-xs text-indigo-400 hover:text-indigo-600 font-medium whitespace-nowrap">Review &rarr;</a>
                </div>
              )}
              {(data?.outstanding.invoiceCount || 0) > 0 && (
                <div className="flex items-center justify-between p-3 bg-zinc-100 border border-zinc-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-medium">MED</span>
                    <span className="text-sm text-zinc-900">{data!.outstanding.invoiceCount} residents late ({formatCurrency(data!.outstanding.total)})</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setOutstandingOpen(true)} className="text-xs text-zinc-400 hover:text-zinc-900 font-medium">View</button>
                    <a href="/billing" className="text-xs text-indigo-400 hover:text-indigo-600 font-medium whitespace-nowrap">Billing &rarr;</a>
                  </div>
                </div>
              )}
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
        <div className="bg-white border border-zinc-200 rounded-xl p-6">
          <h2 className="text-base font-semibold text-zinc-900 mb-4">Recent Activity</h2>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="animate-pulse flex gap-3 py-2">
                  <div className="h-7 w-7 bg-zinc-200 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-zinc-200 rounded w-3/4" />
                    <div className="h-3 bg-zinc-200 rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-zinc-200 max-h-[360px] overflow-y-auto">
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

      {/* ROW 5: House Satisfaction */}
      {(!satisfactionLoading && houseSatisfaction && houseSatisfaction.length > 0) && (
        <div className="bg-white border border-zinc-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Heart className="h-4 w-4 text-pink-400" />
            <h2 className="text-base font-semibold text-zinc-900">House Satisfaction</h2>
            <span className="text-xs text-zinc-500">(last 7 days)</span>
          </div>
          <div className="space-y-3">
            {houseSatisfaction.map((house) => (
              <div key={house.houseId} className={`flex items-center gap-3 p-3 rounded-lg ${house.isLow ? "bg-red-50 border border-red-200" : "bg-zinc-100"}`}>
                <div className="w-32 flex-shrink-0">
                  <p className="text-sm font-medium text-zinc-700 truncate">{house.houseName}</p>
                  {house.isLow && <p className="text-xs text-red-400">Low mood — check in</p>}
                </div>
                <MoodBar avg={house.avgMood} count={house.checkInCount} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ROW 6: Messages preview */}
      <div className="bg-white border border-zinc-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-indigo-400" />
            <h2 className="text-base font-semibold text-zinc-900">Messages</h2>
          </div>
          <a href="/messages" className="text-sm text-indigo-400 hover:text-indigo-600 font-medium">View All &rarr;</a>
        </div>
        <p className="text-sm text-zinc-500 text-center py-4">Message preview coming soon</p>
      </div>

      {/* ROW 7: Expiring Consents */}
      {(data?.expiringConsents.count || 0) > 0 && (
        <div className="bg-white border border-zinc-200 rounded-xl">
          <div className="flex items-center justify-between p-6 border-b border-zinc-200">
            <h2 className="text-base font-semibold text-zinc-900">Expiring Consents (Next 30 Days)</h2>
            <a href="/compliance/consents" className="text-sm text-indigo-400 hover:text-indigo-600 font-medium">View All</a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200">
                  <th className="text-left py-3 px-6 text-xs font-medium text-zinc-400 uppercase tracking-wide">Resident</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-zinc-400 uppercase tracking-wide">Type</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-zinc-400 uppercase tracking-wide">Expires</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-zinc-400 uppercase tracking-wide">Days Left</th>
                  <th className="text-left py-3 px-6 text-xs font-medium text-zinc-400 uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody>
                {data?.expiringConsents.items.map((consent) => (
                  <tr key={consent.id} className="border-b border-zinc-200 hover:bg-zinc-100">
                    <td className="py-3 px-6 text-sm text-zinc-900">{consent.residentName}</td>
                    <td className="py-3 px-4 text-sm text-zinc-400">{consent.consentType.replace(/_/g, " ")}</td>
                    <td className="py-3 px-4 text-sm text-zinc-400">
                      {consent.expiresAt ? new Date(consent.expiresAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        (consent.daysRemaining || 0) <= 7 ? "bg-red-50 text-red-700"
                          : (consent.daysRemaining || 0) <= 14 ? "bg-yellow-50 text-yellow-700"
                          : "bg-blue-50 text-blue-700"
                      }`}>
                        {consent.daysRemaining}d
                      </span>
                    </td>
                    <td className="py-3 px-6">
                      <a href="/compliance/consents" className="text-sm text-indigo-400 hover:text-indigo-600 font-medium">Renew</a>
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
        {[
          { href: "/reports/occupancy", icon: BedDouble, iconClass: "text-red-600", bg: "bg-red-50", label: "Occupancy Report", desc: "Beds, trends, waitlist" },
          { href: "/reports/financial", icon: DollarSign, iconClass: "text-green-600", bg: "bg-green-50", label: "Financial Report", desc: "Revenue, aging, collections" },
          { href: "/reports/operations", icon: TrendingUp, iconClass: "text-orange-600", bg: "bg-orange-50", label: "Operations Report", desc: "Chores, meetings, incidents" },
          { href: "/reports/compliance", icon: ShieldCheck, iconClass: "text-purple-600", bg: "bg-purple-50", label: "Compliance Report", desc: "Consents, disclosures, audit" },
        ].map(({ href, icon: Icon, iconClass, bg, label, desc }) => (
          <a
            key={href}
            href={href}
            className="flex items-center gap-3 p-4 bg-white border border-zinc-200 rounded-xl hover:border-zinc-400 transition-colors"
          >
            <div className={`p-2 ${bg} rounded-lg`}>
              <Icon className={`h-5 w-5 ${iconClass}`} />
            </div>
            <div>
              <p className="font-medium text-zinc-900 text-sm">{label}</p>
              <p className="text-xs text-zinc-500">{desc}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

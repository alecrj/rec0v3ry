"use client";

import { useState } from "react";
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
  AlertCircle,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  PageContainer,
  PageHeader,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  SkeletonTable,
  ErrorState,
  useToast,
} from "@/components/ui";
import { SkeletonCard } from "@/components/ui";

export const dynamic = "force-dynamic";

function formatCurrency(amount: string | number) {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

function InvoiceStatusBadge({ status }: { status: string }) {
  const config: Record<string, { variant: "success" | "warning" | "error" | "default" | "info"; label: string }> = {
    draft: { variant: "default", label: "Draft" },
    pending: { variant: "info", label: "Pending" },
    paid: { variant: "success", label: "Paid" },
    partially_paid: { variant: "warning", label: "Partially Paid" },
    overdue: { variant: "error", label: "Overdue" },
    void: { variant: "default", label: "Void" },
    written_off: { variant: "default", label: "Written Off" },
  };
  const { variant, label } = config[status] ?? { variant: "default" as const, label: status };
  return <Badge variant={variant} dot size="md">{label}</Badge>;
}

function PaymentStatusBadge({ status }: { status: string }) {
  const config: Record<string, { variant: "success" | "warning" | "error" | "default" }> = {
    succeeded: { variant: "success" },
    completed: { variant: "success" },
    pending: { variant: "warning" },
    failed: { variant: "error" },
    refunded: { variant: "default" },
  };
  const { variant } = config[status] ?? { variant: "default" as const };
  return (
    <Badge variant={variant} dot>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const invoiceId = params.id as string;
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "check" | "wire" | "other">("cash");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [showVoidConfirm, setShowVoidConfirm] = useState(false);

  const { data: invoice, isLoading, error } = trpc.invoice.getById.useQuery(
    { id: invoiceId },
    { enabled: !!invoiceId }
  );

  const { data: paymentsData } = trpc.payment.list.useQuery(
    { invoiceId, limit: 50 },
    { enabled: !!invoiceId }
  );

  const sendMutation = trpc.invoice.send.useMutation({
    onSuccess: () => {
      toast("success", "Invoice sent", "Invoice has been marked as pending");
      utils.invoice.getById.invalidate({ id: invoiceId });
    },
    onError: (err) => toast("error", "Failed to send invoice", err.message),
  });

  const voidMutation = trpc.invoice.void.useMutation({
    onSuccess: () => {
      toast("success", "Invoice voided");
      utils.invoice.getById.invalidate({ id: invoiceId });
      setShowVoidConfirm(false);
    },
    onError: (err) => toast("error", "Failed to void invoice", err.message),
  });

  const recordPaymentMutation = trpc.payment.recordManual.useMutation({
    onSuccess: () => {
      toast("success", "Payment recorded");
      utils.invoice.getById.invalidate({ id: invoiceId });
      utils.payment.list.invalidate({ invoiceId });
      setShowPaymentModal(false);
      setPaymentAmount("");
      setPaymentNotes("");
    },
    onError: (err) => toast("error", "Failed to record payment", err.message),
  });

  const invoicePayments = paymentsData?.items ?? [];

  if (error) {
    return (
      <PageContainer>
        <Card variant="outlined" className="border-red-500/30 bg-red-500/10">
          <CardContent>
            <ErrorState
              title="Failed to load invoice"
              description={error.message}
            />
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  if (isLoading || !invoice) {
    return (
      <PageContainer>
        <div className="flex items-center gap-4 mb-6">
          <div className="h-8 w-8 bg-zinc-700 rounded-lg animate-shimmer" />
          <div className="space-y-2">
            <div className="h-7 w-48 bg-zinc-700 rounded animate-shimmer" />
            <div className="h-4 w-32 bg-zinc-700 rounded animate-shimmer" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <SkeletonCard />
          </div>
          <SkeletonCard />
        </div>
      </PageContainer>
    );
  }

  const total = parseFloat(invoice.total ?? "0");
  const amountPaid = parseFloat(invoice.amount_paid ?? "0");
  const amountDue = parseFloat(invoice.amount_due ?? "0");
  const subtotal = parseFloat(invoice.subtotal ?? "0");
  const taxAmount = parseFloat(invoice.tax_amount ?? "0");
  const residentName = invoice.resident
    ? `${invoice.resident.first_name} ${invoice.resident.last_name}`
    : "Unknown";

  return (
    <PageContainer>
      {/* Header with back button */}
      <PageHeader
        title={invoice.invoice_number ?? "Invoice"}
        description={`Created ${new Date(invoice.issue_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`}
        badge={<InvoiceStatusBadge status={invoice.status} />}
        actions={
          <div className="flex gap-3">
            {invoice.status === "draft" && (
              <Button
                variant="primary"
                icon={<Send className="h-4 w-4" />}
                onClick={() => sendMutation.mutate({ id: invoiceId })}
                disabled={sendMutation.isPending}
              >
                {sendMutation.isPending ? "Sending..." : "Send Invoice"}
              </Button>
            )}
            {(invoice.status === "pending" || invoice.status === "overdue" || invoice.status === "partially_paid") && (
              <Button
                variant="primary"
                icon={<DollarSign className="h-4 w-4" />}
                onClick={() => {
                  setPaymentAmount(invoice.amount_due ?? "0");
                  setShowPaymentModal(true);
                }}
              >
                Record Payment
              </Button>
            )}
            {invoice.status !== "void" && invoice.status !== "paid" && (
              <Button
                variant="destructive"
                icon={<XCircle className="h-4 w-4" />}
                onClick={() => setShowVoidConfirm(true)}
                disabled={voidMutation.isPending}
              >
                Void
              </Button>
            )}
          </div>
        }
      />

      {/* Back link */}
      <Link
        href="/billing/invoices"
        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors -mt-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Invoices
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Invoice details */}
          <Card>
            <CardContent>
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">Invoice Number</p>
                  <p className="text-xl font-bold font-mono text-zinc-100">{invoice.invoice_number}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">Issue Date</p>
                  <p className="text-lg font-semibold text-zinc-100">
                    {new Date(invoice.issue_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-6 pb-6 border-b border-zinc-800">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">Due Date</p>
                  <p className="text-lg font-semibold text-zinc-100">
                    {new Date(invoice.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">Bill To</p>
                  <p className="text-lg font-semibold text-zinc-100">{residentName}</p>
                </div>
              </div>

              {/* Line Items */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">Line Items</p>
                <div className="overflow-x-auto -mx-6">
                  <table className="w-full">
                    <thead>
                      <tr className="border-y border-zinc-800/50 bg-zinc-800/50">
                        <th className="text-left py-3 px-6 text-xs font-semibold uppercase tracking-wider text-zinc-500">Description</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Type</th>
                        <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Qty</th>
                        <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Unit Price</th>
                        <th className="text-right py-3 px-6 text-xs font-semibold uppercase tracking-wider text-zinc-500">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {(invoice.lineItems ?? []).map((item) => (
                        <tr key={item.id} className="hover:bg-zinc-800/50 transition-colors">
                          <td className="py-3 px-6 text-sm text-zinc-100">{item.description}</td>
                          <td className="py-3 px-4">
                            <Badge variant="default">{item.payment_type}</Badge>
                          </td>
                          <td className="py-3 px-4 text-sm text-zinc-400 text-right">{item.quantity ?? 1}</td>
                          <td className="py-3 px-4 text-sm text-zinc-400 text-right">{formatCurrency(item.unit_price)}</td>
                          <td className="py-3 px-6 text-sm font-semibold text-zinc-100 text-right">{formatCurrency(item.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="mt-6 pt-4 border-t border-zinc-800">
                  <div className="flex justify-end">
                    <div className="w-64 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-500">Subtotal</span>
                        <span className="font-medium text-zinc-100">{formatCurrency(subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-500">Tax</span>
                        <span className="font-medium text-zinc-100">{formatCurrency(taxAmount)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold pt-2 border-t border-zinc-800">
                        <span className="text-zinc-100">Total</span>
                        <span className="text-zinc-100">{formatCurrency(total)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-500">Paid</span>
                        <span className="font-semibold text-green-400">{formatCurrency(amountPaid)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold pt-2 border-t border-zinc-800">
                        <span className="text-zinc-100">Balance Due</span>
                        <span className="text-indigo-400">{formatCurrency(amountDue)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {invoice.notes && (
                <div className="mt-6 pt-6 border-t border-zinc-800">
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Notes</p>
                  <p className="text-sm text-zinc-300 leading-relaxed">{invoice.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment History */}
          {invoicePayments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="overflow-x-auto -mx-6">
                  <table className="w-full">
                    <thead>
                      <tr className="border-y border-zinc-800/50 bg-zinc-800/50">
                        <th className="text-left py-3 px-6 text-xs font-semibold uppercase tracking-wider text-zinc-500">Date</th>
                        <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Amount</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Method</th>
                        <th className="text-left py-3 px-6 text-xs font-semibold uppercase tracking-wider text-zinc-500">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {invoicePayments.map((payment) => (
                        <tr key={payment.id} className="hover:bg-zinc-800/50 transition-colors">
                          <td className="py-3 px-6 text-sm text-zinc-400">
                            {new Date(payment.payment_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </td>
                          <td className="py-3 px-4 text-sm font-semibold text-zinc-100 text-right">
                            {formatCurrency(payment.amount)}
                          </td>
                          <td className="py-3 px-4 text-sm text-zinc-400 capitalize">
                            {payment.payment_method_type?.replace(/_/g, " ") ?? "—"}
                          </td>
                          <td className="py-3 px-6">
                            <PaymentStatusBadge status={payment.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardContent>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-4">Resident Information</h2>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500/15 to-indigo-500/25 flex items-center justify-center">
                  <span className="text-sm font-semibold text-indigo-300">
                    {residentName.split(" ").map(n => n[0]).join("").slice(0, 2)}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-100">{residentName}</p>
                </div>
              </div>

              {amountDue > 0 && (
                <div className="p-4 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                  <div className="flex items-start gap-3">
                    <DollarSign className="h-5 w-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-indigo-100">Balance Due</p>
                      <p className="text-2xl font-bold text-indigo-100 mt-1">{formatCurrency(amountDue)}</p>
                      <p className="text-xs text-indigo-300 mt-2">
                        Due by {new Date(invoice.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {invoice.status === "paid" && (
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-green-300">Paid in Full</p>
                      <p className="text-xs text-green-300 mt-1">Payment complete</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Record Payment Modal */}
      {showPaymentModal && invoice.resident && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-xl shadow-2xl max-w-md w-full mx-4 border border-zinc-800">
            <div className="p-6 border-b border-zinc-800">
              <h2 className="text-xl font-bold text-zinc-100">Record Payment</h2>
              <p className="text-sm text-zinc-500 mt-1">
                For invoice {invoice.invoice_number}
              </p>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                recordPaymentMutation.mutate({
                  residentId: invoice.resident!.id,
                  invoiceId: invoice.id,
                  amount: paymentAmount,
                  paymentMethodType: paymentMethod,
                  paymentDate: new Date().toISOString(),
                  notes: paymentNotes || undefined,
                });
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                  Amount <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full h-10 px-3 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Balance due: {formatCurrency(invoice.amount_due ?? "0")}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                  Payment Method <span className="text-red-400">*</span>
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
                  className="w-full h-10 px-3 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                  <option value="wire">Wire Transfer</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Notes</label>
                <textarea
                  rows={2}
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                  placeholder="Optional notes..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => setShowPaymentModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={recordPaymentMutation.isPending}>
                  {recordPaymentMutation.isPending ? "Recording..." : "Record Payment"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Void Confirmation */}
      {showVoidConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-xl shadow-2xl max-w-sm w-full mx-4 border border-zinc-800 p-6">
            <h2 className="text-lg font-bold text-zinc-100 mb-2">Void Invoice?</h2>
            <p className="text-sm text-zinc-400 mb-6">
              This will permanently mark invoice {invoice.invoice_number} as void. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowVoidConfirm(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => voidMutation.mutate({ id: invoiceId })}
                disabled={voidMutation.isPending}
              >
                {voidMutation.isPending ? "Voiding..." : "Void Invoice"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

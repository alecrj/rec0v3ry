"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CreditCard,
  CheckCircle,
  DollarSign,
  Lock,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/components/ui";

export const dynamic = "force-dynamic";

// ── Main Page ───────────────────────────────────────────
export default function MakePaymentPage() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);

  // Handle return from Stripe Checkout
  const checkoutSuccess = searchParams.get("checkout") === "success";
  const checkoutCanceled = searchParams.get("checkout") === "canceled";

  useEffect(() => {
    if (checkoutCanceled) {
      toast("info", "Payment canceled", "Your payment was not processed.");
    }
  }, [checkoutCanceled]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: userData } = trpc.user.getCurrentUser.useQuery();
  const residentId = userData?.scope_type === "resident" ? userData.scope_id : undefined;

  const { data: invoicesData, isLoading } = trpc.invoice.list.useQuery(
    { residentId: residentId!, status: "pending" },
    { enabled: !!residentId }
  );

  const createCheckoutSession = trpc.stripe.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    },
    onError: (error) => {
      toast("error", "Payment setup failed", error.message);
    },
  });

  const invoices = invoicesData?.items ?? [];

  const toggleInvoice = (id: string) => {
    setSelectedInvoices((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectedTotal = invoices
    .filter((inv) => selectedInvoices.includes(inv.id))
    .reduce((sum, inv) => sum + Number(inv.total ?? 0) - Number(inv.amount_paid ?? 0), 0);

  const handleProceedToPayment = () => {
    if (!residentId || selectedInvoices.length === 0) return;
    createCheckoutSession.mutate({
      invoiceId: selectedInvoices[0]!,
      invoiceIds: selectedInvoices,
      residentId,
      amountCents: Math.round(selectedTotal * 100),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  // Success state (returned from Stripe Checkout)
  if (checkoutSuccess) {
    return (
      <div className="p-4 space-y-6">
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 bg-green-500/15 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-12 w-12 text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-zinc-100 mb-2">Payment Processing</h1>
            <p className="text-zinc-400 mb-1">Your payment is being processed</p>
            <p className="text-sm text-zinc-500 mb-6">A receipt will be sent to your email once confirmed</p>

            <Link
              href="/payments"
              className="w-full px-4 py-3 border border-zinc-700 text-zinc-300 rounded-lg font-medium hover:bg-zinc-800/40 flex items-center justify-center"
            >
              Back to Payments
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/payments" className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
          <ArrowLeft className="h-5 w-5 text-zinc-400" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Make a Payment</h1>
          <p className="text-zinc-400 mt-1">Pay your outstanding balance</p>
        </div>
      </div>

      {checkoutCanceled && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0" />
          <p className="text-sm text-zinc-300">Payment was canceled. Please try again.</p>
        </div>
      )}

      {invoices.length === 0 ? (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6 text-center">
          <CheckCircle className="h-10 w-10 text-green-400 mx-auto mb-3" />
          <p className="font-medium text-zinc-100">No outstanding invoices</p>
          <p className="text-sm text-zinc-400 mt-1">You&apos;re all caught up!</p>
        </div>
      ) : (
        <>
          <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
            <h2 className="text-lg font-semibold text-zinc-100 mb-4">Select Invoices to Pay</h2>
            <div className="space-y-3">
              {invoices.map((invoice) => {
                const isSelected = selectedInvoices.includes(invoice.id);
                const amount = Number(invoice.total ?? 0) - Number(invoice.amount_paid ?? 0);
                return (
                  <label
                    key={invoice.id}
                    className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? "border-indigo-500 bg-indigo-500/10"
                        : "border-zinc-800 hover:bg-zinc-800/40"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleInvoice(invoice.id)}
                      className="w-4 h-4 text-indigo-400 rounded"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-zinc-100">
                        {invoice.invoice_number ?? "Invoice"}
                      </p>
                      {invoice.due_date && (
                        <p className="text-sm text-zinc-400">
                          Due {new Date(invoice.due_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <p className="font-bold text-zinc-100">${amount.toFixed(2)}</p>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
            <div className="flex items-center gap-3 p-3 border border-zinc-800 rounded-lg">
              <div className="p-2 bg-indigo-500/15 rounded-lg">
                <CreditCard className="h-5 w-5 text-indigo-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-zinc-100">Card, ACH, Apple Pay, Google Pay</p>
                <p className="text-sm text-zinc-400">Secure checkout powered by Stripe</p>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Invoices</span>
                <span className="text-zinc-100">{selectedInvoices.length} selected</span>
              </div>
              <div className="pt-3 border-t border-zinc-800 flex justify-between">
                <span className="font-semibold text-zinc-100">Total</span>
                <span className="text-xl font-bold text-zinc-100">${selectedTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleProceedToPayment}
              disabled={selectedInvoices.length === 0 || createCheckoutSession.isPending}
              className={`w-full px-4 py-4 rounded-lg font-semibold flex items-center justify-center gap-2 text-lg ${
                selectedInvoices.length > 0 && !createCheckoutSession.isPending
                  ? "bg-indigo-500 text-white hover:bg-indigo-400"
                  : "bg-zinc-700 text-zinc-500 cursor-not-allowed"
              }`}
            >
              {createCheckoutSession.isPending ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <DollarSign className="h-6 w-6" />
              )}
              {createCheckoutSession.isPending ? "Redirecting to checkout..." : `Pay $${selectedTotal.toFixed(2)}`}
            </button>
            <p className="text-xs text-center text-zinc-400 flex items-center justify-center gap-1">
              <Lock className="h-3 w-3" />
              Secure payment powered by Stripe. You will be redirected to complete payment.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

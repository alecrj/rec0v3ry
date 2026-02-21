"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CreditCard,
  CheckCircle,
  DollarSign,
  Lock,
  Loader2,
} from "lucide-react";
import { useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/components/ui";
import { StripeProvider } from "@/components/stripe-provider";

export const dynamic = "force-dynamic";

// ── Checkout Form (inside Stripe Elements) ──────────────
function CheckoutForm({
  amount,
  invoiceCount,
  onSuccess,
}: {
  amount: number;
  invoiceCount: number;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payments`,
      },
      redirect: "if_required",
    });

    if (error) {
      toast("error", "Payment failed", error.message ?? "An unexpected error occurred");
      setProcessing(false);
    } else {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
        <h2 className="text-lg font-semibold text-zinc-100 mb-4">Payment Details</h2>
        <PaymentElement />
      </div>

      <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
        <h2 className="text-lg font-semibold text-zinc-100 mb-4">Summary</h2>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Invoices</span>
            <span className="text-zinc-100">{invoiceCount} selected</span>
          </div>
          <div className="pt-3 border-t border-zinc-800 flex justify-between">
            <span className="font-semibold text-zinc-100">Total</span>
            <span className="text-xl font-bold text-zinc-100">${amount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <button
          type="submit"
          disabled={!stripe || processing}
          className={`w-full px-4 py-4 rounded-lg font-semibold flex items-center justify-center gap-2 text-lg ${
            stripe && !processing
              ? "bg-indigo-500 text-white hover:bg-indigo-400"
              : "bg-zinc-700 text-zinc-500 cursor-not-allowed"
          }`}
        >
          {processing ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <DollarSign className="h-6 w-6" />
          )}
          {processing ? "Processing..." : `Pay $${amount.toFixed(2)}`}
        </button>
        <p className="text-xs text-center text-zinc-400 flex items-center justify-center gap-1">
          <Lock className="h-3 w-3" />
          Secure payment powered by Stripe
        </p>
      </div>
    </form>
  );
}

// ── Main Page ───────────────────────────────────────────
export default function MakePaymentPage() {
  const { toast } = useToast();
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [connectedAccountId, setConnectedAccountId] = useState<string | null>(null);

  const { data: userData } = trpc.user.getCurrentUser.useQuery();
  const residentId = userData?.scope_type === "resident" ? userData.scope_id : undefined;

  const { data: invoicesData, isLoading } = trpc.invoice.list.useQuery(
    { residentId: residentId!, status: "pending" },
    { enabled: !!residentId }
  );

  const createPaymentIntent = trpc.stripe.createPaymentIntent.useMutation({
    onSuccess: (data) => {
      setClientSecret(data.clientSecret);
      setConnectedAccountId(data.connectedAccountId);
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
    createPaymentIntent.mutate({
      invoiceIds: selectedInvoices,
      amountCents: Math.round(selectedTotal * 100),
      residentId,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (paymentComplete) {
    return (
      <div className="p-4 space-y-6">
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 bg-green-500/15 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-12 w-12 text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-zinc-100 mb-2">Payment Complete</h1>
            <p className="text-zinc-400 mb-1">Your payment has been processed</p>
            <p className="text-sm text-zinc-500 mb-6">A receipt will be sent to your email</p>

            <div className="bg-zinc-800/40 rounded-lg p-6 mb-6 text-left">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-zinc-400">Amount</span>
                <span className="text-lg font-bold text-zinc-100">${selectedTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-zinc-400">Invoices</span>
                <span className="text-sm text-zinc-100">{selectedInvoices.length} selected</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-zinc-400">Date</span>
                <span className="text-sm text-zinc-100">{new Date().toLocaleDateString()}</span>
              </div>
            </div>

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

  // Show Stripe checkout form once PaymentIntent is created
  if (clientSecret && connectedAccountId) {
    return (
      <div className="p-4 space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => { setClientSecret(null); setConnectedAccountId(null); }}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-zinc-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">Complete Payment</h1>
            <p className="text-zinc-400 mt-1">Enter your payment details</p>
          </div>
        </div>

        <StripeProvider clientSecret={clientSecret} connectedAccountId={connectedAccountId}>
          <CheckoutForm
            amount={selectedTotal}
            invoiceCount={selectedInvoices.length}
            onSuccess={() => setPaymentComplete(true)}
          />
        </StripeProvider>
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
                <p className="font-medium text-zinc-100">Pay with Card</p>
                <p className="text-sm text-zinc-400">Secure payment via Stripe</p>
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
              disabled={selectedInvoices.length === 0 || createPaymentIntent.isPending}
              className={`w-full px-4 py-4 rounded-lg font-semibold flex items-center justify-center gap-2 text-lg ${
                selectedInvoices.length > 0 && !createPaymentIntent.isPending
                  ? "bg-indigo-500 text-white hover:bg-indigo-400"
                  : "bg-zinc-700 text-zinc-500 cursor-not-allowed"
              }`}
            >
              {createPaymentIntent.isPending ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <DollarSign className="h-6 w-6" />
              )}
              {createPaymentIntent.isPending ? "Setting up..." : `Pay $${selectedTotal.toFixed(2)}`}
            </button>
            <p className="text-xs text-center text-zinc-400 flex items-center justify-center gap-1">
              <Lock className="h-3 w-3" />
              Secure payment powered by Stripe
            </p>
          </div>
        </>
      )}
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/components/ui";

export const dynamic = "force-dynamic";

/**
 * Stripe Connect onboarding refresh URL
 * Stripe redirects here when the onboarding link expires and needs to be regenerated.
 * We generate a new account link and redirect the operator back to Stripe.
 */
export default function StripeConnectRefreshPage() {
  const router = useRouter();
  const { toast } = useToast();

  const createAccountLink = trpc.stripe.createAccountLink.useMutation({
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (err) => {
      toast("error", "Failed to resume onboarding", err.message);
      setTimeout(() => router.push("/settings/payments"), 2000);
    },
  });

  useEffect(() => {
    // Auto-generate a new account link on mount
    createAccountLink.mutate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        {createAccountLink.isError ? (
          <>
            <div className="w-20 h-20 bg-amber-500/15 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="h-12 w-12 text-amber-400" />
            </div>
            <h1 className="text-2xl font-bold text-zinc-100 mb-2">Session Expired</h1>
            <p className="text-zinc-400 mb-1">Unable to resume Stripe onboarding.</p>
            <p className="text-sm text-zinc-500">Redirecting to payment settings...</p>
          </>
        ) : (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-indigo-400 mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-zinc-100 mb-2">Resuming Stripe Setup</h1>
            <p className="text-zinc-400">Generating a fresh onboarding link...</p>
          </>
        )}
      </div>
    </div>
  );
}

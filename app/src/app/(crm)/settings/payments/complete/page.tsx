"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/components/ui";

export const dynamic = "force-dynamic";

/**
 * Stripe Connect onboarding completion return URL
 * Stripe redirects here after operator completes onboarding.
 * We refresh account status then redirect to payment settings.
 */
export default function StripeConnectCompletePage() {
  const router = useRouter();
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const { data: accountStatus, isLoading } = trpc.stripe.getAccountStatus.useQuery();

  useEffect(() => {
    if (accountStatus) {
      if (accountStatus.chargesEnabled) {
        toast("success", "Stripe connected!", "You can now accept payments from residents.");
      } else {
        toast("info", "Onboarding in progress", "Stripe may need additional information to verify your account.");
      }
      // Invalidate fee config so settings page refreshes
      utils.stripe.getFeeConfig.invalidate().then(() => {
        setTimeout(() => router.push("/settings/payments"), 2000);
      });
    }
  }, [accountStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        {isLoading ? (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-indigo-400 mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-zinc-100 mb-2">Verifying your Stripe account...</h1>
            <p className="text-zinc-400">Just a moment while we confirm your setup.</p>
          </>
        ) : accountStatus?.chargesEnabled ? (
          <>
            <div className="w-20 h-20 bg-green-500/15 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-12 w-12 text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-zinc-100 mb-2">Stripe Connected!</h1>
            <p className="text-zinc-400 mb-1">Your account is verified and ready to accept payments.</p>
            <p className="text-sm text-zinc-500">Redirecting to payment settings...</p>
          </>
        ) : (
          <>
            <div className="w-20 h-20 bg-amber-500/15 rounded-full flex items-center justify-center mx-auto mb-6">
              <Loader2 className="h-12 w-12 text-amber-400" />
            </div>
            <h1 className="text-2xl font-bold text-zinc-100 mb-2">Verification in Progress</h1>
            <p className="text-zinc-400 mb-1">Stripe is reviewing your information.</p>
            <p className="text-sm text-zinc-500">Redirecting to payment settings...</p>
          </>
        )}
      </div>
    </div>
  );
}

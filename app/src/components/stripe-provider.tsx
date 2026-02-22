"use client";

import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { useMemo, type ReactNode } from "react";

export function StripeProvider({
  children,
  clientSecret,
  connectedAccountId,
}: {
  children: ReactNode;
  clientSecret: string;
  connectedAccountId: string;
}) {
  // Load Stripe with stripeAccount so payments go to the connected account
  const stripePromise = useMemo(
    () =>
      loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!, {
        stripeAccount: connectedAccountId,
      }),
    [connectedAccountId]
  );

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: "stripe",
          variables: {
            colorPrimary: "#dc2626",
            colorBackground: "#ffffff",
            colorText: "#0a0a0a",
            colorDanger: "#dc2626",
            fontFamily: "system-ui, sans-serif",
            borderRadius: "2px",
          },
        },
      }}
      key={clientSecret}
    >
      {children}
    </Elements>
  );
}

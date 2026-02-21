"use client";

import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { type ReactNode } from "react";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

export function StripeProvider({
  children,
  clientSecret,
  connectedAccountId,
}: {
  children: ReactNode;
  clientSecret: string;
  connectedAccountId: string;
}) {
  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: "night",
          variables: {
            colorPrimary: "#6366f1",
            colorBackground: "#18181b",
            colorText: "#f4f4f5",
            colorDanger: "#ef4444",
            fontFamily: "system-ui, sans-serif",
            borderRadius: "8px",
          },
        },
      }}
      key={clientSecret}
    >
      {children}
    </Elements>
  );
}

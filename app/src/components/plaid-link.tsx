"use client";

import { useCallback, useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui";
import { Building2 } from "lucide-react";

interface PlaidLinkButtonProps {
  onSuccess?: () => void;
}

export function PlaidLinkButton({ onSuccess }: PlaidLinkButtonProps) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [linkToken, setLinkToken] = useState<string | null>(null);

  const createLinkToken = trpc.plaid.createLinkToken.useMutation({
    onSuccess: (data) => setLinkToken(data.linkToken),
    onError: (err) => toast("error", "Failed to initialize Plaid", err.message),
  });

  const exchangeToken = trpc.plaid.exchangeToken.useMutation({
    onSuccess: () => {
      toast("success", "Bank account connected");
      utils.plaid.getConnections.invalidate();
      onSuccess?.();
    },
    onError: (err) => toast("error", "Failed to connect account", err.message),
  });

  useEffect(() => {
    createLinkToken.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPlaidSuccess = useCallback(
    (publicToken: string, metadata: { institution?: { name?: string; institution_id?: string } | null }) => {
      exchangeToken.mutate({
        publicToken,
        institutionName: metadata.institution?.name || undefined,
        institutionId: metadata.institution?.institution_id || undefined,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: onPlaidSuccess,
  });

  return (
    <Button
      variant="primary"
      icon={<Building2 className="h-4 w-4" />}
      onClick={() => open()}
      disabled={!ready || exchangeToken.isPending}
    >
      {exchangeToken.isPending ? "Connecting..." : "Connect Bank Account"}
    </Button>
  );
}

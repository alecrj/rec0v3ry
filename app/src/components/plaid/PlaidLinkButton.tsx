"use client";

/**
 * PlaidLinkButton
 *
 * Opens Plaid Link to connect a bank account / card.
 * Calls createLinkToken → opens Plaid UI → calls exchangeToken on success.
 */

import { useCallback, useEffect, useState } from "react";
import { usePlaidLink, PlaidLinkOptions, PlaidLinkOnSuccess } from "react-plaid-link";
import { trpc } from "@/lib/trpc";
import { Link as LinkIcon, Loader2 } from "lucide-react";

interface Props {
  onSuccess?: () => void;
  onError?: (message: string) => void;
}

export function PlaidLinkButton({ onSuccess, onError }: Props) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const utils = trpc.useUtils();
  const createLinkToken = trpc.plaid.createLinkToken.useMutation();
  const exchangeToken = trpc.plaid.exchangeToken.useMutation({
    onSuccess: () => {
      utils.plaid.getConnections.invalidate();
      onSuccess?.();
    },
    onError: (err) => {
      onError?.(err.message);
    },
  });

  // Get link token on mount
  useEffect(() => {
    setIsLoading(true);
    createLinkToken.mutate(undefined, {
      onSuccess: (data) => {
        setLinkToken(data.linkToken);
        setIsLoading(false);
      },
      onError: (err) => {
        setIsLoading(false);
        onError?.(err.message);
      },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSuccess = useCallback<PlaidLinkOnSuccess>(
    (publicToken, metadata) => {
      const account = metadata.accounts[0];
      if (!account) return;

      exchangeToken.mutate({
        public_token: publicToken,
        institution_id: metadata.institution?.institution_id ?? undefined,
        institution_name: metadata.institution?.name ?? undefined,
        account_id: account.id,
        account_name: account.name ?? undefined,
        account_mask: account.mask ?? undefined,
        account_type: account.type ?? undefined,
        account_subtype: account.subtype ?? undefined,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [exchangeToken]
  );

  const config: PlaidLinkOptions = {
    token: linkToken ?? "",
    onSuccess: handleSuccess,
    onExit: () => {},
  };

  const { open, ready } = usePlaidLink(config);

  const handleClick = () => {
    if (ready && linkToken) {
      open();
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={!ready || isLoading || !linkToken || exchangeToken.isPending}
      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {(isLoading || exchangeToken.isPending) ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <LinkIcon className="h-4 w-4" />
      )}
      Connect New Account
    </button>
  );
}

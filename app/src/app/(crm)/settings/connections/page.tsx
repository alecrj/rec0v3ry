"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/components/ui/toast";
import {
  PageContainer,
  PageHeader,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  EmptyState,
  SkeletonTable,
} from "@/components/ui";
import { PlaidLinkButton } from "@/components/plaid-link";
import { RefreshCw, Trash2, Building2, Clock, CreditCard } from "lucide-react";

export const dynamic = "force-dynamic";

function formatDate(d: string | Date | null) {
  if (!d) return "Never";
  return new Date(d).toLocaleString();
}

export default function ConnectionsPage() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const { data: connections, isLoading } = trpc.plaid.getConnections.useQuery();

  const syncMutation = trpc.plaid.syncTransactions.useMutation({
    onSuccess: (data) => {
      toast("success", `Synced ${data.newTransactions} new transaction${data.newTransactions !== 1 ? "s" : ""}`);
      utils.plaid.getConnections.invalidate();
    },
    onError: (err) => toast("error", "Sync failed", err.message),
  });

  const removeMutation = trpc.plaid.removeConnection.useMutation({
    onSuccess: () => {
      toast("success", "Account disconnected");
      utils.plaid.getConnections.invalidate();
      setConfirmRemove(null);
    },
    onError: (err) => toast("error", "Failed to disconnect", err.message),
  });

  return (
    <PageContainer>
      <PageHeader
        title="Bank Connections"
        description="Connect your bank or card to auto-import expenses"
        actions={<PlaidLinkButton />}
      />

      <Card>
        <CardHeader>
          <CardTitle>Connected Accounts</CardTitle>
        </CardHeader>
        {isLoading ? (
          <CardContent className="pt-0">
            <SkeletonTable rows={3} columns={4} />
          </CardContent>
        ) : !connections || connections.length === 0 ? (
          <CardContent className="pt-0">
            <EmptyState
              iconType="inbox"
              title="No accounts connected"
              description="Connect your bank account or credit card to automatically import transactions."
            />
          </CardContent>
        ) : (
          <div className="divide-y divide-zinc-800/50">
            {connections.map((conn) => (
              <div key={conn.id} className="flex items-center gap-4 px-6 py-4">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-5 w-5 text-indigo-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-200">{conn.institution_name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1 text-xs text-zinc-500">
                      <CreditCard className="h-3 w-3" />
                      {conn.account_name || `****${conn.account_mask}`}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-zinc-600">
                      <Clock className="h-3 w-3" />
                      Last synced: {formatDate(conn.last_synced_at)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant="success" size="sm">Active</Badge>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<RefreshCw className={`h-3.5 w-3.5 ${syncMutation.isPending ? "animate-spin" : ""}`} />}
                    onClick={() => syncMutation.mutate({ plaidItemId: conn.id })}
                    disabled={syncMutation.isPending}
                  >
                    Sync
                  </Button>
                  {confirmRemove === conn.id ? (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeMutation.mutate({ plaidItemId: conn.id })}
                        disabled={removeMutation.isPending}
                      >
                        Confirm
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => setConfirmRemove(null)}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Trash2 className="h-3.5 w-3.5" />}
                      onClick={() => setConfirmRemove(conn.id)}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </PageContainer>
  );
}

"use client";

/**
 * Plaid Connections Settings Page
 *
 * G2-13: Plaid Link end-to-end
 * G2-14: Card-to-house mapping
 *
 * Shows all connected bank accounts/cards.
 * Allows connecting new accounts via Plaid Link.
 * Per-connection: house assignment, sync, disconnect.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { PlaidLinkButton } from "@/components/plaid/PlaidLinkButton";
import {
  Building2,
  RefreshCw,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  CreditCard,
  Home,
} from "lucide-react";

export const dynamic = "force-dynamic";

function formatDate(date: Date | null | string): string {
  if (!date) return "Never";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function ConnectionCard({
  connection,
  houses,
  onSync,
  onDisconnect,
  onHouseChange,
  isSyncing,
  isDisconnecting,
  isUpdating,
  syncResult,
}: {
  connection: {
    id: string;
    institution_name: string | null;
    account_name: string | null;
    account_mask: string | null;
    account_type: string | null;
    account_subtype: string | null;
    default_house_id: string | null;
    last_synced_at: Date | null;
    house_name: string | null;
  };
  houses: Array<{ id: string; name: string }>;
  onSync: () => void;
  onDisconnect: () => void;
  onHouseChange: (houseId: string | null) => void;
  isSyncing: boolean;
  isDisconnecting: boolean;
  isUpdating: boolean;
  syncResult: { imported: number; skipped: number } | null;
}) {
  const displayName = [connection.institution_name, connection.account_name]
    .filter(Boolean)
    .join(" – ");

  const maskDisplay = connection.account_mask ? `••••${connection.account_mask}` : "";
  const subtypeDisplay = connection.account_subtype
    ? connection.account_subtype.replace(/_/g, " ")
    : connection.account_type ?? "account";

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <p className="text-white font-semibold">{displayName || "Unknown Account"}</p>
            <p className="text-zinc-400 text-sm capitalize">
              {subtypeDisplay}{" "}
              {maskDisplay && <span className="font-mono">{maskDisplay}</span>}
            </p>
          </div>
        </div>
        <span className="flex items-center gap-1 text-xs text-emerald-400">
          <CheckCircle2 className="h-3 w-3" />
          Active
        </span>
      </div>

      {/* House Assignment */}
      <div className="flex items-start gap-3">
        <Home className="h-4 w-4 text-zinc-400 shrink-0 mt-2" />
        <div className="flex-1">
          <label className="text-xs text-zinc-400 block mb-1">
            Assign transactions to house
          </label>
          <select
            value={connection.default_house_id ?? ""}
            onChange={(e) => onHouseChange(e.target.value || null)}
            disabled={isUpdating}
            className="w-full bg-zinc-800 border border-zinc-600 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <option value="">All Houses (manual assignment)</option>
            {houses.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </div>
        {isUpdating && (
          <Loader2 className="h-4 w-4 text-indigo-400 animate-spin mt-2" />
        )}
      </div>

      {/* Last synced */}
      <p className="text-xs text-zinc-500">
        Last synced: {formatDate(connection.last_synced_at)}
      </p>

      {/* Sync result */}
      {syncResult && (
        <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-400/10 rounded-lg px-3 py-2">
          <CheckCircle2 className="h-4 w-4" />
          Imported {syncResult.imported} transactions ({syncResult.skipped} already synced)
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-zinc-700">
        <button
          onClick={onSync}
          disabled={isSyncing}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSyncing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Sync Transactions
        </button>

        <button
          onClick={onDisconnect}
          disabled={isDisconnecting}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors ml-auto"
        >
          {isDisconnecting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          Disconnect
        </button>
      </div>
    </div>
  );
}

export default function PlaidSettingsPage() {
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
  const [disconnectingIds, setDisconnectingIds] = useState<Set<string>>(new Set());
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const [syncResults, setSyncResults] = useState<
    Record<string, { imported: number; skipped: number }>
  >({});

  const utils = trpc.useUtils();

  const { data: connections, isLoading: loadingConnections } =
    trpc.plaid.getConnections.useQuery();

  const { data: housesList } = trpc.property.listAllHouses.useQuery();

  const syncMutation = trpc.plaid.syncTransactions.useMutation();
  const disconnectMutation = trpc.plaid.removeConnection.useMutation();
  const updateMutation = trpc.plaid.updateConnection.useMutation();

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleSync = async (connectionId: string) => {
    setSyncingIds((prev) => new Set([...prev, connectionId]));
    setSyncResults((prev) => { const s = { ...prev }; delete s[connectionId]; return s; });
    try {
      const result = await syncMutation.mutateAsync({ connectionId });
      setSyncResults((prev) => ({
        ...prev,
        [connectionId]: { imported: result.imported, skipped: result.skipped },
      }));
      showNotification("success", `Synced: ${result.imported} new transactions`);
      utils.plaid.getConnections.invalidate();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Sync failed";
      showNotification("error", message);
    } finally {
      setSyncingIds((prev) => {
        const s = new Set(prev);
        s.delete(connectionId);
        return s;
      });
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    if (!confirm("Disconnect this account? Existing transactions will remain.")) return;
    setDisconnectingIds((prev) => new Set([...prev, connectionId]));
    try {
      await disconnectMutation.mutateAsync({ connectionId });
      showNotification("success", "Account disconnected");
      utils.plaid.getConnections.invalidate();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Disconnect failed";
      showNotification("error", message);
    } finally {
      setDisconnectingIds((prev) => {
        const s = new Set(prev);
        s.delete(connectionId);
        return s;
      });
    }
  };

  const handleHouseChange = async (connectionId: string, houseId: string | null) => {
    setUpdatingIds((prev) => new Set([...prev, connectionId]));
    try {
      await updateMutation.mutateAsync({ connectionId, default_house_id: houseId });
      utils.plaid.getConnections.invalidate();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Update failed";
      showNotification("error", message);
    } finally {
      setUpdatingIds((prev) => {
        const s = new Set(prev);
        s.delete(connectionId);
        return s;
      });
    }
  };

  const houses = housesList ?? [];

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Bank Connections</h1>
          <p className="text-zinc-400 mt-1">
            Connect bank accounts and cards to automatically import expenses via Plaid.
          </p>
        </div>
        <PlaidLinkButton
          onSuccess={() => showNotification("success", "Account connected successfully!")}
          onError={(msg) => showNotification("error", msg)}
        />
      </div>

      {/* Notification */}
      {notification && (
        <div
          className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${
            notification.type === "success"
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              : "bg-red-500/10 text-red-400 border border-red-500/20"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          {notification.message}
        </div>
      )}

      {/* Info box */}
      <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 flex items-start gap-3">
        <Building2 className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
        <div className="text-sm text-indigo-300">
          <p className="font-semibold mb-1">Card-to-House Mapping</p>
          <p className="text-indigo-300/70">
            Assign each connected account to a specific house. All new transactions from that account
            will automatically be attributed to the assigned house. Multiple cards can map to the
            same house.
          </p>
        </div>
      </div>

      {/* Connections list */}
      {loadingConnections ? (
        <div className="flex items-center gap-2 text-zinc-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading connections...
        </div>
      ) : connections && connections.length > 0 ? (
        <div className="space-y-4">
          {connections.map((connection) => (
            <ConnectionCard
              key={connection.id}
              connection={connection}
              houses={houses}
              onSync={() => handleSync(connection.id)}
              onDisconnect={() => handleDisconnect(connection.id)}
              onHouseChange={(houseId) => handleHouseChange(connection.id, houseId)}
              isSyncing={syncingIds.has(connection.id)}
              isDisconnecting={disconnectingIds.has(connection.id)}
              isUpdating={updatingIds.has(connection.id)}
              syncResult={syncResults[connection.id] ?? null}
            />
          ))}
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-12 text-center">
          <CreditCard className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
          <p className="text-white font-semibold text-lg mb-2">No accounts connected</p>
          <p className="text-zinc-400 text-sm mb-6">
            Connect a bank account or credit card to automatically import expenses.
          </p>
          <PlaidLinkButton
            onSuccess={() => showNotification("success", "Account connected!")}
            onError={(msg) => showNotification("error", msg)}
          />
        </div>
      )}
    </div>
  );
}

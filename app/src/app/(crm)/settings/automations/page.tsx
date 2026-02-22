"use client";

import { useState } from "react";
import {
  Sunrise,
  Bell,
  Check,
  BedDouble,
  AlertTriangle,
  FlaskConical,
  RefreshCw,
  Calendar,
  TrendingUp,
  UserPlus,
  List,
  Play,
  Settings2,
  X,
  Clock,
  CheckCircle2,
  XCircle,
  SkipForward,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  PageContainer,
  PageHeader,
  Card,
  CardContent,
  Badge,
  Button,
  useToast,
  EmptyState,
} from "@/components/ui";
import { SkeletonCard } from "@/components/ui";

export const dynamic = "force-dynamic";

// ── Icon mapping ─────────────────────────────────────────
const ICON_MAP: Record<string, React.ElementType> = {
  sunrise: Sunrise,
  bell: Bell,
  check: Check,
  bed: BedDouble,
  "alert-triangle": AlertTriangle,
  "flask-conical": FlaskConical,
  "refresh-cw": RefreshCw,
  calendar: Calendar,
  "trending-up": TrendingUp,
  "user-plus": UserPlus,
  list: List,
};

// ── Category labels & colors ─────────────────────────────
const CATEGORY_META: Record<string, { label: string; color: string }> = {
  payments: { label: "Payments", color: "text-green-400" },
  operations: { label: "Operations", color: "text-blue-400" },
  occupancy: { label: "Occupancy", color: "text-purple-400" },
  reports: { label: "Reports", color: "text-amber-400" },
  admissions: { label: "Admissions", color: "text-indigo-400" },
};

const CATEGORY_ORDER = ["payments", "operations", "occupancy", "reports", "admissions"];

// ── Settings definitions for automations that have configurable settings ──
const CONFIGURABLE_SETTINGS: Record<
  string,
  { label: string; field: string; type: "time" | "select" | "number"; options?: { label: string; value: string }[] }[]
> = {
  daily_digest: [
    { label: "Send Time", field: "sendTime", type: "time" },
  ],
  random_drug_test: [
    {
      label: "Frequency",
      field: "frequency",
      type: "select",
      options: [
        { label: "Daily", value: "daily" },
        { label: "Weekly", value: "weekly" },
        { label: "Biweekly", value: "biweekly" },
        { label: "Monthly", value: "monthly" },
      ],
    },
    { label: "Selection Percent", field: "selectionPercent", type: "number" },
  ],
  chore_rotation: [
    {
      label: "Rotation Day",
      field: "rotationDay",
      type: "select",
      options: [
        { label: "Monday", value: "monday" },
        { label: "Tuesday", value: "tuesday" },
        { label: "Wednesday", value: "wednesday" },
        { label: "Thursday", value: "thursday" },
        { label: "Friday", value: "friday" },
        { label: "Saturday", value: "saturday" },
        { label: "Sunday", value: "sunday" },
      ],
    },
  ],
  weekly_pnl: [
    {
      label: "Send Day",
      field: "sendDay",
      type: "select",
      options: [
        { label: "Monday", value: "monday" },
        { label: "Tuesday", value: "tuesday" },
        { label: "Wednesday", value: "wednesday" },
        { label: "Thursday", value: "thursday" },
        { label: "Friday", value: "friday" },
      ],
    },
    { label: "Send Time", field: "sendTime", type: "time" },
  ],
};

// ── Status badge helper ──────────────────────────────────
function RunStatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  const map: Record<string, { variant: "success" | "error" | "warning"; icon: React.ElementType; label: string }> = {
    success: { variant: "success", icon: CheckCircle2, label: "Success" },
    error: { variant: "error", icon: XCircle, label: "Error" },
    skipped: { variant: "warning", icon: SkipForward, label: "Skipped" },
  };
  const info = map[status] ?? map.skipped!;
  const Icon = info.icon;
  return (
    <Badge variant={info.variant} dot>
      {info.label}
    </Badge>
  );
}

// ── Settings Modal ───────────────────────────────────────
function SettingsModal({
  automationKey,
  automationName,
  onClose,
}: {
  automationKey: string;
  automationName: string;
  onClose: () => void;
}) {
  const toast = useToast();
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.automation.getSettings.useQuery({ key: automationKey });
  const updateSettings = trpc.automation.updateSettings.useMutation({
    onSuccess: () => {
      toast.toast("success", "Settings saved");
      utils.automation.list.invalidate();
      onClose();
    },
    onError: (err) => toast.toast("error", err.message),
  });

  const [localSettings, setLocalSettings] = useState<Record<string, unknown> | null>(null);
  const settings = localSettings ?? (data?.settings as Record<string, unknown>) ?? {};
  const fields = CONFIGURABLE_SETTINGS[automationKey] ?? [];

  if (fields.length === 0) {
    return null;
  }

  function handleChange(field: string, value: unknown) {
    setLocalSettings((prev) => ({ ...(prev ?? settings), [field]: value }));
  }

  function handleSave() {
    updateSettings.mutate({ key: automationKey, settings: localSettings ?? settings });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white border border-zinc-200 rounded-xl w-full max-w-md mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-200">
          <h2 className="text-sm font-semibold text-zinc-800">{automationName} Settings</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-600 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {isLoading ? (
            <div className="h-20 animate-pulse bg-zinc-100 rounded-lg" />
          ) : (
            fields.map((f) => (
              <div key={f.field}>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">{f.label}</label>
                {f.type === "time" && (
                  <input
                    type="time"
                    value={(settings[f.field] as string) ?? "08:00"}
                    onChange={(e) => handleChange(f.field, e.target.value)}
                    className="w-full h-9 px-3 rounded-md bg-zinc-100 border border-zinc-200 text-sm text-zinc-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                  />
                )}
                {f.type === "select" && f.options && (
                  <select
                    value={(settings[f.field] as string) ?? f.options[0]?.value ?? ""}
                    onChange={(e) => handleChange(f.field, e.target.value)}
                    className="w-full h-9 px-3 rounded-md bg-zinc-100 border border-zinc-200 text-sm text-zinc-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors appearance-none"
                  >
                    {f.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                )}
                {f.type === "number" && (
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={(settings[f.field] as number) ?? 25}
                    onChange={(e) => handleChange(f.field, parseInt(e.target.value, 10) || 0)}
                    className="w-full h-9 px-3 rounded-md bg-zinc-100 border border-zinc-200 text-sm text-zinc-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                  />
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-5 border-t border-zinc-200">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" loading={updateSettings.isPending} onClick={handleSave}>
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────
export default function AutomationsPage() {
  const toast = useToast();
  const utils = trpc.useUtils();
  const { data: automations, isLoading, error } = trpc.automation.list.useQuery(undefined);

  const toggleMutation = trpc.automation.toggle.useMutation({
    onSuccess: (result) => {
      toast.toast("success", `${result.key} ${result.enabled ? "enabled" : "disabled"}`);
      utils.automation.list.invalidate();
    },
    onError: (err) => toast.toast("error", err.message),
  });

  const runNowMutation = trpc.automation.runNow.useMutation({
    onSuccess: (result) => {
      if (result.triggered) {
        toast.toast("success", "Automation triggered successfully");
      } else {
        toast.toast("info", result.message ?? "Automation does not have a handler yet");
      }
      utils.automation.list.invalidate();
    },
    onError: (err) => toast.toast("error", err.message),
  });

  const [settingsModal, setSettingsModal] = useState<{ key: string; name: string } | null>(null);

  // Group automations by category
  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    ...(CATEGORY_META[cat] ?? { label: cat, color: "text-zinc-400" }),
    items: (automations ?? []).filter((a) => a.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <PageContainer>
      <PageHeader
        title="Automations"
        description="Toggle automations on and off. Each runs automatically on schedule."
      />

      {isLoading ? (
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : error ? (
        <Card variant="surface">
          <CardContent>
            <EmptyState iconType="error" title="Failed to load automations" description={error.message} />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {grouped.map((group) => (
            <div key={group.category}>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3 px-1">
                {group.label}
              </h2>
              <div className="space-y-2">
                {group.items.map((automation) => {
                  const Icon = ICON_MAP[automation.icon] ?? Bell;
                  const hasSettings = CONFIGURABLE_SETTINGS[automation.key] !== undefined;

                  return (
                    <div
                      key={automation.key}
                      className="flex items-center gap-4 p-4 rounded-xl border border-zinc-200 bg-white/50 hover:bg-zinc-100/30 transition-colors"
                    >
                      {/* Icon */}
                      <div
                        className={`flex-shrink-0 p-2 rounded-lg ${
                          automation.enabled
                            ? "bg-indigo-500/10 text-indigo-400"
                            : "bg-zinc-100 text-zinc-500"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-zinc-800">{automation.name}</p>
                          {automation.enabled && (
                            <Badge variant="success" dot>
                              Active
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-zinc-500 mt-0.5">{automation.description}</p>

                        {/* Last run info */}
                        {automation.lastRunAt && (
                          <div className="flex items-center gap-2 mt-1.5">
                            <Clock className="h-3 w-3 text-zinc-600" />
                            <span className="text-[11px] text-zinc-600">
                              Last run:{" "}
                              {new Date(automation.lastRunAt).toLocaleString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </span>
                            <RunStatusBadge status={automation.lastRunStatus} />
                            {automation.runCount > 0 && (
                              <span className="text-[11px] text-zinc-600">
                                ({automation.runCount} runs)
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Settings button (if configurable) */}
                        {hasSettings && (
                          <button
                            onClick={() => setSettingsModal({ key: automation.key, name: automation.name })}
                            className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
                            title="Settings"
                          >
                            <Settings2 className="h-4 w-4" />
                          </button>
                        )}

                        {/* Run Now button */}
                        <button
                          onClick={() => runNowMutation.mutate({ key: automation.key })}
                          disabled={runNowMutation.isPending}
                          className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-600 hover:bg-zinc-100 transition-colors disabled:opacity-40"
                          title="Run Now"
                        >
                          <Play className="h-4 w-4" />
                        </button>

                        {/* Toggle */}
                        <button
                          onClick={() =>
                            toggleMutation.mutate({
                              key: automation.key,
                              enabled: !automation.enabled,
                            })
                          }
                          disabled={toggleMutation.isPending}
                          className={`relative w-10 h-5 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-zinc-950 ${
                            automation.enabled ? "bg-indigo-500" : "bg-zinc-200"
                          }`}
                          role="switch"
                          aria-checked={automation.enabled}
                          title={automation.enabled ? "Disable" : "Enable"}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
                              automation.enabled ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Settings Modal */}
      {settingsModal && (
        <SettingsModal
          automationKey={settingsModal.key}
          automationName={settingsModal.name}
          onClose={() => setSettingsModal(null)}
        />
      )}
    </PageContainer>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CreditCard,
  DollarSign,
  Bell,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { PageContainer, PageHeader, Button, Badge, useToast } from "@/components/ui";

export const dynamic = "force-dynamic";

function SectionCard({ title, description, icon: Icon, children }: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-zinc-800 rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-zinc-800/50 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-indigo-500/10">
          <Icon className="h-4 w-4 text-indigo-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
          <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function Toggle({ enabled, onToggle, disabled }: { enabled: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        enabled ? "bg-indigo-500" : "bg-zinc-700"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export default function PaymentSettingsPage() {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const { data: feeConfig, isLoading: feeLoading } = trpc.stripe.getFeeConfig.useQuery();
  const { data: paymentSettings, isLoading: settingsLoading } = trpc.payment.getPaymentSettings.useQuery();

  const [feeMode, setFeeMode] = useState<"absorb" | "pass_through">("absorb");
  const [feeModeInitialized, setFeeModeInitialized] = useState(false);

  // Initialize fee mode from server data
  if (feeConfig && !feeModeInitialized) {
    setFeeMode(feeConfig.feeMode as "absorb" | "pass_through");
    setFeeModeInitialized(true);
  }

  const [reminderForm, setReminderForm] = useState({
    enabled: false,
    daysBefore: 3,
    dayOf: true,
    daysAfter: [1, 7],
  });
  const [lateFeeForm, setLateFeeForm] = useState({
    enabled: false,
    type: "flat" as "flat" | "percentage",
    amount: "25",
    percentage: "5",
    gracePeriodDays: 5,
  });
  const [settingsInitialized, setSettingsInitialized] = useState(false);

  if (paymentSettings && !settingsInitialized) {
    setReminderForm({
      enabled: paymentSettings.reminders.enabled,
      daysBefore: paymentSettings.reminders.daysBefore,
      dayOf: paymentSettings.reminders.dayOf,
      daysAfter: paymentSettings.reminders.daysAfter,
    });
    setLateFeeForm({
      enabled: paymentSettings.lateFees.enabled,
      type: paymentSettings.lateFees.type,
      amount: paymentSettings.lateFees.amount,
      percentage: paymentSettings.lateFees.percentage,
      gracePeriodDays: paymentSettings.lateFees.gracePeriodDays,
    });
    setSettingsInitialized(true);
  }

  const updateFeeConfig = trpc.stripe.updateFeeConfig.useMutation({
    onSuccess: () => {
      toast("success", "Fee configuration updated");
      utils.stripe.getFeeConfig.invalidate();
    },
    onError: (err) => toast("error", "Failed to update fees", err.message),
  });

  const updatePaymentSettings = trpc.payment.updatePaymentSettings.useMutation({
    onSuccess: () => {
      toast("success", "Payment settings saved");
      utils.payment.getPaymentSettings.invalidate();
    },
    onError: (err) => toast("error", "Failed to save settings", err.message),
  });

  const createAccountLink = trpc.stripe.createAccountLink.useMutation({
    onSuccess: (data) => {
      // Redirect to Stripe onboarding (same tab so return URL works)
      window.location.href = data.url;
    },
    onError: (err) => toast("error", "Failed to open Stripe onboarding", err.message),
  });

  const createConnectedAccount = trpc.stripe.createConnectedAccount.useMutation({
    onSuccess: () => {
      // Immediately redirect to Stripe onboarding after account creation
      createAccountLink.mutate();
    },
    onError: (err) => toast("error", "Failed to create Stripe account", err.message),
  });

  const isLoading = feeLoading || settingsLoading;

  const stripeConnected = feeConfig?.connected ?? false;
  const chargesEnabled = feeConfig?.chargesEnabled ?? false;

  return (
    <PageContainer>
      <PageHeader
        title="Payment Settings"
        actions={
          <Link href="/settings">
            <Button variant="ghost" size="sm" icon={<ArrowLeft className="h-4 w-4" />}>
              Back to Settings
            </Button>
          </Link>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stripe Connect */}
          <SectionCard
            title="Online Payments"
            description="Accept card and bank payments from residents"
            icon={CreditCard}
          >
            {!stripeConnected ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 rounded-lg bg-zinc-800/40 border border-zinc-800">
                  <XCircle className="h-5 w-5 text-zinc-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-zinc-200">Stripe not connected</p>
                    <p className="text-xs text-zinc-500 mt-1">
                      Connect a Stripe account to accept card and ACH payments from residents.
                      Supports Apple Pay and Google Pay automatically.
                    </p>
                  </div>
                </div>
                <Button
                  variant="primary"
                  onClick={() => createConnectedAccount.mutate()}
                  disabled={createConnectedAccount.isPending || createAccountLink.isPending}
                >
                  {createConnectedAccount.isPending || createAccountLink.isPending
                    ? "Redirecting to Stripe..."
                    : "Connect Stripe Account"}
                </Button>
              </div>
            ) : !chargesEnabled ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
                  <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-zinc-200">Onboarding incomplete</p>
                    <p className="text-xs text-zinc-500 mt-1">
                      Your Stripe account is created but you need to complete verification before you can accept payments.
                    </p>
                  </div>
                </div>
                <Button
                  variant="primary"
                  onClick={() => createAccountLink.mutate()}
                  disabled={createAccountLink.isPending}
                >
                  {createAccountLink.isPending ? "Redirecting..." : "Complete Stripe Setup"}
                  <ExternalLink className="h-4 w-4 ml-1" />
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 rounded-lg bg-green-500/5 border border-green-500/20">
                  <CheckCircle2 className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-zinc-200">Stripe connected</p>
                    <p className="text-xs text-zinc-500 mt-1">
                      You can accept card, ACH, Apple Pay, and Google Pay payments from residents.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="success" size="sm">Active</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => createAccountLink.mutate()}
                  >
                    Manage Stripe Account
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </SectionCard>

          {/* Fee Configuration */}
          <SectionCard
            title="Processing Fees"
            description="Choose who pays Stripe processing fees"
            icon={DollarSign}
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFeeMode("absorb")}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    feeMode === "absorb"
                      ? "border-indigo-500 bg-indigo-500/5"
                      : "border-zinc-800 bg-zinc-800/20 hover:border-zinc-700"
                  }`}
                >
                  <p className="text-sm font-medium text-zinc-200">You absorb fees</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    You pay ~2.9% + $0.30 per transaction. Residents see no extra charge.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setFeeMode("pass_through")}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    feeMode === "pass_through"
                      ? "border-indigo-500 bg-indigo-500/5"
                      : "border-zinc-800 bg-zinc-800/20 hover:border-zinc-700"
                  }`}
                >
                  <p className="text-sm font-medium text-zinc-200">Convenience fee</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Residents pay a small processing fee. Your payout is the full amount.
                  </p>
                </button>
              </div>
              <div className="flex justify-end">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => updateFeeConfig.mutate({ feeMode })}
                  disabled={updateFeeConfig.isPending || feeMode === feeConfig?.feeMode}
                >
                  {updateFeeConfig.isPending ? "Saving..." : "Save Fee Settings"}
                </Button>
              </div>
            </div>
          </SectionCard>

          {/* Payment Reminders */}
          <SectionCard
            title="Payment Reminders"
            description="Automatic reminders sent to residents via in-app messages"
            icon={Bell}
          >
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-200">Enable reminders</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Residents get in-app reminders about upcoming and overdue rent</p>
                </div>
                <Toggle
                  enabled={reminderForm.enabled}
                  onToggle={() => setReminderForm({ ...reminderForm, enabled: !reminderForm.enabled })}
                />
              </div>

              {reminderForm.enabled && (
                <div className="space-y-4 pl-0">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Days before due date</label>
                    <input
                      type="number"
                      min={0}
                      max={30}
                      value={reminderForm.daysBefore}
                      onChange={(e) => setReminderForm({ ...reminderForm, daysBefore: parseInt(e.target.value) || 0 })}
                      className="w-24 h-9 px-3 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-zinc-300">Remind on due date</p>
                    <Toggle
                      enabled={reminderForm.dayOf}
                      onToggle={() => setReminderForm({ ...reminderForm, dayOf: !reminderForm.dayOf })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                      Days after due date (overdue reminders)
                    </label>
                    <div className="flex items-center gap-2">
                      {reminderForm.daysAfter.map((day, i) => (
                        <div key={i} className="flex items-center gap-1">
                          <input
                            type="number"
                            min={1}
                            max={90}
                            value={day}
                            onChange={(e) => {
                              const updated = [...reminderForm.daysAfter];
                              updated[i] = parseInt(e.target.value) || 1;
                              setReminderForm({ ...reminderForm, daysAfter: updated });
                            }}
                            className="w-16 h-9 px-2 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-center"
                          />
                          <button
                            type="button"
                            onClick={() => setReminderForm({ ...reminderForm, daysAfter: reminderForm.daysAfter.filter((_, j) => j !== i) })}
                            className="text-zinc-600 hover:text-red-400 text-sm"
                          >
                            x
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setReminderForm({ ...reminderForm, daysAfter: [...reminderForm.daysAfter, 14] })}
                        className="h-9 px-3 text-xs font-medium border border-zinc-800 border-dashed rounded-lg text-zinc-500 hover:text-zinc-300 hover:border-zinc-700"
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-800/30 border border-zinc-800/50">
                    <p className="text-xs text-zinc-500">
                      Preview: Residents will be reminded{" "}
                      <span className="text-zinc-300">{reminderForm.daysBefore} days before</span>
                      {reminderForm.dayOf && <>, <span className="text-zinc-300">on the due date</span></>}
                      {reminderForm.daysAfter.length > 0 && (
                        <>, and <span className="text-zinc-300">{reminderForm.daysAfter.join(", ")} days after</span> if unpaid</>
                      )}.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() =>
                    updatePaymentSettings.mutate({
                      reminders: reminderForm,
                      lateFees: lateFeeForm,
                    })
                  }
                  disabled={updatePaymentSettings.isPending}
                >
                  {updatePaymentSettings.isPending ? "Saving..." : "Save Reminder Settings"}
                </Button>
              </div>
            </div>
          </SectionCard>

          {/* Late Fees */}
          <SectionCard
            title="Late Fees"
            description="Automatically apply fees to overdue invoices"
            icon={AlertTriangle}
          >
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-200">Enable late fees</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Fees are applied automatically after the grace period</p>
                </div>
                <Toggle
                  enabled={lateFeeForm.enabled}
                  onToggle={() => setLateFeeForm({ ...lateFeeForm, enabled: !lateFeeForm.enabled })}
                />
              </div>

              {lateFeeForm.enabled && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Fee type</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setLateFeeForm({ ...lateFeeForm, type: "flat" })}
                        className={`p-3 rounded-lg border text-left text-sm transition-all ${
                          lateFeeForm.type === "flat"
                            ? "border-indigo-500 bg-indigo-500/5 text-zinc-200"
                            : "border-zinc-800 text-zinc-400 hover:border-zinc-700"
                        }`}
                      >
                        Flat fee (e.g. $25)
                      </button>
                      <button
                        type="button"
                        onClick={() => setLateFeeForm({ ...lateFeeForm, type: "percentage" })}
                        className={`p-3 rounded-lg border text-left text-sm transition-all ${
                          lateFeeForm.type === "percentage"
                            ? "border-indigo-500 bg-indigo-500/5 text-zinc-200"
                            : "border-zinc-800 text-zinc-400 hover:border-zinc-700"
                        }`}
                      >
                        Percentage (e.g. 5%)
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {lateFeeForm.type === "flat" ? (
                      <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1.5">Fee amount</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={lateFeeForm.amount}
                            onChange={(e) => setLateFeeForm({ ...lateFeeForm, amount: e.target.value })}
                            className="w-full h-9 pl-7 pr-3 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1.5">Fee percentage</label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            value={lateFeeForm.percentage}
                            onChange={(e) => setLateFeeForm({ ...lateFeeForm, percentage: e.target.value })}
                            className="w-full h-9 px-3 pr-7 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">%</span>
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1.5">Grace period (days)</label>
                      <input
                        type="number"
                        min={0}
                        max={30}
                        value={lateFeeForm.gracePeriodDays}
                        onChange={(e) => setLateFeeForm({ ...lateFeeForm, gracePeriodDays: parseInt(e.target.value) || 0 })}
                        className="w-full h-9 px-3 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-800/30 border border-zinc-800/50">
                    <p className="text-xs text-zinc-500">
                      Preview: A{" "}
                      <span className="text-zinc-300">
                        {lateFeeForm.type === "flat" ? `$${lateFeeForm.amount}` : `${lateFeeForm.percentage}%`} late fee
                      </span>{" "}
                      will be applied to overdue invoices after a{" "}
                      <span className="text-zinc-300">{lateFeeForm.gracePeriodDays}-day grace period</span>.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() =>
                    updatePaymentSettings.mutate({
                      reminders: reminderForm,
                      lateFees: lateFeeForm,
                    })
                  }
                  disabled={updatePaymentSettings.isPending}
                >
                  {updatePaymentSettings.isPending ? "Saving..." : "Save Late Fee Settings"}
                </Button>
              </div>
            </div>
          </SectionCard>
        </div>
      )}
    </PageContainer>
  );
}

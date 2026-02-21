"use client";

import { useState, FormEvent } from "react";
import {
  Plus,
  Edit,
  XCircle,
  DollarSign,
  Calendar,
  Home,
  Loader2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/components/ui";
import {
  PageContainer,
  PageHeader,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  EmptyState,
  ErrorState,
} from "@/components/ui";
import { SkeletonCard } from "@/components/ui";

export const dynamic = "force-dynamic";

const paymentTypeLabels: Record<string, string> = {
  rent: "Rent",
  security_deposit: "Security Deposit",
  program_fee: "Program Fee",
  service_fee: "Service Fee",
  damage: "Damage",
  late_fee: "Late Fee",
  other: "Other",
};

const paymentTypeBadge: Record<string, "info" | "success" | "default" | "warning" | "error"> = {
  rent: "info",
  security_deposit: "success",
  program_fee: "default",
  service_fee: "default",
  damage: "warning",
  late_fee: "error",
  other: "default",
};

const frequencyLabels: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

function formatCurrency(amount: string | number) {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export default function RatesPage() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [rateForm, setRateForm] = useState({
    propertyId: "",
    houseId: "",
    paymentType: "",
    rateName: "",
    amount: "",
    billingFrequency: "",
    effectiveFrom: new Date().toISOString().split("T")[0],
  });

  const { data: rates, isLoading, error } = trpc.rate.list.useQuery({ activeOnly: !showInactive });
  const { data: propertyList } = trpc.property.list.useQuery();
  const { data: housesForProperty } = trpc.property.listHouses.useQuery(
    { propertyId: rateForm.propertyId },
    { enabled: !!rateForm.propertyId }
  );

  const createRate = trpc.rate.create.useMutation({
    onSuccess: () => {
      toast("success", "Rate created successfully");
      utils.rate.list.invalidate();
      setRateForm({ propertyId: "", houseId: "", paymentType: "", rateName: "", amount: "", billingFrequency: "", effectiveFrom: new Date().toISOString().split("T")[0] });
      setShowAddForm(false);
    },
    onError: (err) => {
      toast("error", err.message);
    },
  });

  const deactivateRate = trpc.rate.deactivate.useMutation({
    onSuccess: () => {
      toast("success", "Rate deactivated");
      utils.rate.list.invalidate();
    },
    onError: (err) => {
      toast("error", err.message);
    },
  });

  const handleCreateRate = (e: FormEvent) => {
    e.preventDefault();
    createRate.mutate({
      houseId: rateForm.houseId || undefined,
      paymentType: rateForm.paymentType as "rent" | "security_deposit" | "program_fee" | "service_fee" | "damage" | "late_fee" | "other",
      rateName: rateForm.rateName,
      amount: rateForm.amount,
      billingFrequency: rateForm.billingFrequency as "daily" | "weekly" | "monthly",
      effectiveFrom: rateForm.effectiveFrom,
    });
  };

  const allRates = rates ?? [];
  const properties = propertyList ?? [];

  // Group rates by house
  const houseMap = new Map<string, { name: string; rates: typeof allRates }>();
  for (const rate of allRates) {
    const houseName = rate.house?.name ?? "Organization-Wide";
    const houseId = rate.house_id ?? "org-wide";
    if (!houseMap.has(houseId)) {
      houseMap.set(houseId, { name: houseName, rates: [] });
    }
    houseMap.get(houseId)!.rates.push(rate);
  }
  const groupedRates = Array.from(houseMap.entries()).map(([id, data]) => ({
    id,
    house: data.name,
    rates: data.rates,
  }));

  if (error) {
    return (
      <PageContainer>
        <Card><CardContent><ErrorState title="Failed to load rates" description={error.message} /></CardContent></Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Rate Configuration"
        description="Manage pricing for all houses and services"
        actions={
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-zinc-500 cursor-pointer">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded border-zinc-700 text-indigo-400 focus:ring-indigo-500"
              />
              Show inactive
            </label>
            <Button
              variant="primary"
              icon={<Plus className="h-4 w-4" />}
              onClick={() => setShowAddForm(!showAddForm)}
            >
              Add Rate
            </Button>
          </div>
        }
      />

      {/* Add Rate Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Rate</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <form onSubmit={handleCreateRate}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                    Property
                  </label>
                  <select
                    className="w-full h-12 px-4 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none"
                    value={rateForm.propertyId}
                    onChange={(e) => setRateForm({ ...rateForm, propertyId: e.target.value, houseId: "" })}
                  >
                    <option value="">Organization-wide</option>
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                    House
                  </label>
                  <select
                    className="w-full h-12 px-4 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none"
                    value={rateForm.houseId}
                    onChange={(e) => setRateForm({ ...rateForm, houseId: e.target.value })}
                    disabled={!rateForm.propertyId}
                  >
                    <option value="">All houses</option>
                    {(housesForProperty ?? []).map((h) => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                    Payment Type <span className="text-red-400">*</span>
                  </label>
                  <select
                    className="w-full h-12 px-4 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none"
                    required
                    value={rateForm.paymentType}
                    onChange={(e) => setRateForm({ ...rateForm, paymentType: e.target.value })}
                  >
                    <option value="">Select type...</option>
                    {Object.entries(paymentTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                    Rate Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Weekly Rent"
                    required
                    className="w-full h-12 px-4 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    value={rateForm.rateName}
                    onChange={(e) => setRateForm({ ...rateForm, rateName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                    Amount <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      required
                      className="w-full h-12 pl-8 pr-4 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      value={rateForm.amount}
                      onChange={(e) => setRateForm({ ...rateForm, amount: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                    Billing Frequency <span className="text-red-400">*</span>
                  </label>
                  <select
                    className="w-full h-12 px-4 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none"
                    required
                    value={rateForm.billingFrequency}
                    onChange={(e) => setRateForm({ ...rateForm, billingFrequency: e.target.value })}
                  >
                    <option value="">Select frequency...</option>
                    {Object.entries(frequencyLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                    Effective From <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full h-12 px-4 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    value={rateForm.effectiveFrom}
                    onChange={(e) => setRateForm({ ...rateForm, effectiveFrom: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button variant="secondary" type="button" onClick={() => setShowAddForm(false)}>Cancel</Button>
                <Button variant="primary" type="submit" disabled={createRate.isPending}>
                  {createRate.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : "Save Rate"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {/* Empty */}
      {!isLoading && groupedRates.length === 0 && (
        <Card>
          <CardContent>
            <EmptyState
              iconType="inbox"
              title="No rates configured"
              description="Add your first rate to start billing residents."
              action={{ label: "Add Rate", onClick: () => setShowAddForm(true) }}
            />
          </CardContent>
        </Card>
      )}

      {/* Rate Groups */}
      {!isLoading && groupedRates.map((group) => (
        <Card key={group.id}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Home className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <CardTitle>{group.house}</CardTitle>
                <p className="text-sm text-zinc-500">
                  {group.rates.filter((r) => r.is_active).length} active rate{group.rates.filter((r) => r.is_active).length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {group.rates.map((rate) => (
                <div
                  key={rate.id}
                  className={`border rounded-xl p-5 transition-all ${
                    rate.is_active
                      ? "border-zinc-800 bg-zinc-900 hover:border-zinc-700 hover:shadow-sm"
                      : "border-zinc-800/50 bg-zinc-800/40 opacity-60"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-zinc-100 mb-1.5">{rate.rate_name}</h3>
                      <Badge variant={paymentTypeBadge[rate.payment_type] ?? "default"}>
                        {paymentTypeLabels[rate.payment_type] ?? rate.payment_type}
                      </Badge>
                    </div>
                    {!rate.is_active && <Badge variant="default">Inactive</Badge>}
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl font-bold text-zinc-100">{formatCurrency(rate.amount)}</p>
                      <p className="text-xs text-zinc-500">
                        / {frequencyLabels[rate.billing_frequency]?.toLowerCase() ?? rate.billing_frequency}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                      <Calendar className="h-3 w-3" />
                      <span>From {new Date(rate.effective_from).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                    </div>
                    {rate.effective_until && (
                      <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                        <Calendar className="h-3 w-3" />
                        <span>Until {new Date(rate.effective_until).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-3 border-t border-zinc-800/50">
                    <Button variant="ghost" size="sm" icon={<Edit className="h-3 w-3" />} className="flex-1">
                      Edit
                    </Button>
                    {rate.is_active && (
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<XCircle className="h-3 w-3" />}
                        className="flex-1 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        onClick={() => deactivateRate.mutate({ id: rate.id })}
                        disabled={deactivateRate.isPending}
                      >
                        Deactivate
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </PageContainer>
  );
}

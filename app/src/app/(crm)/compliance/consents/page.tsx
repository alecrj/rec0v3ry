"use client";

import { useState } from "react";
import { Plus, Search, Download, FileText, Shield, RefreshCw } from "lucide-react";
import { ConsentStatusBadge, type ConsentStatus } from "@/components/compliance/consent-status-badge";
import { ConsentWizard } from "@/components/compliance/consent-wizard";
import { trpc } from "@/lib/trpc";
import {
  PageContainer,
  PageHeader,
  StatCard,
  StatCardGrid,
  Card,
  CardContent,
  Button,
  EmptyState,
  NoResultsState,
  SkeletonTable,
  useToast,
} from "@/components/ui";

export const dynamic = "force-dynamic";

export default function ConsentsPage() {
  const { toast } = useToast();
  const [showWizard, setShowWizard] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<ConsentStatus | "all">("all");

  const utils = trpc.useUtils();
  const { data, isLoading, error } = trpc.consent.list.useQuery({
    status: statusFilter === "all" ? undefined : statusFilter,
    limit: 50,
  });

  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [renewId, setRenewId] = useState<string | null>(null);
  const [renewDate, setRenewDate] = useState("");

  const revokeConsent = trpc.consent.revoke.useMutation({
    onSuccess: () => {
      toast("success", "Consent revoked");
      setRevokeId(null);
      utils.consent.list.invalidate();
    },
    onError: (err) => toast("error", "Failed to revoke consent", err.message),
  });

  const renewConsent = trpc.consent.renew.useMutation({
    onSuccess: () => {
      toast("success", "Consent renewed successfully");
      setRenewId(null);
      setRenewDate("");
      utils.consent.list.invalidate();
    },
    onError: (err) => toast("error", "Failed to renew consent", err.message),
  });

  const consents = data?.items || [];

  const stats = {
    total: consents.length,
    active: consents.filter((c) => c.status === "active").length,
    expired: consents.filter((c) => c.status === "expired").length,
    revoked: consents.filter((c) => c.status === "revoked").length,
  };

  const filteredConsents = consents.filter((consent) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    const residentName = consent.recipient_name?.toLowerCase() || "";
    const consentType = consent.consent_type?.toLowerCase() || "";
    return residentName.includes(search) || consentType.includes(search);
  });

  if (showWizard) {
    return (
      <PageContainer>
        <ConsentWizard
          onComplete={() => {
            setShowWizard(false);
            utils.consent.list.invalidate();
          }}
          onCancel={() => setShowWizard(false)}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="42 CFR Part 2 Consents"
        description="Manage patient consent forms for substance use disorder information disclosure"
        actions={
          <Button
            variant="primary"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => setShowWizard(true)}
          >
            New Consent
          </Button>
        }
      />

      {/* Regulatory Notice */}
      <Card variant="outlined" className="border-amber-500/30 bg-amber-500/10">
        <CardContent>
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-amber-300">
                Important: 42 CFR Part 2 Final Rule (Effective Feb 16, 2026)
              </h3>
              <p className="text-sm text-amber-300 mt-1">
                All consent forms must comply with updated requirements including
                specific disclosure recipients, clear purpose statements, and
                standardized revocation procedures. RecoveryOS consent forms are
                designed to meet these requirements.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card variant="outlined" className="border-red-500/30 bg-red-500/10">
          <CardContent>
            <p className="text-sm font-medium text-red-300">Error loading consents</p>
            <p className="text-sm text-red-300 mt-1">{error.message}</p>
          </CardContent>
        </Card>
      )}

      <StatCardGrid columns={4}>
        <StatCard
          title="Total Consents"
          value={isLoading ? "—" : String(stats.total)}
          icon={<FileText className="h-5 w-5" />}
          loading={isLoading}
        />
        <StatCard
          title="Active"
          value={isLoading ? "—" : String(stats.active)}
          variant="success"
          icon={<FileText className="h-5 w-5" />}
          loading={isLoading}
        />
        <StatCard
          title="Expired"
          value={isLoading ? "—" : String(stats.expired)}
          variant="warning"
          icon={<FileText className="h-5 w-5" />}
          loading={isLoading}
        />
        <StatCard
          title="Revoked"
          value={isLoading ? "—" : String(stats.revoked)}
          variant="error"
          icon={<FileText className="h-5 w-5" />}
          loading={isLoading}
        />
      </StatCardGrid>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="px-4 pt-4 pb-0">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search by resident name or consent type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ConsentStatus | "all")}
              className="h-10 px-3 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="expired">Expired</option>
              <option value="revoked">Revoked</option>
            </select>
            <Button variant="secondary" icon={<Download className="h-4 w-4" />}>
              Export
            </Button>
          </div>
        </div>

        <div className="mt-4">
          {isLoading ? (
            <div className="px-4 pb-4"><SkeletonTable rows={6} columns={6} /></div>
          ) : filteredConsents.length === 0 ? (
            <CardContent>
              {searchTerm ? (
                <NoResultsState searchTerm={searchTerm} onClear={() => setSearchTerm("")} />
              ) : (
                <EmptyState
                  iconType="document"
                  title="No consents found"
                  description="Create a new consent to get started."
                  action={{ label: "New Consent", onClick: () => setShowWizard(true) }}
                />
              )}
            </CardContent>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-y border-zinc-800/50 bg-zinc-800/50">
                      <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Resident Name</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Consent Type</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Status</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Expiration</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Created</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredConsents.map((consent) => (
                      <tr key={consent.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/50 transition-colors">
                        <td className="py-3 px-4 text-sm font-medium text-zinc-100">
                          {consent.recipient_name || "—"}
                        </td>
                        <td className="py-3 px-4 text-sm text-zinc-400">
                          {consent.consent_type.replace(/_/g, " ")}
                        </td>
                        <td className="py-3 px-4">
                          <ConsentStatusBadge status={consent.status as ConsentStatus} />
                        </td>
                        <td className="py-3 px-4 text-sm text-zinc-400">
                          {consent.expires_at
                            ? new Date(consent.expires_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                            : "No expiration"}
                        </td>
                        <td className="py-3 px-4 text-sm text-zinc-400">
                          {consent.created_at
                            ? new Date(consent.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                            : "—"}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" className="text-indigo-400">View</Button>
                            {consent.status === "active" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-zinc-400"
                                onClick={() => setRevokeId(consent.id)}
                                disabled={revokeConsent.isPending}
                              >
                                Revoke
                              </Button>
                            )}
                            {consent.status === "expired" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-indigo-400"
                                icon={<RefreshCw className="h-3 w-3" />}
                                onClick={() => {
                                  setRenewId(consent.id);
                                  setRenewDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16));
                                }}
                              >
                                Renew
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-zinc-800/50 bg-zinc-800/50">
                <p className="text-sm text-zinc-500">
                  Showing {filteredConsents.length} consent{filteredConsents.length !== 1 ? "s" : ""}
                </p>
              </div>
            </>
          )}
        </div>
      </Card>
      {/* Revoke Confirmation Modal */}
      {revokeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-zinc-100">Revoke Consent</h3>
            <p className="text-sm text-zinc-400 mt-2">
              Are you sure you want to revoke this consent? This action cannot be undone.
              Per 42 CFR 2.31(b), revocation does not apply retroactively.
            </p>
            <div className="flex items-center justify-end gap-3 mt-6">
              <Button variant="secondary" onClick={() => setRevokeId(null)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={() => revokeConsent.mutate({ id: revokeId })}
                disabled={revokeConsent.isPending}
              >
                {revokeConsent.isPending ? "Revoking..." : "Confirm Revoke"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Renew Modal */}
      {renewId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-zinc-100">Renew Consent</h3>
            <p className="text-sm text-zinc-400 mt-2">
              This will create a new active consent with the same terms as the expired one.
            </p>
            <div className="mt-4">
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                New Expiration Date
              </label>
              <input
                type="datetime-local"
                value={renewDate}
                onChange={(e) => setRenewDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <Button variant="secondary" onClick={() => { setRenewId(null); setRenewDate(""); }}>
                Cancel
              </Button>
              <Button
                variant="primary"
                icon={<RefreshCw className="h-4 w-4" />}
                onClick={() => {
                  if (!renewDate) return;
                  renewConsent.mutate({
                    id: renewId,
                    newExpirationDate: new Date(renewDate).toISOString(),
                  });
                }}
                disabled={renewConsent.isPending || !renewDate}
              >
                {renewConsent.isPending ? "Renewing..." : "Renew Consent"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

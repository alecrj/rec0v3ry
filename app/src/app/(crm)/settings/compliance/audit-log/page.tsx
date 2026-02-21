"use client";

import { useState } from "react";
import { Download, CheckCircle2, XCircle, Shield } from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  PageContainer,
  PageHeader,
  Card,
  CardContent,
  Button,
  Badge,
  EmptyState,
  ErrorState,
  SkeletonTable,
} from "@/components/ui";

export const dynamic = "force-dynamic";

type SensitivityLevel = "public" | "internal" | "confidential" | "part2_protected";

const sensitivityConfig: Record<string, { variant: "error" | "warning" | "info" | "default"; label: string }> = {
  part2_protected: { variant: "error", label: "42 CFR Part 2" },
  confidential: { variant: "warning", label: "Confidential" },
  internal: { variant: "info", label: "Internal" },
  public: { variant: "default", label: "Public" },
};

export default function AuditLogPage() {
  const [selectedSensitivity, setSelectedSensitivity] = useState<SensitivityLevel | "">("");
  const [selectedResourceType, setSelectedResourceType] = useState("");
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);

  const { data, isLoading, error } = trpc.audit.query.useQuery({
    dateFrom: `${dateFrom}T00:00:00Z`,
    dateTo: `${dateTo}T23:59:59Z`,
    sensitivityLevel: selectedSensitivity || undefined,
    resourceType: selectedResourceType || undefined,
    limit: 50,
  });

  const { data: chainVerification, isLoading: verifyingChain } = trpc.audit.verifyChain.useQuery({
    dateFrom: `${dateFrom}T00:00:00Z`,
    dateTo: `${dateTo}T23:59:59Z`,
  });

  const entries = data?.items || [];

  const formatActorName = (entry: (typeof entries)[0]) => {
    if (entry.actorUser) {
      return `${entry.actorUser.first_name} ${entry.actorUser.last_name}`;
    }
    if (entry.actorResident) {
      return `${entry.actorResident.first_name} ${entry.actorResident.last_name} (Resident)`;
    }
    return entry.actor_type || "System";
  };

  return (
    <PageContainer>
      <PageHeader
        title="Audit Log"
        description="Tamper-evident audit trail for all system activities"
        actions={
          <div className="flex items-center gap-3">
            {verifyingChain ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-zinc-800/40 border border-zinc-800 rounded-lg">
                <div className="h-4 w-4 border-2 border-zinc-700 border-t-indigo-400 rounded-full animate-spin" />
                <span className="text-sm font-medium text-zinc-400">Verifying...</span>
              </div>
            ) : chainVerification?.valid ? (
              <Badge variant="success" dot>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Chain Verified
                </span>
              </Badge>
            ) : chainVerification ? (
              <Badge variant="error" dot>
                <span className="flex items-center gap-1.5">
                  <XCircle className="h-3.5 w-3.5" />
                  Chain Broken
                </span>
              </Badge>
            ) : null}
            <Button variant="secondary" icon={<Download className="h-4 w-4" />}>
              Export
            </Button>
          </div>
        }
      />

      {/* Info Banner */}
      <Card variant="outlined" className="border-indigo-500/30 bg-indigo-500/10">
        <CardContent>
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-indigo-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-indigo-200">
              All audit events are cryptographically signed and chained to ensure integrity. Any
              tampering or deletion will be immediately detected. Logs are retained for 7 years per
              HIPAA requirements.
            </p>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card><CardContent><ErrorState title="Error loading audit logs" description={error.message} /></CardContent></Card>
      )}

      {/* Filters + Table */}
      <Card className="overflow-hidden">
        <div className="px-4 pt-4 pb-0">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
                Date Range
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="flex-1 h-10 px-3 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="flex-1 h-10 px-3 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
                Resource Type
              </label>
              <select
                value={selectedResourceType}
                onChange={(e) => setSelectedResourceType(e.target.value)}
                className="w-full h-10 px-3 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="">All Resources</option>
                <option value="consent">Consent</option>
                <option value="resident">Resident</option>
                <option value="disclosure">Disclosure</option>
                <option value="user">User</option>
                <option value="invoice">Invoice</option>
                <option value="payment">Payment</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
                Sensitivity
              </label>
              <select
                value={selectedSensitivity}
                onChange={(e) => setSelectedSensitivity(e.target.value as SensitivityLevel | "")}
                className="w-full h-10 px-3 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="">All Levels</option>
                <option value="part2_protected">42 CFR Part 2</option>
                <option value="confidential">Confidential</option>
                <option value="internal">Internal</option>
                <option value="public">Public</option>
              </select>
            </div>
            <div className="flex items-end pb-1">
              <p className="text-sm text-zinc-500">
                {isLoading ? "Loading..." : `${entries.length} entries`}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4">
          {isLoading ? (
            <div className="px-4 pb-4"><SkeletonTable rows={8} columns={6} /></div>
          ) : entries.length === 0 ? (
            <div className="px-4 pb-4">
              <EmptyState
                iconType="document"
                title="No audit logs found"
                description="Try adjusting your date range or filters."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-y border-zinc-800/50 bg-zinc-800/50">
                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Timestamp</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">User</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Action</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Resource</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Description</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Sensitivity</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => {
                    const sc = sensitivityConfig[entry.sensitivity_level] ?? sensitivityConfig.public;
                    return (
                      <tr key={entry.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/50 transition-colors">
                        <td className="py-3 px-4 text-sm text-zinc-400 whitespace-nowrap">
                          {new Date(entry.created_at).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-sm font-medium text-zinc-100">
                          {formatActorName(entry)}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm font-mono text-zinc-300">{entry.action}</span>
                        </td>
                        <td className="py-3 px-4 text-sm text-zinc-400">
                          {entry.resource_type}
                        </td>
                        <td className="py-3 px-4 text-sm text-zinc-400 max-w-xs truncate">
                          {entry.description || "—"}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={sc.variant}>{sc.label}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {data && entries.length > 0 && (
          <div className="px-4 py-3 border-t border-zinc-800/50 bg-zinc-800/50">
            <p className="text-sm text-zinc-500">
              Showing {entries.length} entries
              {data.nextCursor && " (more available)"}
            </p>
          </div>
        )}
      </Card>
    </PageContainer>
  );
}

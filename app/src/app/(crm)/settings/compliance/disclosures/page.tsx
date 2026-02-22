"use client";

import { useState } from "react";
import { FileText, Download, TrendingUp, Search, Shield } from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  PageContainer,
  PageHeader,
  StatCard,
  StatCardGrid,
  Card,
  CardContent,
  Button,
  Badge,
  EmptyState,
  ErrorState,
  SkeletonTable,
  useToast,
} from "@/components/ui";

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const dynamic = "force-dynamic";

const purposeLabels: Record<string, string> = {
  treatment: "Treatment Coordination",
  payment: "Payment/Billing",
  healthcare_operations: "Healthcare Operations",
  research: "Research",
  audit: "Audit",
  court_order: "Court Order",
  medical_emergency: "Medical Emergency",
  crime_on_premises: "Crime on Premises",
  other: "Other",
};

export default function DisclosuresPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPurpose, setSelectedPurpose] = useState("");

  const { data, isLoading, error } = trpc.disclosure.listAll.useQuery({
    purpose: selectedPurpose
      ? (selectedPurpose as "treatment" | "payment" | "healthcare_operations" | "research" | "audit" | "court_order" | "medical_emergency" | "crime_on_premises" | "other")
      : undefined,
    limit: 50,
  });

  const disclosures = data?.items ?? [];
  const totalCount = data?.total ?? 0;

  const filtered = searchTerm
    ? disclosures.filter((d) => {
        const term = searchTerm.toLowerCase();
        return (
          d.disclosed_to_name?.toLowerCase().includes(term) ||
          d.disclosed_to_organization?.toLowerCase().includes(term) ||
          d.disclosure_purpose?.toLowerCase().includes(term)
        );
      })
    : disclosures;

  const uniqueRecipients = new Set(filtered.map((d) => d.disclosed_to_name)).size;

  const purposeCounts = filtered.reduce((acc, d) => {
    const p = d.disclosure_purpose ?? "other";
    acc[p] = (acc[p] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const mostCommonPurpose = Object.entries(purposeCounts).sort((a, b) => b[1] - a[1])[0];

  if (error) {
    return (
      <PageContainer>
        <Card><CardContent><ErrorState title="Failed to load disclosures" description={error.message} /></CardContent></Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Disclosure Log"
        description="Track all disclosures of protected health information"
        actions={
          <Button variant="primary" icon={<FileText className="h-4 w-4" />}>
            Request Accounting
          </Button>
        }
      />

      {/* Regulatory Notice */}
      <Card variant="outlined" className="border-amber-500/30 bg-amber-500/10">
        <CardContent>
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-amber-600">
                Patient Rights: Accounting of Disclosures
              </h3>
              <p className="text-sm text-amber-600 mt-1">
                Under 42 CFR Part 2, patients have the right to request an accounting of all
                disclosures made without their consent. Use the &quot;Request Accounting&quot; button to
                generate a formal report for a specific patient.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <StatCardGrid columns={3}>
        <StatCard
          title="Total Disclosures"
          value={isLoading ? "—" : String(totalCount)}
          subtitle="All time"
          icon={<TrendingUp className="h-5 w-5" />}
          loading={isLoading}
        />
        <StatCard
          title="Unique Recipients"
          value={isLoading ? "—" : String(uniqueRecipients)}
          subtitle="In current results"
          variant="success"
          icon={<FileText className="h-5 w-5" />}
          loading={isLoading}
        />
        <StatCard
          title="Most Common Purpose"
          value={isLoading ? "—" : mostCommonPurpose ? purposeLabels[mostCommonPurpose[0]] ?? mostCommonPurpose[0] : "N/A"}
          subtitle={`${mostCommonPurpose?.[1] ?? 0} disclosures`}
          variant="info"
          icon={<FileText className="h-5 w-5" />}
          loading={isLoading}
        />
      </StatCardGrid>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="px-4 pt-4 pb-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search by recipient, organization..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-zinc-200 rounded-lg bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
              />
            </div>
            <select
              value={selectedPurpose}
              onChange={(e) => setSelectedPurpose(e.target.value)}
              className="h-10 px-3 text-sm border border-zinc-200 rounded-lg bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="">All Purposes</option>
              <option value="treatment">Treatment Coordination</option>
              <option value="payment">Payment/Billing</option>
              <option value="healthcare_operations">Healthcare Operations</option>
              <option value="court_order">Court Order</option>
              <option value="medical_emergency">Medical Emergency</option>
              <option value="research">Research</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          {isLoading ? (
            <div className="px-4 pb-4"><SkeletonTable rows={6} columns={6} /></div>
          ) : filtered.length === 0 ? (
            <CardContent>
              <EmptyState
                iconType="document"
                title="No disclosures found"
                description="Disclosure records will appear here as they are created."
              />
            </CardContent>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-y border-zinc-200/50 bg-zinc-100">
                      <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Date</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Recipient</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Organization</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Purpose</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Method</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Disclosed By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((disclosure) => (
                      <tr key={disclosure.id} className="border-b border-zinc-200/50 hover:bg-zinc-100 transition-colors">
                        <td className="py-3 px-4 text-sm text-zinc-400">
                          {disclosure.disclosed_at
                            ? new Date(disclosure.disclosed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                            : "—"}
                        </td>
                        <td className="py-3 px-4 text-sm font-medium text-zinc-800">
                          {disclosure.disclosed_to_name ?? "—"}
                        </td>
                        <td className="py-3 px-4 text-sm text-zinc-400">
                          {disclosure.disclosed_to_organization ?? "—"}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="default">
                            {purposeLabels[disclosure.disclosure_purpose ?? "other"] ?? disclosure.disclosure_purpose}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-zinc-400">
                          {disclosure.disclosure_method ?? "—"}
                        </td>
                        <td className="py-3 px-4 text-sm text-zinc-400">
                          {disclosure.discloser
                            ? `${disclosure.discloser.first_name} ${disclosure.discloser.last_name}`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-zinc-200/50 bg-zinc-100 flex items-center justify-between">
                <p className="text-sm text-zinc-500">
                  Showing {filtered.length} of {totalCount} disclosures
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Download className="h-3.5 w-3.5" />}
                  onClick={() => {
                    if (filtered.length === 0) {
                      toast("info", "Nothing to export");
                      return;
                    }
                    const REDISCLOSURE_NOTICE = "CONFIDENTIALITY NOTICE: This record is protected by federal confidentiality rules (42 CFR Part 2). The federal rules prohibit you from making any further disclosure of this record unless further disclosure is expressly permitted by the written consent of the individual to whom it pertains or is otherwise permitted by 42 CFR Part 2.";
                    const rows: string[][] = [
                      [REDISCLOSURE_NOTICE],
                      [],
                      ["Date", "Recipient", "Organization", "Purpose", "Method", "Disclosed By"],
                      ...filtered.map((d) => [
                        d.disclosed_at ? new Date(d.disclosed_at).toLocaleDateString() : "",
                        d.disclosed_to_name ?? "",
                        d.disclosed_to_organization ?? "",
                        purposeLabels[d.disclosure_purpose ?? "other"] ?? d.disclosure_purpose ?? "",
                        d.disclosure_method ?? "",
                        d.discloser ? `${d.discloser.first_name} ${d.discloser.last_name}` : "",
                      ]),
                    ];
                    const date = new Date().toISOString().split("T")[0];
                    downloadCsv(`disclosures-${date}.csv`, rows);
                    toast("success", "Disclosures exported", `${filtered.length} records exported with 42 CFR Part 2 redisclosure notice.`);
                  }}
                >
                  Export CSV
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>
    </PageContainer>
  );
}

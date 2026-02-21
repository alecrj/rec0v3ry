"use client";

import { useState } from "react";
import {
  Archive,
  AlertTriangle,
  Shield,
  Clock,
  FileText,
  Plus,
  Info,
  X,
  Pencil,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  PageContainer,
  PageHeader,
  StatCard,
  StatCardGrid,
  Button,
  Badge,
  EmptyState,
  SkeletonTable,
  useToast,
} from "@/components/ui";

export const dynamic = "force-dynamic";

const DOC_TYPES = [
  "intake_form", "resident_agreement", "house_rules", "consent_form",
  "release_of_info", "financial_agreement", "treatment_plan",
  "discharge_summary", "incident_report", "other",
] as const;

const typeLabels: Record<string, string> = {
  intake_form: "Intake Form",
  resident_agreement: "Resident Agreement",
  house_rules: "House Rules",
  consent_form: "Consent Form",
  release_of_info: "Release of Info",
  financial_agreement: "Financial Agreement",
  treatment_plan: "Treatment Plan",
  discharge_summary: "Discharge Summary",
  incident_report: "Incident Report",
  other: "Other",
};

const inputClass = "w-full h-10 px-3 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors";

const RETENTION_PRESETS = [
  { label: "3 years (operational)", value: "1095" },
  { label: "6 years (medical/Part 2)", value: "2190" },
  { label: "7 years (financial/IRS)", value: "2555" },
  { label: "10 years", value: "3650" },
  { label: "Indefinite", value: "indefinite" },
];

function retentionLabel(days: string): string {
  if (days === "indefinite") return "Indefinite";
  const d = parseInt(days, 10);
  if (isNaN(d)) return days;
  const years = Math.round(d / 365);
  return years >= 1 ? `${years} year${years > 1 ? "s" : ""}` : `${d} days`;
}

// ── Create/Edit Policy Modal ───────────────────────────────
function PolicyFormModal({
  isOpen,
  onClose,
  policy,
}: {
  isOpen: boolean;
  onClose: () => void;
  policy?: {
    id: string;
    name: string;
    document_type: string | null;
    retention_period_days: string;
    description: string | null;
    is_active: boolean;
  } | null;
}) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const isEdit = !!policy;

  const [name, setName] = useState(policy?.name ?? "");
  const [documentType, setDocumentType] = useState(policy?.document_type ?? "");
  const [retentionDays, setRetentionDays] = useState(policy?.retention_period_days ?? "2190");
  const [description, setDescription] = useState(policy?.description ?? "");

  const createMutation = trpc.document.retention.create.useMutation({
    onSuccess: () => {
      toast("success", "Retention policy created");
      utils.document.retention.list.invalidate();
      onClose();
    },
    onError: (err) => toast("error", "Failed to create policy", err.message),
  });

  const updateMutation = trpc.document.retention.update.useMutation({
    onSuccess: () => {
      toast("success", "Policy updated");
      utils.document.retention.list.invalidate();
      onClose();
    },
    onError: (err) => toast("error", "Failed to update policy", err.message),
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-zinc-900 rounded-2xl shadow-xl w-full max-w-lg mx-4 border border-zinc-800">
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-zinc-100">
              {isEdit ? "Edit Policy" : "New Retention Policy"}
            </h2>
            <p className="text-sm text-zinc-500 mt-1">
              {isEdit ? "Update retention policy details" : "Define document retention requirements"}
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-500 hover:text-zinc-300">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (isEdit && policy) {
              updateMutation.mutate({
                id: policy.id,
                name,
                retentionPeriodDays: retentionDays,
                description: description || undefined,
              });
            } else {
              createMutation.mutate({
                name,
                documentType: (documentType || undefined) as typeof DOC_TYPES[number] | undefined,
                retentionPeriodDays: retentionDays,
                description: description || undefined,
              });
            }
          }}
          className="p-6 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              Policy Name <span className="text-red-400">*</span>
            </label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              placeholder="e.g. Part 2 Consent Records"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Document Type</label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className={inputClass}
              >
                <option value="">All Types</option>
                {DOC_TYPES.map((t) => (
                  <option key={t} value={t}>{typeLabels[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Retention Period</label>
              <select
                value={retentionDays}
                onChange={(e) => setRetentionDays(e.target.value)}
                className={inputClass}
              >
                {RETENTION_PRESETS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-y"
              placeholder="Regulatory basis for this retention period..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!name || createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending)
                ? "Saving..."
                : (isEdit ? "Save Changes" : "Create Policy")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────
export default function RetentionDashboardPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<any>(null);

  const { data: policies, isLoading: policiesLoading } = trpc.document.retention.list.useQuery({
    activeOnly: false,
  });

  const { data: expiringDocs, isLoading: expiringLoading } = trpc.document.retention.getExpiring.useQuery({
    daysAhead: 90,
  });

  const isLoading = policiesLoading || expiringLoading;

  const allPolicies = policies ?? [];
  const activePolicies = allPolicies.filter((p) => p.is_active);
  const expiring = expiringDocs ?? [];

  return (
    <PageContainer>
      <PageHeader
        title="Retention Dashboard"
        description="Document retention policies and compliance"
        actions={
          <Button
            variant="primary"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => setShowCreateModal(true)}
          >
            New Policy
          </Button>
        }
      />

      <StatCardGrid columns={4}>
        <StatCard
          title="Total Policies"
          value={isLoading ? "\u2014" : String(allPolicies.length)}
          subtitle="Under retention management"
          icon={<FileText className="h-5 w-5" />}
          loading={isLoading}
        />
        <StatCard
          title="Active Policies"
          value={isLoading ? "\u2014" : `${activePolicies.length}/${allPolicies.length}`}
          subtitle="Currently active"
          variant="success"
          icon={<Shield className="h-5 w-5" />}
          loading={isLoading}
        />
        <StatCard
          title="Expiring Soon"
          value={isLoading ? "\u2014" : String(expiring.length)}
          subtitle="Documents within 90 days"
          variant="warning"
          icon={<Clock className="h-5 w-5" />}
          loading={isLoading}
        />
        <StatCard
          title="Inactive Policies"
          value={isLoading ? "\u2014" : String(allPolicies.length - activePolicies.length)}
          subtitle="Paused or retired"
          icon={<AlertTriangle className="h-5 w-5" />}
          loading={isLoading}
        />
      </StatCardGrid>

      {/* Info banner */}
      <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-indigo-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-indigo-100">Regulatory Minimums</p>
            <p className="text-sm text-indigo-200 mt-1">
              42 CFR Part 2: 6 years &bull; HIPAA Medical: 6 years &bull; Financial/IRS: 7 years &bull; Operational: 3 years
            </p>
          </div>
        </div>
      </div>

      {/* Retention Policies Table */}
      <div>
        <h2 className="text-lg font-semibold text-zinc-100 mb-4">Retention Policies</h2>
        {policiesLoading ? (
          <SkeletonTable rows={5} columns={6} />
        ) : allPolicies.length === 0 ? (
          <EmptyState
            iconType="inbox"
            title="No retention policies"
            description="Create your first retention policy to manage document lifecycles."
            action={{ label: "New Policy", onClick: () => setShowCreateModal(true) }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Policy Name</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Document Type</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Retention Period</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Description</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Status</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {allPolicies.map((policy) => (
                  <tr key={policy.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Archive className="h-4 w-4 text-zinc-500 flex-shrink-0" />
                        <span className="text-sm font-medium text-zinc-100">{policy.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-zinc-400">
                      {policy.document_type ? (typeLabels[policy.document_type] ?? policy.document_type) : "All types"}
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-zinc-100">
                      {retentionLabel(policy.retention_period_days)}
                    </td>
                    <td className="py-3 px-4 text-sm text-zinc-400 max-w-xs truncate">
                      {policy.description ?? "\u2014"}
                    </td>
                    <td className="py-3 px-4">
                      {policy.is_active ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="default">Inactive</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        className="p-1.5 text-zinc-500 hover:text-indigo-400 rounded transition-colors"
                        title="Edit"
                        onClick={() => setEditingPolicy(policy)}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Expiring Documents */}
      <div>
        <h2 className="text-lg font-semibold text-zinc-100 mb-1">Documents Expiring Soon</h2>
        <p className="text-sm text-zinc-400 mb-4">Documents approaching end of retention period (next 90 days)</p>
        {expiringLoading ? (
          <SkeletonTable rows={3} columns={4} />
        ) : expiring.length === 0 ? (
          <EmptyState
            iconType="inbox"
            title="No expiring documents"
            description="No documents are approaching their retention expiry within 90 days."
          />
        ) : (
          <div className="space-y-3">
            {expiring.map((doc) => (
              <div key={doc.id} className="border border-zinc-800 rounded-lg p-4 flex items-center justify-between hover:bg-zinc-800/30 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-500/15 rounded-lg">
                    <Clock className="h-4 w-4 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-100">{doc.title}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {typeLabels[doc.document_type] ?? doc.document_type}
                      {doc.expires_at && (
                        <> &bull; Expires {new Date(doc.expires_at).toLocaleDateString()}</>
                      )}
                    </p>
                  </div>
                </div>
                <Badge variant="warning">Expiring</Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      <PolicyFormModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />
      <PolicyFormModal
        key={editingPolicy?.id}
        isOpen={!!editingPolicy}
        onClose={() => setEditingPolicy(null)}
        policy={editingPolicy}
      />
    </PageContainer>
  );
}

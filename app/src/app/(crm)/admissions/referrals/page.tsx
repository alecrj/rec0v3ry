"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  Building2,
  Phone,
  Mail,
  MoreVertical,
  TrendingUp,
  Users,
  ChevronLeft,
  Loader2,
  X,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
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
  StatCard,
  StatCardGrid,
  useToast,
} from "@/components/ui";

export const dynamic = "force-dynamic";

const REFERRAL_TYPE_LABELS: Record<string, string> = {
  treatment_center: "Treatment Center",
  court: "Court / Probation",
  hospital: "Hospital",
  aa_na: "AA / NA",
  church: "Church / Faith",
  self: "Self-Referral",
  family: "Family",
  online: "Online",
  other: "Other",
};

const REFERRAL_TYPE_COLORS: Record<string, string> = {
  treatment_center: "bg-indigo-50 text-indigo-600",
  court: "bg-amber-50 text-amber-600",
  hospital: "bg-red-50 text-red-600",
  aa_na: "bg-cyan-50 text-cyan-600",
  church: "bg-purple-50 text-purple-600",
  self: "bg-zinc-100 text-zinc-600",
  family: "bg-green-50 text-green-600",
  online: "bg-blue-50 text-blue-600",
  other: "bg-zinc-100 text-zinc-500",
};

const REFERRAL_TYPES = [
  "treatment_center",
  "court",
  "hospital",
  "aa_na",
  "church",
  "self",
  "family",
  "online",
  "other",
] as const;

const inputClass =
  "w-full h-10 px-3 text-sm border border-zinc-200 rounded-lg bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors";

interface ReferralSource {
  id: string;
  name: string;
  type: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string | Date;
  total_referrals: number;
  total_admitted: number;
  conversion_rate: number;
}

// ── Create / Edit Modal ──────────────────────────────────
function ReferralSourceModal({
  isOpen,
  onClose,
  source,
  isSubmitting,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  source?: ReferralSource | null;
  isSubmitting?: boolean;
  onSubmit: (data: {
    name: string;
    type: string;
    contactName?: string;
    contactPhone?: string;
    contactEmail?: string;
    address?: string;
    notes?: string;
  }) => void;
}) {
  const isEdit = !!source;
  const [name, setName] = useState(source?.name || "");
  const [type, setType] = useState(source?.type || "treatment_center");
  const [contactName, setContactName] = useState(source?.contact_name || "");
  const [contactPhone, setContactPhone] = useState(source?.contact_phone || "");
  const [contactEmail, setContactEmail] = useState(source?.contact_email || "");
  const [address, setAddress] = useState(source?.address || "");
  const [notes, setNotes] = useState(source?.notes || "");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      type,
      contactName: contactName || undefined,
      contactPhone: contactPhone || undefined,
      contactEmail: contactEmail || undefined,
      address: address || undefined,
      notes: notes || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 border border-zinc-200">
        <div className="p-6 border-b border-zinc-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-zinc-800">
              {isEdit ? "Edit Referral Source" : "Add Referral Source"}
            </h2>
            <p className="text-sm text-zinc-500 mt-1">
              {isEdit ? "Update source information" : "Track where your referrals come from"}
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-500 hover:text-zinc-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-zinc-600 mb-1.5">
                Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
                placeholder="e.g. Sunrise Treatment Center"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-zinc-600 mb-1.5">
                Type <span className="text-red-400">*</span>
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className={inputClass}
              >
                {REFERRAL_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {REFERRAL_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-600 mb-1.5">Contact Name</label>
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className={inputClass}
              placeholder="Primary contact person"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-600 mb-1.5">Phone</label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className={inputClass}
                placeholder="(555) 123-4567"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-600 mb-1.5">Email</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className={inputClass}
                placeholder="contact@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-600 mb-1.5">Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className={inputClass}
              placeholder="123 Main St, City, State ZIP"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-600 mb-1.5">Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none transition-colors"
              placeholder="Additional notes about this referral source..."
            />
          </div>

          <div className="pt-4 border-t border-zinc-200 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={isSubmitting}>
              {isSubmitting ? "Saving..." : isEdit ? "Save Changes" : "Add Source"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ReferralSourcesPage() {
  const { toast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editingSource, setEditingSource] = useState<ReferralSource | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const { data: sources, isLoading, error } = trpc.referralSource.list.useQuery();

  const createMutation = trpc.referralSource.create.useMutation({
    onSuccess: () => {
      toast("success", "Referral source added");
      setShowModal(false);
      utils.referralSource.list.invalidate();
    },
    onError: (err) => toast("error", "Failed to add", err.message),
  });

  const updateMutation = trpc.referralSource.update.useMutation({
    onSuccess: () => {
      toast("success", "Referral source updated");
      setEditingSource(null);
      utils.referralSource.list.invalidate();
    },
    onError: (err) => toast("error", "Failed to update", err.message),
  });

  const deleteMutation = trpc.referralSource.delete.useMutation({
    onSuccess: () => {
      toast("success", "Referral source removed");
      utils.referralSource.list.invalidate();
    },
    onError: (err) => toast("error", "Failed to remove", err.message),
  });

  const toggleActiveMutation = trpc.referralSource.update.useMutation({
    onSuccess: () => {
      toast("success", "Status updated");
      utils.referralSource.list.invalidate();
    },
    onError: (err) => toast("error", "Failed to update", err.message),
  });

  const handleCreate = (data: {
    name: string;
    type: string;
    contactName?: string;
    contactPhone?: string;
    contactEmail?: string;
    address?: string;
    notes?: string;
  }) => {
    createMutation.mutate({
      name: data.name,
      type: data.type as typeof REFERRAL_TYPES[number],
      contactName: data.contactName,
      contactPhone: data.contactPhone,
      contactEmail: data.contactEmail,
      address: data.address,
      notes: data.notes,
    });
  };

  const handleUpdate = (data: {
    name: string;
    type: string;
    contactName?: string;
    contactPhone?: string;
    contactEmail?: string;
    address?: string;
    notes?: string;
  }) => {
    if (!editingSource) return;
    updateMutation.mutate({
      id: editingSource.id,
      name: data.name,
      type: data.type as typeof REFERRAL_TYPES[number],
      contactName: data.contactName || null,
      contactPhone: data.contactPhone || null,
      contactEmail: data.contactEmail || null,
      address: data.address || null,
      notes: data.notes || null,
    });
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to remove this referral source?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleToggleActive = (source: ReferralSource) => {
    toggleActiveMutation.mutate({
      id: source.id,
      isActive: !source.is_active,
    });
  };

  // Compute summary stats
  const totalSources = sources?.length || 0;
  const activeSources = sources?.filter((s) => s.is_active).length || 0;
  const totalReferrals = sources?.reduce((sum, s) => sum + s.total_referrals, 0) || 0;
  const totalAdmitted = sources?.reduce((sum, s) => sum + s.total_admitted, 0) || 0;
  const overallConversion = totalReferrals > 0 ? Math.round((totalAdmitted / totalReferrals) * 100) : 0;

  return (
    <PageContainer>
      {/* Breadcrumb */}
      <div>
        <Link
          href="/admissions"
          className="flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-800"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Pipeline
        </Link>
      </div>

      <PageHeader
        title="Referral Sources"
        description="Track and manage where your referrals come from"
        actions={
          <Button
            variant="primary"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => setShowModal(true)}
          >
            Add Source
          </Button>
        }
      />

      {error && (
        <Card>
          <CardContent>
            <ErrorState title="Error loading referral sources" description={error.message} />
          </CardContent>
        </Card>
      )}

      <StatCardGrid columns={4}>
        <StatCard
          title="Total Sources"
          value={isLoading ? "--" : String(totalSources)}
          icon={<Building2 className="h-5 w-5" />}
          loading={isLoading}
        />
        <StatCard
          title="Active Sources"
          value={isLoading ? "--" : String(activeSources)}
          variant="success"
          icon={<Users className="h-5 w-5" />}
          loading={isLoading}
        />
        <StatCard
          title="Total Referrals"
          value={isLoading ? "--" : String(totalReferrals)}
          icon={<Users className="h-5 w-5" />}
          loading={isLoading}
        />
        <StatCard
          title="Conversion Rate"
          value={isLoading ? "--" : `${overallConversion}%`}
          icon={<TrendingUp className="h-5 w-5" />}
          loading={isLoading}
        />
      </StatCardGrid>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
        </div>
      ) : !sources || sources.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              title="No referral sources yet"
              description="Add your first referral source to start tracking where your residents come from."
              action={{
                label: "Add Source",
                onClick: () => setShowModal(true),
                icon: <Plus className="h-4 w-4" />,
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200">
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Referrals
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Admitted
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Conv. Rate
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/50">
                {sources.map((source) => (
                  <tr
                    key={source.id}
                    className="hover:bg-zinc-100/40 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-zinc-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Building2 className="h-4 w-4 text-zinc-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-zinc-800">{source.name}</p>
                          {source.address && (
                            <p className="text-xs text-zinc-500 truncate max-w-[200px]">
                              {source.address}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 text-xs rounded-full ${
                          REFERRAL_TYPE_COLORS[source.type] || REFERRAL_TYPE_COLORS.other
                        }`}
                      >
                        {REFERRAL_TYPE_LABELS[source.type] || source.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        {source.contact_name && (
                          <p className="text-sm text-zinc-600">{source.contact_name}</p>
                        )}
                        {source.contact_phone && (
                          <div className="flex items-center gap-1 text-xs text-zinc-500">
                            <Phone className="h-3 w-3" />
                            {source.contact_phone}
                          </div>
                        )}
                        {source.contact_email && (
                          <div className="flex items-center gap-1 text-xs text-zinc-500">
                            <Mail className="h-3 w-3" />
                            {source.contact_email}
                          </div>
                        )}
                        {!source.contact_name && !source.contact_phone && !source.contact_email && (
                          <span className="text-xs text-zinc-600">--</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-medium text-zinc-800">{source.total_referrals}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-medium text-green-400">{source.total_admitted}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-medium text-zinc-800">
                        {source.conversion_rate}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={source.is_active ? "success" : "default"}>
                        {source.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="relative inline-block">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === source.id ? null : source.id)}
                          className="p-1 hover:bg-zinc-100 rounded transition-colors"
                        >
                          <MoreVertical className="h-4 w-4 text-zinc-500" />
                        </button>
                        {openMenuId === source.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setOpenMenuId(null)}
                            />
                            <div className="absolute right-0 top-8 w-44 bg-white rounded-lg shadow-lg border border-zinc-200 py-1 z-20">
                              <button
                                className="w-full text-left px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100/40 flex items-center gap-2"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  setEditingSource(source);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                                Edit
                              </button>
                              <button
                                className="w-full text-left px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100/40 flex items-center gap-2"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  handleToggleActive(source);
                                }}
                              >
                                {source.is_active ? (
                                  <>
                                    <ToggleLeft className="h-4 w-4" />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <ToggleRight className="h-4 w-4" />
                                    Activate
                                  </>
                                )}
                              </button>
                              <button
                                className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  handleDelete(source.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                                Remove
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Create Modal */}
      <ReferralSourceModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleCreate}
        isSubmitting={createMutation.isPending}
      />

      {/* Edit Modal */}
      {editingSource && (
        <ReferralSourceModal
          isOpen={!!editingSource}
          onClose={() => setEditingSource(null)}
          source={editingSource}
          onSubmit={handleUpdate}
          isSubmitting={updateMutation.isPending}
        />
      )}
    </PageContainer>
  );
}

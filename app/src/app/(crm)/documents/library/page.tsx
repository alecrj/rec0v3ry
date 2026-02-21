"use client";

import { useState } from "react";
import {
  Plus,
  Search,
  Upload,
  Download,
  FileText,
  Eye,
  X,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  PageContainer,
  PageHeader,
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

const SENSITIVITY_LEVELS = [
  "public", "internal", "confidential", "part2_protected",
] as const;

const statusConfig: Record<string, { variant: "success" | "warning" | "error" | "default"; label: string }> = {
  draft: { variant: "default", label: "Draft" },
  pending_signature: { variant: "warning", label: "Pending Signature" },
  signed: { variant: "success", label: "Signed" },
  expired: { variant: "error", label: "Expired" },
  voided: { variant: "default", label: "Voided" },
};

const sensitivityConfig: Record<string, { variant: "info" | "warning" | "error" | "default"; label: string }> = {
  public: { variant: "default", label: "Public" },
  internal: { variant: "info", label: "Internal" },
  confidential: { variant: "warning", label: "Confidential" },
  part2_protected: { variant: "error", label: "Part 2" },
};

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

// ── Create Document Modal ──────────────────────────────────
function CreateDocumentModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [title, setTitle] = useState("");
  const [documentType, setDocumentType] = useState<typeof DOC_TYPES[number]>("other");
  const [residentId, setResidentId] = useState("");
  const [sensitivityLevel, setSensitivityLevel] = useState<typeof SENSITIVITY_LEVELS[number]>("confidential");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: residents } = trpc.resident.list.useQuery(
    { limit: 200 },
    { enabled: isOpen }
  );

  const getUploadUrl = trpc.document.getUploadUrl.useMutation();

  const createMutation = trpc.document.create.useMutation({
    onSuccess: () => {
      toast("success", "Document created");
      utils.document.list.invalidate();
      resetAndClose();
    },
    onError: (err) => toast("error", "Failed to create document", err.message),
  });

  async function handleSubmit() {
    setUploading(true);
    try {
      let fileUrl: string | undefined;

      if (file) {
        const { uploadUrl, storageKey } = await getUploadUrl.mutateAsync({
          fileName: file.name,
          contentType: file.type,
          category: "document",
          residentId: residentId || undefined,
        });

        await fetch(uploadUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });

        fileUrl = storageKey;
      }

      createMutation.mutate({
        title,
        documentType,
        residentId: residentId || undefined,
        sensitivityLevel,
        description: description || undefined,
        fileUrl,
      });
    } catch (err: any) {
      toast("error", "Upload failed", err.message ?? "Could not upload file");
    } finally {
      setUploading(false);
    }
  }

  function resetAndClose() {
    setTitle("");
    setDocumentType("other");
    setResidentId("");
    setSensitivityLevel("confidential");
    setDescription("");
    setFile(null);
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={resetAndClose} />
      <div className="relative bg-zinc-900 rounded-2xl shadow-xl w-full max-w-lg mx-4 border border-zinc-800">
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-zinc-100">New Document</h2>
            <p className="text-sm text-zinc-500 mt-1">Create a new document record</p>
          </div>
          <button onClick={resetAndClose} className="p-1 text-zinc-500 hover:text-zinc-300">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="p-6 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
              placeholder="e.g. Intake Form - John Smith"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Document Type <span className="text-red-400">*</span>
              </label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value as typeof DOC_TYPES[number])}
                className={inputClass}
              >
                {DOC_TYPES.map((t) => (
                  <option key={t} value={t}>{typeLabels[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Sensitivity</label>
              <select
                value={sensitivityLevel}
                onChange={(e) => setSensitivityLevel(e.target.value as typeof SENSITIVITY_LEVELS[number])}
                className={inputClass}
              >
                <option value="public">Public</option>
                <option value="internal">Internal</option>
                <option value="confidential">Confidential</option>
                <option value="part2_protected">Part 2 Protected</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Resident (Optional)</label>
            <select
              value={residentId}
              onChange={(e) => setResidentId(e.target.value)}
              className={inputClass}
            >
              <option value="">Organization-wide</option>
              {(residents?.items ?? []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.first_name} {r.last_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Attach File</label>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-zinc-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-zinc-800 file:text-zinc-300 hover:file:bg-zinc-700 cursor-pointer"
            />
            {file && (
              <p className="text-xs text-zinc-500 mt-1">
                {file.name} ({(file.size / 1024).toFixed(0)} KB)
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-y"
              placeholder="Brief description of this document..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={resetAndClose}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={!title || uploading || createMutation.isPending}>
              {uploading ? "Uploading..." : createMutation.isPending ? "Creating..." : "Create Document"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── View Document Modal ────────────────────────────────────
function ViewDocumentModal({
  isOpen,
  onClose,
  doc,
}: {
  isOpen: boolean;
  onClose: () => void;
  doc: {
    id: string;
    title: string;
    document_type: string;
    status: string;
    description?: string | null;
    sensitivity_level?: string | null;
    created_at: string;
    updated_at?: string | null;
    resident?: { first_name: string; last_name: string } | null;
  } | null;
}) {
  if (!isOpen || !doc) return null;

  const sc = statusConfig[doc.status] ?? statusConfig.draft;
  const sens = sensitivityConfig[doc.sensitivity_level ?? "internal"] ?? sensitivityConfig.internal;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-zinc-900 rounded-2xl shadow-xl w-full max-w-lg mx-4 border border-zinc-800">
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-zinc-100">Document Details</h2>
          <button onClick={onClose} className="p-1 text-zinc-500 hover:text-zinc-300">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Title</label>
            <p className="text-sm text-zinc-100 mt-1">{doc.title}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Type</label>
              <p className="text-sm text-zinc-100 mt-1">{typeLabels[doc.document_type] ?? doc.document_type}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Resident</label>
              <p className="text-sm text-zinc-100 mt-1">
                {doc.resident ? `${doc.resident.first_name} ${doc.resident.last_name}` : "Organization-wide"}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Status</label>
              <div className="mt-1"><Badge variant={sc!.variant}>{sc!.label}</Badge></div>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Sensitivity</label>
              <div className="mt-1"><Badge variant={sens!.variant}>{sens!.label}</Badge></div>
            </div>
          </div>
          {doc.description && (
            <div>
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Description</label>
              <p className="text-sm text-zinc-400 mt-1">{doc.description}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Created</label>
              <p className="text-sm text-zinc-400 mt-1">{new Date(doc.created_at).toLocaleDateString()}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Updated</label>
              <p className="text-sm text-zinc-400 mt-1">
                {doc.updated_at ? new Date(doc.updated_at).toLocaleDateString() : "\u2014"}
              </p>
            </div>
          </div>
          <div className="pt-2 flex justify-end">
            <Button variant="secondary" onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────
export default function DocumentLibraryPage() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<any>(null);

  const { data, isLoading } = trpc.document.list.useQuery({
    status: activeTab === "all" ? undefined : activeTab as "draft" | "pending_signature" | "signed" | "expired" | "voided",
    search: searchTerm || undefined,
    limit: 50,
  });

  const downloadMutation = trpc.document.getDownloadUrl.useMutation({
    onSuccess: (data) => {
      if (data.downloadUrl) {
        window.open(data.downloadUrl, "_blank");
      } else {
        toast("info", "No file attached", "This document doesn't have an uploaded file yet.");
      }
    },
    onError: (err) => toast("error", "Download failed", err.message),
  });

  const deleteMutation = trpc.document.delete.useMutation({
    onSuccess: () => {
      toast("success", "Document deleted");
      utils.document.list.invalidate();
    },
    onError: (err) => toast("error", "Failed to delete", err.message),
  });

  const documents = data?.items ?? [];

  const tabs = [
    { id: "all", label: "All" },
    { id: "draft", label: "Draft" },
    { id: "pending_signature", label: "Pending Signature" },
    { id: "signed", label: "Signed" },
    { id: "expired", label: "Expired" },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Document Library"
        actions={
          <div className="flex gap-3">
            <Button
              variant="primary"
              icon={<Plus className="h-4 w-4" />}
              onClick={() => setShowCreateModal(true)}
            >
              New Document
            </Button>
          </div>
        }
      />

      {/* Search + Tabs */}
      <div className="space-y-0">
        <div className="flex flex-col sm:flex-row gap-4 pb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search by title or resident name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 border-b border-zinc-800 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-indigo-500 text-indigo-400"
                  : "border-transparent text-zinc-400 hover:text-zinc-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <SkeletonTable rows={6} columns={7} />
      ) : documents.length === 0 ? (
        <EmptyState
          iconType="inbox"
          title="No documents found"
          description={searchTerm ? "Try adjusting your search criteria" : "Create your first document to get started."}
          action={!searchTerm ? { label: "New Document", onClick: () => setShowCreateModal(true) } : undefined}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Document</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Type</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Resident</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Sensitivity</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Status</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Updated</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {documents.map((doc) => {
                const sc = statusConfig[doc.status] ?? statusConfig.draft;
                const sens = sensitivityConfig[doc.sensitivity_level ?? "internal"] ?? sensitivityConfig.internal;
                return (
                  <tr key={doc.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-zinc-500 flex-shrink-0" />
                        <span className="text-sm font-medium text-zinc-100">{doc.title}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-zinc-400">
                      {typeLabels[doc.document_type] ?? doc.document_type}
                    </td>
                    <td className="py-3 px-4 text-sm text-zinc-400">
                      {doc.resident ? `${doc.resident.first_name} ${doc.resident.last_name}` : "\u2014"}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={sens!.variant}>{sens!.label}</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={sc!.variant}>{sc!.label}</Badge>
                    </td>
                    <td className="py-3 px-4 text-sm text-zinc-400">
                      {doc.updated_at ? new Date(doc.updated_at).toLocaleDateString() : "\u2014"}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <button
                          className="p-1.5 text-zinc-500 hover:text-indigo-400 rounded transition-colors"
                          title="View"
                          onClick={() => setViewingDoc(doc)}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          className="p-1.5 text-zinc-500 hover:text-indigo-400 rounded transition-colors"
                          title="Download"
                          onClick={() => downloadMutation.mutate({ id: doc.id })}
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        {doc.status === "draft" && (
                          <button
                            className="p-1.5 text-zinc-500 hover:text-red-400 rounded transition-colors"
                            title="Delete"
                            onClick={() => {
                              if (window.confirm(`Delete "${doc.title}"?`)) {
                                deleteMutation.mutate({ id: doc.id });
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="px-4 py-3 border-t border-zinc-800/50">
            <p className="text-sm text-zinc-500">Showing {documents.length} document{documents.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
      )}

      <CreateDocumentModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />
      <ViewDocumentModal isOpen={!!viewingDoc} onClose={() => setViewingDoc(null)} doc={viewingDoc} />
    </PageContainer>
  );
}

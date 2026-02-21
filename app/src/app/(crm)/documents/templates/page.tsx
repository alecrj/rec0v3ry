"use client";

import { useState } from "react";
import {
  Plus,
  Search,
  FileStack,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  PageContainer,
  PageHeader,
  Button,
  Badge,
  EmptyState,
  SkeletonCard,
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
  resident_agreement: "Agreement",
  consent_form: "Consent",
  release_of_info: "Release of Info",
  house_rules: "House Rules",
  financial_agreement: "Financial",
  treatment_plan: "Treatment Plan",
  discharge_summary: "Discharge Summary",
  incident_report: "Incident Report",
  other: "Other",
};

const inputClass = "w-full h-10 px-3 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors";

// ── Template Form Modal (Create + Edit) ────────────────────
function TemplateFormModal({
  isOpen,
  onClose,
  template,
}: {
  isOpen: boolean;
  onClose: () => void;
  template?: {
    id: string;
    name: string;
    document_type: string;
    description: string | null;
    template_content: string | null;
    version: string | null;
  } | null;
}) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const isEdit = !!template;

  const [name, setName] = useState(template?.name ?? "");
  const [documentType, setDocumentType] = useState<typeof DOC_TYPES[number]>(
    (template?.document_type as typeof DOC_TYPES[number]) ?? "other"
  );
  const [description, setDescription] = useState(template?.description ?? "");
  const [templateContent, setTemplateContent] = useState(template?.template_content ?? "");
  const [version, setVersion] = useState(template?.version ?? "1.0");

  const createMutation = trpc.document.template.create.useMutation({
    onSuccess: () => {
      toast("success", "Template created");
      utils.document.template.list.invalidate();
      onClose();
    },
    onError: (err) => toast("error", "Failed to create template", err.message),
  });

  const updateMutation = trpc.document.template.update.useMutation({
    onSuccess: () => {
      toast("success", "Template updated");
      utils.document.template.list.invalidate();
      onClose();
    },
    onError: (err) => toast("error", "Failed to update template", err.message),
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-zinc-900 rounded-2xl shadow-xl w-full max-w-lg mx-4 border border-zinc-800">
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-zinc-100">
              {isEdit ? "Edit Template" : "New Template"}
            </h2>
            <p className="text-sm text-zinc-500 mt-1">
              {isEdit ? "Update template details" : "Create a reusable document template"}
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-500 hover:text-zinc-300">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (isEdit && template) {
              updateMutation.mutate({
                id: template.id,
                name,
                documentType,
                description: description || undefined,
                templateContent: templateContent || undefined,
                version,
              });
            } else {
              createMutation.mutate({
                name,
                documentType,
                description: description || undefined,
                templateContent: templateContent || undefined,
                version,
              });
            }
          }}
          className="p-6 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              Template Name <span className="text-red-400">*</span>
            </label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              placeholder="e.g. Standard Intake Form"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Document Type</label>
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
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Version</label>
              <input
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className={inputClass}
                placeholder="1.0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-y"
              placeholder="Brief description..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Template Content</label>
            <textarea
              rows={5}
              value={templateContent}
              onChange={(e) => setTemplateContent(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-y font-mono"
              placeholder="Template body text or HTML content..."
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
                ? (isEdit ? "Saving..." : "Creating...")
                : (isEdit ? "Save Changes" : "Create Template")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────
export default function DocumentTemplatesPage() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);

  const { data: templates, isLoading } = trpc.document.template.list.useQuery({
    documentType: activeCategory === "all" ? undefined : activeCategory,
    activeOnly: false,
  });

  const deleteTemplate = trpc.document.template.delete.useMutation({
    onSuccess: () => {
      toast("success", "Template deactivated");
      utils.document.template.list.invalidate();
    },
    onError: (err) => toast("error", "Failed to delete template", err.message),
  });

  const allTemplates = templates ?? [];
  const filteredTemplates = allTemplates.filter((t) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return t.name.toLowerCase().includes(q) || (t.description ?? "").toLowerCase().includes(q);
  });

  const categories = [
    { id: "all", label: "All Templates" },
    { id: "intake_form", label: "Intake Forms" },
    { id: "resident_agreement", label: "Agreements" },
    { id: "consent_form", label: "Consent Forms" },
    { id: "release_of_info", label: "Release of Info" },
    { id: "house_rules", label: "House Rules" },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Document Templates"
        actions={
          <Button
            variant="primary"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => setShowCreateModal(true)}
          >
            New Template
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                activeCategory === cat.id
                  ? "bg-indigo-500/15 text-indigo-300"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <EmptyState
          iconType="inbox"
          title="No templates found"
          description={searchTerm ? "Try adjusting your search criteria" : "Create your first template to get started."}
          action={!searchTerm ? { label: "New Template", onClick: () => setShowCreateModal(true) } : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="border border-zinc-800 rounded-lg p-5 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileStack className="h-5 w-5 text-indigo-400" />
                  <Badge variant="default">
                    {typeLabels[template.document_type] ?? template.document_type}
                  </Badge>
                </div>
                <Badge variant={template.is_active ? "success" : "default"}>
                  {template.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>

              <h3 className="font-semibold text-zinc-100 mb-1">{template.name}</h3>
              <p className="text-sm text-zinc-400 mb-4 line-clamp-2">{template.description ?? "No description"}</p>

              <div className="flex items-center justify-between text-xs text-zinc-500 mb-4">
                <span>v{template.version ?? "1.0"}</span>
                <span>Updated {template.updated_at ? new Date(template.updated_at).toLocaleDateString() : "\u2014"}</span>
              </div>

              <div className="flex items-center gap-2 border-t border-zinc-800/50 pt-3">
                <button
                  className="flex-1 px-3 py-1.5 text-sm font-medium text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors flex items-center justify-center gap-1"
                  onClick={() => setEditingTemplate(template)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </button>
                <button
                  className="px-2 py-1.5 text-sm text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  onClick={() => {
                    if (window.confirm(`Deactivate "${template.name}"?`)) {
                      deleteTemplate.mutate({ id: template.id });
                    }
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <TemplateFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
      <TemplateFormModal
        key={editingTemplate?.id}
        isOpen={!!editingTemplate}
        onClose={() => setEditingTemplate(null)}
        template={editingTemplate}
      />
    </PageContainer>
  );
}

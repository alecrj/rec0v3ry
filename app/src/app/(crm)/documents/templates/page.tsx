"use client";

import { useState } from "react";
import {
  Plus,
  Search,
  FileStack,
  Pencil,
  Trash2,
  X,
  Send,
  FileText,
  ClipboardList,
  ShieldCheck,
  DollarSign,
  Phone,
  FlaskConical,
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

// ── Pre-built template definitions ─────────────────────────
const prebuiltTemplates = [
  {
    name: "House Rules Agreement",
    description: "Standard house rules every resident signs on move-in. Covers expectations for behavior, curfew, chores, and community living.",
    docType: "house_rules" as const,
    icon: ClipboardList,
    color: "text-blue-400 bg-blue-500/10",
  },
  {
    name: "Move-In Agreement",
    description: "Comprehensive residency agreement covering terms of stay, behavioral expectations, and grounds for discharge.",
    docType: "resident_agreement" as const,
    icon: FileText,
    color: "text-indigo-400 bg-indigo-500/10",
  },
  {
    name: "Financial Responsibility Agreement",
    description: "Payment terms, fee schedule, late payment policy, and financial obligations during residency.",
    docType: "financial_agreement" as const,
    icon: DollarSign,
    color: "text-green-400 bg-green-500/10",
  },
  {
    name: "Emergency Contact Form",
    description: "Emergency contact information, medical conditions, allergies, and healthcare authorization.",
    docType: "intake_form" as const,
    icon: Phone,
    color: "text-amber-400 bg-amber-500/10",
  },
  {
    name: "Consent to Drug Testing",
    description: "Written authorization for random and scheduled drug testing as a condition of residency.",
    docType: "consent_form" as const,
    icon: FlaskConical,
    color: "text-purple-400 bg-purple-500/10",
  },
];

// ── Template Form Modal (Create + Edit) ────────────────────
function TemplateFormModal({
  isOpen,
  onClose,
  template,
  defaultValues,
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
  defaultValues?: {
    name?: string;
    documentType?: typeof DOC_TYPES[number];
    description?: string;
  };
}) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const isEdit = !!template;

  const [name, setName] = useState(template?.name ?? defaultValues?.name ?? "");
  const [documentType, setDocumentType] = useState<typeof DOC_TYPES[number]>(
    (template?.document_type as typeof DOC_TYPES[number]) ?? defaultValues?.documentType ?? "other"
  );
  const [description, setDescription] = useState(template?.description ?? defaultValues?.description ?? "");
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

// ── Send from Template Modal ───────────────────────────────
function SendFromTemplateModal({
  isOpen,
  onClose,
  templateName,
  templateId,
}: {
  isOpen: boolean;
  onClose: () => void;
  templateName: string;
  templateId?: string;
}) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [residentId, setResidentId] = useState("");
  const [emailSubject, setEmailSubject] = useState(`Please sign: ${templateName}`);
  const [emailBody, setEmailBody] = useState("");

  const { data: residents } = trpc.resident.list.useQuery(
    { limit: 200 },
    { enabled: isOpen }
  );

  // If we have a templateId, find matching documents; otherwise create one first
  const { data: draftDocs } = trpc.document.list.useQuery(
    { status: "draft", limit: 100 },
    { enabled: isOpen }
  );

  const createDocument = trpc.document.create.useMutation();

  const createEnvelope = trpc.esign.createEnvelope.useMutation({
    onSuccess: () => {
      toast("success", "Sent for signature", "The signing request has been created.");
      utils.document.list.invalidate();
      utils.esign.listPending.invalidate();
      resetAndClose();
    },
    onError: (err) => toast("error", "Failed to send", err.message),
  });

  function resetAndClose() {
    setSignerName("");
    setSignerEmail("");
    setResidentId("");
    setEmailSubject(`Please sign: ${templateName}`);
    setEmailBody("");
    onClose();
  }

  async function handleSubmit() {
    try {
      // Create a document from the template, then send for signature
      const doc = await createDocument.mutateAsync({
        title: templateName,
        documentType: "resident_agreement",
        residentId: residentId || undefined,
        templateId: templateId || undefined,
        description: `Generated from template: ${templateName}`,
      });

      createEnvelope.mutate({
        documentIds: [doc.id],
        signers: [{
          email: signerEmail,
          name: signerName,
          residentId: residentId || undefined,
        }],
        emailSubject: emailSubject || undefined,
        emailBody: emailBody || undefined,
      });
    } catch (err: any) {
      toast("error", "Failed to create document", err.message ?? "Unknown error");
    }
  }

  // Auto-fill name/email when resident is selected
  function handleResidentChange(id: string) {
    setResidentId(id);
    const resident = (residents?.items ?? []).find((r) => r.id === id);
    if (resident) {
      setSignerName(`${resident.first_name} ${resident.last_name}`);
      if (resident.email) {
        setSignerEmail(resident.email);
      }
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={resetAndClose} />
      <div className="relative bg-zinc-900 rounded-2xl shadow-xl w-full max-w-lg mx-4 border border-zinc-800">
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-zinc-100">Send for Signature</h2>
            <p className="text-sm text-zinc-500 mt-1">
              Send &quot;{templateName}&quot; to a resident for e-signature
            </p>
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
              Resident (Optional)
            </label>
            <select
              value={residentId}
              onChange={(e) => handleResidentChange(e.target.value)}
              className={inputClass}
            >
              <option value="">Select a resident...</option>
              {(residents?.items ?? []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.first_name} {r.last_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              Signer Name <span className="text-red-400">*</span>
            </label>
            <input
              required
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              className={inputClass}
              placeholder="Full name of the signer"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              Signer Email <span className="text-red-400">*</span>
            </label>
            <input
              required
              type="email"
              value={signerEmail}
              onChange={(e) => setSignerEmail(e.target.value)}
              className={inputClass}
              placeholder="signer@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Subject Line</label>
            <input
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              className={inputClass}
              placeholder="Email subject line"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              Message (Optional)
            </label>
            <textarea
              rows={2}
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-y"
              placeholder="Optional message to include with the signing request..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={resetAndClose}>Cancel</Button>
            <Button
              type="submit"
              variant="primary"
              icon={<Send className="h-4 w-4" />}
              disabled={!signerName || !signerEmail || createEnvelope.isPending || createDocument.isPending}
            >
              {createEnvelope.isPending || createDocument.isPending ? "Sending..." : "Send for Signature"}
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
  const [sendingTemplate, setSendingTemplate] = useState<{
    name: string;
    id?: string;
  } | null>(null);
  const [createFromPrebuilt, setCreateFromPrebuilt] = useState<{
    name: string;
    docType: typeof DOC_TYPES[number];
    description: string;
  } | null>(null);

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

  const filteredPrebuilt = prebuiltTemplates.filter((t) => {
    if (activeCategory !== "all" && t.docType !== activeCategory) return false;
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
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

      {/* Pre-built Templates */}
      {filteredPrebuilt.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 px-1">
            Quick-Start Templates
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPrebuilt.map((pt) => {
              const Icon = pt.icon;
              // Check if this pre-built template already exists in org templates
              const existsInOrg = allTemplates.some(
                (t) => t.name === pt.name && t.is_active
              );

              return (
                <div
                  key={pt.name}
                  className="border border-zinc-800 rounded-lg p-5 hover:border-zinc-700 transition-colors bg-zinc-900/50"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`p-2 rounded-lg ${pt.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <Badge variant="default" size="sm">
                      {typeLabels[pt.docType] ?? pt.docType}
                    </Badge>
                  </div>

                  <h3 className="font-semibold text-zinc-100 mb-1">{pt.name}</h3>
                  <p className="text-sm text-zinc-400 mb-4 line-clamp-2">{pt.description}</p>

                  <div className="flex items-center gap-2 border-t border-zinc-800/50 pt-3">
                    {existsInOrg ? (
                      <button
                        className="flex-1 px-3 py-1.5 text-sm font-medium text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors flex items-center justify-center gap-1"
                        onClick={() => setSendingTemplate({ name: pt.name })}
                      >
                        <Send className="h-3.5 w-3.5" />
                        Send
                      </button>
                    ) : (
                      <button
                        className="flex-1 px-3 py-1.5 text-sm font-medium text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors flex items-center justify-center gap-1"
                        onClick={() =>
                          setCreateFromPrebuilt({
                            name: pt.name,
                            docType: pt.docType,
                            description: pt.description,
                          })
                        }
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Create Template
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Org Templates */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 px-1">
          Your Templates
        </h2>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <SkeletonCard /><SkeletonCard /><SkeletonCard />
          </div>
        ) : filteredTemplates.length === 0 ? (
          <EmptyState
            iconType="inbox"
            title="No custom templates yet"
            description={searchTerm ? "Try adjusting your search criteria" : "Create a custom template or use one of the quick-start templates above."}
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
                  {template.is_active && (
                    <button
                      className="flex-1 px-3 py-1.5 text-sm font-medium text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors flex items-center justify-center gap-1"
                      onClick={() =>
                        setSendingTemplate({ name: template.name, id: template.id })
                      }
                    >
                      <Send className="h-3.5 w-3.5" />
                      Send
                    </button>
                  )}
                  <button
                    className="px-3 py-1.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800 rounded-lg transition-colors flex items-center justify-center gap-1"
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
      </div>

      {/* Modals */}
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
      <TemplateFormModal
        key={createFromPrebuilt?.name}
        isOpen={!!createFromPrebuilt}
        onClose={() => setCreateFromPrebuilt(null)}
        defaultValues={createFromPrebuilt ?? undefined}
      />
      <SendFromTemplateModal
        key={sendingTemplate?.name}
        isOpen={!!sendingTemplate}
        onClose={() => setSendingTemplate(null)}
        templateName={sendingTemplate?.name ?? ""}
        templateId={sendingTemplate?.id}
      />
    </PageContainer>
  );
}

"use client";

import { useState } from "react";
import {
  Search,
  PenTool,
  CheckCircle,
  Clock,
  Send,
  Eye,
  X,
  ExternalLink,
  XCircle,
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
import { DocumentStatusBadge } from "@/components/document-status-badge";

export const dynamic = "force-dynamic";

const inputClass = "w-full h-10 px-3 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors";

const statusMap: Record<string, "pending_signature" | "signed" | "voided" | undefined> = {
  all: undefined,
  pending: "pending_signature",
  signed: "signed",
  voided: "voided",
};

// ── Send from Template Modal ───────────────────────────────
// Primary flow: operator picks a DocuSign template + resident → envelope sent
function SendFromTemplateModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [templateId, setTemplateId] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [residentId, setResidentId] = useState("");
  const [emailSubject, setEmailSubject] = useState("");

  const { data: templates, isLoading: templatesLoading } = trpc.esign.listTemplates.useQuery(
    undefined,
    { enabled: isOpen }
  );

  const { data: residentsData } = trpc.resident.list.useQuery(
    { limit: 200 },
    { enabled: isOpen }
  );

  const sendFromTemplate = trpc.esign.sendFromTemplate.useMutation({
    onSuccess: (data) => {
      toast("success", "Sent for signature", `Envelope sent to ${data.signerEmail}`);
      utils.document.list.invalidate();
      resetAndClose();
    },
    onError: (err) => toast("error", "Failed to send", err.message),
  });

  function resetAndClose() {
    setTemplateId("");
    setTemplateName("");
    setResidentId("");
    setEmailSubject("");
    onClose();
  }

  function handleTemplateChange(id: string) {
    setTemplateId(id);
    const tmpl = (templates ?? []).find((t) => t.templateId === id);
    if (tmpl) setTemplateName(tmpl.name);
  }

  if (!isOpen) return null;

  const residentList = residentsData?.items ?? [];

  // Fallback built-in templates when no DocuSign templates configured yet
  const builtInTemplates = [
    { templateId: "house-rules", name: "House Rules Agreement" },
    { templateId: "move-in", name: "Move-In Agreement" },
    { templateId: "financial", name: "Financial Agreement" },
    { templateId: "emergency", name: "Emergency Contact Form" },
    { templateId: "drug-testing", name: "Drug Testing Consent" },
  ];
  const templateList = templates && templates.length > 0 ? templates : builtInTemplates;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={resetAndClose} />
      <div className="relative bg-zinc-900 rounded-2xl shadow-xl w-full max-w-lg mx-4 border border-zinc-800">
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-zinc-100">Send for Signature</h2>
            <p className="text-sm text-zinc-500 mt-1">Choose a template and resident to send via DocuSign</p>
          </div>
          <button onClick={resetAndClose} className="p-1 text-zinc-500 hover:text-zinc-300">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendFromTemplate.mutate({
              templateId,
              templateName,
              residentId,
              emailSubject: emailSubject || undefined,
            });
          }}
          className="p-6 space-y-4"
        >
          {/* Template Selection */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              Document Template <span className="text-red-400">*</span>
            </label>
            <select
              required
              value={templateId}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className={inputClass}
              disabled={templatesLoading}
            >
              <option value="">{templatesLoading ? "Loading templates..." : "Select a template..."}</option>
              {templateList.map((t) => (
                <option key={t.templateId} value={t.templateId}>
                  {t.name}
                </option>
              ))}
            </select>
            {templates && templates.length === 0 && (
              <p className="text-xs text-zinc-500 mt-1">
                No DocuSign templates found — using built-in list. Configure templates in your DocuSign account.
              </p>
            )}
          </div>

          {/* Resident Selection */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              Resident <span className="text-red-400">*</span>
            </label>
            <select
              required
              value={residentId}
              onChange={(e) => setResidentId(e.target.value)}
              className={inputClass}
            >
              <option value="">Select a resident...</option>
              {residentList.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.first_name} {r.last_name}
                  {r.email ? ` — ${r.email}` : " (no email — add email first)"}
                </option>
              ))}
            </select>
          </div>

          {/* Optional subject override */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Email Subject (Optional)</label>
            <input
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              className={inputClass}
              placeholder={templateName ? `Please sign: ${templateName}` : "Please sign this document"}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={resetAndClose}>Cancel</Button>
            <Button
              type="submit"
              variant="primary"
              icon={<Send className="h-4 w-4" />}
              disabled={!templateId || !residentId || sendFromTemplate.isPending}
            >
              {sendFromTemplate.isPending ? "Sending..." : "Send for Signature"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── View Document Modal ────────────────────────────────────
function ViewDocModal({
  isOpen,
  onClose,
  doc,
}: {
  isOpen: boolean;
  onClose: () => void;
  doc: { id: string; title: string; status: string; docusign_status?: string | null; docusign_envelope_id?: string | null; created_at: string; resident?: { first_name: string; last_name: string } | null } | null;
}) {
  const { toast } = useToast();

  const [signerEmail, setSignerEmail] = useState("");
  const [signerName, setSignerName] = useState("");

  const getSigningUrl = trpc.esign.getSigningUrl.useMutation({
    onSuccess: (data) => {
      if (data.signingUrl) {
        window.open(data.signingUrl, "_blank");
      } else {
        toast("info", "No signing URL available");
      }
    },
    onError: (err) => toast("error", "Failed to get signing URL", err.message),
  });

  const getStatus = trpc.esign.getStatus.useQuery(
    { documentId: doc?.id ?? "" },
    { enabled: isOpen && !!doc }
  );

  if (!isOpen || !doc) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-zinc-900 rounded-2xl shadow-xl w-full max-w-md mx-4 border border-zinc-800">
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-100">Signature Details</h2>
          <button onClick={onClose} className="p-1 text-zinc-500 hover:text-zinc-300">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Document</label>
            <p className="text-sm text-zinc-100 mt-1">{doc.title}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Status</label>
              <div className="mt-1">
                <DocumentStatusBadge status={doc.status} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Resident</label>
              <p className="text-sm text-zinc-100 mt-1">
                {doc.resident ? `${doc.resident.first_name} ${doc.resident.last_name}` : "Organization"}
              </p>
            </div>
          </div>
          {doc.docusign_status && (
            <div>
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">DocuSign Status</label>
              <div className="mt-1">
                <DocumentStatusBadge status={doc.docusign_status} />
              </div>
            </div>
          )}
          {doc.docusign_envelope_id && (
            <div>
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Envelope ID</label>
              <p className="text-xs text-zinc-500 mt-1 font-mono">{doc.docusign_envelope_id}</p>
            </div>
          )}
          {getStatus.data?.signatures && getStatus.data.signatures.length > 0 && (
            <div>
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Signers</label>
              <div className="mt-2 space-y-2">
                {getStatus.data.signatures.map((sig) => (
                  <div key={sig.id} className="flex items-center justify-between py-1.5 px-3 bg-zinc-800/30 rounded-lg">
                    <span className="text-sm text-zinc-300">{sig.signerName}</span>
                    <Badge variant={sig.signedAt ? "success" : "warning"} size="sm">
                      {sig.signedAt ? `Signed ${new Date(sig.signedAt).toLocaleDateString()}` : "Pending"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
          {doc.status === "pending_signature" && (
            <div className="space-y-3 border-t border-zinc-800 pt-4">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Generate Signing Link</p>
              <input
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                className={inputClass}
                placeholder="Signer name"
              />
              <input
                value={signerEmail}
                onChange={(e) => setSignerEmail(e.target.value)}
                className={inputClass}
                placeholder="Signer email"
              />
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            {doc.status === "pending_signature" && (
              <Button
                variant="secondary"
                icon={<ExternalLink className="h-4 w-4" />}
                onClick={() => getSigningUrl.mutate({ documentId: doc.id, signerEmail, signerName })}
                disabled={getSigningUrl.isPending || !signerEmail || !signerName}
              >
                Open Signing
              </Button>
            )}
            <Button variant="secondary" onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────
export default function SignatureTrackerPage() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showSendModal, setShowSendModal] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<any>(null);

  const { data, isLoading } = trpc.document.list.useQuery({
    status: statusMap[activeTab],
    search: searchTerm || undefined,
    limit: 50,
  });

  const voidEnvelope = trpc.esign.voidEnvelope.useMutation({
    onSuccess: () => {
      toast("success", "Document voided");
      utils.document.list.invalidate();
    },
    onError: (err) => toast("error", "Failed to void", err.message),
  });

  const documents = data?.items ?? [];

  const signatureDocs = documents.filter((d) =>
    ["pending_signature", "signed", "voided"].includes(d.status)
  );

  const pendingCount = signatureDocs.filter((d) => d.status === "pending_signature").length;
  const signedCount = signatureDocs.filter((d) => d.status === "signed").length;

  const tabs = [
    { id: "all", label: "All" },
    { id: "pending", label: "Pending" },
    { id: "signed", label: "Signed" },
    { id: "voided", label: "Voided" },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Signature Tracker"
        actions={
          <Button
            variant="primary"
            icon={<Send className="h-4 w-4" />}
            onClick={() => setShowSendModal(true)}
          >
            Send for Signature
          </Button>
        }
      />

      <StatCardGrid columns={3}>
        <StatCard
          title="Pending Signatures"
          value={isLoading ? "\u2014" : String(pendingCount)}
          subtitle="Awaiting signatures"
          variant="warning"
          icon={<Clock className="h-5 w-5" />}
          loading={isLoading}
        />
        <StatCard
          title="Completed"
          value={isLoading ? "\u2014" : String(signedCount)}
          subtitle="Fully signed"
          variant="success"
          icon={<CheckCircle className="h-5 w-5" />}
          loading={isLoading}
        />
        <StatCard
          title="Total Documents"
          value={isLoading ? "\u2014" : String(signatureDocs.length)}
          subtitle="With signature tracking"
          icon={<PenTool className="h-5 w-5" />}
          loading={isLoading}
        />
      </StatCardGrid>

      {/* Search + Tabs */}
      <div className="space-y-0">
        <div className="pb-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search documents..."
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

      {/* Document list */}
      {isLoading ? (
        <SkeletonTable rows={5} columns={5} />
      ) : signatureDocs.length === 0 ? (
        <EmptyState
          iconType="inbox"
          title="No documents found"
          description={searchTerm ? "Try adjusting your search" : "Send a document for signature to get started."}
          action={!searchTerm ? { label: "Send for Signature", onClick: () => setShowSendModal(true) } : undefined}
        />
      ) : (
        <div className="space-y-3">
          {signatureDocs.map((doc) => (
            <div key={doc.id} className="border border-zinc-800 rounded-lg p-4 hover:bg-zinc-800/30 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${
                    doc.status === "signed" ? "bg-green-500/10" :
                    doc.status === "pending_signature" ? "bg-amber-500/10" :
                    "bg-zinc-800"
                  }`}>
                    {doc.status === "signed" ? (
                      <CheckCircle className="h-4 w-4 text-green-400" />
                    ) : doc.status === "pending_signature" ? (
                      <Clock className="h-4 w-4 text-amber-400" />
                    ) : (
                      <XCircle className="h-4 w-4 text-zinc-500" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-zinc-100">{doc.title}</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {doc.resident ? `${doc.resident.first_name} ${doc.resident.last_name}` : "Organization"} &bull;{" "}
                      Created {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                    {doc.docusign_envelope_id && (
                      <p className="text-xs text-zinc-600 mt-0.5 font-mono">
                        Envelope: {doc.docusign_envelope_id.slice(0, 20)}...
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <DocumentStatusBadge status={doc.status} />
                  {doc.docusign_status && doc.docusign_status !== doc.status && (
                    <DocumentStatusBadge status={doc.docusign_status} size="sm" />
                  )}
                  <button
                    className="p-1 text-zinc-500 hover:text-indigo-400"
                    title="View Details"
                    onClick={() => setViewingDoc(doc)}
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {doc.status === "pending_signature" && (
                <div className="mt-3 flex gap-2">
                  <button
                    className="text-xs text-red-400 hover:text-red-300 font-medium"
                    onClick={() => {
                      if (window.confirm("Void this document?")) {
                        voidEnvelope.mutate({ documentId: doc.id, reason: "Voided by admin" });
                      }
                    }}
                  >
                    Void Document
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <SendFromTemplateModal isOpen={showSendModal} onClose={() => setShowSendModal(false)} />
      <ViewDocModal isOpen={!!viewingDoc} onClose={() => setViewingDoc(null)} doc={viewingDoc} />
    </PageContainer>
  );
}

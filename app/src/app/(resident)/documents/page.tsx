"use client";

import { useState } from "react";
import {
  FileText,
  PenTool,
  Download,
  CheckCircle,
  Shield,
  Eye,
  Loader2,
  ExternalLink,
  X,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/components/ui";

export const dynamic = "force-dynamic";

// ── Embedded Signing Modal ─────────────────────────────────
function EmbeddedSigningModal({
  isOpen,
  onClose,
  signingUrl,
}: {
  isOpen: boolean;
  onClose: () => void;
  signingUrl: string | null;
}) {
  if (!isOpen || !signingUrl) return null;

  // Check if URL is a real DocuSign URL (not placeholder) for iframe embedding
  const isRealDocuSignUrl = signingUrl.startsWith("https://");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-zinc-900 rounded-2xl shadow-xl w-full max-w-4xl mx-4 border border-zinc-800 h-[85vh] flex flex-col">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <PenTool className="h-4 w-4 text-indigo-400" />
            <h2 className="text-lg font-semibold text-zinc-100">Sign Document</h2>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-500 hover:text-zinc-300">
            <X className="h-5 w-5" />
          </button>
        </div>
        {isRealDocuSignUrl ? (
          <div className="flex-1">
            <iframe
              src={signingUrl}
              className="w-full h-full rounded-b-2xl"
              title="DocuSign Signing"
              allow="camera; microphone"
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <PenTool className="h-12 w-12 text-indigo-400 mb-4" />
            <h3 className="text-lg font-semibold text-zinc-100 mb-2">DocuSign Signing</h3>
            <p className="text-sm text-zinc-400 mb-6 max-w-md">
              The signing experience will open here when DocuSign is fully configured.
              For now, click below to open the signing page in a new tab.
            </p>
            <a
              href={signingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-500 text-sm"
            >
              <ExternalLink className="h-4 w-4" />
              Open Signing Page
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResidentDocumentsPage() {
  const { toast } = useToast();
  const { data: userData } = trpc.user.getCurrentUser.useQuery();
  const residentId = userData?.scope_type === "resident" ? userData.scope_id : undefined;

  const [signingUrl, setSigningUrl] = useState<string | null>(null);

  const { data: docsData, isLoading } = trpc.document.list.useQuery(
    { residentId: residentId! },
    { enabled: !!residentId }
  );

  const getSigningUrl = trpc.esign.getSigningUrl.useMutation({
    onSuccess: (data) => {
      if (data.signingUrl) {
        setSigningUrl(data.signingUrl);
      } else {
        toast("info", "Signing URL not available", "The document may not be ready for signing yet.");
      }
    },
    onError: (err) => toast("error", "Failed to get signing link", err.message),
  });

  const getDownloadUrl = trpc.document.getDownloadUrl.useMutation({
    onSuccess: (data) => {
      if (data.downloadUrl) {
        window.open(data.downloadUrl, "_blank");
      } else {
        toast("info", "Download not available", "The document file has not been uploaded yet.");
      }
    },
    onError: (err) => toast("error", "Failed to get download link", err.message),
  });

  const documents = docsData?.items ?? [];
  const pendingSignatures = documents.filter(
    (d) => d.docusign_status === "sent" || d.docusign_status === "delivered" || d.status === "pending_signature"
  );
  const signedDocuments = documents.filter(
    (d) => d.docusign_status === "completed" || d.status === "signed"
  );
  const otherDocuments = documents.filter(
    (d) =>
      !["sent", "delivered", "completed"].includes(d.docusign_status ?? "") &&
      !["pending_signature", "signed"].includes(d.status)
  );

  const getSensitivityLabel = (level: string | null) => {
    const labels: Record<string, { label: string; className: string }> = {
      public: { label: "Public", className: "text-zinc-500" },
      internal: { label: "Internal", className: "text-indigo-400" },
      confidential: { label: "Confidential", className: "text-amber-400" },
      part2_protected: { label: "Part 2 Protected", className: "text-red-400" },
    };
    return labels[level ?? "internal"] || labels.internal!;
  };

  const userName = userData?.first_name && userData?.last_name
    ? `${userData.first_name} ${userData.last_name}`
    : "Resident";
  const userEmailAddr = userData?.email ?? "";

  const handleSignNow = (docId: string) => {
    if (!userEmailAddr) {
      toast("error", "Email required", "Your account does not have an email address.");
      return;
    }
    getSigningUrl.mutate({
      documentId: docId,
      signerEmail: userEmailAddr,
      signerName: userName,
    });
  };

  const handleView = (docId: string) => {
    getDownloadUrl.mutate({ id: docId });
  };

  const handleDownload = (docId: string) => {
    getDownloadUrl.mutate({ id: docId });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  // No resident linked
  if (!residentId) {
    return (
      <div className="p-4 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">My Documents</h1>
          <p className="text-zinc-400 mt-1">View and sign your documents</p>
        </div>
        <div className="bg-zinc-800/40 border border-zinc-800 rounded-lg p-6 text-center">
          <FileText className="h-10 w-10 text-zinc-500 mx-auto mb-3" />
          <p className="text-zinc-400">No resident account linked. Contact your house manager.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">My Documents</h1>
        <p className="text-zinc-400 mt-1">View and sign your documents</p>
      </div>

      {pendingSignatures.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <PenTool className="h-5 w-5 text-amber-400" />
            <h2 className="font-semibold text-amber-300">
              {pendingSignatures.length} Document{pendingSignatures.length > 1 ? "s" : ""} Awaiting Your Signature
            </h2>
          </div>
          <div className="space-y-2">
            {pendingSignatures.map((doc) => (
              <div
                key={doc.id}
                className="bg-zinc-900 rounded-lg border border-amber-500/30 p-4 flex items-center justify-between"
              >
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 bg-amber-500/15 rounded-lg">
                    <PenTool className="h-4 w-4 text-amber-400" />
                  </div>
                  <div>
                    <p className="font-medium text-zinc-100">{doc.title ?? doc.description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {doc.created_at && (
                        <p className="text-sm text-zinc-400">
                          Requested {new Date(doc.created_at).toLocaleDateString()}
                        </p>
                      )}
                      {doc.docusign_status === "delivered" && (
                        <span className="text-xs text-indigo-400 font-medium">Viewed</span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleSignNow(doc.id)}
                  disabled={getSigningUrl.isPending}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-500 text-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  {getSigningUrl.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <PenTool className="h-3.5 w-3.5" />
                  )}
                  Sign Now
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-zinc-900 rounded-lg border border-zinc-800">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-100">Signed Documents</h2>
          <span className="text-sm text-zinc-400">{signedDocuments.length + otherDocuments.length} documents</span>
        </div>
        <div className="divide-y divide-zinc-800/50">
          {[...signedDocuments, ...otherDocuments].length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-sm">No documents yet</div>
          ) : (
            [...signedDocuments, ...otherDocuments].map((doc) => {
              const sensitivity = getSensitivityLabel(doc.sensitivity_level);

              return (
                <div key={doc.id} className="p-4 hover:bg-zinc-800/40 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-green-500/15 rounded-lg">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-zinc-100">{doc.title ?? doc.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {doc.created_at && (
                          <span className="text-sm text-zinc-400">
                            {new Date(doc.created_at).toLocaleDateString()}
                          </span>
                        )}
                        <span className="text-zinc-600">&bull;</span>
                        <span className={`text-xs font-medium flex items-center gap-1 ${sensitivity.className}`}>
                          <Shield className="h-3 w-3" />
                          {sensitivity.label}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleView(doc.id)}
                        disabled={getDownloadUrl.isPending}
                        className="p-2 text-zinc-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDownload(doc.id)}
                        disabled={getDownloadUrl.isPending}
                        className="p-2 text-zinc-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <Shield className="h-5 w-5 text-indigo-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-indigo-100">Your Privacy</p>
            <p className="text-xs text-indigo-200 mt-1">
              Documents marked &quot;Part 2 Protected&quot; are subject to 42 CFR Part 2 regulations.
              Your substance use disorder treatment records cannot be shared without your written consent.
            </p>
          </div>
        </div>
      </div>

      {/* Embedded Signing Modal */}
      <EmbeddedSigningModal
        isOpen={!!signingUrl}
        onClose={() => setSigningUrl(null)}
        signingUrl={signingUrl}
      />
    </div>
  );
}

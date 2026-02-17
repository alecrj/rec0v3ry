"use client";

import Link from "next/link";
import {
  FileText,
  PenTool,
  Download,
  Clock,
  CheckCircle,
  ChevronRight,
  Shield,
  Eye,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default function ResidentDocumentsPage() {
  const pendingSignatures = [
    {
      id: "1",
      title: "Monthly House Meeting Agreement - February",
      type: "house_rules",
      requestedAt: "2026-02-10",
      method: "click_to_sign",
    },
    {
      id: "2",
      title: "Updated Consent Form (42 CFR Part 2)",
      type: "consent_form",
      requestedAt: "2026-02-08",
      method: "electronic",
    },
  ];

  const myDocuments = [
    {
      id: "1",
      title: "Resident Agreement",
      type: "resident_agreement",
      status: "signed",
      signedAt: "2026-01-15",
      sensitivity: "confidential",
    },
    {
      id: "2",
      title: "Intake Assessment Form",
      type: "intake_form",
      status: "signed",
      signedAt: "2026-01-15",
      sensitivity: "part2_protected",
    },
    {
      id: "3",
      title: "Consent to Treatment",
      type: "consent_form",
      status: "signed",
      signedAt: "2026-01-15",
      sensitivity: "part2_protected",
    },
    {
      id: "4",
      title: "Financial Agreement",
      type: "financial_agreement",
      status: "signed",
      signedAt: "2026-01-15",
      sensitivity: "confidential",
    },
    {
      id: "5",
      title: "House Rules Acknowledgment",
      type: "house_rules",
      status: "signed",
      signedAt: "2026-01-15",
      sensitivity: "internal",
    },
  ];

  const getTypeIcon = (type: string) => {
    if (type === "consent_form" || type === "release_of_info") return Shield;
    if (type === "financial_agreement") return FileText;
    return FileText;
  };

  const getSensitivityLabel = (level: string) => {
    const labels: Record<string, { label: string; className: string }> = {
      public: { label: "Public", className: "text-slate-500" },
      internal: { label: "Internal", className: "text-blue-600" },
      confidential: { label: "Confidential", className: "text-orange-600" },
      part2_protected: { label: "Part 2 Protected", className: "text-red-600" },
    };
    return labels[level] || labels.internal;
  };

  return (
    <div className="p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Documents</h1>
        <p className="text-slate-600 mt-1">View and sign your documents</p>
      </div>

      {pendingSignatures.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <PenTool className="h-5 w-5 text-yellow-600" />
            <h2 className="font-semibold text-yellow-900">
              {pendingSignatures.length} Document{pendingSignatures.length > 1 ? "s" : ""} Awaiting Your Signature
            </h2>
          </div>
          <div className="space-y-2">
            {pendingSignatures.map((doc) => (
              <div
                key={doc.id}
                className="bg-white rounded-lg border border-yellow-200 p-4 flex items-center justify-between"
              >
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <PenTool className="h-4 w-4 text-yellow-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{doc.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-sm text-slate-600">
                        Requested {new Date(doc.requestedAt).toLocaleDateString()}
                      </p>
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                        {doc.method === "electronic" ? "DocuSign" : "Click to Sign"}
                      </span>
                    </div>
                  </div>
                </div>
                <button className="px-4 py-2 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700 text-sm flex items-center gap-1">
                  Sign Now
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Signed Documents</h2>
          <span className="text-sm text-slate-600">{myDocuments.length} documents</span>
        </div>
        <div className="divide-y divide-slate-100">
          {myDocuments.map((doc) => {
            const TypeIcon = getTypeIcon(doc.type);
            const sensitivity = getSensitivityLabel(doc.sensitivity);

            return (
              <div
                key={doc.id}
                className="p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900">{doc.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-slate-600">
                        Signed {new Date(doc.signedAt).toLocaleDateString()}
                      </span>
                      <span className="text-slate-300">&bull;</span>
                      <span className={`text-xs font-medium flex items-center gap-1 ${sensitivity.className}`}>
                        <Shield className="h-3 w-3" />
                        {sensitivity.label}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="View"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-900">Your Privacy</p>
            <p className="text-xs text-blue-800 mt-1">
              Documents marked &quot;Part 2 Protected&quot; are subject to 42 CFR Part 2 regulations.
              Your substance use disorder treatment records cannot be shared without your written consent.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

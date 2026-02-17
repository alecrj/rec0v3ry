"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Upload,
  Download,
  FileText,
  Eye,
  Calendar,
  ArrowUpRight,
  Filter,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default function DocumentLibraryPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const tabs = [
    { id: "all", label: "All" },
    { id: "draft", label: "Draft" },
    { id: "pending_signature", label: "Pending Signature" },
    { id: "signed", label: "Signed" },
    { id: "expired", label: "Expired" },
  ];

  const documents = [
    {
      id: "1",
      title: "Resident Agreement - Sarah Martinez",
      type: "resident_agreement",
      resident: "Sarah Martinez",
      status: "signed",
      sensitivity: "confidential",
      createdAt: "2026-01-15",
      updatedAt: "2026-01-20",
    },
    {
      id: "2",
      title: "Intake Form - Michael Chen",
      type: "intake_form",
      resident: "Michael Chen",
      status: "pending_signature",
      sensitivity: "part2_protected",
      createdAt: "2026-02-10",
      updatedAt: "2026-02-10",
    },
    {
      id: "3",
      title: "House Rules v3",
      type: "house_rules",
      resident: null,
      status: "signed",
      sensitivity: "internal",
      createdAt: "2025-12-01",
      updatedAt: "2026-01-05",
    },
    {
      id: "4",
      title: "Release of Information - Jennifer Parker",
      type: "release_of_info",
      resident: "Jennifer Parker",
      status: "draft",
      sensitivity: "part2_protected",
      createdAt: "2026-02-11",
      updatedAt: "2026-02-11",
    },
    {
      id: "5",
      title: "Financial Agreement - Robert Thompson",
      type: "financial_agreement",
      resident: "Robert Thompson",
      status: "pending_signature",
      sensitivity: "confidential",
      createdAt: "2026-02-08",
      updatedAt: "2026-02-09",
    },
    {
      id: "6",
      title: "Consent Form - Lisa Anderson",
      type: "consent_form",
      resident: "Lisa Anderson",
      status: "expired",
      sensitivity: "part2_protected",
      createdAt: "2025-06-15",
      updatedAt: "2025-06-15",
    },
    {
      id: "7",
      title: "Discharge Summary - David Wilson",
      type: "discharge_summary",
      resident: "David Wilson",
      status: "signed",
      sensitivity: "part2_protected",
      createdAt: "2026-01-30",
      updatedAt: "2026-02-01",
    },
  ];

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: "bg-slate-100 text-slate-700",
      pending_signature: "bg-yellow-100 text-yellow-700",
      signed: "bg-green-100 text-green-700",
      expired: "bg-red-100 text-red-700",
      voided: "bg-slate-100 text-slate-500",
    };
    const labels: Record<string, string> = {
      draft: "Draft",
      pending_signature: "Pending Signature",
      signed: "Signed",
      expired: "Expired",
      voided: "Voided",
    };
    return {
      className: styles[status] || styles.draft,
      label: labels[status] || status,
    };
  };

  const getSensitivityBadge = (level: string) => {
    const styles: Record<string, string> = {
      public: "bg-slate-100 text-slate-600",
      internal: "bg-blue-100 text-blue-700",
      confidential: "bg-orange-100 text-orange-700",
      part2_protected: "bg-red-100 text-red-700",
    };
    const labels: Record<string, string> = {
      public: "Public",
      internal: "Internal",
      confidential: "Confidential",
      part2_protected: "Part 2",
    };
    return {
      className: styles[level] || styles.internal,
      label: labels[level] || level,
    };
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
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
    return labels[type] || type;
  };

  const filteredDocs = documents.filter((doc) => {
    const matchesTab = activeTab === "all" || doc.status === activeTab;
    const matchesSearch =
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.resident &&
        doc.resident.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesTab && matchesSearch;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Document Library
          </h1>
          <p className="text-slate-600 mt-1">
            Manage all resident and organization documents
          </p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Document
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by title or resident name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <button className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </button>
          </div>
        </div>

        <div className="border-b border-slate-200">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {filteredDocs.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                      Document
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                      Type
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                      Resident
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                      Sensitivity
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                      Updated
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocs.map((doc) => {
                    const statusBadge = getStatusBadge(doc.status);
                    const sensitivityBadge = getSensitivityBadge(
                      doc.sensitivity
                    );
                    return (
                      <tr
                        key={doc.id}
                        className="border-b border-slate-100 hover:bg-slate-50"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-slate-400 flex-shrink-0" />
                            <span className="text-sm font-medium text-slate-900">
                              {doc.title}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600">
                          {getTypeLabel(doc.type)}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600">
                          {doc.resident || "—"}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${sensitivityBadge.className}`}
                          >
                            {sensitivityBadge.label}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${statusBadge.className}`}
                          >
                            {statusBadge.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600">
                          {new Date(doc.updatedAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <button
                              className="p-1 text-slate-400 hover:text-blue-600"
                              title="View"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              className="p-1 text-slate-400 hover:text-blue-600"
                              title="Download"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-slate-200 flex items-center justify-between">
              <button className="px-3 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export
              </button>
              <p className="text-sm text-slate-600">
                Showing {filteredDocs.length} of {documents.length} documents
              </p>
            </div>
          </>
        ) : (
          <div className="p-12 text-center">
            <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-900">
              No documents found
            </p>
            <p className="text-sm text-slate-600 mt-1">
              {searchTerm
                ? "Try adjusting your search criteria"
                : "Upload or create your first document to get started"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

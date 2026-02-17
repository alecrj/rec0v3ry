"use client";

import { useState } from "react";
import {
  Search,
  PenTool,
  CheckCircle,
  Clock,
  XCircle,
  Send,
  Eye,
  ArrowUpRight,
  Filter,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  variant?: "default" | "success" | "warning" | "danger";
}

function StatCard({ title, value, subtitle, icon: Icon, variant = "default" }: StatCardProps) {
  const variantStyles = {
    default: "bg-blue-50 text-blue-600",
    success: "bg-green-50 text-green-600",
    warning: "bg-yellow-50 text-yellow-600",
    danger: "bg-red-50 text-red-600",
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-600">{title}</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{value}</p>
          <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
        </div>
        <div className={`p-3 rounded-lg ${variantStyles[variant]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

export default function SignatureTrackerPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const tabs = [
    { id: "all", label: "All" },
    { id: "pending", label: "Pending" },
    { id: "signed", label: "Signed" },
    { id: "voided", label: "Voided" },
  ];

  const envelopes = [
    {
      id: "1",
      document: "Resident Agreement - Sarah Martinez",
      signers: [
        { name: "Sarah Martinez", status: "signed", signedAt: "2026-01-20" },
        { name: "Mike Johnson (Manager)", status: "signed", signedAt: "2026-01-21" },
      ],
      status: "completed",
      createdAt: "2026-01-19",
      method: "electronic",
    },
    {
      id: "2",
      document: "Intake Form - Michael Chen",
      signers: [
        { name: "Michael Chen", status: "pending", signedAt: null },
        { name: "Dr. Lisa Park", status: "pending", signedAt: null },
      ],
      status: "pending",
      createdAt: "2026-02-10",
      method: "electronic",
    },
    {
      id: "3",
      document: "Release of Info - Jennifer Parker",
      signers: [
        { name: "Jennifer Parker", status: "signed", signedAt: "2026-02-09" },
        { name: "Records Dept", status: "pending", signedAt: null },
      ],
      status: "pending",
      createdAt: "2026-02-08",
      method: "electronic",
    },
    {
      id: "4",
      document: "Financial Agreement - Robert Thompson",
      signers: [
        { name: "Robert Thompson", status: "pending", signedAt: null },
      ],
      status: "pending",
      createdAt: "2026-02-08",
      method: "electronic",
    },
    {
      id: "5",
      document: "House Rules Ack - Lisa Anderson",
      signers: [
        { name: "Lisa Anderson", status: "signed", signedAt: "2025-06-15" },
      ],
      status: "voided",
      createdAt: "2025-06-14",
      method: "click_to_sign",
    },
  ];

  const getEnvelopeStatus = (status: string) => {
    const config: Record<string, { className: string; label: string; icon: React.ComponentType<{ className?: string }> }> = {
      completed: { className: "bg-green-100 text-green-700", label: "Completed", icon: CheckCircle },
      pending: { className: "bg-yellow-100 text-yellow-700", label: "Pending", icon: Clock },
      voided: { className: "bg-slate-100 text-slate-500", label: "Voided", icon: XCircle },
    };
    return config[status] || config.pending;
  };

  const filteredEnvelopes = envelopes.filter((env) => {
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "pending" && env.status === "pending") ||
      (activeTab === "signed" && env.status === "completed") ||
      (activeTab === "voided" && env.status === "voided");
    const matchesSearch = env.document.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const pendingCount = envelopes.filter((e) => e.status === "pending").length;
  const completedCount = envelopes.filter((e) => e.status === "completed").length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Signature Tracker</h1>
          <p className="text-slate-600 mt-1">Track e-signature status across all documents</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2">
          <Send className="h-4 w-4" />
          Send for Signature
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Pending Signatures"
          value={String(pendingCount)}
          subtitle="Awaiting signatures"
          icon={Clock}
          variant="warning"
        />
        <StatCard
          title="Completed"
          value={String(completedCount)}
          subtitle="Fully signed"
          icon={CheckCircle}
          variant="success"
        />
        <StatCard
          title="Total Envelopes"
          value={String(envelopes.length)}
          subtitle="All time"
          icon={PenTool}
          variant="default"
        />
      </div>

      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
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

        {filteredEnvelopes.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {filteredEnvelopes.map((envelope) => {
              const statusConfig = getEnvelopeStatus(envelope.status);
              const StatusIcon = statusConfig.icon;
              return (
                <div key={envelope.id} className="p-4 hover:bg-slate-50">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-medium text-slate-900">{envelope.document}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Sent {new Date(envelope.createdAt).toLocaleDateString()} &bull; {envelope.method === "electronic" ? "DocuSign" : "Click-to-Sign"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${statusConfig.className}`}>
                        <StatusIcon className="h-3 w-3" />
                        {statusConfig.label}
                      </span>
                      <button className="p-1 text-slate-400 hover:text-blue-600">
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {envelope.signers.map((signer, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${
                          signer.status === "signed"
                            ? "bg-green-50 text-green-700"
                            : "bg-slate-50 text-slate-600"
                        }`}
                      >
                        {signer.status === "signed" ? (
                          <CheckCircle className="h-3.5 w-3.5" />
                        ) : (
                          <Clock className="h-3.5 w-3.5" />
                        )}
                        <span>{signer.name}</span>
                        {signer.signedAt && (
                          <span className="text-xs opacity-70">
                            {new Date(signer.signedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {envelope.status === "pending" && (
                    <div className="mt-3 flex gap-2">
                      <button className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                        Resend Reminder
                      </button>
                      <span className="text-slate-300">|</span>
                      <button className="text-xs text-red-600 hover:text-red-700 font-medium">
                        Void Envelope
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center">
            <PenTool className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-900">No envelopes found</p>
            <p className="text-sm text-slate-600 mt-1">
              {searchTerm ? "Try adjusting your search" : "Send a document for signature to get started"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

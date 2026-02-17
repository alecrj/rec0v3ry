"use client";

import { useState } from "react";
import {
  Archive,
  AlertTriangle,
  Shield,
  Clock,
  CheckCircle,
  FileText,
  Trash2,
  Info,
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

export default function RetentionDashboardPage() {
  const policies = [
    {
      id: "1",
      name: "Part 2 Protected Records",
      documentType: "consent_form",
      retentionYears: 6,
      regulatoryBasis: "42 CFR Part 2",
      documentCount: 52,
      nextReview: "2026-06-15",
      isCompliant: true,
    },
    {
      id: "2",
      name: "Medical Records",
      documentType: "treatment_plan",
      retentionYears: 6,
      regulatoryBasis: "HIPAA",
      documentCount: 31,
      nextReview: "2026-06-15",
      isCompliant: true,
    },
    {
      id: "3",
      name: "Financial Records",
      documentType: "financial_agreement",
      retentionYears: 7,
      regulatoryBasis: "IRS / State",
      documentCount: 48,
      nextReview: "2026-03-01",
      isCompliant: true,
    },
    {
      id: "4",
      name: "Operational Records",
      documentType: "house_rules",
      retentionYears: 3,
      regulatoryBasis: "Internal Policy",
      documentCount: 15,
      nextReview: "2026-04-01",
      isCompliant: true,
    },
    {
      id: "5",
      name: "Incident Reports",
      documentType: "incident_report",
      retentionYears: 6,
      regulatoryBasis: "HIPAA / State",
      documentCount: 8,
      nextReview: "2026-06-15",
      isCompliant: false,
    },
  ];

  const expiringDocuments = [
    {
      id: "1",
      title: "Consent Form - Former Resident A",
      type: "consent_form",
      expiresAt: "2026-03-15",
      policy: "Part 2 Protected Records",
      action: "review",
    },
    {
      id: "2",
      title: "Financial Agreement - Former Resident B",
      type: "financial_agreement",
      expiresAt: "2026-04-01",
      policy: "Financial Records",
      action: "review",
    },
    {
      id: "3",
      title: "House Rules v1 (Superseded)",
      type: "house_rules",
      expiresAt: "2026-02-28",
      policy: "Operational Records",
      action: "delete",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Retention Dashboard</h1>
          <p className="text-slate-600 mt-1">Document retention policies and compliance</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Documents"
          value="154"
          subtitle="Under retention management"
          icon={FileText}
          variant="default"
        />
        <StatCard
          title="Compliant Policies"
          value="4/5"
          subtitle="Meeting retention requirements"
          icon={Shield}
          variant="success"
        />
        <StatCard
          title="Expiring Soon"
          value="3"
          subtitle="Within next 60 days"
          icon={Clock}
          variant="warning"
        />
        <StatCard
          title="Review Required"
          value="1"
          subtitle="Policy needs attention"
          icon={AlertTriangle}
          variant="danger"
        />
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-900">Regulatory Minimums</p>
            <p className="text-sm text-blue-800 mt-1">
              42 CFR Part 2: 6 years &bull; HIPAA Medical: 6 years &bull; Financial/IRS: 7 years &bull; Operational: 3 years
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Retention Policies</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Policy Name</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Document Type</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Retention Period</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Basis</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Documents</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Next Review</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {policies.map((policy) => (
                <tr key={policy.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Archive className="h-4 w-4 text-slate-400" />
                      <span className="text-sm font-medium text-slate-900">{policy.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600">{policy.documentType.replace(/_/g, " ")}</td>
                  <td className="py-3 px-4 text-sm font-medium text-slate-900">{policy.retentionYears} years</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded">
                      {policy.regulatoryBasis}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-right text-slate-900">{policy.documentCount}</td>
                  <td className="py-3 px-4 text-sm text-slate-600">
                    {new Date(policy.nextReview).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">
                    {policy.isCompliant ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-green-700">
                        <CheckCircle className="h-3.5 w-3.5" />
                        Compliant
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-medium text-red-700">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Review Required
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Documents Expiring Soon</h2>
          <p className="text-sm text-slate-600 mt-1">Documents approaching end of retention period</p>
        </div>
        <div className="divide-y divide-slate-100">
          {expiringDocuments.map((doc) => (
            <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="h-4 w-4 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">{doc.title}</p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Expires {new Date(doc.expiresAt).toLocaleDateString()} &bull; {doc.policy}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {doc.action === "delete" ? (
                  <button className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 flex items-center gap-1">
                    <Trash2 className="h-3.5 w-3.5" />
                    Schedule Deletion
                  </button>
                ) : (
                  <button className="px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50">
                    Review
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

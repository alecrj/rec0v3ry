"use client";

import {
  ShieldCheck,
  AlertTriangle,
  FileText,
  AlertCircle,
  UserCheck,
  Activity
} from "lucide-react";

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

export default function ComplianceDashboardPage() {
  const expiringConsents = [
    {
      id: "1",
      resident: "Sarah M.",
      type: "Treatment Disclosure",
      expires: "2026-02-19",
      daysLeft: 7,
    },
    {
      id: "2",
      resident: "Michael D.",
      type: "Family Contact",
      expires: "2026-02-24",
      daysLeft: 12,
    },
    {
      id: "3",
      resident: "Jennifer P.",
      type: "Employment Verification",
      expires: "2026-03-01",
      daysLeft: 17,
    },
  ];

  const recentDisclosures = [
    {
      id: "1",
      date: "2026-02-11",
      resident: "John S.",
      recipient: "Family Services Center",
      purpose: "Treatment Coordination",
      consentId: "CNS-2024-089",
    },
    {
      id: "2",
      date: "2026-02-10",
      resident: "Maria G.",
      recipient: "State Probation Office",
      purpose: "Legal Requirement",
      consentId: "CNS-2024-092",
    },
    {
      id: "3",
      date: "2026-02-09",
      resident: "Robert T.",
      recipient: "ABC Insurance Co.",
      purpose: "Insurance Claims",
      consentId: "CNS-2024-076",
    },
    {
      id: "4",
      date: "2026-02-08",
      resident: "Lisa M.",
      recipient: "Employer - Tech Corp",
      purpose: "Employment Verification",
      consentId: "CNS-2024-101",
    },
  ];

  const breachIncidents = [
    {
      id: "1",
      date: "2026-02-05",
      type: "Unauthorized Access",
      severity: "Medium",
      status: "Under Investigation",
      affectedCount: 1,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Compliance Dashboard</h1>
        <p className="text-slate-600 mt-1">HIPAA & 42 CFR Part 2 compliance overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Active Consents"
          value="47"
          subtitle="All residents covered"
          icon={ShieldCheck}
          variant="success"
        />
        <StatCard
          title="Expiring in 30 Days"
          value="12"
          subtitle="Renewal required soon"
          icon={AlertTriangle}
          variant="warning"
        />
        <StatCard
          title="Total Disclosures"
          value="28"
          subtitle="This month (Feb 2026)"
          icon={FileText}
          variant="default"
        />
        <StatCard
          title="Open Breach Incidents"
          value="1"
          subtitle="Under investigation"
          icon={AlertCircle}
          variant="danger"
        />
        <StatCard
          title="BAA Status"
          value="8"
          subtitle="Active agreements"
          icon={UserCheck}
          variant="success"
        />
        <StatCard
          title="Audit Events"
          value="342"
          subtitle="Today (Feb 12, 2026)"
          icon={Activity}
          variant="default"
        />
      </div>

      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Expiring Consents (Next 30 Days)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Resident
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Type
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Expires
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Days Left
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {expiringConsents.map((consent) => (
                <tr key={consent.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 text-sm font-medium text-slate-900">
                    {consent.resident}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600">{consent.type}</td>
                  <td className="py-3 px-4 text-sm text-slate-600">
                    {new Date(consent.expires).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        consent.daysLeft <= 7
                          ? "bg-red-100 text-red-700"
                          : consent.daysLeft <= 14
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {consent.daysLeft} days
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                      Renew
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Recent Disclosures</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Date
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Resident
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Recipient
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Purpose
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Consent ID
                </th>
              </tr>
            </thead>
            <tbody>
              {recentDisclosures.map((disclosure) => (
                <tr key={disclosure.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 text-sm text-slate-600">
                    {new Date(disclosure.date).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-sm font-medium text-slate-900">
                    {disclosure.resident}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600">{disclosure.recipient}</td>
                  <td className="py-3 px-4 text-sm text-slate-600">{disclosure.purpose}</td>
                  <td className="py-3 px-4">
                    <span className="text-sm font-mono text-slate-700">
                      {disclosure.consentId}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Open Breach Incidents</h2>
        </div>
        <div className="p-6">
          {breachIncidents.length > 0 ? (
            <div className="space-y-4">
              {breachIncidents.map((incident) => (
                <div
                  key={incident.id}
                  className="border border-red-200 bg-red-50 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm font-semibold text-red-900">
                          {incident.type}
                        </span>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            incident.severity === "High"
                              ? "bg-red-100 text-red-700"
                              : incident.severity === "Medium"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {incident.severity} Severity
                        </span>
                      </div>
                      <p className="text-sm text-red-800">
                        Reported: {new Date(incident.date).toLocaleDateString()} • Affected
                        Records: {incident.affectedCount}
                      </p>
                      <p className="text-sm font-medium text-red-900 mt-2">
                        Status: {incident.status}
                      </p>
                    </div>
                    <button className="text-sm text-red-700 hover:text-red-800 font-medium">
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <ShieldCheck className="h-12 w-12 text-green-600 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-900">No Open Incidents</p>
              <p className="text-sm text-slate-600 mt-1">All breach reports are resolved</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

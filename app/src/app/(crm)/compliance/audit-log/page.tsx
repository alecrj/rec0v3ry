"use client";

import { useState } from "react";
import { Search, Download, CheckCircle2 } from "lucide-react";

type SensitivityLevel = "part2" | "phi" | "pii" | "operational";

interface AuditEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  resource: string;
  resourceId: string;
  sensitivity: SensitivityLevel;
  ipAddress: string;
}

const mockAuditEntries: AuditEntry[] = [
  {
    id: "1",
    timestamp: "2026-02-12T14:32:15Z",
    user: "Sarah Johnson (Compliance Officer)",
    action: "consent_created",
    resource: "Consent",
    resourceId: "CNS-2026-123",
    sensitivity: "part2",
    ipAddress: "192.168.1.45",
  },
  {
    id: "2",
    timestamp: "2026-02-12T14:28:03Z",
    user: "Mike Davis (House Manager)",
    action: "resident_viewed",
    resource: "Resident",
    resourceId: "RES-8472",
    sensitivity: "phi",
    ipAddress: "192.168.1.32",
  },
  {
    id: "3",
    timestamp: "2026-02-12T14:15:42Z",
    user: "Jennifer Smith (Admin)",
    action: "disclosure_made",
    resource: "Disclosure",
    resourceId: "DSC-2026-089",
    sensitivity: "part2",
    ipAddress: "192.168.1.20",
  },
  {
    id: "4",
    timestamp: "2026-02-12T14:05:18Z",
    user: "Robert Taylor (Staff)",
    action: "login_success",
    resource: "Session",
    resourceId: "SESS-45892",
    sensitivity: "operational",
    ipAddress: "192.168.1.67",
  },
  {
    id: "5",
    timestamp: "2026-02-12T13:52:31Z",
    user: "Lisa Martinez (Case Manager)",
    action: "consent_revoked",
    resource: "Consent",
    resourceId: "CNS-2025-456",
    sensitivity: "part2",
    ipAddress: "192.168.1.54",
  },
  {
    id: "6",
    timestamp: "2026-02-12T13:40:05Z",
    user: "David Chen (Compliance Officer)",
    action: "baa_created",
    resource: "BAA",
    resourceId: "BAA-2026-007",
    sensitivity: "pii",
    ipAddress: "192.168.1.45",
  },
  {
    id: "7",
    timestamp: "2026-02-12T13:22:47Z",
    user: "Emily Wilson (Staff)",
    action: "resident_updated",
    resource: "Resident",
    resourceId: "RES-3921",
    sensitivity: "phi",
    ipAddress: "192.168.1.89",
  },
  {
    id: "8",
    timestamp: "2026-02-12T13:10:12Z",
    user: "System",
    action: "consent_expiry_reminder",
    resource: "Notification",
    resourceId: "NOT-1847",
    sensitivity: "operational",
    ipAddress: "127.0.0.1",
  },
];

export default function AuditLogPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedEventType, setSelectedEventType] = useState("");
  const [selectedResourceType, setSelectedResourceType] = useState("");
  const [selectedSensitivity, setSelectedSensitivity] = useState("");

  const getSensitivityBadge = (level: SensitivityLevel) => {
    const styles = {
      part2: "bg-red-100 text-red-700 border-red-200",
      phi: "bg-orange-100 text-orange-700 border-orange-200",
      pii: "bg-yellow-100 text-yellow-700 border-yellow-200",
      operational: "bg-slate-100 text-slate-700 border-slate-200",
    };

    const labels = {
      part2: "42 CFR Part 2",
      phi: "PHI",
      pii: "PII",
      operational: "Operational",
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium border ${styles[level]}`}>
        {labels[level]}
      </span>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Audit Log</h1>
          <p className="text-slate-600 mt-1">
            Tamper-evident audit trail for all system activities
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-700">Chain Verified</span>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-medium text-slate-700">
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          All audit events are cryptographically signed and chained to ensure integrity. Any
          tampering or deletion will be immediately detected. Logs are retained for 7 years per
          HIPAA requirements.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Date Range
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  defaultValue="2026-02-12"
                />
                <input
                  type="date"
                  className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  defaultValue="2026-02-12"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">User</label>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Users</option>
                <option value="sarah">Sarah Johnson</option>
                <option value="mike">Mike Davis</option>
                <option value="jennifer">Jennifer Smith</option>
                <option value="robert">Robert Taylor</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Event Type
              </label>
              <select
                value={selectedEventType}
                onChange={(e) => setSelectedEventType(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Events</option>
                <option value="consent">Consent Actions</option>
                <option value="disclosure">Disclosures</option>
                <option value="login">Login/Logout</option>
                <option value="resident">Resident Actions</option>
                <option value="baa">BAA Actions</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Resource Type
              </label>
              <select
                value={selectedResourceType}
                onChange={(e) => setSelectedResourceType(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Resources</option>
                <option value="consent">Consent</option>
                <option value="resident">Resident</option>
                <option value="disclosure">Disclosure</option>
                <option value="baa">BAA</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Sensitivity
              </label>
              <select
                value={selectedSensitivity}
                onChange={(e) => setSelectedSensitivity(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Levels</option>
                <option value="part2">42 CFR Part 2</option>
                <option value="phi">PHI</option>
                <option value="pii">PII</option>
                <option value="operational">Operational</option>
              </select>
            </div>
          </div>

          <div className="mt-3">
            <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">
              <Search className="h-4 w-4 inline-block mr-2" />
              Search
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Timestamp
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  User
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Action
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Resource
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Resource ID
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Sensitivity
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  IP Address
                </th>
              </tr>
            </thead>
            <tbody>
              {mockAuditEntries.map((entry) => (
                <tr key={entry.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 text-sm text-slate-600">
                    {new Date(entry.timestamp).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-900">{entry.user}</td>
                  <td className="py-3 px-4">
                    <span className="text-sm font-mono text-slate-700">{entry.action}</span>
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600">{entry.resource}</td>
                  <td className="py-3 px-4">
                    <span className="text-sm font-mono text-slate-700">{entry.resourceId}</span>
                  </td>
                  <td className="py-3 px-4">{getSensitivityBadge(entry.sensitivity)}</td>
                  <td className="py-3 px-4">
                    <span className="text-sm font-mono text-slate-600">{entry.ipAddress}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-slate-200 flex items-center justify-between">
          <p className="text-sm text-slate-600">Showing 8 of 342 entries</p>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 text-sm border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50">
              Previous
            </button>
            <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded">1</button>
            <button className="px-3 py-1 text-sm border border-slate-300 rounded hover:bg-slate-50">
              2
            </button>
            <button className="px-3 py-1 text-sm border border-slate-300 rounded hover:bg-slate-50">
              3
            </button>
            <button className="px-3 py-1 text-sm border border-slate-300 rounded hover:bg-slate-50">
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

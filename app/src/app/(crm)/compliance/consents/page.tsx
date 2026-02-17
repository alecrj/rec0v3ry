"use client";

import { useState } from "react";
import { Plus, Search, Filter, Download, FileText } from "lucide-react";
import { ConsentStatusBadge } from "@/components/compliance/consent-status-badge";
import { ConsentWizard } from "@/components/compliance/consent-wizard";

type ConsentStatus = "active" | "expired" | "revoked";

interface Consent {
  id: string;
  residentName: string;
  type: string;
  status: ConsentStatus;
  expirationDate: string;
  createdDate: string;
}

const mockConsents: Consent[] = [
  {
    id: "1",
    residentName: "Sarah M.",
    type: "Treatment Disclosure",
    status: "active",
    expirationDate: "2026-02-19",
    createdDate: "2025-08-19",
  },
  {
    id: "2",
    residentName: "Michael D.",
    type: "Family Contact",
    status: "active",
    expirationDate: "2026-02-24",
    createdDate: "2025-08-24",
  },
  {
    id: "3",
    residentName: "Jennifer P.",
    type: "Employment Verification",
    status: "active",
    expirationDate: "2026-03-01",
    createdDate: "2025-09-01",
  },
  {
    id: "4",
    residentName: "Robert T.",
    type: "Insurance Claims",
    status: "expired",
    expirationDate: "2026-01-15",
    createdDate: "2025-07-15",
  },
  {
    id: "5",
    residentName: "Lisa M.",
    type: "Treatment Disclosure",
    status: "revoked",
    expirationDate: "2026-06-10",
    createdDate: "2025-12-10",
  },
];

export default function ConsentsPage() {
  const [showWizard, setShowWizard] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  if (showWizard) {
    return (
      <div className="p-6">
        <ConsentWizard
          onComplete={() => setShowWizard(false)}
          onCancel={() => setShowWizard(false)}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            42 CFR Part 2 Consents
          </h1>
          <p className="text-slate-600 mt-1">
            Manage patient consent forms for substance use disorder information
            disclosure
          </p>
        </div>
        <button
          onClick={() => setShowWizard(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          <Plus className="h-4 w-4" />
          New Consent
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <FileText className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-amber-900">
              Important: 42 CFR Part 2 Final Rule (Effective Feb 16, 2026)
            </h3>
            <p className="text-sm text-amber-800 mt-1">
              All consent forms must comply with updated requirements including
              specific disclosure recipients, clear purpose statements, and
              standardized revocation procedures. RecoveryOS consent forms are
              designed to meet these requirements.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Total Consents</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {mockConsents.length}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Active</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {mockConsents.filter((c) => c.status === "active").length}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Expired</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">
            {mockConsents.filter((c) => c.status === "expired").length}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Revoked</p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            {mockConsents.filter((c) => c.status === "revoked").length}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by resident name or consent type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-medium text-slate-700">
              <Filter className="h-4 w-4" />
              Filter
            </button>
            <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-medium text-slate-700">
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Resident Name
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Consent Type
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Status
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Expiration Date
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Created Date
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {mockConsents.map((consent) => (
                <tr
                  key={consent.id}
                  className="border-b border-slate-100 hover:bg-slate-50"
                >
                  <td className="py-3 px-4 text-sm font-medium text-slate-900">
                    {consent.residentName}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600">
                    {consent.type}
                  </td>
                  <td className="py-3 px-4">
                    <ConsentStatusBadge status={consent.status} />
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600">
                    {new Date(consent.expirationDate).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600">
                    {new Date(consent.createdDate).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                        View
                      </button>
                      {consent.status === "active" && (
                        <>
                          <span className="text-slate-300">|</span>
                          <button className="text-sm text-slate-600 hover:text-slate-700 font-medium">
                            Revoke
                          </button>
                        </>
                      )}
                      {consent.status === "expired" && (
                        <>
                          <span className="text-slate-300">|</span>
                          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                            Renew
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

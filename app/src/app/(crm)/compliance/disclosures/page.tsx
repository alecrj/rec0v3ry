"use client";

import { useState } from "react";
import { FileText, Download, TrendingUp } from "lucide-react";

interface Disclosure {
  id: string;
  date: string;
  resident: string;
  recipient: string;
  purpose: string;
  consentId: string;
  method: string;
  disclosedBy: string;
}

const mockDisclosures: Disclosure[] = [
  {
    id: "1",
    date: "2026-02-11",
    resident: "John S.",
    recipient: "Family Services Center",
    purpose: "Treatment Coordination",
    consentId: "CNS-2024-089",
    method: "Secure Email",
    disclosedBy: "Sarah Johnson",
  },
  {
    id: "2",
    date: "2026-02-10",
    resident: "Maria G.",
    recipient: "State Probation Office",
    purpose: "Legal Requirement",
    consentId: "CNS-2024-092",
    method: "Encrypted Portal",
    disclosedBy: "Mike Davis",
  },
  {
    id: "3",
    date: "2026-02-09",
    resident: "Robert T.",
    recipient: "ABC Insurance Co.",
    purpose: "Insurance Claims",
    consentId: "CNS-2024-076",
    method: "Fax (Encrypted)",
    disclosedBy: "Jennifer Smith",
  },
  {
    id: "4",
    date: "2026-02-08",
    resident: "Lisa M.",
    recipient: "Employer - Tech Corp",
    purpose: "Employment Verification",
    consentId: "CNS-2024-101",
    method: "Phone",
    disclosedBy: "David Chen",
  },
  {
    id: "5",
    date: "2026-02-07",
    resident: "Michael D.",
    recipient: "Dr. Anderson (Primary Care)",
    purpose: "Treatment Coordination",
    consentId: "CNS-2024-068",
    method: "Secure Email",
    disclosedBy: "Sarah Johnson",
  },
  {
    id: "6",
    date: "2026-02-06",
    resident: "Jennifer P.",
    recipient: "County Mental Health",
    purpose: "Treatment Coordination",
    consentId: "CNS-2024-082",
    method: "Encrypted Portal",
    disclosedBy: "Emily Wilson",
  },
  {
    id: "7",
    date: "2026-02-05",
    resident: "David K.",
    recipient: "Family Member (Mother)",
    purpose: "Family Communication",
    consentId: "CNS-2024-095",
    method: "Phone",
    disclosedBy: "Robert Taylor",
  },
  {
    id: "8",
    date: "2026-02-04",
    resident: "Sarah M.",
    recipient: "VA Healthcare",
    purpose: "Benefits Coordination",
    consentId: "CNS-2024-073",
    method: "Secure Email",
    disclosedBy: "Lisa Martinez",
  },
];

export default function DisclosuresPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPurpose, setSelectedPurpose] = useState("");

  const thisMonthTotal = mockDisclosures.length;
  const uniqueRecipients = new Set(mockDisclosures.map((d) => d.recipient)).size;

  const purposeCounts = mockDisclosures.reduce((acc, d) => {
    acc[d.purpose] = (acc[d.purpose] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const mostCommonPurpose = Object.entries(purposeCounts).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Disclosure Log</h1>
          <p className="text-slate-600 mt-1">
            Track all disclosures of protected health information
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
          <FileText className="h-4 w-4" />
          Request Accounting
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <FileText className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-amber-900">
              Patient Rights: Accounting of Disclosures
            </h3>
            <p className="text-sm text-amber-800 mt-1">
              Under 42 CFR Part 2, patients have the right to request an accounting of all
              disclosures made without their consent. Use the "Request Accounting" button to
              generate a formal report for a specific patient.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-600">Total Disclosures</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{thisMonthTotal}</p>
              <p className="text-xs text-slate-500 mt-1">February 2026</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-600">Unique Recipients</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{uniqueRecipients}</p>
              <p className="text-xs text-slate-500 mt-1">This month</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <FileText className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-600">Most Common Purpose</p>
              <p className="text-lg font-bold text-slate-900 mt-1">
                {mostCommonPurpose?.[0] || "N/A"}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {mostCommonPurpose?.[1] || 0} disclosures
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <FileText className="h-5 w-5 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Date Range
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  defaultValue="2026-02-01"
                />
                <input
                  type="date"
                  className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  defaultValue="2026-02-12"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Resident Search
              </label>
              <input
                type="text"
                placeholder="Search resident..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Purpose</label>
              <select
                value={selectedPurpose}
                onChange={(e) => setSelectedPurpose(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Purposes</option>
                <option value="treatment">Treatment Coordination</option>
                <option value="legal">Legal Requirement</option>
                <option value="insurance">Insurance Claims</option>
                <option value="employment">Employment Verification</option>
                <option value="family">Family Communication</option>
              </select>
            </div>
          </div>
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
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Method
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Disclosed By
                </th>
              </tr>
            </thead>
            <tbody>
              {mockDisclosures.map((disclosure) => (
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
                  <td className="py-3 px-4 text-sm text-slate-600">{disclosure.method}</td>
                  <td className="py-3 px-4 text-sm text-slate-600">{disclosure.disclosedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-slate-200 flex items-center justify-between">
          <p className="text-sm text-slate-600">Showing {mockDisclosures.length} disclosures</p>
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-medium text-slate-700">
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>
    </div>
  );
}

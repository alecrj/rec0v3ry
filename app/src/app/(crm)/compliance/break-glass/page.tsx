"use client";

import { useState } from "react";
import { AlertTriangle, ShieldAlert } from "lucide-react";

interface BreakGlassEvent {
  id: string;
  date: string;
  user: string;
  reason: string;
  resident: string;
  duration: string;
  status: "active" | "expired" | "reviewed";
  reviewStatus: "pending" | "approved" | "flagged";
  justification: string;
}

const mockEvents: BreakGlassEvent[] = [
  {
    id: "1",
    date: "2026-02-10T22:15:00Z",
    user: "Dr. Sarah Johnson",
    reason: "Medical Emergency",
    resident: "Robert T.",
    duration: "2 hours",
    status: "expired",
    reviewStatus: "approved",
    justification: "Patient experiencing severe withdrawal symptoms requiring immediate access to medical history and medication records.",
  },
  {
    id: "2",
    date: "2026-02-08T14:30:00Z",
    user: "Mike Davis (House Manager)",
    reason: "Patient Safety",
    resident: "Jennifer P.",
    duration: "1 hour",
    status: "expired",
    reviewStatus: "approved",
    justification: "Resident expressed suicidal ideation. Needed immediate access to treatment plan and emergency contacts.",
  },
  {
    id: "3",
    date: "2026-01-28T19:45:00Z",
    user: "Officer Martinez (Police)",
    reason: "Legal Requirement",
    resident: "Michael K.",
    duration: "30 minutes",
    status: "expired",
    reviewStatus: "flagged",
    justification: "Court order for patient records in custody case.",
  },
];

export default function BreakGlassPage() {
  const [showModal, setShowModal] = useState(false);
  const [reason, setReason] = useState("");
  const [justification, setJustification] = useState("");
  const [residentId, setResidentId] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);

  const handleActivate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!acknowledged) {
      alert("You must acknowledge that this action will be logged and reviewed");
      return;
    }
    alert("Break-glass access activated! (placeholder)");
    setShowModal(false);
    // Reset form
    setReason("");
    setJustification("");
    setResidentId("");
    setAcknowledged(false);
  };

  const getStatusBadge = (status: BreakGlassEvent["status"]) => {
    const styles = {
      active: "bg-red-100 text-red-700 border-red-200 animate-pulse",
      expired: "bg-slate-100 text-slate-700 border-slate-200",
      reviewed: "bg-green-100 text-green-700 border-green-200",
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium border ${styles[status]}`}>
        {status === "active" ? "Active" : status === "expired" ? "Expired" : "Reviewed"}
      </span>
    );
  };

  const getReviewBadge = (reviewStatus: BreakGlassEvent["reviewStatus"]) => {
    const styles = {
      pending: "bg-yellow-100 text-yellow-700",
      approved: "bg-green-100 text-green-700",
      flagged: "bg-red-100 text-red-700",
    };

    const labels = {
      pending: "Pending Review",
      approved: "Approved",
      flagged: "Flagged",
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[reviewStatus]}`}>
        {labels[reviewStatus]}
      </span>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Break-Glass Access Log</h1>
          <p className="text-slate-600 mt-1">Emergency access to protected health information</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
        >
          <ShieldAlert className="h-4 w-4" />
          Activate Break-Glass
        </button>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-red-900">
              Critical: Emergency Access Only
            </h3>
            <p className="text-sm text-red-800 mt-1">
              Break-glass access bypasses normal consent controls and should only be used in
              genuine emergencies (medical emergency, patient safety, legal requirement). All
              actions are elevated-logged, time-limited, and subject to mandatory review by the
              compliance officer.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Total Events</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{mockEvents.length}</p>
          <p className="text-xs text-slate-500 mt-1">All time</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Pending Review</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">
            {mockEvents.filter((e) => e.reviewStatus === "pending").length}
          </p>
          <p className="text-xs text-slate-500 mt-1">Requires compliance officer review</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Flagged Events</p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            {mockEvents.filter((e) => e.reviewStatus === "flagged").length}
          </p>
          <p className="text-xs text-slate-500 mt-1">May require investigation</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Recent Break-Glass Events</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Date
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  User
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Reason
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Resident
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Duration
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Status
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Review Status
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {mockEvents.map((event) => (
                <tr key={event.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 text-sm text-slate-600">
                    {new Date(event.date).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-sm font-medium text-slate-900">
                    {event.user}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600">{event.reason}</td>
                  <td className="py-3 px-4 text-sm font-medium text-slate-900">
                    {event.resident}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600">{event.duration}</td>
                  <td className="py-3 px-4">{getStatusBadge(event.status)}</td>
                  <td className="py-3 px-4">{getReviewBadge(event.reviewStatus)}</td>
                  <td className="py-3 px-4">
                    <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Activate Break-Glass Access</h2>
              <p className="text-sm text-slate-600 mt-1">
                Emergency access to protected health information
              </p>
            </div>

            <form onSubmit={handleActivate} className="p-6 space-y-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">
                  This action will be logged with elevated sensitivity and reviewed by the
                  compliance officer. Use only in genuine emergencies.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Emergency Reason <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select reason</option>
                  <option value="medical_emergency">Medical Emergency</option>
                  <option value="legal_requirement">Legal Requirement</option>
                  <option value="patient_safety">Patient Safety</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Resident <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={residentId}
                  onChange={(e) => setResidentId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select resident</option>
                  <option value="res-1">Sarah M.</option>
                  <option value="res-2">Michael D.</option>
                  <option value="res-3">Jennifer P.</option>
                  <option value="res-4">Robert T.</option>
                  <option value="res-5">Lisa M.</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Justification <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  minLength={50}
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Provide detailed justification for this emergency access (minimum 50 characters)"
                />
                <p className="text-xs text-slate-500 mt-1">
                  {justification.length} / 50 characters minimum
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acknowledged}
                    onChange={(e) => setAcknowledged(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      I understand this action will be logged and reviewed
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      This emergency access will be recorded in the audit log with elevated
                      sensitivity, time-stamped, and automatically flagged for compliance officer
                      review. Misuse may result in disciplinary action.
                    </p>
                  </div>
                </label>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
                <button
                  type="submit"
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                >
                  Confirm & Activate
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

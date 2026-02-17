"use client";

import { useState } from "react";
import {
  AlertCircle,
  Plus,
  Calendar,
  User,
  Home,
  Filter,
  FileText,
  Clock,
  AlertTriangle,
  Shield,
  MapPin,
} from "lucide-react";

export const dynamic = "force-dynamic";

type IncidentType =
  | "relapse"
  | "curfew_violation"
  | "guest_policy"
  | "contraband"
  | "violence"
  | "theft"
  | "property_damage"
  | "awol"
  | "other";
type Severity = "low" | "medium" | "high" | "critical";

interface Incident {
  id: string;
  residentName: string | null;
  houseName: string;
  incidentType: IncidentType;
  severity: Severity;
  occurredAt: string;
  location: string;
  description: string;
  reportedBy: string;
  policeInvolved: boolean;
  followUpRequired: boolean;
  followUpNotes: string | null;
}

export default function IncidentsPage() {
  const [selectedHouse, setSelectedHouse] = useState<string>("all");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");

  const houses = [
    { id: "h1", name: "Serenity House" },
    { id: "h2", name: "Hope Manor" },
    { id: "h3", name: "Recovery Haven" },
  ];

  const incidents: Incident[] = [
    {
      id: "1",
      residentName: "Michael Chen",
      houseName: "Serenity House",
      incidentType: "curfew_violation",
      severity: "low",
      occurredAt: "2026-02-17T22:30:00",
      location: "Front entrance",
      description: "Resident returned 30 minutes after curfew. First offense.",
      reportedBy: "John Manager",
      policeInvolved: false,
      followUpRequired: true,
      followUpNotes: null,
    },
    {
      id: "2",
      residentName: "David Wilson",
      houseName: "Hope Manor",
      incidentType: "guest_policy",
      severity: "medium",
      occurredAt: "2026-02-16T15:00:00",
      location: "Common area",
      description: "Unauthorized guest found in common area. Guest removed immediately.",
      reportedBy: "Jane Admin",
      policeInvolved: false,
      followUpRequired: true,
      followUpNotes: "Meeting scheduled with resident",
    },
    {
      id: "3",
      residentName: "Emily Thompson",
      houseName: "Recovery Haven",
      incidentType: "relapse",
      severity: "high",
      occurredAt: "2026-02-15T20:00:00",
      location: "Resident room",
      description: "Resident showed signs of substance use. Drug test administered.",
      reportedBy: "John Manager",
      policeInvolved: false,
      followUpRequired: true,
      followUpNotes: "Crisis counselor contacted",
    },
    {
      id: "4",
      residentName: null,
      houseName: "Serenity House",
      incidentType: "property_damage",
      severity: "medium",
      occurredAt: "2026-02-14T08:00:00",
      location: "Kitchen",
      description: "Microwave damaged. Unknown who caused the damage.",
      reportedBy: "Jane Admin",
      policeInvolved: false,
      followUpRequired: false,
      followUpNotes: null,
    },
    {
      id: "5",
      residentName: "Robert Garcia",
      houseName: "Hope Manor",
      incidentType: "violence",
      severity: "critical",
      occurredAt: "2026-02-13T21:00:00",
      location: "Common area",
      description: "Physical altercation between two residents. Both separated, minor injuries.",
      reportedBy: "John Manager",
      policeInvolved: true,
      followUpRequired: true,
      followUpNotes: "Police report filed #2026-0213",
    },
    {
      id: "6",
      residentName: "Sarah Martinez",
      houseName: "Recovery Haven",
      incidentType: "awol",
      severity: "high",
      occurredAt: "2026-02-12T06:00:00",
      location: "N/A",
      description: "Resident did not return from pass. Located at 14:00 same day.",
      reportedBy: "Jane Admin",
      policeInvolved: false,
      followUpRequired: false,
      followUpNotes: "Resolved - returned voluntarily",
    },
  ];

  const stats = {
    total: incidents.length,
    critical: incidents.filter((i) => i.severity === "critical").length,
    high: incidents.filter((i) => i.severity === "high").length,
    pendingFollowUp: incidents.filter((i) => i.followUpRequired).length,
    policeInvolved: incidents.filter((i) => i.policeInvolved).length,
  };

  const getSeverityBadge = (severity: Severity) => {
    const styles: Record<Severity, string> = {
      low: "bg-green-100 text-green-700",
      medium: "bg-yellow-100 text-yellow-700",
      high: "bg-orange-100 text-orange-700",
      critical: "bg-red-100 text-red-700",
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${styles[severity]}`}>
        {severity}
      </span>
    );
  };

  const getIncidentTypeBadge = (type: IncidentType) => {
    const styles: Record<IncidentType, string> = {
      relapse: "bg-red-100 text-red-700",
      curfew_violation: "bg-yellow-100 text-yellow-700",
      guest_policy: "bg-blue-100 text-blue-700",
      contraband: "bg-orange-100 text-orange-700",
      violence: "bg-red-100 text-red-700",
      theft: "bg-purple-100 text-purple-700",
      property_damage: "bg-slate-100 text-slate-700",
      awol: "bg-indigo-100 text-indigo-700",
      other: "bg-slate-100 text-slate-700",
    };
    const labels: Record<IncidentType, string> = {
      relapse: "Relapse",
      curfew_violation: "Curfew",
      guest_policy: "Guest Policy",
      contraband: "Contraband",
      violence: "Violence",
      theft: "Theft",
      property_damage: "Property Damage",
      awol: "AWOL",
      other: "Other",
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[type]}`}>
        {labels[type]}
      </span>
    );
  };

  const filteredIncidents = incidents.filter((i) => {
    if (selectedHouse !== "all" && i.houseName !== selectedHouse) return false;
    if (selectedSeverity !== "all" && i.severity !== selectedSeverity) return false;
    if (selectedType !== "all" && i.incidentType !== selectedType) return false;
    return true;
  });

  const criticalIncidents = filteredIncidents.filter(
    (i) => i.severity === "critical" || i.severity === "high"
  );
  const otherIncidents = filteredIncidents.filter(
    (i) => i.severity !== "critical" && i.severity !== "high"
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Incident Reports</h1>
          <p className="text-slate-600 mt-1">Document and track incidents</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Incident Report
        </button>
      </div>

      {/* Encrypted Data Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900">Encrypted Incident Data</h3>
            <p className="text-sm text-blue-700 mt-1">
              Sensitive incident details (descriptions, actions taken) are encrypted at rest.
              All access is audit logged for compliance.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Total (30d)</p>
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Critical</p>
              <p className="text-2xl font-bold text-slate-900">{stats.critical}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <AlertCircle className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">High Priority</p>
              <p className="text-2xl font-bold text-slate-900">{stats.high}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Needs Follow-up</p>
              <p className="text-2xl font-bold text-slate-900">{stats.pendingFollowUp}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg">
              <Shield className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Police Involved</p>
              <p className="text-2xl font-bold text-slate-900">{stats.policeInvolved}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-700">Filters:</span>
          </div>
          <select
            value={selectedHouse}
            onChange={(e) => setSelectedHouse(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Houses</option>
            {houses.map((h) => (
              <option key={h.id} value={h.name}>
                {h.name}
              </option>
            ))}
          </select>
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Types</option>
            <option value="relapse">Relapse</option>
            <option value="curfew_violation">Curfew Violation</option>
            <option value="guest_policy">Guest Policy</option>
            <option value="violence">Violence</option>
            <option value="property_damage">Property Damage</option>
            <option value="awol">AWOL</option>
            <option value="other">Other</option>
          </select>
          <div className="flex items-center gap-2 ml-auto">
            <Calendar className="h-4 w-4 text-slate-500" />
            <span className="text-sm text-slate-600">Last 30 days</span>
          </div>
        </div>
      </div>

      {/* Critical/High Priority */}
      {criticalIncidents.length > 0 && (
        <div className="bg-white rounded-lg border border-red-200">
          <div className="p-6 border-b border-red-200 bg-red-50">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Critical & High Priority ({criticalIncidents.length})
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {criticalIncidents.map((incident) => (
              <div key={incident.id} className="p-4 hover:bg-slate-50">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      {getIncidentTypeBadge(incident.incidentType)}
                      {getSeverityBadge(incident.severity)}
                      {incident.policeInvolved && (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-slate-800 text-white">
                          Police Involved
                        </span>
                      )}
                      {incident.followUpRequired && (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-700">
                          Follow-up Required
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      {incident.residentName && (
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          <span>{incident.residentName}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Home className="h-4 w-4" />
                        <span>{incident.houseName}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        <span>{incident.location}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{new Date(incident.occurredAt).toLocaleString()}</span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-700">{incident.description}</p>
                  </div>
                  <button className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700">
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Incidents Table */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">All Incidents</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Date/Time</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Type</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Severity</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Resident</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">House</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {otherIncidents.map((incident) => (
                <tr key={incident.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 text-sm text-slate-600">
                    {new Date(incident.occurredAt).toLocaleString()}
                  </td>
                  <td className="py-3 px-4">{getIncidentTypeBadge(incident.incidentType)}</td>
                  <td className="py-3 px-4">{getSeverityBadge(incident.severity)}</td>
                  <td className="py-3 px-4 text-sm text-slate-900">
                    {incident.residentName || "N/A"}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600">{incident.houseName}</td>
                  <td className="py-3 px-4">
                    {incident.followUpRequired ? (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-700">
                        Needs Follow-up
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
                        Resolved
                      </span>
                    )}
                  </td>
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
    </div>
  );
}

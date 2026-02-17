"use client";

import { useState } from "react";
import {
  BadgeCheck,
  Plus,
  Clock,
  MapPin,
  User,
  Home,
  Filter,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Calendar,
  Phone,
} from "lucide-react";

export const dynamic = "force-dynamic";

type PassStatus = "requested" | "approved" | "denied" | "active" | "completed" | "violated" | "cancelled";
type PassType = "day_pass" | "overnight" | "weekend" | "extended" | "medical" | "work" | "family_visit";

interface Pass {
  id: string;
  residentName: string;
  houseName: string;
  passType: PassType;
  status: PassStatus;
  requestedAt: string;
  startTime: string;
  endTime: string;
  destination: string;
  purpose: string;
  contactDuringPass: string;
  approvedBy: string | null;
  actualReturnTime: string | null;
  wasViolated: boolean;
}

export default function PassesPage() {
  const [selectedHouse, setSelectedHouse] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");

  const houses = [
    { id: "h1", name: "Serenity House" },
    { id: "h2", name: "Hope Manor" },
    { id: "h3", name: "Recovery Haven" },
  ];

  const passes: Pass[] = [
    {
      id: "1",
      residentName: "Sarah Martinez",
      houseName: "Serenity House",
      passType: "day_pass",
      status: "requested",
      requestedAt: "2026-02-17T08:30:00",
      startTime: "2026-02-18T10:00:00",
      endTime: "2026-02-18T18:00:00",
      destination: "Downtown Medical Center",
      purpose: "Doctor's appointment",
      contactDuringPass: "(555) 123-4567",
      approvedBy: null,
      actualReturnTime: null,
      wasViolated: false,
    },
    {
      id: "2",
      residentName: "Michael Chen",
      houseName: "Serenity House",
      passType: "work",
      status: "active",
      requestedAt: "2026-02-16T14:00:00",
      startTime: "2026-02-17T08:00:00",
      endTime: "2026-02-17T17:00:00",
      destination: "ABC Construction",
      purpose: "Work shift",
      contactDuringPass: "(555) 987-6543",
      approvedBy: "John Manager",
      actualReturnTime: null,
      wasViolated: false,
    },
    {
      id: "3",
      residentName: "Jennifer Parker",
      houseName: "Hope Manor",
      passType: "family_visit",
      status: "approved",
      requestedAt: "2026-02-15T09:00:00",
      startTime: "2026-02-19T12:00:00",
      endTime: "2026-02-19T20:00:00",
      destination: "Parent's home",
      purpose: "Family dinner",
      contactDuringPass: "(555) 456-7890",
      approvedBy: "Jane Admin",
      actualReturnTime: null,
      wasViolated: false,
    },
    {
      id: "4",
      residentName: "David Wilson",
      houseName: "Hope Manor",
      passType: "overnight",
      status: "completed",
      requestedAt: "2026-02-14T11:00:00",
      startTime: "2026-02-16T14:00:00",
      endTime: "2026-02-17T10:00:00",
      destination: "Sister's house",
      purpose: "Family event",
      contactDuringPass: "(555) 321-9876",
      approvedBy: "John Manager",
      actualReturnTime: "2026-02-17T09:45:00",
      wasViolated: false,
    },
    {
      id: "5",
      residentName: "Emily Thompson",
      houseName: "Recovery Haven",
      passType: "day_pass",
      status: "violated",
      requestedAt: "2026-02-13T10:00:00",
      startTime: "2026-02-15T09:00:00",
      endTime: "2026-02-15T15:00:00",
      destination: "Job interview",
      purpose: "Employment",
      contactDuringPass: "(555) 654-3210",
      approvedBy: "Jane Admin",
      actualReturnTime: "2026-02-15T18:30:00",
      wasViolated: true,
    },
    {
      id: "6",
      residentName: "Robert Garcia",
      houseName: "Recovery Haven",
      passType: "medical",
      status: "denied",
      requestedAt: "2026-02-17T07:00:00",
      startTime: "2026-02-17T14:00:00",
      endTime: "2026-02-17T16:00:00",
      destination: "Urgent Care",
      purpose: "Non-emergency check-up",
      contactDuringPass: "(555) 111-2222",
      approvedBy: null,
      actualReturnTime: null,
      wasViolated: false,
    },
  ];

  const stats = {
    pending: passes.filter((p) => p.status === "requested").length,
    active: passes.filter((p) => p.status === "active").length,
    completed: passes.filter((p) => p.status === "completed").length,
    violated: passes.filter((p) => p.status === "violated" || p.wasViolated).length,
  };

  const getStatusBadge = (status: PassStatus, wasViolated: boolean) => {
    const styles: Record<PassStatus, string> = {
      requested: "bg-yellow-100 text-yellow-700",
      approved: "bg-blue-100 text-blue-700",
      denied: "bg-red-100 text-red-700",
      active: "bg-green-100 text-green-700",
      completed: "bg-slate-100 text-slate-700",
      violated: "bg-red-100 text-red-700",
      cancelled: "bg-slate-100 text-slate-700",
    };
    const labels: Record<PassStatus, string> = {
      requested: "Pending",
      approved: "Approved",
      denied: "Denied",
      active: "Active",
      completed: wasViolated ? "Late Return" : "Completed",
      violated: "Violated",
      cancelled: "Cancelled",
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const getPassTypeBadge = (type: PassType) => {
    const styles: Record<PassType, string> = {
      day_pass: "bg-blue-100 text-blue-700",
      overnight: "bg-purple-100 text-purple-700",
      weekend: "bg-indigo-100 text-indigo-700",
      extended: "bg-orange-100 text-orange-700",
      medical: "bg-green-100 text-green-700",
      work: "bg-yellow-100 text-yellow-700",
      family_visit: "bg-pink-100 text-pink-700",
    };
    const labels: Record<PassType, string> = {
      day_pass: "Day Pass",
      overnight: "Overnight",
      weekend: "Weekend",
      extended: "Extended",
      medical: "Medical",
      work: "Work",
      family_visit: "Family",
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[type]}`}>
        {labels[type]}
      </span>
    );
  };

  const filteredPasses = passes.filter((p) => {
    if (selectedHouse !== "all" && p.houseName !== selectedHouse) return false;
    if (selectedStatus !== "all" && p.status !== selectedStatus) return false;
    if (selectedType !== "all" && p.passType !== selectedType) return false;
    return true;
  });

  const pendingPasses = filteredPasses.filter((p) => p.status === "requested");
  const activePasses = filteredPasses.filter((p) => p.status === "active");
  const otherPasses = filteredPasses.filter(
    (p) => p.status !== "requested" && p.status !== "active"
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pass Management</h1>
          <p className="text-slate-600 mt-1">Manage resident pass requests and tracking</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Pass Request
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Pending Requests</p>
              <p className="text-2xl font-bold text-slate-900">{stats.pending}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <BadgeCheck className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Currently Out</p>
              <p className="text-2xl font-bold text-slate-900">{stats.active}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Completed (7d)</p>
              <p className="text-2xl font-bold text-slate-900">{stats.completed}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Violations (7d)</p>
              <p className="text-2xl font-bold text-slate-900">{stats.violated}</p>
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
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="requested">Pending</option>
            <option value="approved">Approved</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="violated">Violated</option>
            <option value="denied">Denied</option>
          </select>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Types</option>
            <option value="day_pass">Day Pass</option>
            <option value="overnight">Overnight</option>
            <option value="weekend">Weekend</option>
            <option value="medical">Medical</option>
            <option value="work">Work</option>
            <option value="family_visit">Family Visit</option>
          </select>
        </div>
      </div>

      {/* Pending Requests */}
      {pendingPasses.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200">
          <div className="p-6 border-b border-slate-200 bg-yellow-50">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              Pending Requests ({pendingPasses.length})
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {pendingPasses.map((pass) => (
              <div key={pass.id} className="p-4 hover:bg-slate-50">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-slate-400" />
                      <span className="font-medium text-slate-900">{pass.residentName}</span>
                      {getPassTypeBadge(pass.passType)}
                      {getStatusBadge(pass.status, pass.wasViolated)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      <div className="flex items-center gap-1">
                        <Home className="h-4 w-4" />
                        <span>{pass.houseName}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {new Date(pass.startTime).toLocaleDateString()} -{" "}
                          {new Date(pass.endTime).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        <span>{pass.destination}</span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600">
                      <span className="font-medium">Purpose:</span> {pass.purpose}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1.5 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 flex items-center gap-1">
                      <CheckCircle className="h-4 w-4" />
                      Approve
                    </button>
                    <button className="px-3 py-1.5 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700 flex items-center gap-1">
                      <XCircle className="h-4 w-4" />
                      Deny
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Passes */}
      {activePasses.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200">
          <div className="p-6 border-b border-slate-200 bg-green-50">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <BadgeCheck className="h-5 w-5 text-green-600" />
              Currently Out ({activePasses.length})
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {activePasses.map((pass) => (
              <div key={pass.id} className="p-4 hover:bg-slate-50">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-slate-400" />
                      <span className="font-medium text-slate-900">{pass.residentName}</span>
                      {getPassTypeBadge(pass.passType)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        <span>{pass.destination}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>Due back: {new Date(pass.endTime).toLocaleTimeString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Phone className="h-4 w-4" />
                        <span>{pass.contactDuringPass}</span>
                      </div>
                    </div>
                  </div>
                  <button className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700">
                    Check In
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pass History */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Pass History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Resident</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">House</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Type</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Dates</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {otherPasses.map((pass) => (
                <tr key={pass.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 text-sm font-medium text-slate-900">{pass.residentName}</td>
                  <td className="py-3 px-4 text-sm text-slate-600">{pass.houseName}</td>
                  <td className="py-3 px-4">{getPassTypeBadge(pass.passType)}</td>
                  <td className="py-3 px-4 text-sm text-slate-600">
                    {new Date(pass.startTime).toLocaleDateString()} -{" "}
                    {new Date(pass.endTime).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">{getStatusBadge(pass.status, pass.wasViolated)}</td>
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

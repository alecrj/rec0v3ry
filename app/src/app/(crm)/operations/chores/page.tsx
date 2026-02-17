"use client";

import { useState } from "react";
import {
  ListTodo,
  Plus,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  Filter,
  RefreshCw,
  User,
  Home,
} from "lucide-react";

export const dynamic = "force-dynamic";

type ChoreStatus = "assigned" | "in_progress" | "completed" | "verified" | "failed" | "skipped";

interface ChoreAssignment {
  id: string;
  choreTitle: string;
  choreArea: string;
  residentName: string;
  houseName: string;
  assignedDate: string;
  dueDate: string;
  status: ChoreStatus;
  completedAt: string | null;
  verifiedAt: string | null;
}

export default function ChoresPage() {
  const [selectedHouse, setSelectedHouse] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const houses = [
    { id: "h1", name: "Serenity House" },
    { id: "h2", name: "Hope Manor" },
    { id: "h3", name: "Recovery Haven" },
  ];

  const assignments: ChoreAssignment[] = [
    {
      id: "1",
      choreTitle: "Kitchen Deep Clean",
      choreArea: "Kitchen",
      residentName: "Sarah Martinez",
      houseName: "Serenity House",
      assignedDate: "2026-02-17",
      dueDate: "2026-02-17",
      status: "completed",
      completedAt: "2026-02-17T14:30:00",
      verifiedAt: null,
    },
    {
      id: "2",
      choreTitle: "Common Area Vacuum",
      choreArea: "Living Room",
      residentName: "Michael Chen",
      houseName: "Serenity House",
      assignedDate: "2026-02-17",
      dueDate: "2026-02-17",
      status: "in_progress",
      completedAt: null,
      verifiedAt: null,
    },
    {
      id: "3",
      choreTitle: "Bathroom Sanitize",
      choreArea: "Bathroom A",
      residentName: "Jennifer Parker",
      houseName: "Serenity House",
      assignedDate: "2026-02-17",
      dueDate: "2026-02-17",
      status: "assigned",
      completedAt: null,
      verifiedAt: null,
    },
    {
      id: "4",
      choreTitle: "Trash Collection",
      choreArea: "All Areas",
      residentName: "David Wilson",
      houseName: "Hope Manor",
      assignedDate: "2026-02-17",
      dueDate: "2026-02-17",
      status: "verified",
      completedAt: "2026-02-17T10:15:00",
      verifiedAt: "2026-02-17T11:00:00",
    },
    {
      id: "5",
      choreTitle: "Yard Work",
      choreArea: "Exterior",
      residentName: "Emily Thompson",
      houseName: "Hope Manor",
      assignedDate: "2026-02-17",
      dueDate: "2026-02-17",
      status: "failed",
      completedAt: null,
      verifiedAt: null,
    },
    {
      id: "6",
      choreTitle: "Laundry Room Clean",
      choreArea: "Laundry",
      residentName: "Robert Garcia",
      houseName: "Recovery Haven",
      assignedDate: "2026-02-17",
      dueDate: "2026-02-17",
      status: "skipped",
      completedAt: null,
      verifiedAt: null,
    },
  ];

  const stats = {
    total: assignments.length,
    completed: assignments.filter((a) => a.status === "completed" || a.status === "verified").length,
    pending: assignments.filter((a) => a.status === "assigned" || a.status === "in_progress").length,
    failed: assignments.filter((a) => a.status === "failed").length,
  };

  const completionRate = Math.round((stats.completed / stats.total) * 100);

  const getStatusBadge = (status: ChoreStatus) => {
    const styles: Record<ChoreStatus, string> = {
      assigned: "bg-blue-100 text-blue-700",
      in_progress: "bg-yellow-100 text-yellow-700",
      completed: "bg-green-100 text-green-700",
      verified: "bg-emerald-100 text-emerald-700",
      failed: "bg-red-100 text-red-700",
      skipped: "bg-slate-100 text-slate-700",
    };
    const labels: Record<ChoreStatus, string> = {
      assigned: "Assigned",
      in_progress: "In Progress",
      completed: "Completed",
      verified: "Verified",
      failed: "Failed",
      skipped: "Skipped",
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const filteredAssignments = assignments.filter((a) => {
    if (selectedHouse !== "all" && !a.houseName.toLowerCase().includes(selectedHouse.toLowerCase())) {
      return false;
    }
    if (selectedStatus !== "all" && a.status !== selectedStatus) {
      return false;
    }
    return true;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Chore Management</h1>
          <p className="text-slate-600 mt-1">Manage chore assignments and track completion</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Generate Rotation
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Chore
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ListTodo className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Total Today</p>
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Completed</p>
              <p className="text-2xl font-bold text-slate-900">{stats.completed}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Pending</p>
              <p className="text-2xl font-bold text-slate-900">{stats.pending}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Completion Rate</p>
              <p className="text-2xl font-bold text-slate-900">{completionRate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="flex items-center gap-4">
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
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="verified">Verified</option>
            <option value="failed">Failed</option>
            <option value="skipped">Skipped</option>
          </select>
          <div className="flex items-center gap-2 ml-auto">
            <Calendar className="h-4 w-4 text-slate-500" />
            <span className="text-sm text-slate-600">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Assignments Table */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Today's Assignments</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Chore</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Area</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Resident</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">House</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Due</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssignments.map((assignment) => (
                <tr key={assignment.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <span className="text-sm font-medium text-slate-900">{assignment.choreTitle}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-slate-600">{assignment.choreArea}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-slate-400" />
                      <span className="text-sm text-slate-900">{assignment.residentName}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Home className="h-4 w-4 text-slate-400" />
                      <span className="text-sm text-slate-600">{assignment.houseName}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-slate-600">
                      {new Date(assignment.dueDate).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="py-3 px-4">{getStatusBadge(assignment.status)}</td>
                  <td className="py-3 px-4">
                    {assignment.status === "completed" && (
                      <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                        Verify
                      </button>
                    )}
                    {(assignment.status === "assigned" || assignment.status === "in_progress") && (
                      <button className="text-sm text-green-600 hover:text-green-700 font-medium">
                        Mark Done
                      </button>
                    )}
                    {assignment.status === "failed" && (
                      <button className="text-sm text-orange-600 hover:text-orange-700 font-medium">
                        Reassign
                      </button>
                    )}
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

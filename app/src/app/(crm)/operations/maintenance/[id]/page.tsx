"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Wrench,
  ChevronLeft,
  Home,
  User,
  Clock,
  AlertTriangle,
  CheckCircle,
  MapPin,
  UserCheck,
  MessageSquare,
  Edit2,
  Trash2,
  Circle,
  ArrowUpCircle,
} from "lucide-react";

export const dynamic = "force-dynamic";

type Priority = "low" | "medium" | "high" | "urgent";
type Status = "open" | "in_progress" | "completed" | "cancelled";

interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  houseName: string;
  houseId: string;
  location: string;
  priority: Priority;
  status: Status;
  reporterName: string;
  reporterType: "resident" | "staff";
  assigneeName: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  completionNotes: string | null;
}

interface ActivityLog {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  details: string | null;
}

export default function MaintenanceDetailPage() {
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  // Mock data - would be fetched from API
  const request: MaintenanceRequest = {
    id: "1",
    title: "Leaking faucet in kitchen",
    description:
      "The kitchen sink faucet has been dripping constantly for the past 2 days. The drip is quite fast and is wasting water. I've tried turning it off tightly but it still leaks. This might need a new washer or the entire faucet might need to be replaced.",
    houseName: "Serenity House",
    houseId: "h1",
    location: "Kitchen - Main sink",
    priority: "medium",
    status: "in_progress",
    reporterName: "Sarah Martinez",
    reporterType: "resident",
    assigneeName: "Mike Wilson",
    createdAt: "2026-02-16T10:30:00",
    updatedAt: "2026-02-17T09:00:00",
    completedAt: null,
    completionNotes: null,
  };

  const activityLog: ActivityLog[] = [
    {
      id: "1",
      action: "Request created",
      user: "Sarah Martinez",
      timestamp: "2026-02-16T10:30:00",
      details: null,
    },
    {
      id: "2",
      action: "Priority changed to Medium",
      user: "John Manager",
      timestamp: "2026-02-16T11:00:00",
      details: "Elevated from Low due to water waste concerns",
    },
    {
      id: "3",
      action: "Assigned to Mike Wilson",
      user: "John Manager",
      timestamp: "2026-02-16T14:00:00",
      details: null,
    },
    {
      id: "4",
      action: "Status changed to In Progress",
      user: "Mike Wilson",
      timestamp: "2026-02-17T09:00:00",
      details: "Will inspect today, ordered replacement parts",
    },
  ];

  const staffMembers = [
    { id: "u1", name: "Mike Wilson", role: "Maintenance" },
    { id: "u2", name: "Tom Maintenance", role: "Maintenance" },
    { id: "u3", name: "John Manager", role: "House Manager" },
  ];

  const getPriorityBadge = (priority: Priority) => {
    const styles: Record<Priority, string> = {
      low: "bg-slate-100 text-slate-700",
      medium: "bg-yellow-100 text-yellow-700",
      high: "bg-orange-100 text-orange-700",
      urgent: "bg-red-100 text-red-700",
    };
    const icons: Record<Priority, React.ReactNode> = {
      low: <Circle className="h-3 w-3" />,
      medium: <ArrowUpCircle className="h-3 w-3" />,
      high: <AlertTriangle className="h-3 w-3" />,
      urgent: <AlertTriangle className="h-3 w-3" />,
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${styles[priority]}`}>
        {icons[priority]}
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </span>
    );
  };

  const getStatusBadge = (status: Status) => {
    const styles: Record<Status, string> = {
      open: "bg-blue-100 text-blue-700",
      in_progress: "bg-purple-100 text-purple-700",
      completed: "bg-green-100 text-green-700",
      cancelled: "bg-slate-100 text-slate-600",
    };
    const labels: Record<Status, string> = {
      open: "Open",
      in_progress: "In Progress",
      completed: "Completed",
      cancelled: "Cancelled",
    };
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/operations/maintenance"
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-slate-600" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{request.title}</h1>
              {getStatusBadge(request.status)}
            </div>
            <p className="text-slate-600 mt-1">Request #{request.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-600" title="Edit">
            <Edit2 className="h-5 w-5" />
          </button>
          <button className="p-2 hover:bg-red-50 rounded-lg text-red-600" title="Delete">
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Details Card */}
          <div className="bg-white rounded-lg border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Request Details</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <h3 className="text-sm font-medium text-slate-700 mb-2">Description</h3>
                <p className="text-slate-600">{request.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-slate-700 mb-1">Priority</h3>
                  <div>{getPriorityBadge(request.priority)}</div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-slate-700 mb-1">Location</h3>
                  <div className="flex items-center gap-2 text-slate-600">
                    <MapPin className="h-4 w-4" />
                    {request.location}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-slate-700 mb-1">House</h3>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Home className="h-4 w-4" />
                    {request.houseName}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-slate-700 mb-1">Reported By</h3>
                  <div className="flex items-center gap-2 text-slate-600">
                    <User className="h-4 w-4" />
                    {request.reporterName}
                    <span className="text-slate-400 text-sm">
                      ({request.reporterType === "resident" ? "Resident" : "Staff"})
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-slate-700 mb-1">Created</h3>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Clock className="h-4 w-4" />
                    {new Date(request.createdAt).toLocaleString()}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-slate-700 mb-1">Last Updated</h3>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Clock className="h-4 w-4" />
                    {new Date(request.updatedAt).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Log */}
          <div className="bg-white rounded-lg border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Activity Log</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {activityLog.map((activity, index) => (
                  <div key={activity.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                      {index < activityLog.length - 1 && (
                        <div className="w-0.5 flex-1 bg-slate-200 mt-2" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-slate-900">{activity.action}</p>
                        <span className="text-sm text-slate-500">
                          {new Date(activity.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600">by {activity.user}</p>
                      {activity.details && (
                        <p className="text-sm text-slate-500 mt-1 italic">"{activity.details}"</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions Card */}
          <div className="bg-white rounded-lg border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Actions</h2>
            </div>
            <div className="p-6 space-y-3">
              {request.status === "open" && (
                <>
                  <button
                    onClick={() => setShowAssignModal(true)}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center gap-2"
                  >
                    <UserCheck className="h-4 w-4" />
                    Assign Staff
                  </button>
                  <button className="w-full px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 flex items-center justify-center gap-2">
                    <ArrowUpCircle className="h-4 w-4" />
                    Change Priority
                  </button>
                </>
              )}
              {request.status === "in_progress" && (
                <>
                  <button
                    onClick={() => setShowCompleteModal(true)}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Mark Complete
                  </button>
                  <button
                    onClick={() => setShowAssignModal(true)}
                    className="w-full px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 flex items-center justify-center gap-2"
                  >
                    <UserCheck className="h-4 w-4" />
                    Reassign
                  </button>
                </>
              )}
              <button className="w-full px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 flex items-center justify-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Add Note
              </button>
            </div>
          </div>

          {/* Assignment Card */}
          <div className="bg-white rounded-lg border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Assignment</h2>
            </div>
            <div className="p-6">
              {request.assigneeName ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{request.assigneeName}</p>
                    <p className="text-sm text-slate-500">Maintenance</p>
                  </div>
                </div>
              ) : (
                <p className="text-slate-500">Not assigned</p>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="text-sm font-medium text-slate-700 mb-3">Time Open</h3>
            <p className="text-2xl font-bold text-slate-900">
              {Math.round((Date.now() - new Date(request.createdAt).getTime()) / (1000 * 60 * 60))} hours
            </p>
            <p className="text-sm text-slate-500 mt-1">
              Since {new Date(request.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md m-4">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Assign Staff Member</h2>
            </div>
            <div className="p-6 space-y-3">
              {staffMembers.map((staff) => (
                <button
                  key={staff.id}
                  className="w-full p-3 border border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                      <User className="h-5 w-5 text-slate-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-slate-900">{staff.name}</p>
                      <p className="text-sm text-slate-500">{staff.role}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md m-4">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Mark as Complete</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Completion Notes (optional)
                </label>
                <textarea
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Describe what was done to resolve the issue..."
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setShowCompleteModal(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700">
                Complete Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

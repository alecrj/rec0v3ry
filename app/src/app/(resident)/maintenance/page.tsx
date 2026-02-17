"use client";

import { useState } from "react";
import {
  Wrench,
  Plus,
  Clock,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  MapPin,
  Send,
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
  location: string;
  priority: Priority;
  status: Status;
  createdAt: string;
  completedAt: string | null;
}

export default function ResidentMaintenancePage() {
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newPriority, setNewPriority] = useState<Priority>("medium");

  const requests: MaintenanceRequest[] = [
    {
      id: "1",
      title: "Leaking faucet in kitchen",
      description: "The kitchen sink faucet has been dripping constantly",
      location: "Kitchen",
      priority: "medium",
      status: "in_progress",
      createdAt: "2026-02-16T10:30:00",
      completedAt: null,
    },
    {
      id: "2",
      title: "Light bulb replacement",
      description: "Hallway light bulb burned out",
      location: "Hallway",
      priority: "low",
      status: "completed",
      createdAt: "2026-02-14T09:00:00",
      completedAt: "2026-02-14T16:30:00",
    },
    {
      id: "3",
      title: "Window won't close properly",
      description: "The window in my room doesn't latch correctly",
      location: "My Room",
      priority: "high",
      status: "open",
      createdAt: "2026-02-17T08:00:00",
      completedAt: null,
    },
  ];

  const getStatusIcon = (status: Status) => {
    switch (status) {
      case "open":
        return <Circle className="h-4 w-4 text-blue-500" />;
      case "in_progress":
        return <Clock className="h-4 w-4 text-purple-500" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: Status) => {
    const labels: Record<Status, string> = {
      open: "Open",
      in_progress: "In Progress",
      completed: "Completed",
      cancelled: "Cancelled",
    };
    return labels[status];
  };

  const getPriorityColor = (priority: Priority) => {
    const colors: Record<Priority, string> = {
      low: "text-slate-500",
      medium: "text-yellow-600",
      high: "text-orange-600",
      urgent: "text-red-600",
    };
    return colors[priority];
  };

  const handleSubmit = () => {
    // In production, would call API
    console.log({ title: newTitle, description: newDescription, location: newLocation, priority: newPriority });
    setShowNewRequest(false);
    setNewTitle("");
    setNewDescription("");
    setNewLocation("");
    setNewPriority("medium");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4">
        <h1 className="text-xl font-bold text-slate-900">Maintenance</h1>
        <p className="text-sm text-slate-600">Report and track repair requests</p>
      </div>

      <div className="p-4 space-y-4">
        {/* New Request Button */}
        {!showNewRequest && (
          <button
            onClick={() => setShowNewRequest(true)}
            className="w-full p-4 bg-blue-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 active:bg-blue-700"
          >
            <Plus className="h-5 w-5" />
            Report an Issue
          </button>
        )}

        {/* New Request Form */}
        {showNewRequest && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
            <h2 className="font-semibold text-slate-900">Report an Issue</h2>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                What's the issue?
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g., Leaking faucet"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Description
              </label>
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Provide more details..."
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Location
              </label>
              <input
                type="text"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                placeholder="e.g., Kitchen, Bathroom, My Room"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Priority
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(["low", "medium", "high", "urgent"] as Priority[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setNewPriority(p)}
                    className={`px-3 py-2 border rounded-lg text-sm font-medium capitalize ${
                      newPriority === p
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-slate-300 text-slate-700"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowNewRequest(false)}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!newTitle.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:bg-slate-300"
              >
                <Send className="h-4 w-4" />
                Submit
              </button>
            </div>
          </div>
        )}

        {/* Requests List */}
        <div className="space-y-3">
          <h2 className="font-semibold text-slate-900 px-1">Your Requests</h2>

          {requests.map((request) => (
            <div
              key={request.id}
              className="bg-white rounded-xl border border-slate-200 p-4 active:bg-slate-50"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(request.status)}
                    <span className="font-medium text-slate-900">{request.title}</span>
                  </div>
                  <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                    {request.description}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-sm">
                    <div className="flex items-center gap-1 text-slate-500">
                      <MapPin className="h-3 w-3" />
                      {request.location}
                    </div>
                    <span className={`font-medium capitalize ${getPriorityColor(request.priority)}`}>
                      {request.priority}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-slate-400">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {getStatusLabel(request.status)}
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400 mt-1" />
              </div>
            </div>
          ))}
        </div>

        {/* Help Text */}
        <div className="text-center text-sm text-slate-500 py-4">
          <p>For urgent safety issues, please contact staff directly.</p>
        </div>
      </div>
    </div>
  );
}

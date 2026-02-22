"use client";

import { useState } from "react";
import {
  Plus,
  Clock,
  CheckCircle,
  ChevronRight,
  MapPin,
  Send,
  Circle,
  Loader2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

export const dynamic = "force-dynamic";

type Priority = "low" | "medium" | "high" | "urgent";

export default function ResidentMaintenancePage() {
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newPriority, setNewPriority] = useState<Priority>("medium");

  const { data: userData } = trpc.user.getCurrentUser.useQuery();
  const orgId = userData?.org_id;
  const residentId = userData?.scope_type === "resident" ? userData.scope_id : undefined;
  const houseId = (userData as any)?.currentAdmission?.house_id;

  const { data: profile } = trpc.resident.getMyProfile.useQuery(
    undefined,
    { enabled: !!userData }
  );

  const resolvedHouseId = profile?.currentAdmission?.house_id ?? houseId;

  const { data: requestsData, isLoading } = trpc.maintenance.list.useQuery(
    { orgId: orgId! },
    { enabled: !!orgId }
  );

  const utils = trpc.useUtils();
  const createMutation = trpc.maintenance.create.useMutation({
    onSuccess: () => {
      setShowNewRequest(false);
      setNewTitle("");
      setNewDescription("");
      setNewLocation("");
      setNewPriority("medium");
      utils.maintenance.list.invalidate();
    },
  });

  const requests = requestsData ?? [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <Circle className="h-4 w-4 text-[#0d9488]" />;
      case "in_progress":
        return <Clock className="h-4 w-4 text-[#0d9488]" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      open: "Open",
      in_progress: "In Progress",
      completed: "Completed",
      cancelled: "Cancelled",
    };
    return labels[status] ?? status;
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: "text-zinc-500",
      medium: "text-amber-400",
      high: "text-amber-600",
      urgent: "text-red-400",
    };
    return colors[priority] ?? "text-zinc-500";
  };

  const handleSubmit = () => {
    if (!newTitle.trim() || !orgId || !resolvedHouseId) return;
    createMutation.mutate({
      orgId,
      houseId: resolvedHouseId,
      title: newTitle.trim(),
      description: newDescription.trim(),
      location: newLocation.trim() ? newLocation.trim() : undefined,
      priority: newPriority,
      reportedByResidentId: residentId ?? undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100">
      <div className="bg-white border-b border-zinc-200 px-4 py-4">
        <h1 className="text-xl font-bold text-zinc-800">Maintenance</h1>
        <p className="text-sm text-zinc-400">Report and track repair requests</p>
      </div>

      <div className="p-4 space-y-4">
        {!showNewRequest && (
          <button
            onClick={() => setShowNewRequest(true)}
            className="w-full p-4 bg-[#0d9488] text-white rounded-xl font-medium flex items-center justify-center gap-2 active:bg-[#14b8a6]"
          >
            <Plus className="h-5 w-5" />
            Report an Issue
          </button>
        )}

        {showNewRequest && (
          <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-4">
            <h2 className="font-semibold text-zinc-800">Report an Issue</h2>

            <div>
              <label className="block text-sm font-medium text-zinc-600 mb-1">
                What&apos;s the issue?
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g., Leaking faucet"
                className="w-full px-3 py-2 border border-zinc-200 rounded-lg bg-zinc-100 text-zinc-800 text-base focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-600 mb-1">
                Description
              </label>
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Provide more details..."
                rows={3}
                className="w-full px-3 py-2 border border-zinc-200 rounded-lg bg-zinc-100 text-zinc-800 text-base focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-600 mb-1">
                Location
              </label>
              <input
                type="text"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                placeholder="e.g., Kitchen, Bathroom, My Room"
                className="w-full px-3 py-2 border border-zinc-200 rounded-lg bg-zinc-100 text-zinc-800 text-base focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-600 mb-2">
                Priority
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(["low", "medium", "high", "urgent"] as Priority[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setNewPriority(p)}
                    className={`px-3 py-2 border rounded-lg text-sm font-medium capitalize ${
                      newPriority === p
                        ? "border-[#0d9488] bg-[#0d9488]/10 text-teal-700"
                        : "border-zinc-200 text-zinc-600"
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
                className="flex-1 px-4 py-2 border border-zinc-200 text-zinc-600 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!newTitle.trim() || createMutation.isPending}
                className="flex-1 px-4 py-2 bg-[#0d9488] text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:bg-zinc-200"
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Submit
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <h2 className="font-semibold text-zinc-800 px-1">Your Requests</h2>

          {requests.length === 0 ? (
            <div className="bg-white rounded-xl border border-zinc-200 p-8 text-center">
              <p className="text-zinc-500">No maintenance requests yet</p>
              <p className="text-sm text-zinc-500 mt-1">Report an issue using the button above</p>
            </div>
          ) : (
            requests.map((request: typeof requests[number]) => (
              <div
                key={request.id}
                className="bg-white rounded-xl border border-zinc-200 p-4 active:bg-zinc-100"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(request.status ?? "open")}
                      <span className="font-medium text-zinc-800">{request.title}</span>
                    </div>
                    {request.description && (
                      <p className="text-sm text-zinc-400 mt-1 line-clamp-2">
                        {request.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-sm">
                      {request.location && (
                        <div className="flex items-center gap-1 text-zinc-500">
                          <MapPin className="h-3 w-3" />
                          {request.location}
                        </div>
                      )}
                      <span className={`font-medium capitalize ${getPriorityColor(request.priority ?? "medium")}`}>
                        {request.priority ?? "medium"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      {request.created_at && (
                        <span className="text-xs text-zinc-500">
                          {new Date(request.created_at).toLocaleDateString()}
                        </span>
                      )}
                      <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-400">
                        {getStatusLabel(request.status ?? "open")}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-zinc-500 mt-1" />
                </div>
              </div>
            ))
          )}
        </div>

        <div className="text-center text-sm text-zinc-500 py-4">
          <p>For urgent safety issues, please contact staff directly.</p>
        </div>
      </div>
    </div>
  );
}

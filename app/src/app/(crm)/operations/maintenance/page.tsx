"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Wrench,
  Plus,
  Filter,
  Search,
  Home,
  User,
  Clock,
  AlertTriangle,
  CheckCircle,
  Circle,
  ArrowUpCircle,
  ChevronRight,
} from "lucide-react";

export const dynamic = "force-dynamic";

type Priority = "low" | "medium" | "high" | "urgent";
type Status = "open" | "in_progress" | "completed" | "cancelled";

interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  houseName: string;
  location: string;
  priority: Priority;
  status: Status;
  reporterName: string;
  reporterType: "resident" | "staff";
  assigneeName: string | null;
  createdAt: string;
  completedAt: string | null;
}

export default function MaintenancePage() {
  const [selectedHouse, setSelectedHouse] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const houses = [
    { id: "h1", name: "Serenity House" },
    { id: "h2", name: "Hope Manor" },
    { id: "h3", name: "Recovery Haven" },
  ];

  const requests: MaintenanceRequest[] = [
    {
      id: "1",
      title: "Leaking faucet in kitchen",
      description: "The kitchen sink faucet has been dripping constantly for the past 2 days",
      houseName: "Serenity House",
      location: "Kitchen",
      priority: "medium",
      status: "in_progress",
      reporterName: "Sarah Martinez",
      reporterType: "resident",
      assigneeName: "Mike Wilson",
      createdAt: "2026-02-16T10:30:00",
      completedAt: null,
    },
    {
      id: "2",
      title: "Broken window lock",
      description: "The lock on the bedroom window doesn't engage properly - security concern",
      houseName: "Serenity House",
      location: "Room 3",
      priority: "high",
      status: "open",
      reporterName: "John Manager",
      reporterType: "staff",
      assigneeName: null,
      createdAt: "2026-02-17T08:15:00",
      completedAt: null,
    },
    {
      id: "3",
      title: "HVAC not cooling",
      description: "Air conditioning unit in the common area is blowing warm air",
      houseName: "Hope Manor",
      location: "Common Area",
      priority: "urgent",
      status: "open",
      reporterName: "Michael Chen",
      reporterType: "resident",
      assigneeName: null,
      createdAt: "2026-02-17T11:45:00",
      completedAt: null,
    },
    {
      id: "4",
      title: "Light bulb replacement",
      description: "Hallway light bulb burned out",
      houseName: "Hope Manor",
      location: "Hallway",
      priority: "low",
      status: "completed",
      reporterName: "Jennifer Parker",
      reporterType: "resident",
      assigneeName: "Mike Wilson",
      createdAt: "2026-02-15T14:00:00",
      completedAt: "2026-02-15T16:30:00",
    },
    {
      id: "5",
      title: "Bathroom door squeaking",
      description: "Main bathroom door hinges are very squeaky",
      houseName: "Recovery Haven",
      location: "Bathroom",
      priority: "low",
      status: "open",
      reporterName: "Emily Thompson",
      reporterType: "resident",
      assigneeName: null,
      createdAt: "2026-02-14T09:20:00",
      completedAt: null,
    },
    {
      id: "6",
      title: "Toilet running constantly",
      description: "Toilet in room 2 bathroom won't stop running",
      houseName: "Recovery Haven",
      location: "Room 2 Bathroom",
      priority: "medium",
      status: "in_progress",
      reporterName: "Robert Garcia",
      reporterType: "resident",
      assigneeName: "Tom Maintenance",
      createdAt: "2026-02-16T16:00:00",
      completedAt: null,
    },
  ];

  const stats = {
    total: requests.length,
    open: requests.filter((r) => r.status === "open").length,
    inProgress: requests.filter((r) => r.status === "in_progress").length,
    completed: requests.filter((r) => r.status === "completed").length,
    urgent: requests.filter((r) => r.priority === "urgent" && r.status !== "completed").length,
  };

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
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const filteredRequests = requests.filter((r) => {
    if (selectedHouse !== "all" && r.houseName !== selectedHouse) return false;
    if (selectedStatus !== "all" && r.status !== selectedStatus) return false;
    if (selectedPriority !== "all" && r.priority !== selectedPriority) return false;
    if (searchQuery && !r.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Sort by priority (urgent first) then by date
  const sortedRequests = [...filteredRequests].sort((a, b) => {
    const priorityOrder: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
    if (a.status === "completed" && b.status !== "completed") return 1;
    if (b.status === "completed" && a.status !== "completed") return -1;
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Maintenance Requests</h1>
          <p className="text-slate-600 mt-1">Track and manage property maintenance</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Request
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Wrench className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Total Requests</p>
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Circle className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Open</p>
              <p className="text-2xl font-bold text-slate-900">{stats.open}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Clock className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">In Progress</p>
              <p className="text-2xl font-bold text-slate-900">{stats.inProgress}</p>
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
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Urgent</p>
              <p className="text-2xl font-bold text-slate-900">{stats.urgent}</p>
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
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search requests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
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
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Priority</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Requests List */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">All Requests</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {sortedRequests.map((request) => (
            <Link
              key={request.id}
              href={`/operations/maintenance/${request.id}`}
              className="block p-4 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium text-slate-900">{request.title}</h3>
                    {getPriorityBadge(request.priority)}
                    {getStatusBadge(request.status)}
                  </div>
                  <p className="text-sm text-slate-600 mt-1 line-clamp-1">{request.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                    <div className="flex items-center gap-1">
                      <Home className="h-3 w-3" />
                      {request.houseName}
                    </div>
                    <span>|</span>
                    <span>{request.location}</span>
                    <span>|</span>
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {request.reporterName}
                      <span className="text-slate-400">
                        ({request.reporterType === "resident" ? "Resident" : "Staff"})
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-slate-400">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Created {new Date(request.createdAt).toLocaleDateString()}
                    </div>
                    {request.assigneeName && (
                      <span>Assigned to: {request.assigneeName}</span>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import {
  Clock,
  Settings,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Filter,
  User,
  Home,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export const dynamic = "force-dynamic";

type CheckInStatus = "on_time" | "late" | "excused" | "pending" | "missed";

interface CurfewCheckIn {
  id: string;
  residentName: string;
  houseName: string;
  checkInDate: string;
  expectedCurfewTime: string;
  actualCheckInTime: string | null;
  status: CheckInStatus;
  excuseReason: string | null;
}

interface HouseCurfew {
  houseId: string;
  houseName: string;
  weekdayCurfew: string;
  weekendCurfew: string;
  activeResidents: number;
  checkedIn: number;
  late: number;
  pending: number;
}

export default function CurfewPage() {
  const [selectedHouse, setSelectedHouse] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  const houses = [
    { id: "h1", name: "Serenity House" },
    { id: "h2", name: "Hope Manor" },
    { id: "h3", name: "Recovery Haven" },
  ];

  const houseCurfews: HouseCurfew[] = [
    {
      houseId: "h1",
      houseName: "Serenity House",
      weekdayCurfew: "22:00",
      weekendCurfew: "23:00",
      activeResidents: 8,
      checkedIn: 6,
      late: 1,
      pending: 1,
    },
    {
      houseId: "h2",
      houseName: "Hope Manor",
      weekdayCurfew: "22:00",
      weekendCurfew: "23:00",
      activeResidents: 6,
      checkedIn: 6,
      late: 0,
      pending: 0,
    },
    {
      houseId: "h3",
      houseName: "Recovery Haven",
      weekdayCurfew: "21:30",
      weekendCurfew: "22:30",
      activeResidents: 5,
      checkedIn: 3,
      late: 1,
      pending: 1,
    },
  ];

  const checkIns: CurfewCheckIn[] = [
    {
      id: "1",
      residentName: "Sarah Martinez",
      houseName: "Serenity House",
      checkInDate: "2026-02-17",
      expectedCurfewTime: "22:00",
      actualCheckInTime: "21:45",
      status: "on_time",
      excuseReason: null,
    },
    {
      id: "2",
      residentName: "Michael Chen",
      houseName: "Serenity House",
      checkInDate: "2026-02-17",
      expectedCurfewTime: "22:00",
      actualCheckInTime: "22:15",
      status: "late",
      excuseReason: null,
    },
    {
      id: "3",
      residentName: "Jennifer Parker",
      houseName: "Serenity House",
      checkInDate: "2026-02-17",
      expectedCurfewTime: "22:00",
      actualCheckInTime: null,
      status: "pending",
      excuseReason: null,
    },
    {
      id: "4",
      residentName: "David Wilson",
      houseName: "Hope Manor",
      checkInDate: "2026-02-17",
      expectedCurfewTime: "22:00",
      actualCheckInTime: "21:30",
      status: "on_time",
      excuseReason: null,
    },
    {
      id: "5",
      residentName: "Emily Thompson",
      houseName: "Hope Manor",
      checkInDate: "2026-02-17",
      expectedCurfewTime: "22:00",
      actualCheckInTime: "22:45",
      status: "excused",
      excuseReason: "Work shift ran late, approved by manager",
    },
    {
      id: "6",
      residentName: "Robert Garcia",
      houseName: "Recovery Haven",
      checkInDate: "2026-02-17",
      expectedCurfewTime: "21:30",
      actualCheckInTime: null,
      status: "missed",
      excuseReason: null,
    },
  ];

  const stats = {
    total: checkIns.length,
    onTime: checkIns.filter((c) => c.status === "on_time").length,
    late: checkIns.filter((c) => c.status === "late").length,
    excused: checkIns.filter((c) => c.status === "excused").length,
    pending: checkIns.filter((c) => c.status === "pending").length,
    missed: checkIns.filter((c) => c.status === "missed").length,
  };

  const complianceRate = Math.round(((stats.onTime + stats.excused) / (stats.total - stats.pending)) * 100) || 100;

  const getStatusBadge = (status: CheckInStatus) => {
    const styles: Record<CheckInStatus, string> = {
      on_time: "bg-green-100 text-green-700",
      late: "bg-red-100 text-red-700",
      excused: "bg-yellow-100 text-yellow-700",
      pending: "bg-blue-100 text-blue-700",
      missed: "bg-red-100 text-red-700",
    };
    const labels: Record<CheckInStatus, string> = {
      on_time: "On Time",
      late: "Late",
      excused: "Excused",
      pending: "Pending",
      missed: "Missed",
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const filteredCheckIns = checkIns.filter((c) => {
    if (selectedHouse !== "all" && c.houseName !== selectedHouse) return false;
    if (selectedStatus !== "all" && c.status !== selectedStatus) return false;
    return true;
  });

  const isWeekend = [0, 6].includes(new Date(selectedDate).getDay());

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Curfew Tracking</h1>
          <p className="text-slate-600 mt-1">Monitor curfew compliance and check-ins</p>
        </div>
        <button className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Configure Curfews
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">On Time</p>
              <p className="text-2xl font-bold text-slate-900">{stats.onTime}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Late</p>
              <p className="text-2xl font-bold text-slate-900">{stats.late}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Excused</p>
              <p className="text-2xl font-bold text-slate-900">{stats.excused}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="h-5 w-5 text-blue-600" />
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
              <p className="text-sm text-slate-600">Compliance</p>
              <p className="text-2xl font-bold text-slate-900">{complianceRate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* House Curfew Summary */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">House Curfew Status</h2>
          <p className="text-sm text-slate-600 mt-1">
            {isWeekend ? "Weekend" : "Weekday"} curfew times apply today
          </p>
        </div>
        <div className="divide-y divide-slate-100">
          {houseCurfews.map((house) => (
            <div key={house.houseId} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-slate-100 rounded-lg">
                    <Home className="h-5 w-5 text-slate-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-900">{house.houseName}</h3>
                    <p className="text-sm text-slate-600">
                      Curfew: {isWeekend ? house.weekendCurfew : house.weekdayCurfew}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-lg font-bold text-green-600">{house.checkedIn}</p>
                    <p className="text-xs text-slate-500">Checked In</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-red-600">{house.late}</p>
                    <p className="text-xs text-slate-500">Late</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-blue-600">{house.pending}</p>
                    <p className="text-xs text-slate-500">Pending</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-slate-900">{house.activeResidents}</p>
                    <p className="text-xs text-slate-500">Total</p>
                  </div>
                  <button className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700">
                    Take Roll
                  </button>
                </div>
              </div>
            </div>
          ))}
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
            <option value="on_time">On Time</option>
            <option value="late">Late</option>
            <option value="excused">Excused</option>
            <option value="pending">Pending</option>
            <option value="missed">Missed</option>
          </select>
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => {
                const d = new Date(selectedDate);
                d.setDate(d.getDate() - 1);
                setSelectedDate(d.toISOString().split("T")[0]);
              }}
              className="p-2 hover:bg-slate-100 rounded-lg"
            >
              <ChevronLeft className="h-4 w-4 text-slate-600" />
            </button>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-500" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              onClick={() => {
                const d = new Date(selectedDate);
                d.setDate(d.getDate() + 1);
                setSelectedDate(d.toISOString().split("T")[0]);
              }}
              className="p-2 hover:bg-slate-100 rounded-lg"
            >
              <ChevronRight className="h-4 w-4 text-slate-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Check-ins Table */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Check-in Log</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Resident</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">House</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Expected</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Actual</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Notes</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCheckIns.map((checkIn) => (
                <tr key={checkIn.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-slate-400" />
                      <span className="text-sm font-medium text-slate-900">{checkIn.residentName}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600">{checkIn.houseName}</td>
                  <td className="py-3 px-4 text-sm text-slate-600">{checkIn.expectedCurfewTime}</td>
                  <td className="py-3 px-4 text-sm text-slate-600">
                    {checkIn.actualCheckInTime || "-"}
                  </td>
                  <td className="py-3 px-4">{getStatusBadge(checkIn.status)}</td>
                  <td className="py-3 px-4 text-sm text-slate-600 max-w-xs truncate">
                    {checkIn.excuseReason || "-"}
                  </td>
                  <td className="py-3 px-4">
                    {checkIn.status === "pending" && (
                      <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                        Check In
                      </button>
                    )}
                    {checkIn.status === "late" && (
                      <button className="text-sm text-yellow-600 hover:text-yellow-700 font-medium">
                        Mark Excused
                      </button>
                    )}
                    {checkIn.status === "missed" && (
                      <button className="text-sm text-red-600 hover:text-red-700 font-medium">
                        Record Violation
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

"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Plus,
  Clock,
  Home,
  Shuffle,
  CalendarDays,
  Play,
  Pause,
  Edit2,
  Trash2,
  ChevronLeft,
  AlertCircle,
  CheckCircle,
  Users,
  BarChart3,
} from "lucide-react";

export const dynamic = "force-dynamic";

type ScheduleType = "random" | "scheduled" | "weekly" | "monthly";
type TestType = "urine" | "breathalyzer" | "oral_swab" | "blood" | "hair_follicle";

interface Schedule {
  id: string;
  name: string;
  scheduleType: ScheduleType;
  testType: TestType;
  houseName: string | null;
  isActive: boolean;
  randomPercentage: number | null;
  daysOfWeek: string[] | null;
  nextExecution: string | null;
  lastExecuted: string | null;
  testsCreated: number;
}

export default function DrugTestSchedulingPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedScheduleType, setSelectedScheduleType] = useState<ScheduleType>("random");

  const schedules: Schedule[] = [
    {
      id: "1",
      name: "Weekly Random Testing",
      scheduleType: "random",
      testType: "urine",
      houseName: null,
      isActive: true,
      randomPercentage: 25,
      daysOfWeek: null,
      nextExecution: "2026-02-20T09:00:00",
      lastExecuted: "2026-02-13T09:00:00",
      testsCreated: 48,
    },
    {
      id: "2",
      name: "Serenity House Mon/Wed/Fri",
      scheduleType: "weekly",
      testType: "breathalyzer",
      houseName: "Serenity House",
      isActive: true,
      randomPercentage: null,
      daysOfWeek: ["monday", "wednesday", "friday"],
      nextExecution: "2026-02-19T07:00:00",
      lastExecuted: "2026-02-17T07:00:00",
      testsCreated: 156,
    },
    {
      id: "3",
      name: "Monthly Random Lab Test",
      scheduleType: "monthly",
      testType: "urine",
      houseName: null,
      isActive: true,
      randomPercentage: 50,
      daysOfWeek: null,
      nextExecution: "2026-03-01T10:00:00",
      lastExecuted: "2026-02-01T10:00:00",
      testsCreated: 24,
    },
    {
      id: "4",
      name: "Hope Manor Weekend Testing",
      scheduleType: "weekly",
      testType: "oral_swab",
      houseName: "Hope Manor",
      isActive: false,
      randomPercentage: null,
      daysOfWeek: ["saturday", "sunday"],
      nextExecution: null,
      lastExecuted: "2026-02-09T08:00:00",
      testsCreated: 32,
    },
  ];

  const stats = {
    totalSchedules: schedules.length,
    activeSchedules: schedules.filter((s) => s.isActive).length,
    randomSchedules: schedules.filter((s) => s.scheduleType === "random").length,
    testsLast30Days: 228,
  };

  const upcomingTests = [
    { id: "1", scheduleName: "Weekly Random Testing", date: "2026-02-20", time: "09:00 AM", houseName: "All Houses", expectedTests: 12 },
    { id: "2", scheduleName: "Serenity House Mon/Wed/Fri", date: "2026-02-19", time: "07:00 AM", houseName: "Serenity House", expectedTests: 8 },
    { id: "3", scheduleName: "Weekly Random Testing", date: "2026-02-27", time: "09:00 AM", houseName: "All Houses", expectedTests: 12 },
    { id: "4", scheduleName: "Monthly Random Lab Test", date: "2026-03-01", time: "10:00 AM", houseName: "All Houses", expectedTests: 24 },
  ];

  const getScheduleTypeBadge = (type: ScheduleType) => {
    const styles: Record<ScheduleType, string> = {
      random: "bg-purple-100 text-purple-700",
      scheduled: "bg-blue-100 text-blue-700",
      weekly: "bg-green-100 text-green-700",
      monthly: "bg-orange-100 text-orange-700",
    };
    const labels: Record<ScheduleType, string> = {
      random: "Random",
      scheduled: "Scheduled",
      weekly: "Weekly",
      monthly: "Monthly",
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[type]}`}>
        {labels[type]}
      </span>
    );
  };

  const getTestTypeBadge = (type: TestType) => {
    const styles: Record<TestType, string> = {
      urine: "bg-blue-100 text-blue-700",
      breathalyzer: "bg-purple-100 text-purple-700",
      oral_swab: "bg-indigo-100 text-indigo-700",
      blood: "bg-red-100 text-red-700",
      hair_follicle: "bg-orange-100 text-orange-700",
    };
    const labels: Record<TestType, string> = {
      urine: "Urine",
      breathalyzer: "Breathalyzer",
      oral_swab: "Oral Swab",
      blood: "Blood",
      hair_follicle: "Hair Follicle",
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[type]}`}>
        {labels[type]}
      </span>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/operations/drug-tests"
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Drug Test Scheduling</h1>
            <p className="text-slate-600 mt-1">Configure automated and random test schedules</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Schedule
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CalendarDays className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Total Schedules</p>
              <p className="text-2xl font-bold text-slate-900">{stats.totalSchedules}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Active</p>
              <p className="text-2xl font-bold text-slate-900">{stats.activeSchedules}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Shuffle className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Random Schedules</p>
              <p className="text-2xl font-bold text-slate-900">{stats.randomSchedules}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <BarChart3 className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Tests (30 days)</p>
              <p className="text-2xl font-bold text-slate-900">{stats.testsLast30Days}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Schedules List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-lg border border-slate-200">
            <div className="p-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Test Schedules</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {schedules.map((schedule) => (
                <div key={schedule.id} className="p-4 hover:bg-slate-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium text-slate-900">{schedule.name}</h3>
                        {schedule.isActive ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                            Paused
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        {getScheduleTypeBadge(schedule.scheduleType)}
                        {getTestTypeBadge(schedule.testType)}
                        {schedule.houseName ? (
                          <div className="flex items-center gap-1 text-sm text-slate-600">
                            <Home className="h-3 w-3" />
                            {schedule.houseName}
                          </div>
                        ) : (
                          <span className="text-sm text-slate-500">All Houses</span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                        {schedule.randomPercentage && (
                          <span>{schedule.randomPercentage}% of residents</span>
                        )}
                        {schedule.daysOfWeek && (
                          <span className="capitalize">
                            {schedule.daysOfWeek.slice(0, 2).join(", ")}
                            {schedule.daysOfWeek.length > 2 && ` +${schedule.daysOfWeek.length - 2}`}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {schedule.testsCreated} tests created
                        </span>
                      </div>
                      {schedule.nextExecution && (
                        <div className="flex items-center gap-1 mt-2 text-sm text-blue-600">
                          <Clock className="h-3 w-3" />
                          Next: {new Date(schedule.nextExecution).toLocaleDateString()} at{" "}
                          {new Date(schedule.nextExecution).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"
                        title={schedule.isActive ? "Pause" : "Resume"}
                      >
                        {schedule.isActive ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        className="p-2 hover:bg-red-50 rounded-lg text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Upcoming Tests Calendar */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-slate-200">
            <div className="p-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-slate-600" />
                <h2 className="text-lg font-semibold text-slate-900">Upcoming Tests</h2>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {upcomingTests.map((test) => (
                <div key={test.id} className="p-4">
                  <div className="font-medium text-slate-900">{test.scheduleName}</div>
                  <div className="flex items-center gap-2 mt-1 text-sm text-slate-600">
                    <Calendar className="h-3 w-3" />
                    {new Date(test.date).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                    <span className="text-slate-400">|</span>
                    <Clock className="h-3 w-3" />
                    {test.time}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm text-slate-500">{test.houseName}</span>
                    <span className="text-sm font-medium text-blue-600">
                      ~{test.expectedTests} tests
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <h3 className="font-medium text-slate-900 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <button className="w-full px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center gap-2">
                <Shuffle className="h-4 w-4" />
                Run Random Test Now
              </button>
              <button className="w-full px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                View Full Calendar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Create Schedule Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg m-4">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Create Test Schedule</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Schedule Name
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Weekly Random Testing"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Schedule Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["random", "scheduled", "weekly", "monthly"] as ScheduleType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setSelectedScheduleType(type)}
                      className={`px-4 py-2 border rounded-lg text-sm font-medium capitalize ${
                        selectedScheduleType === type
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-slate-300 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Test Type
                </label>
                <select className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value="urine">Urine Test</option>
                  <option value="breathalyzer">Breathalyzer</option>
                  <option value="oral_swab">Oral Swab</option>
                  <option value="blood">Blood Test</option>
                  <option value="hair_follicle">Hair Follicle</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  House (optional)
                </label>
                <select className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value="">All Houses</option>
                  <option value="h1">Serenity House</option>
                  <option value="h2">Hope Manor</option>
                  <option value="h3">Recovery Haven</option>
                </select>
              </div>

              {selectedScheduleType === "random" && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Percentage of Residents
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      defaultValue="25"
                      className="w-24 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="text-slate-600">% of residents per execution</span>
                  </div>
                </div>
              )}

              {selectedScheduleType === "weekly" && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Days of Week
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                      <button
                        key={day}
                        className="px-3 py-1 border border-slate-300 rounded text-sm hover:bg-blue-50 hover:border-blue-500"
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-3 bg-amber-50 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                  <p className="text-sm text-amber-700">
                    Random testing helps maintain unpredictability and is recommended for compliance programs.
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
                Create Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

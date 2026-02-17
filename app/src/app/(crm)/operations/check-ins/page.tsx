"use client";

import { useState } from "react";
import {
  ClipboardCheck,
  Plus,
  Calendar,
  User,
  Home,
  Filter,
  Heart,
  Sun,
  Moon,
  Smile,
  Meh,
  Frown,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  AlertCircle,
} from "lucide-react";

export const dynamic = "force-dynamic";

type CheckInType = "morning" | "evening" | "wellness";
type MoodRating = 1 | 2 | 3 | 4 | 5;

interface WellnessCheckIn {
  id: string;
  residentName: string;
  houseName: string;
  checkInType: CheckInType;
  checkInDate: string;
  checkInTime: string;
  moodRating: MoodRating;
  sleepQuality: MoodRating | null;
  stressLevel: MoodRating | null;
  physicalHealth: MoodRating | null;
  cravingsLevel: MoodRating | null;
  notes: string | null;
  flaggedForFollowUp: boolean;
}

export default function CheckInsPage() {
  const [selectedHouse, setSelectedHouse] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  const houses = [
    { id: "h1", name: "Serenity House" },
    { id: "h2", name: "Hope Manor" },
    { id: "h3", name: "Recovery Haven" },
  ];

  const checkIns: WellnessCheckIn[] = [
    {
      id: "1",
      residentName: "Sarah Martinez",
      houseName: "Serenity House",
      checkInType: "morning",
      checkInDate: "2026-02-17",
      checkInTime: "07:30",
      moodRating: 4,
      sleepQuality: 4,
      stressLevel: 2,
      physicalHealth: 4,
      cravingsLevel: 1,
      notes: "Feeling positive about today",
      flaggedForFollowUp: false,
    },
    {
      id: "2",
      residentName: "Michael Chen",
      houseName: "Serenity House",
      checkInType: "morning",
      checkInDate: "2026-02-17",
      checkInTime: "08:15",
      moodRating: 3,
      sleepQuality: 2,
      stressLevel: 4,
      physicalHealth: 3,
      cravingsLevel: 3,
      notes: "Didn't sleep well, job interview today",
      flaggedForFollowUp: true,
    },
    {
      id: "3",
      residentName: "Jennifer Parker",
      houseName: "Hope Manor",
      checkInType: "wellness",
      checkInDate: "2026-02-17",
      checkInTime: "10:00",
      moodRating: 2,
      sleepQuality: 2,
      stressLevel: 5,
      physicalHealth: 3,
      cravingsLevel: 4,
      notes: "Family conflict yesterday, need to talk to counselor",
      flaggedForFollowUp: true,
    },
    {
      id: "4",
      residentName: "David Wilson",
      houseName: "Hope Manor",
      checkInType: "morning",
      checkInDate: "2026-02-17",
      checkInTime: "07:45",
      moodRating: 5,
      sleepQuality: 5,
      stressLevel: 1,
      physicalHealth: 5,
      cravingsLevel: 1,
      notes: null,
      flaggedForFollowUp: false,
    },
    {
      id: "5",
      residentName: "Emily Thompson",
      houseName: "Recovery Haven",
      checkInType: "evening",
      checkInDate: "2026-02-16",
      checkInTime: "21:00",
      moodRating: 3,
      sleepQuality: null,
      stressLevel: 3,
      physicalHealth: 3,
      cravingsLevel: 2,
      notes: "Productive day at work",
      flaggedForFollowUp: false,
    },
    {
      id: "6",
      residentName: "Robert Garcia",
      houseName: "Recovery Haven",
      checkInType: "wellness",
      checkInDate: "2026-02-16",
      checkInTime: "14:00",
      moodRating: 1,
      sleepQuality: 1,
      stressLevel: 5,
      physicalHealth: 2,
      cravingsLevel: 5,
      notes: "Struggling today, triggered by news about old friend",
      flaggedForFollowUp: true,
    },
  ];

  const stats = {
    totalToday: checkIns.filter((c) => c.checkInDate === selectedDate).length,
    avgMood: Math.round(
      checkIns.filter((c) => c.checkInDate === selectedDate).reduce((sum, c) => sum + c.moodRating, 0) /
        checkIns.filter((c) => c.checkInDate === selectedDate).length || 0
    ),
    flagged: checkIns.filter((c) => c.flaggedForFollowUp).length,
    completed: checkIns.filter((c) => c.checkInDate === selectedDate).length,
    pending: 19 - checkIns.filter((c) => c.checkInDate === selectedDate).length, // Mock total residents
  };

  const getMoodIcon = (rating: MoodRating) => {
    if (rating >= 4) return <Smile className="h-5 w-5 text-green-500" />;
    if (rating === 3) return <Meh className="h-5 w-5 text-yellow-500" />;
    return <Frown className="h-5 w-5 text-red-500" />;
  };

  const getMoodColor = (rating: MoodRating) => {
    if (rating >= 4) return "text-green-600 bg-green-100";
    if (rating === 3) return "text-yellow-600 bg-yellow-100";
    return "text-red-600 bg-red-100";
  };

  const getCheckInTypeBadge = (type: CheckInType) => {
    const styles: Record<CheckInType, { bg: string; icon: React.ReactNode }> = {
      morning: { bg: "bg-orange-100 text-orange-700", icon: <Sun className="h-3 w-3" /> },
      evening: { bg: "bg-indigo-100 text-indigo-700", icon: <Moon className="h-3 w-3" /> },
      wellness: { bg: "bg-green-100 text-green-700", icon: <Heart className="h-3 w-3" /> },
    };
    const labels: Record<CheckInType, string> = {
      morning: "Morning",
      evening: "Evening",
      wellness: "Wellness",
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[type].bg} flex items-center gap-1`}>
        {styles[type].icon}
        {labels[type]}
      </span>
    );
  };

  const filteredCheckIns = checkIns.filter((c) => {
    if (selectedHouse !== "all" && c.houseName !== selectedHouse) return false;
    if (selectedType !== "all" && c.checkInType !== selectedType) return false;
    return true;
  });

  const flaggedCheckIns = filteredCheckIns.filter((c) => c.flaggedForFollowUp);
  const regularCheckIns = filteredCheckIns.filter((c) => !c.flaggedForFollowUp);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Daily Check-ins</h1>
          <p className="text-slate-600 mt-1">Monitor resident wellness and daily status</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Check-in
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ClipboardCheck className="h-5 w-5 text-blue-600" />
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
              <Calendar className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Pending</p>
              <p className="text-2xl font-bold text-slate-900">{stats.pending}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Avg Mood</p>
              <p className="text-2xl font-bold text-slate-900">{stats.avgMood}/5</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Flagged</p>
              <p className="text-2xl font-bold text-slate-900">{stats.flagged}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Heart className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Wellness Rate</p>
              <p className="text-2xl font-bold text-slate-900">
                {Math.round((stats.completed / (stats.completed + stats.pending)) * 100)}%
              </p>
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
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Types</option>
            <option value="morning">Morning</option>
            <option value="evening">Evening</option>
            <option value="wellness">Wellness</option>
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

      {/* Flagged Check-ins */}
      {flaggedCheckIns.length > 0 && (
        <div className="bg-white rounded-lg border border-red-200">
          <div className="p-6 border-b border-red-200 bg-red-50">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              Flagged for Follow-up ({flaggedCheckIns.length})
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {flaggedCheckIns.map((checkIn) => (
              <div key={checkIn.id} className="p-4 hover:bg-slate-50">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-slate-400" />
                      <span className="font-medium text-slate-900">{checkIn.residentName}</span>
                      {getCheckInTypeBadge(checkIn.checkInType)}
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getMoodColor(checkIn.moodRating)}`}>
                        Mood: {checkIn.moodRating}/5
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      <div className="flex items-center gap-1">
                        <Home className="h-4 w-4" />
                        <span>{checkIn.houseName}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{checkIn.checkInDate} at {checkIn.checkInTime}</span>
                      </div>
                    </div>
                    {checkIn.notes && (
                      <p className="text-sm text-slate-700 bg-slate-50 p-2 rounded">
                        "{checkIn.notes}"
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      {checkIn.cravingsLevel && checkIn.cravingsLevel >= 4 && (
                        <span className="text-red-600 font-medium">High cravings: {checkIn.cravingsLevel}/5</span>
                      )}
                      {checkIn.stressLevel && checkIn.stressLevel >= 4 && (
                        <span className="text-orange-600 font-medium">High stress: {checkIn.stressLevel}/5</span>
                      )}
                      {checkIn.sleepQuality && checkIn.sleepQuality <= 2 && (
                        <span className="text-yellow-600 font-medium">Poor sleep: {checkIn.sleepQuality}/5</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getMoodIcon(checkIn.moodRating)}
                    <button className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700">
                      Follow Up
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Check-ins Table */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">All Check-ins</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Resident</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">House</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Type</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Time</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Mood</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Cravings</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Notes</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {regularCheckIns.map((checkIn) => (
                <tr key={checkIn.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-slate-400" />
                      <span className="text-sm font-medium text-slate-900">{checkIn.residentName}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600">{checkIn.houseName}</td>
                  <td className="py-3 px-4">{getCheckInTypeBadge(checkIn.checkInType)}</td>
                  <td className="py-3 px-4 text-sm text-slate-600">{checkIn.checkInTime}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      {getMoodIcon(checkIn.moodRating)}
                      <span className="text-sm font-medium">{checkIn.moodRating}/5</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {checkIn.cravingsLevel ? (
                      <span
                        className={`text-sm font-medium ${
                          checkIn.cravingsLevel >= 4 ? "text-red-600" : "text-slate-600"
                        }`}
                      >
                        {checkIn.cravingsLevel}/5
                      </span>
                    ) : (
                      <span className="text-sm text-slate-400">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600 max-w-xs truncate">
                    {checkIn.notes || "-"}
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

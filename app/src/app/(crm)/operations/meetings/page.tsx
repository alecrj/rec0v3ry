"use client";

import { useState } from "react";
import {
  Calendar,
  Plus,
  Users,
  Clock,
  MapPin,
  CheckCircle,
  XCircle,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export const dynamic = "force-dynamic";

type MeetingType = "house" | "aa" | "na" | "therapy" | "life_skills" | "other";
type AttendanceStatus = "attended" | "absent" | "excused" | null;

interface Meeting {
  id: string;
  title: string;
  meetingType: MeetingType;
  houseName: string;
  scheduledDate: string;
  scheduledTime: string;
  duration: number;
  location: string;
  isRequired: boolean;
  totalResidents: number;
  attended: number;
  absent: number;
  excused: number;
}

export default function MeetingsPage() {
  const [selectedHouse, setSelectedHouse] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [currentWeek, setCurrentWeek] = useState(0);

  const houses = [
    { id: "h1", name: "Serenity House" },
    { id: "h2", name: "Hope Manor" },
    { id: "h3", name: "Recovery Haven" },
  ];

  const meetings: Meeting[] = [
    {
      id: "1",
      title: "Morning House Meeting",
      meetingType: "house",
      houseName: "Serenity House",
      scheduledDate: "2026-02-17",
      scheduledTime: "08:00",
      duration: 30,
      location: "Common Room",
      isRequired: true,
      totalResidents: 8,
      attended: 7,
      absent: 1,
      excused: 0,
    },
    {
      id: "2",
      title: "AA Meeting",
      meetingType: "aa",
      houseName: "All Houses",
      scheduledDate: "2026-02-17",
      scheduledTime: "19:00",
      duration: 60,
      location: "Community Center",
      isRequired: true,
      totalResidents: 24,
      attended: 20,
      absent: 2,
      excused: 2,
    },
    {
      id: "3",
      title: "NA Meeting",
      meetingType: "na",
      houseName: "All Houses",
      scheduledDate: "2026-02-18",
      scheduledTime: "19:00",
      duration: 60,
      location: "Church Hall",
      isRequired: true,
      totalResidents: 24,
      attended: 0,
      absent: 0,
      excused: 0,
    },
    {
      id: "4",
      title: "Life Skills Workshop",
      meetingType: "life_skills",
      houseName: "Hope Manor",
      scheduledDate: "2026-02-18",
      scheduledTime: "14:00",
      duration: 90,
      location: "Training Room",
      isRequired: false,
      totalResidents: 8,
      attended: 0,
      absent: 0,
      excused: 0,
    },
    {
      id: "5",
      title: "Group Therapy",
      meetingType: "therapy",
      houseName: "Recovery Haven",
      scheduledDate: "2026-02-19",
      scheduledTime: "10:00",
      duration: 60,
      location: "Therapy Room",
      isRequired: true,
      totalResidents: 6,
      attended: 0,
      absent: 0,
      excused: 0,
    },
    {
      id: "6",
      title: "Weekly House Meeting",
      meetingType: "house",
      houseName: "Serenity House",
      scheduledDate: "2026-02-19",
      scheduledTime: "18:00",
      duration: 45,
      location: "Common Room",
      isRequired: true,
      totalResidents: 8,
      attended: 0,
      absent: 0,
      excused: 0,
    },
  ];

  const getMeetingTypeBadge = (type: MeetingType) => {
    const styles: Record<MeetingType, string> = {
      house: "bg-blue-100 text-blue-700",
      aa: "bg-purple-100 text-purple-700",
      na: "bg-indigo-100 text-indigo-700",
      therapy: "bg-green-100 text-green-700",
      life_skills: "bg-orange-100 text-orange-700",
      other: "bg-slate-100 text-slate-700",
    };
    const labels: Record<MeetingType, string> = {
      house: "House",
      aa: "AA",
      na: "NA",
      therapy: "Therapy",
      life_skills: "Life Skills",
      other: "Other",
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[type]}`}>
        {labels[type]}
      </span>
    );
  };

  const isPastMeeting = (date: string) => {
    return new Date(date) < new Date(new Date().toDateString());
  };

  const isTodayMeeting = (date: string) => {
    return new Date(date).toDateString() === new Date().toDateString();
  };

  const getAttendanceRate = (meeting: Meeting) => {
    if (meeting.totalResidents === 0) return null;
    const total = meeting.attended + meeting.absent + meeting.excused;
    if (total === 0) return null;
    return Math.round((meeting.attended / total) * 100);
  };

  const upcomingMeetings = meetings.filter(
    (m) => !isPastMeeting(m.scheduledDate) || isTodayMeeting(m.scheduledDate)
  );
  const pastMeetings = meetings.filter(
    (m) => isPastMeeting(m.scheduledDate) && !isTodayMeeting(m.scheduledDate)
  );

  const weekStats = {
    total: meetings.length,
    completed: pastMeetings.length + meetings.filter((m) => isTodayMeeting(m.scheduledDate) && getAttendanceRate(m) !== null).length,
    avgAttendance: 87, // Mock average
    required: meetings.filter((m) => m.isRequired).length,
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Meeting Management</h1>
          <p className="text-slate-600 mt-1">Schedule meetings and track attendance</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            View Calendar
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Schedule Meeting
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">This Week</p>
              <p className="text-2xl font-bold text-slate-900">{weekStats.total}</p>
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
              <p className="text-2xl font-bold text-slate-900">{weekStats.completed}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Avg Attendance</p>
              <p className="text-2xl font-bold text-slate-900">{weekStats.avgAttendance}%</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Clock className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Required</p>
              <p className="text-2xl font-bold text-slate-900">{weekStats.required}</p>
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
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Types</option>
            <option value="house">House Meetings</option>
            <option value="aa">AA Meetings</option>
            <option value="na">NA Meetings</option>
            <option value="therapy">Therapy</option>
            <option value="life_skills">Life Skills</option>
          </select>
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => setCurrentWeek(currentWeek - 1)}
              className="p-2 hover:bg-slate-100 rounded-lg"
            >
              <ChevronLeft className="h-4 w-4 text-slate-600" />
            </button>
            <span className="text-sm font-medium text-slate-700">This Week</span>
            <button
              onClick={() => setCurrentWeek(currentWeek + 1)}
              className="p-2 hover:bg-slate-100 rounded-lg"
            >
              <ChevronRight className="h-4 w-4 text-slate-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Meetings List */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Upcoming Meetings</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {upcomingMeetings.map((meeting) => (
            <div key={meeting.id} className="p-4 hover:bg-slate-50">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="text-center min-w-[60px]">
                    <p className="text-xs text-slate-500 uppercase">
                      {new Date(meeting.scheduledDate).toLocaleDateString("en-US", { weekday: "short" })}
                    </p>
                    <p className="text-2xl font-bold text-slate-900">
                      {new Date(meeting.scheduledDate).getDate()}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(meeting.scheduledDate).toLocaleDateString("en-US", { month: "short" })}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-slate-900">{meeting.title}</h3>
                      {getMeetingTypeBadge(meeting.meetingType)}
                      {meeting.isRequired && (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700">
                          Required
                        </span>
                      )}
                      {isTodayMeeting(meeting.scheduledDate) && (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-700">
                          Today
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{meeting.scheduledTime} ({meeting.duration} min)</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        <span>{meeting.location}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>{meeting.houseName}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getAttendanceRate(meeting) !== null ? (
                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-900">
                        {meeting.attended}/{meeting.totalResidents} attended
                      </p>
                      <p className="text-xs text-slate-500">
                        {getAttendanceRate(meeting)}% attendance
                      </p>
                    </div>
                  ) : (
                    <button className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700">
                      Take Attendance
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Past Meetings */}
      {pastMeetings.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Recent Meetings</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Meeting</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Type</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Attendance</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Rate</th>
                </tr>
              </thead>
              <tbody>
                {pastMeetings.map((meeting) => (
                  <tr key={meeting.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 text-sm font-medium text-slate-900">
                      {meeting.title}
                    </td>
                    <td className="py-3 px-4">{getMeetingTypeBadge(meeting.meetingType)}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {new Date(meeting.scheduledDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-green-600">{meeting.attended} attended</span>
                        <span className="text-slate-400">|</span>
                        <span className="text-red-600">{meeting.absent} absent</span>
                        {meeting.excused > 0 && (
                          <>
                            <span className="text-slate-400">|</span>
                            <span className="text-yellow-600">{meeting.excused} excused</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm font-medium text-slate-900">
                        {getAttendanceRate(meeting)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

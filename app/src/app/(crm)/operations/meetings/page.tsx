"use client";

import { useState, FormEvent } from "react";
import {
  Calendar,
  Plus,
  Users,
  Clock,
  MapPin,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  PageContainer,
  PageHeader,
  StatCard,
  StatCardGrid,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  EmptyState,
  ErrorState,
  SkeletonCard,
  useToast,
} from "@/components/ui";

export const dynamic = "force-dynamic";

const meetingTypeBadge: Record<string, { variant: "info" | "success" | "warning" | "error" | "default"; label: string }> = {
  house_meeting: { variant: "info", label: "House" },
  group_therapy: { variant: "success", label: "Therapy" },
  aa_na: { variant: "default", label: "AA/NA" },
  life_skills: { variant: "warning", label: "Life Skills" },
  one_on_one: { variant: "info", label: "1-on-1" },
  family_session: { variant: "error", label: "Family" },
  other: { variant: "default", label: "Other" },
};

export default function MeetingsPage() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [selectedType, setSelectedType] = useState<string>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [meetingForm, setMeetingForm] = useState({
    title: "",
    meetingType: "house_meeting",
    scheduledAt: "",
    durationMinutes: "60",
    location: "",
    isMandatory: false,
  });
  const [attendanceMeetingId, setAttendanceMeetingId] = useState<string | null>(null);
  const [attendanceState, setAttendanceState] = useState<Record<string, { attended: boolean; excused: boolean }>>({});

  const { data: userData } = trpc.user.getCurrentUser.useQuery(undefined, { retry: false });
  const orgId = userData?.org_id;

  const createMeeting = trpc.meeting.create.useMutation({
    onSuccess: () => {
      toast("success", "Meeting scheduled");
      utils.meeting.list.invalidate();
      utils.meeting.getStats.invalidate();
      setMeetingForm({ title: "", meetingType: "house_meeting", scheduledAt: "", durationMinutes: "60", location: "", isMandatory: false });
      setShowCreateModal(false);
    },
    onError: (err) => toast("error", err.message),
  });

  const { data: residents } = trpc.resident.list.useQuery({}, { enabled: !!orgId });

  const { data: meetingDetail } = trpc.meeting.getById.useQuery(
    { meetingId: attendanceMeetingId! },
    { enabled: !!attendanceMeetingId }
  );

  const recordAttendance = trpc.meeting.recordAttendance.useMutation({
    onSuccess: (data) => {
      toast("success", "Attendance recorded", `${data.count} records saved`);
      utils.meeting.list.invalidate();
      utils.meeting.getStats.invalidate();
      utils.meeting.getById.invalidate({ meetingId: attendanceMeetingId! });
      setAttendanceMeetingId(null);
      setAttendanceState({});
    },
    onError: (err) => toast("error", "Failed to record attendance", err.message),
  });

  const { data: meetings, isLoading, error } = trpc.meeting.list.useQuery(
    { orgId: orgId!, limit: 50 },
    { enabled: !!orgId }
  );

  const { data: stats } = trpc.meeting.getStats.useQuery(
    { orgId: orgId! },
    { enabled: !!orgId }
  );

  const statsLoading = !stats && !!orgId;

  const isPastMeeting = (date: Date | string) => new Date(date) < new Date(new Date().toDateString());
  const isTodayMeeting = (date: Date | string) => new Date(date).toDateString() === new Date().toDateString();

  const allMeetings = meetings ?? [];
  const filteredMeetings = allMeetings.filter((m) => {
    if (selectedType !== "all" && m.meeting_type !== selectedType) return false;
    return true;
  });

  const upcomingMeetings = filteredMeetings.filter(
    (m) => !isPastMeeting(m.scheduled_at) || isTodayMeeting(m.scheduled_at)
  );
  const pastMeetings = filteredMeetings.filter(
    (m) => isPastMeeting(m.scheduled_at) && !isTodayMeeting(m.scheduled_at)
  );

  if (error) {
    return (
      <PageContainer>
        <Card><CardContent><ErrorState title="Failed to load meetings" description={error.message} /></CardContent></Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Meeting Management"
        description="Schedule meetings and track attendance"
        actions={
          <div className="flex gap-3">
            <Button variant="secondary" icon={<Calendar className="h-4 w-4" />}>
              View Calendar
            </Button>
            <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setShowCreateModal(true)}>
              Schedule Meeting
            </Button>
          </div>
        }
      />

      <StatCardGrid columns={4}>
        <StatCard
          title="Total Meetings"
          value={statsLoading ? "—" : String(stats?.totalMeetings ?? allMeetings.length)}
          icon={<Calendar className="h-5 w-5" />}
          loading={statsLoading}
        />
        <StatCard
          title="Completed"
          value={statsLoading ? "—" : String(pastMeetings.length)}
          variant="success"
          icon={<CheckCircle className="h-5 w-5" />}
          loading={statsLoading}
        />
        <StatCard
          title="Avg Attendance"
          value={statsLoading ? "—" : `${stats?.attendanceRate ?? 0}%`}
          variant="info"
          icon={<Users className="h-5 w-5" />}
          loading={statsLoading}
        />
        <StatCard
          title="Upcoming"
          value={statsLoading ? "—" : String(upcomingMeetings.length)}
          variant="warning"
          icon={<Clock className="h-5 w-5" />}
          loading={statsLoading}
        />
      </StatCardGrid>

      {/* Filter */}
      <Card>
        <CardContent>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-zinc-600">Filter:</span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="h-10 px-3 text-sm border border-zinc-200 rounded-lg bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="all">All Types</option>
              <option value="house_meeting">House Meetings</option>
              <option value="aa_na">AA/NA Meetings</option>
              <option value="group_therapy">Therapy</option>
              <option value="life_skills">Life Skills</option>
              <option value="one_on_one">1-on-1</option>
              <option value="family_session">Family</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Meetings */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Meetings</CardTitle>
        </CardHeader>
        {isLoading ? (
          <CardContent className="pt-0 space-y-3">
            <SkeletonCard /><SkeletonCard />
          </CardContent>
        ) : upcomingMeetings.length === 0 ? (
          <CardContent className="pt-0">
            <EmptyState
              iconType="inbox"
              title="No upcoming meetings"
              description="Schedule a meeting to get started."
            />
          </CardContent>
        ) : (
          <CardContent className="pt-0">
            <div className="divide-y divide-zinc-200/50 -mx-6">
              {upcomingMeetings.map((meeting) => {
                const config = meetingTypeBadge[meeting.meeting_type] ?? meetingTypeBadge.other;
                return (
                  <div key={meeting.id} className="px-6 py-4 hover:bg-zinc-100 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="text-center min-w-[52px] pt-0.5">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                            {new Date(meeting.scheduled_at).toLocaleDateString("en-US", { weekday: "short" })}
                          </p>
                          <p className="text-2xl font-bold text-zinc-800 leading-tight">
                            {new Date(meeting.scheduled_at).getDate()}
                          </p>
                          <p className="text-[10px] text-zinc-500">
                            {new Date(meeting.scheduled_at).toLocaleDateString("en-US", { month: "short" })}
                          </p>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <h3 className="text-sm font-semibold text-zinc-800">{meeting.title}</h3>
                            <Badge variant={config.variant}>{config.label}</Badge>
                            {meeting.is_mandatory && <Badge variant="error">Required</Badge>}
                            {isTodayMeeting(meeting.scheduled_at) && <Badge variant="warning">Today</Badge>}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-zinc-500">
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5" />
                              <span>
                                {new Date(meeting.scheduled_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                                {meeting.duration_minutes ? ` (${meeting.duration_minutes} min)` : ""}
                              </span>
                            </div>
                            {meeting.location && (
                              <div className="flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5" />
                                <span>{meeting.location}</span>
                              </div>
                            )}
                            {meeting.house_name && (
                              <div className="flex items-center gap-1.5">
                                <Users className="h-3.5 w-3.5" />
                                <span>{meeting.house_name}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button variant="primary" size="sm" onClick={() => {
                        setAttendanceMeetingId(meeting.id);
                        // Pre-populate from existing attendance if available
                        setAttendanceState({});
                      }}>Take Attendance</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Past Meetings */}
      {pastMeetings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Meetings</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto -mx-6">
              <table className="w-full">
                <thead>
                  <tr className="border-y border-zinc-200/50 bg-zinc-100">
                    <th className="text-left py-3 px-6 text-xs font-semibold uppercase tracking-wider text-zinc-500">Meeting</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Type</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Date</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">House</th>
                  </tr>
                </thead>
                <tbody>
                  {pastMeetings.map((meeting) => {
                    const config = meetingTypeBadge[meeting.meeting_type] ?? meetingTypeBadge.other;
                    return (
                      <tr key={meeting.id} className="border-b border-zinc-200/50 hover:bg-zinc-100 transition-colors">
                        <td className="py-3 px-6 text-sm font-medium text-zinc-800">{meeting.title}</td>
                        <td className="py-3 px-4"><Badge variant={config.variant}>{config.label}</Badge></td>
                        <td className="py-3 px-4 text-sm text-zinc-400">
                          {new Date(meeting.scheduled_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </td>
                        <td className="py-3 px-4 text-sm text-zinc-400">{meeting.house_name ?? "All Houses"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
      {/* Attendance Modal */}
      {attendanceMeetingId && orgId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setAttendanceMeetingId(null); setAttendanceState({}); }} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 border border-zinc-200 max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-zinc-200">
              <h2 className="text-xl font-bold text-zinc-800">Take Attendance</h2>
              {meetingDetail && <p className="text-sm text-zinc-500 mt-1">{meetingDetail.title}</p>}
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-2">
              {(residents?.items ?? []).length === 0 ? (
                <p className="text-sm text-zinc-500">No residents found.</p>
              ) : (
                (residents?.items ?? []).map((r) => {
                  const state = attendanceState[r.id] ?? { attended: false, excused: false };
                  // Check if pre-existing attendance
                  const existing = meetingDetail?.attendance?.find((a) => a.resident_id === r.id);
                  const attended = attendanceState[r.id] !== undefined ? state.attended : (existing?.attended ?? false);
                  const excused = attendanceState[r.id] !== undefined ? state.excused : (existing?.excused ?? false);
                  return (
                    <div key={r.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-zinc-100">
                      <span className="text-sm font-medium text-zinc-700">{r.first_name} {r.last_name}</span>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={attended}
                            onChange={(e) => setAttendanceState((prev) => ({
                              ...prev,
                              [r.id]: { attended: e.target.checked, excused: e.target.checked ? false : (prev[r.id]?.excused ?? false) },
                            }))}
                            className="rounded border-zinc-200 text-indigo-500 focus:ring-indigo-500"
                          />
                          <span className="text-xs text-zinc-400">Present</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={excused}
                            onChange={(e) => setAttendanceState((prev) => ({
                              ...prev,
                              [r.id]: { excused: e.target.checked, attended: e.target.checked ? false : (prev[r.id]?.attended ?? false) },
                            }))}
                            className="rounded border-zinc-200 text-amber-500 focus:ring-amber-500"
                          />
                          <span className="text-xs text-zinc-400">Excused</span>
                        </label>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="p-6 border-t border-zinc-200 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => { setAttendanceMeetingId(null); setAttendanceState({}); }}>Cancel</Button>
              <Button
                variant="primary"
                disabled={recordAttendance.isPending}
                onClick={() => {
                  const allResidents = residents?.items ?? [];
                  const attendance = allResidents.map((r) => {
                    const state = attendanceState[r.id];
                    const existing = meetingDetail?.attendance?.find((a) => a.resident_id === r.id);
                    const attended = state !== undefined ? state.attended : (existing?.attended ?? false);
                    const excused = state !== undefined ? state.excused : (existing?.excused ?? false);
                    return {
                      residentId: r.id,
                      attended,
                      excused,
                    };
                  });
                  recordAttendance.mutate({
                    orgId,
                    meetingId: attendanceMeetingId,
                    attendance,
                  });
                }}
              >
                {recordAttendance.isPending ? "Saving..." : "Save Attendance"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Meeting Modal */}
      {showCreateModal && orgId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 border border-zinc-200">
            <div className="p-6 border-b border-zinc-200">
              <h2 className="text-xl font-bold text-zinc-800">Schedule Meeting</h2>
            </div>
            <form
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                createMeeting.mutate({
                  orgId,
                  title: meetingForm.title,
                  meetingType: meetingForm.meetingType as "house_meeting" | "group_therapy" | "aa_na" | "life_skills" | "one_on_one" | "family_session" | "other",
                  scheduledAt: meetingForm.scheduledAt,
                  durationMinutes: parseInt(meetingForm.durationMinutes) || 60,
                  location: meetingForm.location || undefined,
                  isMandatory: meetingForm.isMandatory,
                });
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-zinc-600 mb-1.5">Title <span className="text-red-400">*</span></label>
                <input type="text" className="w-full h-10 px-3 text-sm border border-zinc-200 rounded-lg bg-zinc-100" placeholder="e.g., Weekly House Meeting" required value={meetingForm.title} onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-600 mb-1.5">Type <span className="text-red-400">*</span></label>
                  <select className="w-full h-10 px-3 text-sm border border-zinc-200 rounded-lg bg-zinc-100" value={meetingForm.meetingType} onChange={(e) => setMeetingForm({ ...meetingForm, meetingType: e.target.value })}>
                    <option value="house_meeting">House Meeting</option>
                    <option value="group_therapy">Group Therapy</option>
                    <option value="aa_na">AA/NA</option>
                    <option value="life_skills">Life Skills</option>
                    <option value="one_on_one">1-on-1</option>
                    <option value="family_session">Family Session</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-600 mb-1.5">Duration (min)</label>
                  <input type="number" className="w-full h-10 px-3 text-sm border border-zinc-200 rounded-lg bg-zinc-100" value={meetingForm.durationMinutes} onChange={(e) => setMeetingForm({ ...meetingForm, durationMinutes: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-600 mb-1.5">Date & Time <span className="text-red-400">*</span></label>
                <input type="datetime-local" className="w-full h-10 px-3 text-sm border border-zinc-200 rounded-lg bg-zinc-100" required value={meetingForm.scheduledAt} onChange={(e) => setMeetingForm({ ...meetingForm, scheduledAt: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-600 mb-1.5">Location</label>
                <input type="text" className="w-full h-10 px-3 text-sm border border-zinc-200 rounded-lg bg-zinc-100" placeholder="e.g., Common Room" value={meetingForm.location} onChange={(e) => setMeetingForm({ ...meetingForm, location: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded border-zinc-200 text-indigo-400 focus:ring-indigo-500" checked={meetingForm.isMandatory} onChange={(e) => setMeetingForm({ ...meetingForm, isMandatory: e.target.checked })} />
                <span className="text-sm text-zinc-600">Mandatory attendance</span>
              </label>
              <div className="pt-2 flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={createMeeting.isPending}>
                  {createMeeting.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Scheduling...</> : "Schedule Meeting"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

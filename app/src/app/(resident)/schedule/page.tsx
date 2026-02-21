"use client";

import { Clock, MapPin, Loader2, Calendar } from "lucide-react";
import { trpc } from "@/lib/trpc";

export const dynamic = "force-dynamic";

export default function ResidentSchedulePage() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const { data: userData } = trpc.user.getCurrentUser.useQuery();
  const orgId = userData?.org_id;

  const { data: profile } = trpc.resident.getMyProfile.useQuery(
    undefined,
    { enabled: !!userData }
  );

  const houseId = profile?.currentAdmission?.house_id;

  // Get today's meetings
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const { data: meetingsData, isLoading: meetingsLoading } = trpc.meeting.list.useQuery(
    {
      orgId: orgId!,
      houseId: houseId ?? undefined,
      startDate: todayStart.toISOString(),
      endDate: todayEnd.toISOString(),
    },
    { enabled: !!orgId }
  );

  // Get today's chore assignments
  const { data: choresData, isLoading: choresLoading } = trpc.chore.list.useQuery(
    { orgId: orgId!, houseId: houseId ?? undefined, isActive: true },
    { enabled: !!orgId }
  );

  const isLoading = meetingsLoading || choresLoading;
  const meetings = meetingsData ?? [];
  const chores = choresData ?? [];

  // Build schedule items sorted by time
  const scheduleItems: Array<{
    id: string;
    time: string;
    title: string;
    location?: string;
    type: "meeting" | "chore" | "curfew";
    badge: string;
    badgeColor: string;
  }> = [];

  meetings.forEach((m: typeof meetings[number]) => {
    const time = m.scheduled_at
      ? new Date(m.scheduled_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
      : "TBD";
    scheduleItems.push({
      id: `meeting-${m.id}`,
      time,
      title: m.title ?? m.meeting_type ?? "Meeting",
      location: m.location ?? undefined,
      type: "meeting",
      badge: m.is_mandatory ? "Required" : "Optional",
      badgeColor: m.is_mandatory ? "bg-indigo-500/15 text-indigo-300" : "bg-green-500/15 text-green-300",
    });
  });

  chores.forEach((c: typeof chores[number]) => {
    scheduleItems.push({
      id: `chore-${c.id}`,
      time: "Assigned",
      title: c.title ?? "Chore",
      location: c.area ?? undefined,
      type: "chore",
      badge: "Chore",
      badgeColor: "bg-indigo-500/15 text-indigo-300",
    });
  });

  // Sort by time string
  scheduleItems.sort((a, b) => a.time.localeCompare(b.time));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Schedule</h1>
        <p className="text-zinc-400">{today}</p>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">
          Today
        </h2>

        {scheduleItems.length === 0 ? (
          <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-8 text-center">
            <Calendar className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-500">No scheduled events today</p>
            <p className="text-sm text-zinc-500 mt-1">Check back later for updates</p>
          </div>
        ) : (
          <div className="bg-zinc-900 rounded-lg border border-zinc-800 divide-y divide-zinc-800/50">
            {scheduleItems.map((item) => (
              <div key={item.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-16 text-center flex-shrink-0">
                    <p className="text-sm font-bold text-zinc-100">{item.time}</p>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-zinc-100">{item.title}</p>
                    {item.location && (
                      <div className="flex items-center gap-2 mt-1 text-sm text-zinc-400">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{item.location}</span>
                      </div>
                    )}
                    {item.type === "chore" && (
                      <div className="flex items-center gap-2 mt-1 text-sm text-zinc-400">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Assigned duty</span>
                      </div>
                    )}
                  </div>
                  <div className={`px-2 py-1 text-xs font-medium rounded ${item.badgeColor}`}>
                    {item.badge}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">
          This Week
        </h2>
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4">
          <div className="grid grid-cols-7 gap-2 text-center">
            {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
              <div key={i} className="text-xs font-medium text-zinc-500">
                {day}
              </div>
            ))}
            {Array.from({ length: 7 }, (_, i) => {
              const d = new Date();
              const startOfWeek = d.getDate() - d.getDay();
              const date = startOfWeek + i;
              const isToday = i === d.getDay();
              return (
                <div
                  key={i}
                  className={`py-2 rounded-lg text-sm ${
                    isToday
                      ? "bg-indigo-500 text-white font-bold"
                      : "text-zinc-300"
                  }`}
                >
                  {date}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

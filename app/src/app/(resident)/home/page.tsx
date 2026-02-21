"use client";

import { useState } from "react";
import { Bell, Calendar, CheckCircle, DollarSign, Loader2 } from "lucide-react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { WellnessCheckIn } from "@/components/wellness-checkin";

export const dynamic = "force-dynamic";

const MOOD_EMOJI: Record<number, string> = { 1: "😢", 2: "😕", 3: "😐", 4: "🙂", 5: "😄" };

function MoodSparkline({ history }: { history: { date: string; moodRating: number }[] }) {
  if (history.length === 0) return null;
  const sorted = [...history].reverse(); // oldest first for display
  const colors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-green-400", "bg-emerald-400"];
  return (
    <div className="flex items-end gap-1 h-8">
      {sorted.map((entry, i) => {
        const heightPct = (entry.moodRating / 5) * 100;
        const colorClass = colors[entry.moodRating - 1] ?? "bg-zinc-500";
        const emoji = MOOD_EMOJI[entry.moodRating] ?? "😐";
        return (
          <div
            key={i}
            title={`${entry.date}: ${emoji}`}
            className={`flex-1 rounded-sm ${colorClass} opacity-80 transition-all`}
            style={{ height: `${heightPct}%`, minHeight: 4 }}
          />
        );
      })}
    </div>
  );
}

export default function ResidentHomePage() {
  const [wellnessDismissed, setWellnessDismissed] = useState(false);

  const { data: userData, isLoading: userLoading } = trpc.user.getCurrentUser.useQuery();
  const { data: profile, isLoading: profileLoading } = trpc.resident.getMyProfile.useQuery(
    undefined,
    { enabled: !!userData }
  );
  const { data: wellnessStatus, isLoading: wellnessLoading } = trpc.wellness.getDailyStatus.useQuery(
    undefined,
    { enabled: !!userData }
  );
  const { data: moodHistory } = trpc.wellness.getMyHistory.useQuery(
    undefined,
    { enabled: !!userData }
  );

  const isLoading = userLoading || profileLoading || wellnessLoading;
  const firstName = profile?.preferred_name || profile?.first_name || userData?.first_name || "Resident";
  const houseName = profile?.currentAdmission?.house_name ?? "Your House";
  const bedName = profile?.currentAdmission?.bed_name;
  const admissionDate = profile?.currentAdmission?.admission_date;

  const daysInProgram = admissionDate
    ? Math.floor((Date.now() - new Date(admissionDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const showWellnessCheckIn =
    !wellnessDismissed &&
    !wellnessLoading &&
    wellnessStatus &&
    !wellnessStatus.checkedInToday;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Wellness check-in — shown at top if not done today */}
      {showWellnessCheckIn && (
        <WellnessCheckIn onComplete={() => setWellnessDismissed(true)} />
      )}

      {/* Welcome header */}
      <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold">Welcome back, {firstName}</h1>
        <p className="text-indigo-200 mt-1">
          {houseName}{bedName ? ` - ${bedName}` : ""}
        </p>
        <div className="mt-4 flex items-center gap-4">
          <div>
            <p className="text-sm text-indigo-200">Days in Program</p>
            <p className="text-3xl font-bold font-mono mt-1">{daysInProgram}</p>
          </div>
          <div className="h-12 w-px bg-indigo-400" />
          <div>
            <p className="text-sm text-indigo-200">Status</p>
            <p className="text-lg font-bold mt-1">
              {profile?.currentAdmission?.status === "active" ? "Active" : "—"}
            </p>
          </div>
          {wellnessStatus?.todayEntry?.moodRating && (
            <>
              <div className="h-12 w-px bg-indigo-400" />
              <div>
                <p className="text-sm text-indigo-200">Today&apos;s Mood</p>
                <p className="text-2xl mt-1">{MOOD_EMOJI[wellnessStatus.todayEntry.moodRating] ?? "😐"}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mood history sparkline */}
      {moodHistory && moodHistory.history.length > 1 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-zinc-300">Your Week</h2>
            <span className="text-xs text-zinc-500">{moodHistory.history.length} check-ins</span>
          </div>
          <MoodSparkline history={moodHistory.history.slice(0, 14)} />
          <div className="flex justify-between mt-1">
            <span className="text-xs text-zinc-600">14 days ago</span>
            <span className="text-xs text-zinc-600">Today</span>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-zinc-100">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/payments" className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-left hover:bg-zinc-800/40">
            <DollarSign className="h-6 w-6 text-indigo-400 mb-2" />
            <p className="font-medium text-zinc-100">Make Payment</p>
            <p className="text-xs text-zinc-400 mt-1">View balance</p>
          </Link>
          <Link href="/schedule" className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-left hover:bg-zinc-800/40">
            <Calendar className="h-6 w-6 text-green-400 mb-2" />
            <p className="font-medium text-zinc-100">View Schedule</p>
            <p className="text-xs text-zinc-400 mt-1">Today&apos;s events</p>
          </Link>
          <Link href="/maintenance" className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-left hover:bg-zinc-800/40">
            <CheckCircle className="h-6 w-6 text-indigo-400 mb-2" />
            <p className="font-medium text-zinc-100">Maintenance</p>
            <p className="text-xs text-zinc-400 mt-1">Report an issue</p>
          </Link>
          <Link href="/inbox" className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-left hover:bg-zinc-800/40">
            <Bell className="h-6 w-6 text-amber-400 mb-2" />
            <p className="font-medium text-zinc-100">Messages</p>
            <p className="text-xs text-zinc-400 mt-1">Inbox</p>
          </Link>
        </div>
      </div>

      {/* Your Information */}
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4">
        <h2 className="text-lg font-semibold text-zinc-100 mb-3">
          Your Information
        </h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-400">Name</span>
            <span className="font-medium text-zinc-100">
              {profile?.first_name} {profile?.last_name}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">House</span>
            <span className="font-medium text-zinc-100">{houseName}</span>
          </div>
          {admissionDate && (
            <div className="flex justify-between">
              <span className="text-zinc-400">Admitted</span>
              <span className="font-medium text-zinc-100">
                {new Date(admissionDate).toLocaleDateString()}
              </span>
            </div>
          )}
          {profile?.email && (
            <div className="flex justify-between">
              <span className="text-zinc-400">Email</span>
              <span className="font-medium text-zinc-100">{profile.email}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

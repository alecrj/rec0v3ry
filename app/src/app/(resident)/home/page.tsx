"use client";

import { Bell, Calendar, CheckCircle, DollarSign, Loader2 } from "lucide-react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";

export const dynamic = "force-dynamic";

export default function ResidentHomePage() {
  const { data: userData, isLoading: userLoading } = trpc.user.getCurrentUser.useQuery();
  const { data: profile, isLoading: profileLoading } = trpc.resident.getMyProfile.useQuery(
    undefined,
    { enabled: !!userData }
  );

  const isLoading = userLoading || profileLoading;
  const firstName = profile?.preferred_name || profile?.first_name || userData?.first_name || "Resident";
  const houseName = profile?.currentAdmission?.house_name ?? "Your House";
  const bedName = profile?.currentAdmission?.bed_name;
  const admissionDate = profile?.currentAdmission?.admission_date;

  const daysInProgram = admissionDate
    ? Math.floor((Date.now() - new Date(admissionDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold">Welcome back, {firstName}</h1>
        <p className="text-indigo-700 mt-1">
          {houseName}{bedName ? ` - ${bedName}` : ""}
        </p>
        <div className="mt-4 flex items-center gap-4">
          <div>
            <p className="text-sm text-indigo-700">Days in Program</p>
            <p className="text-3xl font-bold mt-1">{daysInProgram}</p>
          </div>
          <div className="h-12 w-px bg-indigo-500" />
          <div>
            <p className="text-sm text-indigo-700">Status</p>
            <p className="text-lg font-bold mt-1">
              {profile?.currentAdmission?.status === "active" ? "Active" : "—"}
            </p>
          </div>
        </div>
      </div>

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

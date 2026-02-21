"use client";

import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Shield,
  FileText,
  LogOut,
  ChevronRight,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { useClerk } from "@clerk/nextjs";

export const dynamic = "force-dynamic";

export default function ResidentProfilePage() {
  const { signOut } = useClerk();
  const { data: userData, isLoading: userLoading } = trpc.user.getCurrentUser.useQuery();
  const { data: profile, isLoading: profileLoading } = trpc.resident.getMyProfile.useQuery(
    undefined,
    { enabled: !!userData }
  );

  const isLoading = userLoading || profileLoading;

  const firstName = profile?.first_name ?? userData?.first_name ?? "User";
  const lastName = profile?.last_name ?? userData?.last_name ?? "";
  const email = profile?.email ?? userData?.email ?? "";
  const phone = profile?.phone;
  const houseName = profile?.currentAdmission?.house_name;
  const bedName = profile?.currentAdmission?.bed_name;
  const admissionDate = profile?.currentAdmission?.admission_date;
  const isActive = profile?.currentAdmission?.status === "active";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6 text-center">
        <div className="w-20 h-20 bg-indigo-500/15 rounded-full mx-auto flex items-center justify-center">
          <User className="h-10 w-10 text-indigo-400" />
        </div>
        <h1 className="text-xl font-bold text-zinc-100 mt-4">{firstName} {lastName}</h1>
        {admissionDate && (
          <p className="text-zinc-400">
            Resident since {new Date(admissionDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
          </p>
        )}
        {isActive && (
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-green-500/15 text-green-300 rounded-full text-sm font-medium">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            Active Resident
          </div>
        )}
      </div>

      <div className="bg-zinc-900 rounded-lg border border-zinc-800 divide-y divide-zinc-800/50">
        {houseName && (
          <div className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center">
              <MapPin className="h-5 w-5 text-zinc-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-zinc-500">House</p>
              <p className="font-medium text-zinc-100">
                {houseName}{bedName ? ` - ${bedName}` : ""}
              </p>
            </div>
          </div>
        )}

        {admissionDate && (
          <div className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center">
              <Calendar className="h-5 w-5 text-zinc-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-zinc-500">Move-in Date</p>
              <p className="font-medium text-zinc-100">
                {new Date(admissionDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            </div>
          </div>
        )}

        {phone && (
          <div className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center">
              <Phone className="h-5 w-5 text-zinc-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-zinc-500">Phone</p>
              <p className="font-medium text-zinc-100">{phone}</p>
            </div>
          </div>
        )}

        {email && (
          <div className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center">
              <Mail className="h-5 w-5 text-zinc-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-zinc-500">Email</p>
              <p className="font-medium text-zinc-100">{email}</p>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide px-1">
          Settings
        </h2>

        <div className="bg-zinc-900 rounded-lg border border-zinc-800 divide-y divide-zinc-800/50">
          <Link href="/documents" className="w-full p-4 flex items-center gap-3 hover:bg-zinc-800/40">
            <div className="w-10 h-10 bg-indigo-500/15 rounded-lg flex items-center justify-center">
              <Shield className="h-5 w-5 text-indigo-400" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-zinc-100">Privacy & Consents</p>
              <p className="text-sm text-zinc-500">Manage your data sharing preferences</p>
            </div>
            <ChevronRight className="h-5 w-5 text-zinc-500" />
          </Link>

          <Link href="/documents" className="w-full p-4 flex items-center gap-3 hover:bg-zinc-800/40">
            <div className="w-10 h-10 bg-indigo-500/15 rounded-lg flex items-center justify-center">
              <FileText className="h-5 w-5 text-indigo-400" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-zinc-100">My Documents</p>
              <p className="text-sm text-zinc-500">View signed agreements and forms</p>
            </div>
            <ChevronRight className="h-5 w-5 text-zinc-500" />
          </Link>
        </div>
      </div>

      <button
        onClick={() => signOut()}
        className="w-full p-4 bg-zinc-900 rounded-lg border border-red-500/30 flex items-center justify-center gap-2 text-red-400 hover:bg-red-500/10"
      >
        <LogOut className="h-5 w-5" />
        <span className="font-medium">Sign Out</span>
      </button>

      <p className="text-center text-xs text-zinc-500">
        RecoveryOS v1.0 - Your data is protected under HIPAA and 42 CFR Part 2
      </p>
    </div>
  );
}

"use client";

import { use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  Calendar,
  Home,
  BedDouble,
  Edit2,
  Shield,
  FileText,
  DollarSign,
  Users,
  AlertCircle,
  Clock,
  Activity,
  ChevronRight,
  Cake,
  MapPin,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

export const dynamic = "force-dynamic";

const statusConfig: Record<string, { color: string; label: string; bgColor: string }> = {
  active: { color: "text-green-600", label: "Active", bgColor: "bg-green-50" },
  pending: { color: "text-amber-600", label: "Pending Intake", bgColor: "bg-amber-50" },
  completed: { color: "text-zinc-600", label: "Discharged", bgColor: "bg-zinc-100" },
  terminated: { color: "text-red-600", label: "Terminated", bgColor: "bg-red-50" },
  on_hold: { color: "text-amber-600", label: "On Hold", bgColor: "bg-amber-50" },
};

function InfoCard({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 bg-zinc-100">
        <h3 className="font-semibold text-zinc-800">{title}</h3>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      {Icon && (
        <div className="mt-0.5">
          <Icon className="h-4 w-4 text-zinc-500" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{label}</p>
        <p className="text-sm text-zinc-800 mt-0.5">{value || <span className="text-zinc-500">Not provided</span>}</p>
      </div>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
  description,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 hover:bg-zinc-100/40 transition-colors group"
    >
      <div className="p-2 bg-zinc-100 rounded-lg group-hover:bg-indigo-500/15 transition-colors">
        <Icon className="h-5 w-5 text-zinc-400 group-hover:text-indigo-400" />
      </div>
      <div className="flex-1">
        <p className="font-medium text-zinc-800">{label}</p>
        <p className="text-xs text-zinc-500">{description}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-zinc-500 group-hover:text-zinc-400" />
    </Link>
  );
}

export default function ResidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const { data: resident, isLoading, error } = trpc.resident.getById.useQuery({
    residentId: resolvedParams.id,
  });

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
          <p className="font-medium text-red-600">Error loading resident</p>
          <p className="text-sm text-red-400 mt-1">{error.message}</p>
          <Link
            href="/residents"
            className="inline-flex items-center gap-2 mt-4 text-sm text-indigo-400 hover:text-indigo-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Residents
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-8 w-8 bg-zinc-200 rounded"></div>
            <div className="h-20 w-20 bg-zinc-200 rounded-full"></div>
            <div className="space-y-2">
              <div className="h-6 w-48 bg-zinc-200 rounded"></div>
              <div className="h-4 w-32 bg-zinc-200 rounded"></div>
            </div>
          </div>
        </div>
        {/* Content skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-48 bg-zinc-200 rounded-lg"></div>
            <div className="h-64 bg-zinc-200 rounded-lg"></div>
          </div>
          <div className="space-y-6">
            <div className="h-48 bg-zinc-200 rounded-lg"></div>
            <div className="h-48 bg-zinc-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!resident) {
    return (
      <div className="p-6">
        <div className="bg-zinc-100 border border-zinc-200 rounded-lg p-6 text-center">
          <User className="h-12 w-12 text-zinc-500 mx-auto mb-3" />
          <p className="font-medium text-zinc-600">Resident not found</p>
          <Link
            href="/residents"
            className="inline-flex items-center gap-2 mt-4 text-sm text-indigo-400 hover:text-indigo-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Residents
          </Link>
        </div>
      </div>
    );
  }

  const currentStatus = resident.currentAdmission?.status || "none";
  const statusInfo = statusConfig[currentStatus] || {
    color: "text-zinc-400",
    label: "No Admission",
    bgColor: "bg-zinc-100",
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/residents"
            className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-zinc-400" />
          </Link>
          <div className="h-16 w-16 rounded-full bg-zinc-200 flex items-center justify-center overflow-hidden">
            {resident.profile_photo_url ? (
              <img
                src={resident.profile_photo_url}
                alt={resident.first_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xl font-bold text-zinc-500">
                {resident.first_name.charAt(0)}{resident.last_name.charAt(0)}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-800">
              {resident.first_name} {resident.last_name}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${statusInfo.bgColor} ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
              {resident.currentAdmission?.house_name && (
                <span className="flex items-center gap-1 text-sm text-zinc-500">
                  <Home className="h-4 w-4" />
                  {resident.currentAdmission.house_name}
                  {resident.currentAdmission.bed_name && ` / ${resident.currentAdmission.bed_name}`}
                </span>
              )}
            </div>
          </div>
        </div>
        <Link
          href={`/residents/${resident.id}/edit`}
          className="flex items-center gap-2 px-4 py-2 border border-zinc-200 rounded-lg text-zinc-600 font-medium hover:bg-zinc-100/40 transition-colors"
        >
          <Edit2 className="h-4 w-4" />
          Edit
        </Link>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <InfoCard
            title="Personal Information"
            action={
              <span className="text-xs text-zinc-500">
                ID: {resident.id.slice(0, 8)}...
              </span>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoRow
                label="Full Name"
                value={`${resident.first_name} ${resident.last_name}`}
                icon={User}
              />
              {resident.preferred_name && (
                <InfoRow
                  label="Preferred Name"
                  value={resident.preferred_name}
                  icon={User}
                />
              )}
              <InfoRow
                label="Date of Birth"
                value={
                  resident.date_of_birth
                    ? `${formatDate(resident.date_of_birth)} (${calculateAge(resident.date_of_birth)} years old)`
                    : null
                }
                icon={Cake}
              />
              <InfoRow
                label="Email"
                value={resident.email}
                icon={Mail}
              />
              <InfoRow
                label="Phone"
                value={resident.phone}
                icon={Phone}
              />
              <InfoRow
                label="Referral Source"
                value={resident.referral_source}
                icon={Users}
              />
            </div>
          </InfoCard>

          {/* Current Admission */}
          {resident.currentAdmission && (
            <InfoCard title="Current Admission">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoRow
                  label="House"
                  value={resident.currentAdmission.house_name}
                  icon={Home}
                />
                <InfoRow
                  label="Bed"
                  value={resident.currentAdmission.bed_name}
                  icon={BedDouble}
                />
                <InfoRow
                  label="Admission Date"
                  value={formatDate(resident.currentAdmission.admission_date)}
                  icon={Calendar}
                />
                <InfoRow
                  label="Planned Discharge"
                  value={formatDate(resident.currentAdmission.planned_discharge_date)}
                  icon={Calendar}
                />
              </div>
            </InfoCard>
          )}

          {/* Emergency Contacts */}
          <InfoCard
            title="Emergency Contacts"
            action={
              <button className="text-sm text-indigo-400 hover:text-indigo-600 font-medium">
                Add Contact
              </button>
            }
          >
            {resident.contacts && resident.contacts.length > 0 ? (
              <div className="space-y-4">
                {resident.contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-zinc-100"
                  >
                    <div className="w-10 h-10 rounded-full bg-zinc-200 flex items-center justify-center">
                      <User className="h-5 w-5 text-zinc-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-zinc-800">
                          {contact.first_name} {contact.last_name}
                        </p>
                        {contact.is_emergency_contact && (
                          <span className="px-1.5 py-0.5 bg-red-500/15 text-red-600 text-xs rounded">
                            Emergency
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-zinc-500">{contact.relationship}</p>
                      <div className="flex items-center gap-4 mt-1 text-sm text-zinc-400">
                        {contact.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5" />
                            {contact.phone}
                          </span>
                        )}
                        {contact.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5" />
                            {contact.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Users className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
                <p className="text-sm text-zinc-500">No contacts added yet</p>
              </div>
            )}
          </InfoCard>

          {/* Admission History */}
          {resident.admissionHistory && resident.admissionHistory.length > 0 && (
            <InfoCard title="Admission History">
              <div className="space-y-3">
                {resident.admissionHistory.map((admission, index) => {
                  const admissionStatus = statusConfig[admission.status] || statusConfig.pending;
                  return (
                    <div
                      key={admission.id}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        index === 0 ? "bg-indigo-500/10 border border-indigo-500/30" : "bg-zinc-100"
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-zinc-800">
                            {admission.house_name}
                          </p>
                          {index === 0 && (
                            <span className="px-1.5 py-0.5 bg-indigo-500/15 text-indigo-600 text-xs rounded">
                              Current
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-zinc-500">
                          {formatDate(admission.admission_date)}
                          {admission.actual_discharge_date &&
                            ` - ${formatDate(admission.actual_discharge_date)}`}
                        </p>
                        {admission.discharge_reason && (
                          <p className="text-xs text-zinc-500 mt-1">
                            Reason: {admission.discharge_reason}
                          </p>
                        )}
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${admissionStatus.bgColor} ${admissionStatus.color}`}
                      >
                        {admissionStatus.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </InfoCard>
          )}
        </div>

        {/* Right Column - Quick Actions & Summary */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <InfoCard title="Quick Actions">
            <div className="space-y-2">
              <QuickAction
                href={`/billing/invoices?resident=${resident.id}`}
                icon={DollarSign}
                label="Billing"
                description="View invoices & payments"
              />
              <QuickAction
                href={`/documents/library?resident=${resident.id}`}
                icon={FileText}
                label="Documents"
                description="View & upload documents"
              />
              <QuickAction
                href={`/settings/compliance/consents?resident=${resident.id}`}
                icon={Shield}
                label="Consents"
                description={`${resident.activeConsentsCount} active consent${resident.activeConsentsCount !== 1 ? "s" : ""}`}
              />
              <QuickAction
                href={`/operations/drug-tests?resident=${resident.id}`}
                icon={Activity}
                label="Drug Tests"
                description="View test history"
              />
            </div>
          </InfoCard>

          {/* Compliance Summary */}
          <InfoCard title="Compliance Status">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">Active Consents</span>
                <span className="font-semibold text-zinc-800">
                  {resident.activeConsentsCount}
                </span>
              </div>
              {resident.activeConsentsCount === 0 && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-600">
                        No active consents
                      </p>
                      <p className="text-xs text-amber-400 mt-0.5">
                        Consent required for treatment records
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <Link
                href={`/settings/compliance/consents?resident=${resident.id}`}
                className="block text-center text-sm text-indigo-400 hover:text-indigo-600 font-medium py-2"
              >
                Manage Consents
              </Link>
            </div>
          </InfoCard>

          {/* Notes */}
          {resident.notes && (
            <InfoCard title="Notes">
              <p className="text-sm text-zinc-400 whitespace-pre-wrap">
                {resident.notes}
              </p>
            </InfoCard>
          )}

          {/* Metadata */}
          <InfoCard title="Record Info">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">Created</span>
                <span className="text-zinc-800">
                  {formatDate(resident.created_at.toString())}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Last Updated</span>
                <span className="text-zinc-800">
                  {formatDate(resident.updated_at.toString())}
                </span>
              </div>
            </div>
          </InfoCard>
        </div>
      </div>
    </div>
  );
}

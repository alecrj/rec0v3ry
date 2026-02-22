"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  User,
  Phone,
  Mail,
  Calendar,
  Home,
  FileText,
  CheckCircle,
  Circle,
  Clock,
  Edit,
  ArrowRight,
  AlertCircle,
  Shield,
  BedDouble,
  DollarSign,
  Send,
  Copy,
  Check,
  Loader2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

// Pipeline stages for status display
const PIPELINE_STAGES = [
  { id: "new", label: "New" },
  { id: "contacted", label: "Contacted" },
  { id: "qualified", label: "Qualified" },
  { id: "touring", label: "Touring" },
  { id: "applied", label: "Applied" },
  { id: "accepted", label: "Accepted" },
  { id: "deposit_pending", label: "Deposit Pending" },
  { id: "converted", label: "Admitted" },
];

function StatusPipeline({ currentStatus }: { currentStatus: string }) {
  const currentIndex = PIPELINE_STAGES.findIndex((s) => s.id === currentStatus);

  return (
    <div className="flex items-center justify-between overflow-x-auto">
      {PIPELINE_STAGES.map((stage, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <div key={stage.id} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center min-w-0">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${
                  isCompleted
                    ? "bg-green-500 text-white"
                    : isCurrent
                    ? "bg-indigo-500 text-white"
                    : "bg-zinc-200 text-zinc-400"
                }`}
              >
                {isCompleted ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={`mt-1 text-xs whitespace-nowrap ${
                  isCurrent ? "font-medium text-indigo-400" : "text-zinc-500"
                }`}
              >
                {stage.label}
              </span>
            </div>
            {index < PIPELINE_STAGES.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 shrink ${
                  index < currentIndex ? "bg-green-500" : "bg-zinc-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

interface ConvertModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: {
    id: string;
    org_id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
    preferred_move_in_date: string | null;
    house_preference_id: string | null;
  };
}

function ConvertToResidentModal({ isOpen, onClose, lead }: ConvertModalProps) {
  const router = useRouter();
  const utils = trpc.useUtils();

  const [houseId, setHouseId] = useState(lead.house_preference_id || "");
  const [bedId, setBedId] = useState("");
  const [admissionDate, setAdmissionDate] = useState(
    lead.preferred_move_in_date || new Date().toISOString().split("T")[0]
  );
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [generateInvoice, setGenerateInvoice] = useState(true);
  const [sendDocuments, setSendDocuments] = useState(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Load houses for the org
  const { data: housesData } = trpc.property.listAllHouses.useQuery(
    undefined,
    { enabled: isOpen }
  );

  // Load available beds when house is selected
  const { data: availableBeds } = trpc.occupancy.getAvailableBeds.useQuery(
    { houseId: houseId || undefined },
    { enabled: isOpen && !!houseId }
  );

  const convertMutation = trpc.lead.convertToResident.useMutation({
    onSuccess: (data) => {
      utils.lead.getById.invalidate({ leadId: lead.id });
      utils.lead.list.invalidate();
      utils.lead.getPipelineStats.invalidate();
      setToastMsg(`${lead.first_name} ${lead.last_name} has been admitted!`);
      setTimeout(() => {
        onClose();
        router.push("/admissions");
      }, 1500);
    },
    onError: (err) => {
      setToastMsg(`Error: ${err.message}`);
    },
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!houseId || !admissionDate || !dateOfBirth) {
      setToastMsg("Please fill in all required fields.");
      return;
    }
    convertMutation.mutate({
      leadId: lead.id,
      houseId,
      admissionDate,
      bedId: bedId || undefined,
      dateOfBirth,
      generateInvoice,
      sendDocuments,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-white border border-zinc-200 rounded-xl shadow-2xl w-full max-w-lg mx-4">
        <div className="p-6 border-b border-zinc-200">
          <h2 className="text-xl font-semibold text-zinc-800">Approve and Move In</h2>
          <p className="text-sm text-zinc-400 mt-1">
            One-click admission for {lead.first_name} {lead.last_name}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Part 2 notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div className="text-sm text-amber-700">
                <p className="font-medium">42 CFR Part 2 Consent Required</p>
                <p className="mt-1 text-amber-600">
                  Intake cannot be completed without an active Part 2 consent form.
                  The resident will sign this during intake.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-600 mb-1">
                House <span className="text-red-400">*</span>
              </label>
              <select
                value={houseId}
                onChange={(e) => {
                  setHouseId(e.target.value);
                  setBedId("");
                }}
                required
                className="w-full px-3 py-2 bg-zinc-100 border border-zinc-200 text-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select house...</option>
                {housesData?.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-600 mb-1">
                Bed
              </label>
              <select
                value={bedId}
                onChange={(e) => setBedId(e.target.value)}
                disabled={!houseId}
                className="w-full px-3 py-2 bg-zinc-100 border border-zinc-200 text-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
              >
                <option value="">Assign later...</option>
                {availableBeds?.map((b) => (
                  <option key={b.bed_id} value={b.bed_id}>
                    {b.room_name} — {b.bed_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-600 mb-1">
                Move-in Date <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={admissionDate}
                onChange={(e) => setAdmissionDate(e.target.value)}
                required
                className="w-full px-3 py-2 bg-zinc-100 border border-zinc-200 text-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-600 mb-1">
                Date of Birth <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                required
                className="w-full px-3 py-2 bg-zinc-100 border border-zinc-200 text-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => setGenerateInvoice(!generateInvoice)}
                className={`w-10 h-6 rounded-full flex items-center transition-colors cursor-pointer ${
                  generateInvoice ? "bg-indigo-600" : "bg-zinc-200"
                }`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full mx-1 transition-transform ${
                    generateInvoice ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </div>
              <div>
                <span className="text-sm font-medium text-zinc-700">
                  Generate first month's invoice
                </span>
                <p className="text-xs text-zinc-500">
                  Creates a pending rent invoice based on house rate config
                </p>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => setSendDocuments(!sendDocuments)}
                className={`w-10 h-6 rounded-full flex items-center transition-colors cursor-pointer ${
                  sendDocuments ? "bg-indigo-600" : "bg-zinc-200"
                }`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full mx-1 transition-transform ${
                    sendDocuments ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </div>
              <div>
                <span className="text-sm font-medium text-zinc-700">
                  Send documents for signing
                </span>
                <p className="text-xs text-zinc-500">
                  House rules + financial agreement via DocuSign (if configured)
                </p>
              </div>
            </label>
          </div>

          {toastMsg && (
            <div
              className={`rounded-lg p-3 text-sm ${
                toastMsg.startsWith("Error")
                  ? "bg-red-50 border border-red-200 text-red-700"
                  : "bg-green-50 border border-green-200 text-green-700"
              }`}
            >
              {toastMsg}
            </div>
          )}
        </form>

        <div className="p-6 border-t border-zinc-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={convertMutation.isPending}
            className="px-4 py-2 text-zinc-600 border border-zinc-200 rounded-lg font-medium hover:bg-zinc-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={convertMutation.isPending || !houseId || !admissionDate || !dateOfBirth}
            className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {convertMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <ArrowRight className="h-4 w-4" />
                Approve and Move In
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  residentId: string;
  residentName: string;
}

function SendInviteModal({ isOpen, onClose, residentId, residentName }: InviteModalProps) {
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const inviteMutation = trpc.lead.sendInvite.useMutation({
    onSuccess: (data) => {
      setInviteLink(data.inviteLink);
    },
    onError: (err) => {
      setErrorMsg(err.message);
    },
  });

  const handleCopy = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-white border border-zinc-200 rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="p-6 border-b border-zinc-200">
          <h2 className="text-lg font-semibold text-zinc-800">Send App Invite</h2>
          <p className="text-sm text-zinc-400 mt-1">
            Generate a sign-up link for {residentName}
          </p>
        </div>
        <div className="p-6 space-y-4">
          {!inviteLink ? (
            <>
              <p className="text-sm text-zinc-600">
                This generates a unique invite link for the resident to create
                their account in the RecoveryOS app.
              </p>
              {errorMsg && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
                  {errorMsg}
                </div>
              )}
              <button
                onClick={() => inviteMutation.mutate({ residentId })}
                disabled={inviteMutation.isPending}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {inviteMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Generate Invite Link
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <div className="bg-zinc-100 rounded-lg p-3">
                <p className="text-xs text-zinc-500 mb-1 font-medium">Invite Link</p>
                <p className="text-sm text-zinc-700 break-all font-mono">{inviteLink}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleCopy}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-zinc-200 text-zinc-900 rounded-lg font-medium hover:bg-zinc-200"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-green-400" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy Link
                    </>
                  )}
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-zinc-200 text-zinc-600 rounded-lg font-medium hover:bg-zinc-100"
                >
                  Done
                </button>
              </div>
              <p className="text-xs text-zinc-500">
                In production, this link is sent via SMS/email. For now, share it
                manually with the resident.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LeadDetailPage() {
  const params = useParams();
  const leadId = params.id as string;
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const { data: lead, isLoading, error } = trpc.lead.getById.useQuery({ leadId });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-zinc-100 rounded w-1/3" />
          <div className="h-40 bg-zinc-100 rounded" />
          <div className="h-60 bg-zinc-100 rounded" />
        </div>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-medium">Error loading lead</p>
          <p className="text-sm mt-1">{error?.message || "Lead not found"}</p>
        </div>
      </div>
    );
  }

  const daysInPipeline = Math.floor(
    (Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  const canConvert =
    lead.status === "accepted" || lead.status === "deposit_pending";
  const isConverted = lead.status === "converted";

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <div>
        <Link
          href="/admissions"
          className="flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-900"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Pipeline
        </Link>
      </div>

      {/* Header */}
      <div className="bg-white rounded-lg border border-zinc-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center text-xl font-semibold text-zinc-600">
              {lead.first_name[0]}
              {lead.last_name[0]}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-800">
                {lead.first_name} {lead.last_name}
              </h1>
              <div className="flex items-center gap-4 mt-2 text-sm text-zinc-400">
                {lead.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    <span>{lead.phone}</span>
                  </div>
                )}
                {lead.email && (
                  <div className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    <span>{lead.email}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 mt-2 text-sm flex-wrap">
                {lead.house_name && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 rounded border border-red-200">
                    <Home className="h-3.5 w-3.5" />
                    {lead.house_name}
                  </span>
                )}
                {lead.preferred_move_in_date && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-600 rounded border border-green-200">
                    <Calendar className="h-3.5 w-3.5" />
                    Move-in: {new Date(lead.preferred_move_in_date).toLocaleDateString()}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-zinc-100 text-zinc-400 rounded">
                  <Clock className="h-3.5 w-3.5" />
                  {daysInPipeline} days in pipeline
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {isConverted && lead.converted_to_resident_id && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
              >
                <Send className="h-4 w-4" />
                Send App Invite
              </button>
            )}
            {canConvert && (
              <button
                onClick={() => setShowConvertModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
              >
                <ArrowRight className="h-4 w-4" />
                Approve and Move In
              </button>
            )}
          </div>
        </div>

        {/* Status Pipeline */}
        <div className="mt-6 pt-6 border-t border-zinc-200">
          <StatusPipeline currentStatus={lead.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Converted banner */}
          {isConverted && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-6 w-6 text-green-400 shrink-0" />
                <div>
                  <p className="font-medium text-green-600">
                    Admitted as Resident
                  </p>
                  {lead.converted_at && (
                    <p className="text-sm text-green-500 mt-0.5">
                      Converted on{" "}
                      {new Date(lead.converted_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Lead Details */}
          <div className="bg-white rounded-lg border border-zinc-200">
            <div className="p-4 border-b border-zinc-200">
              <h3 className="font-semibold text-zinc-800">Lead Information</h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-500 uppercase tracking-wide">
                    Source
                  </label>
                  <p className="text-sm font-medium text-zinc-700 mt-1">
                    {lead.source || "—"}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 uppercase tracking-wide">
                    Created
                  </label>
                  <p className="text-sm font-medium text-zinc-700 mt-1">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 uppercase tracking-wide">
                    Status
                  </label>
                  <p className="text-sm font-medium text-zinc-700 mt-1 capitalize">
                    {lead.status.replace("_", " ")}
                  </p>
                </div>
                {lead.preferred_move_in_date && (
                  <div>
                    <label className="text-xs text-zinc-500 uppercase tracking-wide">
                      Preferred Move-in
                    </label>
                    <p className="text-sm font-medium text-zinc-700 mt-1">
                      {new Date(lead.preferred_move_in_date).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
              {lead.notes && (
                <div>
                  <label className="text-xs text-zinc-500 uppercase tracking-wide">
                    Notes
                  </label>
                  <p className="text-sm text-zinc-600 mt-1">{lead.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Intake Checklist for eligible leads */}
          {(canConvert || isConverted) && (
            <div className="bg-white rounded-lg border border-zinc-200">
              <div className="p-4 border-b border-zinc-200">
                <h3 className="font-semibold text-zinc-800">Intake Checklist</h3>
              </div>
              <div className="p-4">
                <div className="space-y-2">
                  {[
                    { id: "personal_info", label: "Personal Information", done: true },
                    { id: "dob", label: "Date of Birth", done: isConverted },
                    { id: "part2_consent", label: "42 CFR Part 2 Consent", done: false, required: true },
                    { id: "house_rules", label: "House Rules Agreement", done: false, required: true },
                    { id: "financial_agreement", label: "Financial Agreement", done: false, required: true },
                    { id: "photo_id", label: "Photo ID Upload", done: false },
                  ].map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-2 rounded-lg"
                    >
                      {item.done ? (
                        <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                      ) : (
                        <Circle className="h-5 w-5 text-zinc-600 shrink-0" />
                      )}
                      <span
                        className={`text-sm ${
                          item.done ? "text-zinc-400 line-through" : "text-zinc-700"
                        }`}
                      >
                        {item.label}
                      </span>
                      {item.required && !item.done && (
                        <span className="ml-auto text-xs text-red-400 font-medium">
                          Required
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-lg border border-zinc-200">
            <div className="p-4 border-b border-zinc-200">
              <h3 className="font-semibold text-zinc-800">Quick Actions</h3>
            </div>
            <div className="p-2">
              {canConvert && (
                <button
                  onClick={() => setShowConvertModal(true)}
                  className="w-full text-left px-3 py-2.5 text-sm font-medium text-green-600 hover:bg-zinc-100 rounded-lg flex items-center gap-2"
                >
                  <ArrowRight className="h-4 w-4" />
                  Approve and Move In
                </button>
              )}
              {isConverted && lead.converted_to_resident_id && (
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="w-full text-left px-3 py-2.5 text-sm text-zinc-600 hover:bg-zinc-100 rounded-lg flex items-center gap-2"
                >
                  <Send className="h-4 w-4 text-zinc-400" />
                  Send App Invite
                </button>
              )}
              <button className="w-full text-left px-3 py-2.5 text-sm text-zinc-600 hover:bg-zinc-100 rounded-lg flex items-center gap-2">
                <Phone className="h-4 w-4 text-zinc-500" />
                Log Phone Call
              </button>
              <button className="w-full text-left px-3 py-2.5 text-sm text-zinc-600 hover:bg-zinc-100 rounded-lg flex items-center gap-2">
                <Mail className="h-4 w-4 text-zinc-500" />
                Send Email
              </button>
              <button className="w-full text-left px-3 py-2.5 text-sm text-zinc-600 hover:bg-zinc-100 rounded-lg flex items-center gap-2">
                <FileText className="h-4 w-4 text-zinc-500" />
                Add Note
              </button>
            </div>
          </div>

          {/* Lead Stats */}
          <div className="bg-white rounded-lg border border-zinc-200">
            <div className="p-4 border-b border-zinc-200">
              <h3 className="font-semibold text-zinc-800">Details</h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-500">Pipeline Stage</span>
                <span className="text-zinc-700 font-medium capitalize">
                  {lead.status.replace("_", " ")}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-500">Days in Pipeline</span>
                <span className="text-zinc-700 font-medium">{daysInPipeline}</span>
              </div>
              {lead.source && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500">Source</span>
                  <span className="text-zinc-700 font-medium">{lead.source}</span>
                </div>
              )}
              {isConverted && lead.converted_at && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500">Admitted On</span>
                  <span className="text-zinc-700 font-medium">
                    {new Date(lead.converted_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Convert Modal */}
      <ConvertToResidentModal
        isOpen={showConvertModal}
        onClose={() => setShowConvertModal(false)}
        lead={lead}
      />

      {/* Invite Modal */}
      {lead.converted_to_resident_id && (
        <SendInviteModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          residentId={lead.converted_to_resident_id}
          residentName={`${lead.first_name} ${lead.last_name}`}
        />
      )}
    </div>
  );
}

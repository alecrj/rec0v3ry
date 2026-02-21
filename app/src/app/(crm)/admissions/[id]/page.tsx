"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
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
  Upload,
  Loader2,
  X,
  MessageSquare,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import {
  PageContainer,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  ErrorState,
  useToast,
} from "@/components/ui";

const inputClass = "w-full h-10 px-3 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors";

export const dynamic = "force-dynamic";

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

const INTAKE_CHECKLIST = [
  { id: "personal_info", label: "Personal Information", icon: User, required: true, completed: false },
  { id: "emergency_contacts", label: "Emergency Contacts", icon: Phone, required: true, completed: false },
  { id: "insurance_info", label: "Insurance Information", icon: FileText, required: false, completed: false },
  { id: "photo_id", label: "Photo ID Upload", icon: Upload, required: true, completed: false },
  { id: "insurance_card", label: "Insurance Card Upload", icon: Upload, required: false, completed: false },
  { id: "court_documents", label: "Court Documents", icon: FileText, required: false, completed: false },
  { id: "part2_consent", label: "Part 2 Consent Form", icon: Shield, required: true, completed: false },
  { id: "privacy_notice", label: "Privacy Notice Acknowledgment", icon: Shield, required: true, completed: false },
  { id: "house_rules", label: "House Rules Agreement", icon: Home, required: true, completed: false },
  { id: "financial_agreement", label: "Financial Agreement", icon: FileText, required: true, completed: false },
  { id: "intake_form", label: "Intake Assessment Form", icon: FileText, required: true, completed: false },
];

function StatusPipeline({ currentStatus }: { currentStatus: string }) {
  const currentIndex = PIPELINE_STAGES.findIndex((s) => s.id === currentStatus);

  return (
    <div className="flex items-center justify-between">
      {PIPELINE_STAGES.map((stage, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <div key={stage.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                  isCompleted
                    ? "bg-green-500 text-white"
                    : isCurrent
                    ? "bg-indigo-500 text-white"
                    : "bg-zinc-700 text-zinc-500"
                }`}
              >
                {isCompleted ? <CheckCircle className="h-5 w-5" /> : index + 1}
              </div>
              <span
                className={`mt-1 text-xs ${
                  isCurrent ? "font-medium text-indigo-400" : "text-zinc-500"
                }`}
              >
                {stage.label}
              </span>
            </div>
            {index < PIPELINE_STAGES.length - 1 && (
              <div
                className={`flex-1 h-1 mx-2 ${
                  index < currentIndex ? "bg-green-500" : "bg-zinc-700"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function IntakeChecklist() {
  const requiredItems = INTAKE_CHECKLIST.filter((i) => i.required);
  const completedRequired = requiredItems.filter((i) => i.completed).length;
  const progress = Math.round((completedRequired / requiredItems.length) * 100);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between w-full">
          <CardTitle>Intake Checklist</CardTitle>
          <span className="text-sm text-zinc-500">
            {completedRequired}/{requiredItems.length} required
          </span>
        </div>
        <div className="mt-2 h-2 bg-zinc-800 rounded-full overflow-hidden w-full">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </CardHeader>
      <div className="divide-y divide-zinc-800/50">
        {INTAKE_CHECKLIST.map((item) => (
          <div
            key={item.id}
            className={`px-6 py-3 flex items-center justify-between hover:bg-zinc-800/40 cursor-pointer ${
              item.completed ? "bg-green-500/10/50" : ""
            }`}
          >
            <div className="flex items-center gap-3">
              {item.completed ? (
                <CheckCircle className="h-5 w-5 text-green-400" />
              ) : (
                <Circle className="h-5 w-5 text-zinc-600" />
              )}
              <div>
                <span className={`text-sm ${item.completed ? "text-zinc-500" : "text-zinc-100"}`}>
                  {item.label}
                </span>
                {item.required && !item.completed && (
                  <span className="ml-2 text-xs text-red-400">Required</span>
                )}
              </div>
            </div>
            {!item.completed && (
              <Button variant="ghost" size="sm" className="text-indigo-400">
                {item.id.includes("upload")
                  ? "Upload"
                  : item.id.includes("consent") || item.id.includes("agreement") || item.id.includes("notice")
                  ? "Sign"
                  : "Complete"}
              </Button>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── Edit Lead Modal ────────────────────────────────────────
function EditLeadModal({
  isOpen,
  onClose,
  lead,
}: {
  isOpen: boolean;
  onClose: () => void;
  lead: {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
    source: string | null;
    preferred_move_in_date: string | null;
    notes: string | null;
  };
}) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [firstName, setFirstName] = useState(lead.first_name);
  const [lastName, setLastName] = useState(lead.last_name);
  const [email, setEmail] = useState(lead.email ?? "");
  const [phone, setPhone] = useState(lead.phone ?? "");
  const [source, setSource] = useState(lead.source ?? "");
  const [moveInDate, setMoveInDate] = useState(lead.preferred_move_in_date ?? "");

  const updateMutation = trpc.lead.update.useMutation({
    onSuccess: () => {
      toast("success", "Lead updated");
      utils.lead.getById.invalidate({ leadId: lead.id });
      onClose();
    },
    onError: (err) => toast("error", "Failed to update", err.message),
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-zinc-900 rounded-2xl shadow-xl w-full max-w-lg mx-4 border border-zinc-800">
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-zinc-100">Edit Lead</h2>
          <button onClick={onClose} className="p-1 text-zinc-500 hover:text-zinc-300"><X className="h-5 w-5" /></button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateMutation.mutate({
              leadId: lead.id,
              firstName,
              lastName,
              email: email || null,
              phone: phone || null,
              source: source || null,
              preferredMoveInDate: moveInDate || null,
            });
          }}
          className="p-6 space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">First Name *</label>
              <input required value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Last Name *</label>
              <input required value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Phone</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Source</label>
              <input value={source} onChange={(e) => setSource(e.target.value)} className={inputClass} placeholder="e.g. Website, Referral" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Preferred Move-in</label>
              <input type="date" value={moveInDate} onChange={(e) => setMoveInDate(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={!firstName || !lastName || updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Add Note / Log Activity Modal ──────────────────────────
function AddNoteModal({
  isOpen,
  onClose,
  leadId,
  existingNotes,
  activityType,
}: {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  existingNotes: string | null;
  activityType: "note" | "phone_call" | "email" | "tour";
}) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [content, setContent] = useState("");

  const labels: Record<string, string> = {
    note: "Add Note",
    phone_call: "Log Phone Call",
    email: "Log Email",
    tour: "Schedule Tour",
  };

  const placeholders: Record<string, string> = {
    note: "Enter your note...",
    phone_call: "Summary of the phone call...",
    email: "Summary of email sent...",
    tour: "Tour date, time, and details...",
  };

  const updateMutation = trpc.lead.update.useMutation({
    onSuccess: () => {
      toast("success", `${labels[activityType]} logged`);
      utils.lead.getById.invalidate({ leadId });
      setContent("");
      onClose();
    },
    onError: (err) => toast("error", "Failed to save", err.message),
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-zinc-900 rounded-2xl shadow-xl w-full max-w-md mx-4 border border-zinc-800">
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-100">{labels[activityType]}</h2>
          <button onClick={onClose} className="p-1 text-zinc-500 hover:text-zinc-300"><X className="h-5 w-5" /></button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const timestamp = new Date().toLocaleString();
            const prefix = activityType === "note" ? "" : `[${labels[activityType]}] `;
            const newEntry = `${prefix}${timestamp}: ${content}`;
            const updatedNotes = existingNotes
              ? `${newEntry}\n\n${existingNotes}`
              : newEntry;
            updateMutation.mutate({ leadId, notes: updatedNotes });
          }}
          className="p-6 space-y-4"
        >
          <div>
            <textarea
              required
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-y"
              placeholder={placeholders[activityType]}
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={!content || updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface ConvertModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  lead: {
    first_name: string;
    last_name: string;
    preferred_move_in_date: string | null;
    house_preference_id: string | null;
  };
}

function ConvertToResidentModal({ isOpen, onClose, leadId, lead }: ConvertModalProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [houseId, setHouseId] = useState(lead.house_preference_id || "");
  const [admissionDate, setAdmissionDate] = useState(lead.preferred_move_in_date || "");
  const [dateOfBirth, setDateOfBirth] = useState("");

  const { data: userData } = trpc.user.getCurrentUser.useQuery();
  const orgId = userData?.org_id;

  const { data: houses } = trpc.org.listHouses.useQuery(
    { orgId: orgId! },
    { enabled: !!orgId }
  );

  const convertMutation = trpc.lead.convertToResident.useMutation({
    onSuccess: () => {
      toast("success", "Admission started", `${lead.first_name} ${lead.last_name} has been converted to a resident.`);
      onClose();
      router.push("/admissions");
    },
    onError: (err) => toast("error", "Failed to start admission", err.message),
  });

  if (!isOpen) return null;

  const inputClass = "w-full h-10 px-3 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors";
  const isValid = houseId && admissionDate && dateOfBirth;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    convertMutation.mutate({
      leadId,
      houseId,
      admissionDate,
      dateOfBirth,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-zinc-900 rounded-xl shadow-2xl w-full max-w-lg mx-4 border border-zinc-800">
        <div className="p-6 border-b border-zinc-800">
          <h2 className="text-xl font-bold text-zinc-100">Start Admission</h2>
          <p className="text-sm text-zinc-500 mt-1">
            Convert {lead.first_name} {lead.last_name} to a resident and begin intake
          </p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-400 mt-0.5" />
              <div className="text-sm text-amber-300">
                <p className="font-medium">Part 2 Consent Required</p>
                <p className="mt-1">
                  Intake cannot be completed without at least one active 42 CFR Part 2 consent form.
                  The resident will need to complete this during intake.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">House *</label>
              <select value={houseId} onChange={(e) => setHouseId(e.target.value)} className={inputClass}>
                <option value="">Select house...</option>
                {(houses ?? []).map((h: { id: string; name: string }) => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Bed (Optional)</label>
              <select className={inputClass}>
                <option value="">Assign later...</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Admission Date *</label>
              <input type="date" value={admissionDate} onChange={(e) => setAdmissionDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Date of Birth *</label>
              <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className={inputClass} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Case Manager</label>
            <select className={inputClass}>
              <option value="">Assign later...</option>
            </select>
          </div>

          <div className="pt-4 border-t border-zinc-800 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!isValid || convertMutation.isPending}
              loading={convertMutation.isPending}
            >
              {convertMutation.isPending ? "Converting..." : "Start Admission"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LeadDetailPage() {
  const params = useParams();
  const leadId = params.id as string;
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [noteModal, setNoteModal] = useState<{ open: boolean; type: "note" | "phone_call" | "email" | "tour" }>({ open: false, type: "note" });

  const { data: lead, isLoading, error } = trpc.lead.getById.useQuery(
    { leadId },
    { enabled: !!leadId }
  );

  if (error) {
    return (
      <PageContainer>
        <Card><CardContent><ErrorState title="Failed to load lead" description={error.message} /></CardContent></Card>
      </PageContainer>
    );
  }

  if (isLoading || !lead) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
        </div>
      </PageContainer>
    );
  }

  const daysInPipeline = Math.floor(
    (Date.now() - new Date(lead.created_at!).getTime()) / (1000 * 60 * 60 * 24)
  );

  const canConvert = lead.status === "accepted" || lead.status === "deposit_pending";

  return (
    <PageContainer>
      {/* Breadcrumb */}
      <div>
        <Link
          href="/admissions"
          className="flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-100"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Pipeline
        </Link>
      </div>

      {/* Header Card */}
      <Card>
        <CardContent>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center text-xl font-semibold text-zinc-400">
                {lead.first_name[0]}{lead.last_name[0]}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-zinc-100">
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
                <div className="flex items-center gap-3 mt-2">
                  {lead.house_name && (
                    <Badge variant="info">
                      <span className="flex items-center gap-1"><Home className="h-3 w-3" />{lead.house_name}</span>
                    </Badge>
                  )}
                  {lead.preferred_move_in_date && (
                    <Badge variant="success">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Move-in: {new Date(lead.preferred_move_in_date).toLocaleDateString()}
                      </span>
                    </Badge>
                  )}
                  <Badge variant="default">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {daysInPipeline} days in pipeline
                    </span>
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="secondary" icon={<Edit className="h-4 w-4" />} onClick={() => setShowEditModal(true)}>Edit</Button>
              {canConvert && (
                <Button
                  variant="primary"
                  icon={<ArrowRight className="h-4 w-4" />}
                  onClick={() => setShowConvertModal(true)}
                >
                  Start Admission
                </Button>
              )}
            </div>
          </div>

          {/* Status Pipeline */}
          <div className="mt-6 pt-6 border-t border-zinc-800">
            <StatusPipeline currentStatus={lead.status} />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {canConvert && <IntakeChecklist />}

          {/* Lead Details */}
          <Card>
            <CardHeader>
              <CardTitle>Lead Information</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-zinc-500">Source</label>
                  <p className="text-sm font-medium text-zinc-100">{lead.source || "—"}</p>
                </div>
                <div>
                  <label className="text-sm text-zinc-500">Created</label>
                  <p className="text-sm font-medium text-zinc-100">
                    {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : "—"}
                  </p>
                </div>
              </div>
              {lead.notes && (
                <div className="mt-4">
                  <label className="text-sm text-zinc-500">Notes</label>
                  <p className="text-sm text-zinc-100 mt-1">{lead.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <div className="px-2 pb-2">
              <button
                className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800/40 rounded-lg flex items-center gap-2"
                onClick={() => setNoteModal({ open: true, type: "phone_call" })}
              >
                <Phone className="h-4 w-4 text-zinc-500" />
                Log Phone Call
              </button>
              <button
                className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800/40 rounded-lg flex items-center gap-2"
                onClick={() => setNoteModal({ open: true, type: "email" })}
              >
                <Mail className="h-4 w-4 text-zinc-500" />
                Log Email
              </button>
              <button
                className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800/40 rounded-lg flex items-center gap-2"
                onClick={() => setNoteModal({ open: true, type: "tour" })}
              >
                <Calendar className="h-4 w-4 text-zinc-500" />
                Schedule Tour
              </button>
              <button
                className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800/40 rounded-lg flex items-center gap-2"
                onClick={() => setNoteModal({ open: true, type: "note" })}
              >
                <FileText className="h-4 w-4 text-zinc-500" />
                Add Note
              </button>
            </div>
          </Card>
        </div>
      </div>

      <ConvertToResidentModal
        isOpen={showConvertModal}
        onClose={() => setShowConvertModal(false)}
        leadId={leadId}
        lead={lead}
      />

      {showEditModal && (
        <EditLeadModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          lead={lead}
        />
      )}

      <AddNoteModal
        isOpen={noteModal.open}
        onClose={() => setNoteModal({ open: false, type: "note" })}
        leadId={leadId}
        existingNotes={lead.notes}
        activityType={noteModal.type}
      />
    </PageContainer>
  );
}

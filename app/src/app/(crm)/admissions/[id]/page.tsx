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
  PenTool,
} from "lucide-react";

// Mock lead data
const mockLead = {
  id: "7",
  org_id: "org1",
  first_name: "Kevin",
  last_name: "Wilson",
  email: "kwilson@email.com",
  phone: "(512) 555-7890",
  status: "accepted",
  source: "Referral - Probation",
  preferred_move_in_date: "2026-02-20",
  house_preference_id: "h2",
  house_name: "Men's House B",
  notes: "Referred by Travis County probation. Clean drug test at intake. Highly motivated for recovery.",
  created_at: "2026-01-25",
};

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

// Intake checklist items
const INTAKE_CHECKLIST = [
  { id: "personal_info", label: "Personal Information", icon: User, required: true, completed: true },
  { id: "emergency_contacts", label: "Emergency Contacts", icon: Phone, required: true, completed: true },
  { id: "insurance_info", label: "Insurance Information", icon: FileText, required: false, completed: false },
  { id: "photo_id", label: "Photo ID Upload", icon: Upload, required: true, completed: true },
  { id: "insurance_card", label: "Insurance Card Upload", icon: Upload, required: false, completed: false },
  { id: "court_documents", label: "Court Documents", icon: FileText, required: false, completed: true },
  { id: "part2_consent", label: "Part 2 Consent Form", icon: Shield, required: true, completed: false },
  { id: "privacy_notice", label: "Privacy Notice Acknowledgment", icon: Shield, required: true, completed: false },
  { id: "house_rules", label: "House Rules Agreement", icon: Home, required: true, completed: false },
  { id: "financial_agreement", label: "Financial Agreement", icon: FileText, required: true, completed: false },
  { id: "intake_form", label: "Intake Assessment Form", icon: FileText, required: true, completed: false },
];

// Activity timeline
const ACTIVITY_TIMELINE = [
  { date: "2026-02-17", action: "Accepted", user: "Sarah Manager", note: "Background check cleared" },
  { date: "2026-02-15", action: "Applied", user: "Sarah Manager", note: "Application received" },
  { date: "2026-02-12", action: "Toured", user: "John Staff", note: "Toured Men's House B" },
  { date: "2026-02-08", action: "Qualified", user: "Sarah Manager", note: "Insurance verified" },
  { date: "2026-02-05", action: "Contacted", user: "Sarah Manager", note: "Initial phone screen" },
  { date: "2026-01-25", action: "Created", user: "Sarah Manager", note: "Referral from probation" },
];

function StatusPipeline({ currentStatus }: { currentStatus: string }) {
  const currentIndex = PIPELINE_STAGES.findIndex(s => s.id === currentStatus);

  return (
    <div className="flex items-center justify-between">
      {PIPELINE_STAGES.map((stage, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isUpcoming = index > currentIndex;

        return (
          <div key={stage.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                  isCompleted
                    ? "bg-green-500 text-white"
                    : isCurrent
                    ? "bg-blue-500 text-white"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                {isCompleted ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={`mt-1 text-xs ${
                  isCurrent ? "font-medium text-blue-600" : "text-slate-500"
                }`}
              >
                {stage.label}
              </span>
            </div>
            {index < PIPELINE_STAGES.length - 1 && (
              <div
                className={`flex-1 h-1 mx-2 ${
                  index < currentIndex ? "bg-green-500" : "bg-slate-200"
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
  const requiredItems = INTAKE_CHECKLIST.filter(i => i.required);
  const completedRequired = requiredItems.filter(i => i.completed).length;
  const progress = Math.round((completedRequired / requiredItems.length) * 100);

  return (
    <div className="bg-white rounded-lg border border-slate-200">
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Intake Checklist</h3>
          <span className="text-sm text-slate-500">
            {completedRequired}/{requiredItems.length} required
          </span>
        </div>
        <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <div className="divide-y divide-slate-100">
        {INTAKE_CHECKLIST.map((item) => (
          <div
            key={item.id}
            className={`p-3 flex items-center justify-between hover:bg-slate-50 cursor-pointer ${
              item.completed ? "bg-green-50/50" : ""
            }`}
          >
            <div className="flex items-center gap-3">
              {item.completed ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <Circle className="h-5 w-5 text-slate-300" />
              )}
              <div>
                <span className={`text-sm ${item.completed ? "text-slate-500" : "text-slate-900"}`}>
                  {item.label}
                </span>
                {item.required && !item.completed && (
                  <span className="ml-2 text-xs text-red-500">Required</span>
                )}
              </div>
            </div>
            {!item.completed && (
              <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                {item.id.includes("upload") ? "Upload" : item.id.includes("consent") || item.id.includes("agreement") || item.id.includes("notice") ? "Sign" : "Complete"}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface ConvertModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: typeof mockLead;
}

function ConvertToResidentModal({ isOpen, onClose, lead }: ConvertModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">Start Admission</h2>
          <p className="text-sm text-slate-600 mt-1">
            Convert {lead.first_name} {lead.last_name} to a resident and begin intake
          </p>
        </div>
        <form className="p-6 space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
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
              <label className="block text-sm font-medium text-slate-700 mb-1">House *</label>
              <select
                defaultValue={lead.house_preference_id || ""}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select house...</option>
                <option value="h1">Men's House A</option>
                <option value="h2">Men's House B</option>
                <option value="h3">Women's House</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Bed (Optional)</label>
              <select className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <option value="">Assign later...</option>
                <option value="b1">Room 101 - Bed A</option>
                <option value="b2">Room 101 - Bed B</option>
                <option value="b3">Room 102 - Bed A</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Admission Date *</label>
              <input
                type="date"
                defaultValue={lead.preferred_move_in_date || ""}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth *</label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Case Manager</label>
            <select className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option value="">Assign later...</option>
              <option value="cm1">Sarah Manager</option>
              <option value="cm2">John Staff</option>
            </select>
          </div>
        </form>
        <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-700 border border-slate-300 rounded-lg font-medium hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
          >
            Start Admission
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LeadDetailPage() {
  const params = useParams();
  const leadId = params.id as string;
  const [showConvertModal, setShowConvertModal] = useState(false);

  const daysInPipeline = Math.floor(
    (Date.now() - new Date(mockLead.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  const canConvert = mockLead.status === "accepted" || mockLead.status === "deposit_pending";

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <div>
        <Link
          href="/admissions"
          className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Pipeline
        </Link>
      </div>

      {/* Header */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-xl font-semibold text-slate-600">
              {mockLead.first_name[0]}{mockLead.last_name[0]}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {mockLead.first_name} {mockLead.last_name}
              </h1>
              <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                {mockLead.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    <span>{mockLead.phone}</span>
                  </div>
                )}
                {mockLead.email && (
                  <div className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    <span>{mockLead.email}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm">
                {mockLead.house_name && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded">
                    <Home className="h-4 w-4" />
                    {mockLead.house_name}
                  </span>
                )}
                {mockLead.preferred_move_in_date && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded">
                    <Calendar className="h-4 w-4" />
                    Move-in: {new Date(mockLead.preferred_move_in_date).toLocaleDateString()}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-700 rounded">
                  <Clock className="h-4 w-4" />
                  {daysInPipeline} days in pipeline
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50">
              <Edit className="h-4 w-4" />
              Edit
            </button>
            {canConvert && (
              <button
                onClick={() => setShowConvertModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
              >
                <ArrowRight className="h-4 w-4" />
                Start Admission
              </button>
            )}
          </div>
        </div>

        {/* Status Pipeline */}
        <div className="mt-6 pt-6 border-t border-slate-200">
          <StatusPipeline currentStatus={mockLead.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Intake Checklist */}
          {canConvert && <IntakeChecklist />}

          {/* Lead Details */}
          <div className="bg-white rounded-lg border border-slate-200">
            <div className="p-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900">Lead Information</h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-500">Source</label>
                  <p className="text-sm font-medium text-slate-900">{mockLead.source || "—"}</p>
                </div>
                <div>
                  <label className="text-sm text-slate-500">Created</label>
                  <p className="text-sm font-medium text-slate-900">
                    {new Date(mockLead.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              {mockLead.notes && (
                <div>
                  <label className="text-sm text-slate-500">Notes</label>
                  <p className="text-sm text-slate-900 mt-1">{mockLead.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-lg border border-slate-200">
            <div className="p-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900">Quick Actions</h3>
            </div>
            <div className="p-2">
              <button className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2">
                <Phone className="h-4 w-4 text-slate-400" />
                Log Phone Call
              </button>
              <button className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2">
                <Mail className="h-4 w-4 text-slate-400" />
                Send Email
              </button>
              <button className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-400" />
                Schedule Tour
              </button>
              <button className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-400" />
                Add Note
              </button>
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="bg-white rounded-lg border border-slate-200">
            <div className="p-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900">Activity</h3>
            </div>
            <div className="p-4">
              <div className="space-y-4">
                {ACTIVITY_TIMELINE.map((activity, index) => (
                  <div key={index} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                      {index < ACTIVITY_TIMELINE.length - 1 && (
                        <div className="w-0.5 h-full bg-slate-200 mt-1" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-900">{activity.action}</span>
                        <span className="text-xs text-slate-400">
                          {new Date(activity.date).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mt-0.5">{activity.note}</p>
                      <p className="text-xs text-slate-400 mt-0.5">by {activity.user}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConvertToResidentModal
        isOpen={showConvertModal}
        onClose={() => setShowConvertModal(false)}
        lead={mockLead}
      />
    </div>
  );
}

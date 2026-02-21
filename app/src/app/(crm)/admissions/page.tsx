"use client";

import { useState } from "react";
import Link from "next/link";
import {
  UserPlus,
  Plus,
  Search,
  Phone,
  Mail,
  Calendar,
  Home,
  MoreVertical,
  ArrowRight,
  TrendingUp,
  Users,
  CheckCircle,
  Loader2,
  GripVertical,
  Building2,
  ExternalLink,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@clerk/nextjs";
import {
  PageContainer,
  PageHeader,
  StatCard,
  StatCardGrid,
  Card,
  CardContent,
  Button,
  EmptyState,
  ErrorState,
  useToast,
} from "@/components/ui";

export const dynamic = "force-dynamic";

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  status: string;
  source: string | null;
  preferred_move_in_date: string | null;
  house_preference_id: string | null;
  house_name: string | null;
  notes: string | null;
  created_at: string | Date;
}

// Simplified visual stages that group underlying statuses
const SIMPLIFIED_STAGES = [
  { id: "new", label: "New", color: "bg-zinc-500", statuses: ["new"] },
  { id: "screening", label: "Screening", color: "bg-indigo-500", statuses: ["contacted", "qualified", "touring"] },
  { id: "approved", label: "Approved", color: "bg-green-500", statuses: ["applied", "accepted", "deposit_pending"] },
  { id: "moved_in", label: "Moved In", color: "bg-emerald-500", statuses: ["converted"] },
] as const;

// Full underlying statuses for the detailed view
const PIPELINE_STAGES = [
  { id: "new", label: "New", color: "bg-zinc-500" },
  { id: "contacted", label: "Contacted", color: "bg-indigo-500" },
  { id: "qualified", label: "Qualified", color: "bg-cyan-500" },
  { id: "touring", label: "Touring", color: "bg-purple-500" },
  { id: "applied", label: "Applied", color: "bg-yellow-500" },
  { id: "accepted", label: "Accepted", color: "bg-green-500" },
  { id: "deposit_pending", label: "Deposit Pending", color: "bg-orange-500" },
] as const;

type ViewMode = "simple" | "detailed";

function LeadCard({ lead, onMoveNext, onMarkLost }: { lead: Lead; onMoveNext?: (leadId: string, currentStatus: string) => void; onMarkLost?: (leadId: string) => void }) {
  const [showMenu, setShowMenu] = useState(false);
  const daysInPipeline = Math.floor((Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
          <div className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center text-xs font-semibold text-zinc-400">
            {lead.first_name[0]}{lead.last_name[0]}
          </div>
        </div>
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1 hover:bg-zinc-800 rounded opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreVertical className="h-4 w-4 text-zinc-500" />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-6 w-40 bg-zinc-900 rounded-lg shadow-lg border border-zinc-800 py-1 z-20">
                <Link
                  href={`/admissions/${lead.id}`}
                  className="block px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800/40"
                >
                  View Details
                </Link>
                <button
                  className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800/40"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                    onMoveNext?.(lead.id, lead.status);
                  }}
                >
                  Move to Next Stage
                </button>
                <button
                  className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                    onMarkLost?.(lead.id);
                  }}
                >
                  Mark as Lost
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <Link href={`/admissions/${lead.id}`}>
        <h4 className="font-medium text-zinc-100 text-sm">
          {lead.first_name} {lead.last_name}
        </h4>

        {(lead.phone || lead.email) && (
          <div className="mt-1.5 space-y-1">
            {lead.phone && (
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <Phone className="h-3 w-3" />
                <span>{lead.phone}</span>
              </div>
            )}
            {lead.email && (
              <div className="flex items-center gap-1.5 text-xs text-zinc-500 truncate">
                <Mail className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{lead.email}</span>
              </div>
            )}
          </div>
        )}

        <div className="mt-2 flex items-center gap-2 flex-wrap">
          {lead.house_name && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-indigo-500/10 text-indigo-300 text-xs rounded">
              <Home className="h-3 w-3" />
              {lead.house_name}
            </span>
          )}
          {lead.preferred_move_in_date && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-500/10 text-green-300 text-xs rounded">
              <Calendar className="h-3 w-3" />
              {new Date(lead.preferred_move_in_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          )}
        </div>

        {lead.source && (
          <p className="mt-2 text-xs text-zinc-500">{lead.source}</p>
        )}

        <div className="mt-2 pt-2 border-t border-zinc-800/50 flex items-center justify-between text-xs">
          <span className="text-zinc-500">{daysInPipeline} days</span>
          <ArrowRight className="h-3 w-3 text-zinc-600" />
        </div>
      </Link>
    </div>
  );
}

function PipelineColumn({ stage, leads, isLoading, onMoveNext, onMarkLost }: { stage: { id: string; label: string; color: string }; leads: Lead[]; isLoading?: boolean; onMoveNext?: (leadId: string, currentStatus: string) => void; onMarkLost?: (leadId: string) => void }) {
  return (
    <div className="flex-1 min-w-[280px] max-w-[320px]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${stage.color}`} />
          <h3 className="font-semibold text-zinc-100 text-sm">{stage.label}</h3>
          <span className="bg-zinc-800 text-zinc-400 text-xs font-medium px-2 py-0.5 rounded-full">
            {isLoading ? "--" : leads.length}
          </span>
        </div>
      </div>
      <div className="bg-zinc-800/40 rounded-lg p-2 min-h-[200px] space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
          </div>
        ) : leads.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 text-sm">No leads</div>
        ) : (
          leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} onMoveNext={onMoveNext} onMarkLost={onMarkLost} />
          ))
        )}
      </div>
    </div>
  );
}

interface CreateLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { firstName: string; lastName: string; email?: string; phone?: string; source?: string; notes?: string }) => void;
  isSubmitting?: boolean;
}

function CreateLeadModal({ isOpen, onClose, onSubmit, isSubmitting }: CreateLeadModalProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      firstName,
      lastName,
      email: email || undefined,
      phone: phone || undefined,
      source: source || undefined,
      notes: notes || undefined,
    });
  };

  const inputClass = "w-full h-10 px-3 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-zinc-900 rounded-xl shadow-2xl w-full max-w-lg mx-4 border border-zinc-800">
        <div className="p-6 border-b border-zinc-800">
          <h2 className="text-xl font-bold text-zinc-100">Add New Lead</h2>
          <p className="text-sm text-zinc-500 mt-1">Enter information for a prospective resident</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">First Name *</label>
              <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Last Name *</label>
              <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Phone</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Lead Source</label>
            <select value={source} onChange={(e) => setSource(e.target.value)} className={inputClass}>
              <option value="">Select source...</option>
              <option value="Website">Website</option>
              <option value="Google Ads">Google Ads</option>
              <option value="Referral - Treatment Center">Referral - Treatment Center</option>
              <option value="Referral - AA/NA">Referral - AA/NA</option>
              <option value="Referral - Hospital">Referral - Hospital</option>
              <option value="Referral - Probation">Referral - Probation/Court</option>
              <option value="Word of Mouth">Word of Mouth</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Notes</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-3 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none transition-colors"
              placeholder="Initial contact notes, special circumstances, etc."
            />
          </div>
          <div className="pt-4 border-t border-zinc-800 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" loading={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Lead"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

const STAGE_ORDER = ['new', 'contacted', 'qualified', 'touring', 'applied', 'accepted', 'deposit_pending', 'converted'] as const;

export default function AdmissionsPage() {
  const { toast } = useToast();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("simple");

  const { userId } = useAuth();

  const { data: userData } = trpc.user.getCurrentUser.useQuery(undefined, {
    enabled: !!userId,
  });

  const orgId = userData?.org_id;

  const utils = trpc.useUtils();
  const { data: kanbanData, isLoading, error } = trpc.lead.getKanban.useQuery(
    { orgId: orgId!, excludeTerminal: false },
    { enabled: !!orgId }
  );

  const { data: statsData } = trpc.lead.getPipelineStats.useQuery(
    { orgId: orgId! },
    { enabled: !!orgId }
  );

  const createMutation = trpc.lead.create.useMutation({
    onSuccess: () => {
      setShowCreateModal(false);
      toast("success", "Lead added");
      utils.lead.getKanban.invalidate();
      utils.lead.getPipelineStats.invalidate();
    },
    onError: (err) => toast("error", "Failed to add lead", err.message),
  });

  const updateStatusMutation = trpc.lead.updateStatus.useMutation({
    onSuccess: () => {
      toast("success", "Lead status updated");
      utils.lead.getKanban.invalidate();
      utils.lead.getPipelineStats.invalidate();
    },
    onError: (err) => toast("error", "Failed to update status", err.message),
  });

  const handleMoveNext = (leadId: string, currentStatus: string) => {
    const idx = STAGE_ORDER.indexOf(currentStatus as typeof STAGE_ORDER[number]);
    if (idx < 0 || idx >= STAGE_ORDER.length - 1) return;
    const nextStatus = STAGE_ORDER[idx + 1]!;
    updateStatusMutation.mutate({ leadId, status: nextStatus });
  };

  const [lostModal, setLostModal] = useState<{ leadId: string } | null>(null);
  const [lostReason, setLostReason] = useState("");

  const handleMarkLost = (leadId: string) => {
    setLostModal({ leadId });
  };

  const handleCreateLead = (data: { firstName: string; lastName: string; email?: string; phone?: string; source?: string; notes?: string }) => {
    if (!orgId) return;
    createMutation.mutate({
      orgId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      source: data.source,
      notes: data.notes,
    });
  };

  // Helper to collect leads from grouped statuses
  const getGroupedLeads = (statuses: readonly string[]): Lead[] => {
    if (!kanbanData) return [];
    const result: Lead[] = [];
    for (const status of statuses) {
      const leads = kanbanData[status];
      if (leads) {
        result.push(...(leads as Lead[]));
      }
    }
    return result;
  };

  const totalLeads = statsData?.total || 0;
  const conversionRate = statsData?.conversionRate || 0;
  const readyToAdmit = (kanbanData?.deposit_pending?.length || 0) + (kanbanData?.accepted?.length || 0);

  return (
    <PageContainer>
      <PageHeader
        title="Admissions Pipeline"
        description="Track and manage prospective residents"
        actions={
          <div className="flex items-center gap-3">
            <Link href="/admissions/referrals">
              <Button variant="secondary" icon={<Building2 className="h-4 w-4" />}>
                Referral Sources
              </Button>
            </Link>
            <Button
              variant="primary"
              icon={<Plus className="h-4 w-4" />}
              onClick={() => setShowCreateModal(true)}
            >
              Add Lead
            </Button>
          </div>
        }
      />

      {error && (
        <Card><CardContent><ErrorState title="Error loading pipeline" description={error.message} /></CardContent></Card>
      )}

      <StatCardGrid columns={4}>
        <StatCard
          title="Active Leads"
          value={isLoading ? "--" : String(totalLeads)}
          icon={<Users className="h-5 w-5" />}
          loading={isLoading}
        />
        <StatCard
          title="Converted (Total)"
          value={isLoading ? "--" : String(statsData?.stages?.converted || 0)}
          variant="success"
          icon={<CheckCircle className="h-5 w-5" />}
          loading={isLoading}
        />
        <StatCard
          title="Conversion Rate"
          value={isLoading ? "--" : `${conversionRate}%`}
          icon={<TrendingUp className="h-5 w-5" />}
          loading={isLoading}
        />
        <StatCard
          title="Ready to Admit"
          value={isLoading ? "--" : String(readyToAdmit)}
          variant="warning"
          icon={<UserPlus className="h-5 w-5" />}
          loading={isLoading}
        />
      </StatCardGrid>

      {/* Toolbar: Search + View Toggle + Intake Link */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="flex-1 relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* View mode toggle */}
          <div className="flex items-center bg-zinc-800/40 rounded-lg border border-zinc-800 p-0.5">
            <button
              onClick={() => setViewMode("simple")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                viewMode === "simple"
                  ? "bg-zinc-700 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Simple
            </button>
            <button
              onClick={() => setViewMode("detailed")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                viewMode === "detailed"
                  ? "bg-zinc-700 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Detailed
            </button>
          </div>
        </div>

        {/* Public intake form link */}
        {userData && (
          <Link
            href={`/apply/${(userData as any).org_slug || "your-org"}`}
            target="_blank"
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-indigo-400 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Public Intake Form
          </Link>
        )}
      </div>

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {viewMode === "simple"
            ? SIMPLIFIED_STAGES.map((stage) => (
                <PipelineColumn
                  key={stage.id}
                  stage={stage}
                  leads={getGroupedLeads(stage.statuses)}
                  isLoading={isLoading}
                  onMoveNext={handleMoveNext}
                  onMarkLost={handleMarkLost}
                />
              ))
            : PIPELINE_STAGES.map((stage) => (
                <PipelineColumn
                  key={stage.id}
                  stage={stage}
                  leads={(kanbanData?.[stage.id] || []) as Lead[]}
                  isLoading={isLoading}
                  onMoveNext={handleMoveNext}
                  onMarkLost={handleMarkLost}
                />
              ))
          }
        </div>
      </div>

      <CreateLeadModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateLead}
        isSubmitting={createMutation.isPending}
      />

      {/* Mark Lost Modal */}
      {lostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setLostModal(null); setLostReason(""); }} />
          <div className="relative bg-zinc-900 rounded-xl shadow-2xl w-full max-w-md mx-4 border border-zinc-800">
            <div className="p-6 border-b border-zinc-800">
              <h2 className="text-lg font-bold text-zinc-100">Mark Lead as Lost</h2>
              <p className="text-sm text-zinc-500 mt-1">This lead will be removed from the pipeline</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                  Reason <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={lostReason}
                  onChange={(e) => setLostReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                  placeholder="Why was this lead lost? (e.g., chose another facility, no response, not a fit)"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={() => { setLostModal(null); setLostReason(""); }}>Cancel</Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (lostReason.trim()) {
                      updateStatusMutation.mutate({ leadId: lostModal.leadId, status: "lost", lostReason: lostReason.trim() });
                      setLostModal(null);
                      setLostReason("");
                    }
                  }}
                  disabled={!lostReason.trim() || updateStatusMutation.isPending}
                >
                  {updateStatusMutation.isPending ? "Saving..." : "Mark as Lost"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

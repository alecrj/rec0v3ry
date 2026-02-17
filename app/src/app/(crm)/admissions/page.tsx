"use client";

import { useState } from "react";
import Link from "next/link";
import {
  UserPlus,
  Plus,
  Search,
  Filter,
  Phone,
  Mail,
  Calendar,
  Home,
  MoreVertical,
  ArrowRight,
  TrendingUp,
  Users,
  CheckCircle,
  XCircle,
  GripVertical,
} from "lucide-react";

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
  created_at: string;
}

// Pipeline stages configuration
const PIPELINE_STAGES = [
  { id: "new", label: "New", color: "bg-slate-500" },
  { id: "contacted", label: "Contacted", color: "bg-blue-500" },
  { id: "qualified", label: "Qualified", color: "bg-cyan-500" },
  { id: "touring", label: "Touring", color: "bg-purple-500" },
  { id: "applied", label: "Applied", color: "bg-yellow-500" },
  { id: "accepted", label: "Accepted", color: "bg-green-500" },
  { id: "deposit_pending", label: "Deposit Pending", color: "bg-orange-500" },
] as const;

// Mock data - will be replaced with tRPC query
const mockKanban: Record<string, Lead[]> = {
  new: [
    {
      id: "1",
      first_name: "Marcus",
      last_name: "Rodriguez",
      email: "mrodriguez@email.com",
      phone: "(512) 555-1234",
      status: "new",
      source: "Website",
      preferred_move_in_date: "2026-02-25",
      house_preference_id: "h1",
      house_name: "Men's House A",
      notes: "Inquired via contact form",
      created_at: "2026-02-15",
    },
    {
      id: "2",
      first_name: "Jennifer",
      last_name: "Liu",
      email: "jliu@email.com",
      phone: "(512) 555-2345",
      status: "new",
      source: "Referral - Treatment Center",
      preferred_move_in_date: null,
      house_preference_id: null,
      house_name: null,
      notes: null,
      created_at: "2026-02-16",
    },
  ],
  contacted: [
    {
      id: "3",
      first_name: "Derek",
      last_name: "Mitchell",
      email: "dmitchell@email.com",
      phone: "(512) 555-3456",
      status: "contacted",
      source: "Google Ads",
      preferred_move_in_date: "2026-03-01",
      house_preference_id: "h2",
      house_name: "Men's House B",
      notes: "Left voicemail, waiting for callback",
      created_at: "2026-02-10",
    },
  ],
  qualified: [
    {
      id: "4",
      first_name: "Angela",
      last_name: "Thompson",
      email: "athompson@email.com",
      phone: "(512) 555-4567",
      status: "qualified",
      source: "Referral - AA/NA",
      preferred_move_in_date: "2026-02-28",
      house_preference_id: "h3",
      house_name: "Women's House",
      notes: "Insurance pre-approved. Good candidate.",
      created_at: "2026-02-08",
    },
  ],
  touring: [
    {
      id: "5",
      first_name: "Robert",
      last_name: "Chen",
      email: "rchen@email.com",
      phone: "(512) 555-5678",
      status: "touring",
      source: "Website",
      preferred_move_in_date: "2026-03-05",
      house_preference_id: "h1",
      house_name: "Men's House A",
      notes: "Tour scheduled for 2/18 at 2pm",
      created_at: "2026-02-05",
    },
  ],
  applied: [
    {
      id: "6",
      first_name: "Stephanie",
      last_name: "Garcia",
      email: "sgarcia@email.com",
      phone: "(512) 555-6789",
      status: "applied",
      source: "Referral - Hospital",
      preferred_move_in_date: "2026-02-22",
      house_preference_id: "h3",
      house_name: "Women's House",
      notes: "Application received. Background check in progress.",
      created_at: "2026-02-01",
    },
  ],
  accepted: [
    {
      id: "7",
      first_name: "Kevin",
      last_name: "Wilson",
      email: "kwilson@email.com",
      phone: "(512) 555-7890",
      status: "accepted",
      source: "Referral - Probation",
      preferred_move_in_date: "2026-02-20",
      house_preference_id: "h2",
      house_name: "Men's House B",
      notes: "Approved! Sending admission packet.",
      created_at: "2026-01-25",
    },
  ],
  deposit_pending: [
    {
      id: "8",
      first_name: "Lisa",
      last_name: "Park",
      email: "lpark@email.com",
      phone: "(512) 555-8901",
      status: "deposit_pending",
      source: "Website",
      preferred_move_in_date: "2026-02-19",
      house_preference_id: "h3",
      house_name: "Women's House",
      notes: "Deposit invoice sent. Family paying.",
      created_at: "2026-01-20",
    },
  ],
};

function LeadCard({ lead }: { lead: Lead }) {
  const [showMenu, setShowMenu] = useState(false);
  const daysInPipeline = Math.floor((Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
          <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-xs font-semibold text-slate-600">
            {lead.first_name[0]}{lead.last_name[0]}
          </div>
        </div>
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1 hover:bg-slate-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreVertical className="h-4 w-4 text-slate-500" />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-6 w-40 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20">
                <Link
                  href={`/admissions/${lead.id}`}
                  className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  View Details
                </Link>
                <button className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  Move to Next Stage
                </button>
                <button className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                  Mark as Lost
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <Link href={`/admissions/${lead.id}`}>
        <h4 className="font-medium text-slate-900 text-sm">
          {lead.first_name} {lead.last_name}
        </h4>

        {(lead.phone || lead.email) && (
          <div className="mt-1.5 space-y-1">
            {lead.phone && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Phone className="h-3 w-3" />
                <span>{lead.phone}</span>
              </div>
            )}
            {lead.email && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate">
                <Mail className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{lead.email}</span>
              </div>
            )}
          </div>
        )}

        <div className="mt-2 flex items-center gap-2 flex-wrap">
          {lead.house_name && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-700 text-xs rounded">
              <Home className="h-3 w-3" />
              {lead.house_name}
            </span>
          )}
          {lead.preferred_move_in_date && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-50 text-green-700 text-xs rounded">
              <Calendar className="h-3 w-3" />
              {new Date(lead.preferred_move_in_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          )}
        </div>

        {lead.source && (
          <p className="mt-2 text-xs text-slate-400">{lead.source}</p>
        )}

        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-400">{daysInPipeline} days</span>
          <ArrowRight className="h-3 w-3 text-slate-300" />
        </div>
      </Link>
    </div>
  );
}

function PipelineColumn({ stage, leads }: { stage: typeof PIPELINE_STAGES[number]; leads: Lead[] }) {
  return (
    <div className="flex-1 min-w-[280px] max-w-[320px]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${stage.color}`} />
          <h3 className="font-semibold text-slate-900 text-sm">{stage.label}</h3>
          <span className="bg-slate-100 text-slate-600 text-xs font-medium px-2 py-0.5 rounded-full">
            {leads.length}
          </span>
        </div>
      </div>
      <div className="bg-slate-50 rounded-lg p-2 min-h-[200px] space-y-2">
        {leads.map((lead) => (
          <LeadCard key={lead.id} lead={lead} />
        ))}
        {leads.length === 0 && (
          <div className="text-center py-8 text-slate-400 text-sm">No leads</div>
        )}
      </div>
    </div>
  );
}

interface CreateLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function CreateLeadModal({ isOpen, onClose }: CreateLeadModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">Add New Lead</h2>
          <p className="text-sm text-slate-600 mt-1">Enter information for a prospective resident</p>
        </div>
        <form className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">First Name *</label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Last Name *</label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <input
                type="tel"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Lead Source</label>
              <select className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <option value="">Select source...</option>
                <option value="website">Website</option>
                <option value="google_ads">Google Ads</option>
                <option value="referral_treatment">Referral - Treatment Center</option>
                <option value="referral_aa_na">Referral - AA/NA</option>
                <option value="referral_hospital">Referral - Hospital</option>
                <option value="referral_probation">Referral - Probation/Court</option>
                <option value="word_of_mouth">Word of Mouth</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">House Preference</label>
              <select className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <option value="">Any / No Preference</option>
                <option value="h1">Men's House A</option>
                <option value="h2">Men's House B</option>
                <option value="h3">Women's House</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Preferred Move-in Date</label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Initial contact notes, special circumstances, etc."
            />
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
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          >
            Add Lead
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdmissionsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Calculate stats
  const totalLeads = Object.values(mockKanban).flat().length;
  const convertedThisMonth = 3; // Mock value
  const conversionRate = 42; // Mock value

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admissions Pipeline</h1>
          <p className="text-slate-600 mt-1">Track and manage prospective residents</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
        >
          <Plus className="h-5 w-5" />
          Add Lead
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{totalLeads}</p>
              <p className="text-sm text-slate-500">Active Leads</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{convertedThisMonth}</p>
              <p className="text-sm text-slate-500">Converted (Month)</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">{conversionRate}%</p>
              <p className="text-sm text-slate-500">Conversion Rate</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded-lg">
              <UserPlus className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600">
                {mockKanban.deposit_pending?.length || 0}
              </p>
              <p className="text-sm text-slate-500">Ready to Admit</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search leads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50">
          <Filter className="h-4 w-4" />
          Filters
        </button>
      </div>

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {PIPELINE_STAGES.map((stage) => (
            <PipelineColumn
              key={stage.id}
              stage={stage}
              leads={mockKanban[stage.id] || []}
            />
          ))}
        </div>
      </div>

      <CreateLeadModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />
    </div>
  );
}

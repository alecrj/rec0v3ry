"use client";

import { useState } from "react";
import {
  ClipboardList,
  Plus,
  Search,
  Filter,
  User,
  Calendar,
  Home,
  ChevronDown,
  MoreVertical,
  Phone,
  Mail,
  Clock,
  ArrowUp,
  ArrowDown,
  Check,
  X,
  AlertCircle,
} from "lucide-react";

interface WaitlistEntry {
  id: string;
  resident_id: string;
  house_id: string | null;
  status: string;
  priority: string;
  requested_move_in_date: string | null;
  added_at: string;
  notes: string | null;
  resident_first_name: string;
  resident_last_name: string;
  house_name: string | null;
  phone?: string;
  email?: string;
}

// Mock data - will be replaced with tRPC query
const mockWaitlist: WaitlistEntry[] = [
  {
    id: "1",
    resident_id: "r1",
    house_id: "h1",
    status: "qualified",
    priority: "urgent",
    requested_move_in_date: "2026-02-20",
    added_at: "2026-02-10",
    notes: "Insurance pre-approval received. Ready for immediate placement.",
    resident_first_name: "Marcus",
    resident_last_name: "Rodriguez",
    house_name: "Men's House A",
    phone: "(512) 555-1234",
    email: "mrodriguez@email.com",
  },
  {
    id: "2",
    resident_id: "r2",
    house_id: null,
    status: "contacted",
    priority: "high",
    requested_move_in_date: "2026-02-25",
    added_at: "2026-02-08",
    notes: "Referred by local treatment center. Completing detox program.",
    resident_first_name: "Angela",
    resident_last_name: "Thompson",
    house_name: null,
    phone: "(512) 555-2345",
    email: "athompson@email.com",
  },
  {
    id: "3",
    resident_id: "r3",
    house_id: "h2",
    status: "new",
    priority: "normal",
    requested_move_in_date: "2026-03-01",
    added_at: "2026-02-15",
    notes: null,
    resident_first_name: "Derek",
    resident_last_name: "Mitchell",
    house_name: "Men's House B",
    phone: "(512) 555-3456",
  },
  {
    id: "4",
    resident_id: "r4",
    house_id: "h3",
    status: "touring",
    priority: "normal",
    requested_move_in_date: "2026-03-05",
    added_at: "2026-02-12",
    notes: "Scheduled tour for 2/18. Family will attend.",
    resident_first_name: "Stephanie",
    resident_last_name: "Garcia",
    house_name: "Women's House",
    phone: "(512) 555-4567",
    email: "sgarcia@email.com",
  },
  {
    id: "5",
    resident_id: "r5",
    house_id: null,
    status: "applied",
    priority: "low",
    requested_move_in_date: "2026-03-15",
    added_at: "2026-02-05",
    notes: "Application received. Awaiting background check.",
    resident_first_name: "Kevin",
    resident_last_name: "Wilson",
    house_name: null,
    phone: "(512) 555-5678",
  },
];

const statusConfig: Record<string, { color: string; label: string }> = {
  new: { color: "bg-slate-100 text-slate-700", label: "New" },
  contacted: { color: "bg-blue-100 text-blue-700", label: "Contacted" },
  qualified: { color: "bg-green-100 text-green-700", label: "Qualified" },
  touring: { color: "bg-purple-100 text-purple-700", label: "Touring" },
  applied: { color: "bg-yellow-100 text-yellow-700", label: "Applied" },
  accepted: { color: "bg-emerald-100 text-emerald-700", label: "Accepted" },
  deposit_pending: { color: "bg-orange-100 text-orange-700", label: "Deposit Pending" },
  converted: { color: "bg-teal-100 text-teal-700", label: "Converted" },
  lost: { color: "bg-red-100 text-red-700", label: "Lost" },
};

const priorityConfig: Record<string, { color: string; label: string; icon: typeof ArrowUp }> = {
  urgent: { color: "text-red-600", label: "Urgent", icon: ArrowUp },
  high: { color: "text-orange-600", label: "High", icon: ArrowUp },
  normal: { color: "text-slate-600", label: "Normal", icon: ArrowDown },
  low: { color: "text-slate-400", label: "Low", icon: ArrowDown },
};

function WaitlistCard({ entry }: { entry: WaitlistEntry }) {
  const [showMenu, setShowMenu] = useState(false);
  const status = statusConfig[entry.status] || statusConfig.new;
  const priority = priorityConfig[entry.priority] || priorityConfig.normal;
  const daysOnList = Math.floor((Date.now() - new Date(entry.added_at).getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold text-slate-600">
                {entry.resident_first_name[0]}{entry.resident_last_name[0]}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-900">
                  {entry.resident_first_name} {entry.resident_last_name}
                </h3>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${status.color}`}>
                  {status.label}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                {entry.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    <span>{entry.phone}</span>
                  </div>
                )}
                {entry.email && (
                  <div className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    <span className="truncate max-w-[150px]">{entry.email}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1 ${priority.color}`}>
              <priority.icon className="h-4 w-4" />
              <span className="text-xs font-medium">{priority.label}</span>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <MoreVertical className="h-4 w-4 text-slate-500" />
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-8 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20">
                    <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                      <User className="h-4 w-4" />
                      View Profile
                    </button>
                    <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                      <Check className="h-4 w-4" />
                      Update Status
                    </button>
                    <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-green-600 hover:bg-green-50">
                      <Home className="h-4 w-4" />
                      Assign Bed
                    </button>
                    <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                      <X className="h-4 w-4" />
                      Remove from List
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-100">
          <div>
            <p className="text-xs text-slate-500">Preferred House</p>
            <p className="text-sm font-medium text-slate-900 mt-0.5">
              {entry.house_name || "Any Available"}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Target Move-in</p>
            <p className="text-sm font-medium text-slate-900 mt-0.5">
              {entry.requested_move_in_date
                ? new Date(entry.requested_move_in_date).toLocaleDateString()
                : "Flexible"}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Days on List</p>
            <p className="text-sm font-medium text-slate-900 mt-0.5 flex items-center gap-1">
              <Clock className="h-3 w-3 text-slate-400" />
              {daysOnList} days
            </p>
          </div>
        </div>

        {entry.notes && (
          <div className="mt-3 p-3 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-500 mb-1">Notes</p>
            <p className="text-sm text-slate-700">{entry.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface AddToWaitlistModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function AddToWaitlistModal({ isOpen, onClose }: AddToWaitlistModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">Add to Waitlist</h2>
          <p className="text-sm text-slate-600 mt-1">Add a prospective resident to the waitlist</p>
        </div>
        <form className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
              <input
                type="text"
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
              <label className="block text-sm font-medium text-slate-700 mb-1">Preferred House</label>
              <select className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <option value="">Any Available</option>
                <option value="h1">Men's House A</option>
                <option value="h2">Men's House B</option>
                <option value="h3">Women's House</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
              <select className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <option value="normal">Normal</option>
                <option value="low">Low</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Target Move-in Date</label>
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
              placeholder="Referral source, special requirements, etc."
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
            Add to Waitlist
          </button>
        </div>
      </div>
    </div>
  );
}

export default function WaitlistPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterPriority, setFilterPriority] = useState<string>("");

  // Filter entries
  const filteredEntries = mockWaitlist.filter((entry) => {
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      if (
        !entry.resident_first_name.toLowerCase().includes(search) &&
        !entry.resident_last_name.toLowerCase().includes(search)
      ) {
        return false;
      }
    }
    if (filterStatus && entry.status !== filterStatus) return false;
    if (filterPriority && entry.priority !== filterPriority) return false;
    return true;
  });

  // Stats
  const urgentCount = mockWaitlist.filter((e) => e.priority === "urgent").length;
  const highCount = mockWaitlist.filter((e) => e.priority === "high").length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Waitlist</h1>
          <p className="text-slate-600 mt-1">Manage prospective residents waiting for placement</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
        >
          <Plus className="h-5 w-5" />
          Add to Waitlist
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <ClipboardList className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{mockWaitlist.length}</p>
              <p className="text-sm text-slate-500">Total on List</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{urgentCount}</p>
              <p className="text-sm text-slate-500">Urgent Priority</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded-lg">
              <ArrowUp className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600">{highCount}</p>
              <p className="text-sm text-slate-500">High Priority</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <Check className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                {mockWaitlist.filter((e) => e.status === "qualified" || e.status === "accepted").length}
              </p>
              <p className="text-sm text-slate-500">Ready to Place</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All Statuses</option>
          {Object.entries(statusConfig).map(([key, config]) => (
            <option key={key} value={key}>
              {config.label}
            </option>
          ))}
        </select>
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="normal">Normal</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Waitlist Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredEntries.map((entry) => (
          <WaitlistCard key={entry.id} entry={entry} />
        ))}
      </div>

      {filteredEntries.length === 0 && (
        <div className="text-center py-12">
          <ClipboardList className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900">No entries found</h3>
          <p className="text-slate-500 mt-1">
            {searchQuery || filterStatus || filterPriority
              ? "Try adjusting your filters"
              : "Add someone to the waitlist to get started"}
          </p>
        </div>
      )}

      <AddToWaitlistModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />
    </div>
  );
}

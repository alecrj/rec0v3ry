"use client";

import { useState } from "react";
import {
  ClipboardList,
  Plus,
  Search,
  User,
  Home,
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
import { trpc } from "@/lib/trpc";
import {
  PageContainer,
  PageHeader,
  StatCard,
  StatCardGrid,
  Card,
  CardContent,
  Button,
  Badge,
  EmptyState,
  ErrorState,
  useToast,
} from "@/components/ui";
import { SkeletonStatCard } from "@/components/ui";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface WaitlistEntry {
  id: string;
  resident_id: string;
  house_id: string | null;
  status: string;
  priority: string;
  requested_move_in_date: string | null;
  added_at: Date;
  notes: string | null;
  resident_first_name: string;
  resident_last_name: string;
  house_name: string | null;
  phone?: string;
  email?: string;
}

const statusBadge: Record<string, { variant: "default" | "info" | "success" | "warning" | "error"; label: string }> = {
  new: { variant: "default", label: "New" },
  contacted: { variant: "info", label: "Contacted" },
  qualified: { variant: "success", label: "Qualified" },
  touring: { variant: "info", label: "Touring" },
  applied: { variant: "warning", label: "Applied" },
  accepted: { variant: "success", label: "Accepted" },
  deposit_pending: { variant: "warning", label: "Deposit Pending" },
  converted: { variant: "success", label: "Converted" },
  lost: { variant: "error", label: "Lost" },
};

const priorityConfig: Record<string, { color: string; label: string; direction: "up" | "down" }> = {
  urgent: { color: "text-red-400", label: "Urgent", direction: "up" },
  high: { color: "text-amber-400", label: "High", direction: "up" },
  normal: { color: "text-zinc-500", label: "Normal", direction: "down" },
  low: { color: "text-zinc-500", label: "Low", direction: "down" },
};

function WaitlistCard({ entry }: { entry: WaitlistEntry }) {
  const [showMenu, setShowMenu] = useState(false);
  const status = statusBadge[entry.status] ?? statusBadge.new;
  const priority = priorityConfig[entry.priority] ?? priorityConfig.normal;
  const daysOnList = Math.floor((Date.now() - new Date(entry.added_at).getTime()) / 86400000);
  const PriorityIcon = priority.direction === "up" ? ArrowUp : ArrowDown;

  return (
    <Card hover className="h-full">
      <CardContent>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-zinc-800 to-zinc-700 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-semibold text-zinc-400">
                {entry.resident_first_name[0]}{entry.resident_last_name[0]}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-zinc-100">
                  {entry.resident_first_name} {entry.resident_last_name}
                </h3>
                <Badge variant={status.variant} dot>{status.label}</Badge>
              </div>
              <div className="flex items-center gap-3 mt-1 text-sm text-zinc-500">
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
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className={cn("flex items-center gap-1", priority.color)}>
              <PriorityIcon className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">{priority.label}</span>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <MoreVertical className="h-4 w-4 text-zinc-500" />
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-8 w-48 bg-zinc-900 rounded-xl shadow-lg border border-zinc-800 py-1 z-20">
                    <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800/40">
                      <User className="h-4 w-4" /> View Profile
                    </button>
                    <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800/40">
                      <Check className="h-4 w-4" /> Update Status
                    </button>
                    <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-green-400 hover:bg-green-500/10">
                      <Home className="h-4 w-4" /> Assign Bed
                    </button>
                    <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10">
                      <X className="h-4 w-4" /> Remove
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-zinc-800/50">
          <div>
            <p className="text-xs text-zinc-500">Preferred House</p>
            <p className="text-sm font-medium text-zinc-100 mt-0.5">{entry.house_name || "Any"}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Target Move-in</p>
            <p className="text-sm font-medium text-zinc-100 mt-0.5">
              {entry.requested_move_in_date
                ? new Date(entry.requested_move_in_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                : "Flexible"}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Days on List</p>
            <p className="text-sm font-medium text-zinc-100 mt-0.5 flex items-center gap-1">
              <Clock className="h-3 w-3 text-zinc-500" />
              {daysOnList}
            </p>
          </div>
        </div>

        {entry.notes && (
          <div className="mt-3 p-3 bg-zinc-800/40 rounded-lg">
            <p className="text-xs text-zinc-500 mb-0.5">Notes</p>
            <p className="text-sm text-zinc-300">{entry.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AddToWaitlistModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [residentId, setResidentId] = useState("");
  const [wlHouseId, setWlHouseId] = useState("");
  const [priority, setPriority] = useState<"low" | "normal" | "high" | "urgent">("normal");
  const [moveInDate, setMoveInDate] = useState("");
  const [notes, setNotes] = useState("");

  const { data: residents } = trpc.resident.list.useQuery(
    { status: "all", limit: 100 },
    { enabled: isOpen }
  );
  const { data: houseList } = trpc.property.listAllHouses.useQuery(undefined, {
    enabled: isOpen,
  });

  const addMutation = trpc.occupancy.addToWaitlist.useMutation({
    onSuccess: () => {
      toast("success", "Added to waitlist");
      utils.occupancy.listWaitlist.invalidate();
      onClose();
      setResidentId("");
      setWlHouseId("");
      setPriority("normal");
      setMoveInDate("");
      setNotes("");
    },
    onError: (err) => toast("error", "Failed to add to waitlist", err.message),
  });

  if (!isOpen) return null;

  const inputClass = "w-full h-10 px-3 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-zinc-900 rounded-2xl shadow-xl w-full max-w-lg mx-4 border border-zinc-800">
        <div className="p-6 border-b border-zinc-800">
          <h2 className="text-xl font-semibold text-zinc-100">Add to Waitlist</h2>
          <p className="text-sm text-zinc-500 mt-1">Select an existing resident to add to the waitlist</p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addMutation.mutate({
              residentId,
              houseId: wlHouseId || undefined,
              priority,
              requestedMoveInDate: moveInDate || undefined,
              notes: notes || undefined,
            });
          }}
          className="p-6 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              Resident <span className="text-red-400">*</span>
            </label>
            <select
              required
              value={residentId}
              onChange={(e) => setResidentId(e.target.value)}
              className={inputClass}
            >
              <option value="">Select a resident</option>
              {(residents?.items ?? []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.first_name} {r.last_name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Preferred House</label>
              <select
                value={wlHouseId}
                onChange={(e) => setWlHouseId(e.target.value)}
                className={inputClass}
              >
                <option value="">Any Available</option>
                {(houseList ?? []).map((h: { id: string; name: string }) => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as typeof priority)}
                className={inputClass}
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Target Move-in Date</label>
            <input
              type="date"
              value={moveInDate}
              onChange={(e) => setMoveInDate(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Notes</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-y"
              placeholder="Referral source, special requirements, etc."
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={addMutation.isPending}>
              {addMutation.isPending ? "Adding..." : "Add to Waitlist"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function WaitlistPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");

  const { data: waitlist, isLoading, error } = trpc.occupancy.listWaitlist.useQuery();

  const filteredEntries = (waitlist || []).filter((entry) => {
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      if (!entry.resident_first_name.toLowerCase().includes(search) && !entry.resident_last_name.toLowerCase().includes(search)) return false;
    }
    if (filterStatus && entry.status !== filterStatus) return false;
    if (filterPriority && entry.priority !== filterPriority) return false;
    return true;
  });

  const totalCount = waitlist?.length ?? 0;
  const urgentCount = waitlist?.filter((e) => e.priority === "urgent").length ?? 0;
  const highCount = waitlist?.filter((e) => e.priority === "high").length ?? 0;
  const readyCount = waitlist?.filter((e) => e.status === "qualified" || e.status === "accepted").length ?? 0;

  if (error) {
    return (
      <PageContainer>
        <Card><CardContent><ErrorState title="Failed to load waitlist" description={error.message} /></CardContent></Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Waitlist"
        description="Manage prospective residents waiting for placement"
        actions={
          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setShowAddModal(true)}>
            Add to Waitlist
          </Button>
        }
      />

      {/* Stats */}
      <StatCardGrid columns={4}>
        <StatCard title="Total on List" value={isLoading ? "—" : String(totalCount)} icon={<ClipboardList className="h-5 w-5" />} variant="info" loading={isLoading} />
        <StatCard title="Urgent Priority" value={isLoading ? "—" : String(urgentCount)} icon={<AlertCircle className="h-5 w-5" />} variant={urgentCount > 0 ? "error" : "default"} loading={isLoading} />
        <StatCard title="High Priority" value={isLoading ? "—" : String(highCount)} icon={<ArrowUp className="h-5 w-5" />} variant={highCount > 0 ? "warning" : "default"} loading={isLoading} />
        <StatCard title="Ready to Place" value={isLoading ? "—" : String(readyCount)} icon={<Check className="h-5 w-5" />} variant="success" loading={isLoading} />
      </StatCardGrid>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex-1 relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="h-10 px-4 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none"
        >
          <option value="">All Statuses</option>
          {Object.entries(statusBadge).map(([key, config]) => (
            <option key={key} value={key}>{config.label}</option>
          ))}
        </select>
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="h-10 px-4 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none"
        >
          <option value="">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="normal">Normal</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SkeletonStatCard />
          <SkeletonStatCard />
        </div>
      )}

      {/* Grid */}
      {!isLoading && filteredEntries.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredEntries.map((entry) => (
            <WaitlistCard key={entry.id} entry={entry as WaitlistEntry} />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && filteredEntries.length === 0 && (
        <Card>
          <CardContent>
            <EmptyState
              iconType="inbox"
              title="No entries found"
              description={searchQuery || filterStatus || filterPriority ? "Try adjusting your filters." : "Add someone to get started."}
              action={
                searchQuery || filterStatus || filterPriority
                  ? { label: "Clear filters", onClick: () => { setSearchQuery(""); setFilterStatus(""); setFilterPriority(""); } }
                  : { label: "Add to Waitlist", onClick: () => setShowAddModal(true) }
              }
            />
          </CardContent>
        </Card>
      )}

      <AddToWaitlistModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />
    </PageContainer>
  );
}

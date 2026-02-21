"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import {
  Wrench,
  Plus,
  Home,
  Clock,
  AlertTriangle,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  PageContainer,
  PageHeader,
  StatCard,
  StatCardGrid,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  DataTable,
  EmptyState,
  ErrorState,
  SkeletonTable,
  useToast,
} from "@/components/ui";
import type { Column } from "@/components/ui";

export const dynamic = "force-dynamic";

const priorityBadge: Record<string, { variant: "info" | "warning" | "error" | "default"; label: string }> = {
  low: { variant: "default", label: "Low" },
  medium: { variant: "warning", label: "Medium" },
  high: { variant: "warning", label: "High" },
  urgent: { variant: "error", label: "Urgent" },
};

const statusBadge: Record<string, { variant: "info" | "success" | "warning" | "error" | "default"; label: string }> = {
  open: { variant: "info", label: "Open" },
  in_progress: { variant: "warning", label: "In Progress" },
  completed: { variant: "success", label: "Completed" },
  cancelled: { variant: "default", label: "Cancelled" },
};

type RequestRow = {
  id: string;
  title: string;
  description: string;
  location: string | null;
  priority: string;
  status: string;
  house_name: string;
  created_at: string | Date;
  completed_at: string | Date | null;
  [key: string]: unknown;
};

export default function MaintenancePage() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [requestForm, setRequestForm] = useState({
    houseId: "",
    title: "",
    description: "",
    location: "",
    priority: "medium",
  });

  const { data: userData } = trpc.user.getCurrentUser.useQuery(undefined, { retry: false });
  const orgId = userData?.org_id;

  const { data: propertiesData } = trpc.property.list.useQuery();
  const { data: housesForProp } = trpc.property.listHouses.useQuery(
    { propertyId: selectedPropertyId },
    { enabled: !!selectedPropertyId }
  );

  const createRequest = trpc.maintenance.create.useMutation({
    onSuccess: () => {
      toast("success", "Maintenance request created");
      utils.maintenance.list.invalidate();
      utils.maintenance.getStats.invalidate();
      setRequestForm({ houseId: "", title: "", description: "", location: "", priority: "medium" });
      setSelectedPropertyId("");
      setShowCreateModal(false);
    },
    onError: (err) => toast("error", err.message),
  });

  const { data: requests, isLoading, error } = trpc.maintenance.list.useQuery(
    { orgId: orgId!, limit: 100 },
    { enabled: !!orgId }
  );

  const { data: stats } = trpc.maintenance.getStats.useQuery(
    { orgId: orgId! },
    { enabled: !!orgId }
  );

  const statsLoading = !stats && !!orgId;
  const allRequests = (requests ?? []) as RequestRow[];
  const filteredRequests = allRequests.filter((r) => {
    if (selectedStatus !== "all" && r.status !== selectedStatus) return false;
    if (selectedPriority !== "all" && r.priority !== selectedPriority) return false;
    return true;
  });

  const columns: Column<RequestRow>[] = [
    {
      key: "title",
      header: "Request",
      sortable: true,
      render: (_val, row) => (
        <div>
          <Link href={`/operations/maintenance/${row.id}`} className="text-sm font-medium text-indigo-400 hover:text-indigo-300">
            {row.title}
          </Link>
          {row.location && <p className="text-xs text-zinc-500 mt-0.5">{row.location}</p>}
        </div>
      ),
    },
    {
      key: "house_name",
      header: "House",
      render: (_val, row) => (
        <div className="flex items-center gap-1.5">
          <Home className="h-3.5 w-3.5 text-zinc-500" />
          <span className="text-sm text-zinc-400">{row.house_name}</span>
        </div>
      ),
    },
    {
      key: "priority",
      header: "Priority",
      render: (_val, row) => {
        const config = priorityBadge[row.priority] ?? { variant: "default" as const, label: row.priority };
        return <Badge variant={config.variant} dot>{config.label}</Badge>;
      },
    },
    {
      key: "status",
      header: "Status",
      render: (_val, row) => {
        const config = statusBadge[row.status] ?? { variant: "default" as const, label: row.status };
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      key: "created_at",
      header: "Created",
      sortable: true,
      render: (_val, row) => (
        <span className="text-sm text-zinc-400">
          {new Date(row.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
      ),
    },
  ];

  if (error) {
    return (
      <PageContainer>
        <Card><CardContent><ErrorState title="Failed to load maintenance requests" description={error.message} /></CardContent></Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Maintenance Requests"
        description="Track and manage property maintenance"
        actions={
          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setShowCreateModal(true)}>
            New Request
          </Button>
        }
      />

      <StatCardGrid columns={4}>
        <StatCard
          title="Total Requests"
          value={statsLoading ? "—" : String(stats?.total ?? allRequests.length)}
          icon={<Wrench className="h-5 w-5" />}
          loading={statsLoading}
        />
        <StatCard
          title="Open"
          value={statsLoading ? "—" : String(stats?.open ?? 0)}
          variant="warning"
          icon={<Clock className="h-5 w-5" />}
          loading={statsLoading}
        />
        <StatCard
          title="Completed"
          value={statsLoading ? "—" : String(stats?.completed ?? 0)}
          variant="success"
          icon={<CheckCircle className="h-5 w-5" />}
          loading={statsLoading}
        />
        <StatCard
          title="Urgent"
          value={statsLoading ? "—" : String(stats?.urgent ?? 0)}
          variant="error"
          icon={<AlertTriangle className="h-5 w-5" />}
          loading={statsLoading}
        />
      </StatCardGrid>

      {/* Filters */}
      <Card>
        <CardContent>
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-sm font-medium text-zinc-300">Filter:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="h-10 px-3 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="h-10 px-3 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="all">All Priority</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Requests</CardTitle>
        </CardHeader>
        {isLoading ? (
          <CardContent className="pt-0"><SkeletonTable rows={6} columns={5} /></CardContent>
        ) : filteredRequests.length === 0 ? (
          <CardContent className="pt-0">
            <EmptyState
              iconType="inbox"
              title="No maintenance requests"
              description="Create a new request to track maintenance work."
              action={{ label: "New Request", onClick: () => setShowCreateModal(true) }}
            />
          </CardContent>
        ) : (
          <DataTable
            data={filteredRequests}
            columns={columns}
            loading={isLoading}
            getRowId={(row) => row.id}
            className="border-0 rounded-none"
            rowActions={(row) => (
              <Link href={`/operations/maintenance/${row.id}`}>
                <Button variant="ghost" size="sm" className="text-indigo-400">View</Button>
              </Link>
            )}
          />
        )}
      </Card>

      {/* Create Request Modal */}
      {showCreateModal && orgId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <div className="relative bg-zinc-900 rounded-xl shadow-2xl w-full max-w-lg mx-4 border border-zinc-800">
            <div className="p-6 border-b border-zinc-800">
              <h2 className="text-xl font-bold text-zinc-100">New Maintenance Request</h2>
            </div>
            <form
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                createRequest.mutate({
                  orgId,
                  houseId: requestForm.houseId,
                  title: requestForm.title,
                  description: requestForm.description,
                  location: requestForm.location || undefined,
                  priority: requestForm.priority as "low" | "medium" | "high" | "urgent",
                });
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Property</label>
                <select className="w-full h-10 px-3 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40" value={selectedPropertyId} onChange={(e) => { setSelectedPropertyId(e.target.value); setRequestForm({ ...requestForm, houseId: "" }); }}>
                  <option value="">Select property...</option>
                  {(propertiesData ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">House <span className="text-red-400">*</span></label>
                <select className="w-full h-10 px-3 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40" required value={requestForm.houseId} onChange={(e) => setRequestForm({ ...requestForm, houseId: e.target.value })} disabled={!selectedPropertyId}>
                  <option value="">Select house...</option>
                  {(housesForProp ?? []).map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Title <span className="text-red-400">*</span></label>
                <input type="text" className="w-full h-10 px-3 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40" placeholder="e.g., Leaking faucet in kitchen" required value={requestForm.title} onChange={(e) => setRequestForm({ ...requestForm, title: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Description <span className="text-red-400">*</span></label>
                <textarea className="w-full px-3 py-2 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 min-h-[80px]" required placeholder="Describe the issue..." value={requestForm.description} onChange={(e) => setRequestForm({ ...requestForm, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">Location</label>
                  <input type="text" className="w-full h-10 px-3 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40" placeholder="Kitchen, Room 3..." value={requestForm.location} onChange={(e) => setRequestForm({ ...requestForm, location: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">Priority</label>
                  <select className="w-full h-10 px-3 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40" value={requestForm.priority} onChange={(e) => setRequestForm({ ...requestForm, priority: e.target.value })}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={createRequest.isPending}>
                  {createRequest.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</> : "Create Request"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

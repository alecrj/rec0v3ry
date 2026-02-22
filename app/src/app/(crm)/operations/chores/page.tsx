"use client";

import { useState, FormEvent } from "react";
import {
  ListTodo,
  Plus,
  Calendar,
  CheckCircle,
  Clock,
  RefreshCw,
  User,
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

type ChoreStatus = "assigned" | "in_progress" | "completed" | "verified" | "failed" | "skipped";

const statusBadge: Record<ChoreStatus, { variant: "info" | "warning" | "success" | "error" | "default"; label: string }> = {
  assigned: { variant: "info", label: "Assigned" },
  in_progress: { variant: "warning", label: "In Progress" },
  completed: { variant: "success", label: "Completed" },
  verified: { variant: "success", label: "Verified" },
  failed: { variant: "error", label: "Failed" },
  skipped: { variant: "default", label: "Skipped" },
};

type AssignmentRow = {
  id: string;
  chore_title: string;
  chore_area: string | null;
  resident_first_name: string;
  resident_last_name: string;
  due_date: string | null;
  status: string;
  [key: string]: unknown;
};

export default function ChoresPage() {
  const { toast } = useToast();
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: userData } = trpc.user.getCurrentUser.useQuery(undefined, { retry: false });
  const orgId = userData?.org_id;

  const { data: propertiesData } = trpc.property.list.useQuery();
  const [choreForm, setChoreForm] = useState({ houseId: "", title: "", area: "", frequency: "daily" });
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const { data: housesForProp } = trpc.property.listHouses.useQuery(
    { propertyId: selectedPropertyId },
    { enabled: !!selectedPropertyId }
  );

  const utils = trpc.useUtils();
  const createChore = trpc.chore.create.useMutation({
    onSuccess: () => {
      toast("success", "Chore created");
      utils.chore.listAssignments.invalidate();
      utils.chore.getStats.invalidate();
      setChoreForm({ houseId: "", title: "", area: "", frequency: "daily" });
      setShowCreateModal(false);
    },
    onError: (err) => toast("error", err.message),
  });

  const updateAssignment = trpc.chore.updateAssignment.useMutation({
    onSuccess: () => {
      toast("success", "Chore updated");
      utils.chore.listAssignments.invalidate();
      utils.chore.getStats.invalidate();
    },
    onError: (error) => toast("error", "Failed to update chore", error.message),
  });
  const verifyAssignment = trpc.chore.verifyAssignment.useMutation({
    onSuccess: () => {
      toast("success", "Chore verified");
      utils.chore.listAssignments.invalidate();
      utils.chore.getStats.invalidate();
    },
    onError: (error) => toast("error", "Failed to verify chore", error.message),
  });

  const { data: assignments, isLoading, error } = trpc.chore.listAssignments.useQuery(
    { orgId: orgId!, limit: 100 },
    { enabled: !!orgId }
  );

  const { data: stats } = trpc.chore.getStats.useQuery(
    { orgId: orgId! },
    { enabled: !!orgId }
  );

  const completionRate = stats?.completionRate ?? 0;
  const statsLoading = !stats && !!orgId;

  const filteredAssignments = ((assignments ?? []) as AssignmentRow[]).filter((a) => {
    if (selectedStatus !== "all" && a.status !== selectedStatus) return false;
    return true;
  });

  const columns: Column<AssignmentRow>[] = [
    {
      key: "chore_title",
      header: "Chore",
      sortable: true,
      render: (_val, row) => (
        <span className="text-sm font-medium text-zinc-800">{row.chore_title}</span>
      ),
    },
    {
      key: "chore_area",
      header: "Area",
      render: (_val, row) => (
        <span className="text-sm text-zinc-400">{row.chore_area ?? "—"}</span>
      ),
    },
    {
      key: "resident_first_name",
      header: "Resident",
      render: (_val, row) => (
        <div className="flex items-center gap-2">
          <User className="h-3.5 w-3.5 text-zinc-500" />
          <span className="text-sm text-zinc-800">
            {row.resident_first_name} {row.resident_last_name}
          </span>
        </div>
      ),
    },
    {
      key: "due_date",
      header: "Due",
      sortable: true,
      render: (_val, row) => (
        <span className="text-sm text-zinc-400">
          {row.due_date
            ? new Date(row.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
            : "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (_val, row) => {
        const config = statusBadge[row.status as ChoreStatus] ?? { variant: "default" as const, label: row.status };
        return <Badge variant={config.variant} dot>{config.label}</Badge>;
      },
    },
  ];

  if (error) {
    return (
      <PageContainer>
        <Card><CardContent><ErrorState title="Failed to load chores" description={error.message} /></CardContent></Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Chore Management"
        description="Manage chore assignments and track completion"
        actions={
          <div className="flex gap-3">
            <Button variant="secondary" icon={<RefreshCw className="h-4 w-4" />}>
              Generate Rotation
            </Button>
            <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setShowCreateModal(true)}>
              New Chore
            </Button>
          </div>
        }
      />

      <StatCardGrid columns={4}>
        <StatCard
          title="Total Today"
          value={statsLoading ? "—" : String(stats?.total ?? 0)}
          icon={<ListTodo className="h-5 w-5" />}
          loading={statsLoading}
        />
        <StatCard
          title="Completed"
          value={statsLoading ? "—" : String(((stats as any)?.completed ?? 0) + ((stats as any)?.verified ?? 0))}
          variant="success"
          icon={<CheckCircle className="h-5 w-5" />}
          loading={statsLoading}
        />
        <StatCard
          title="Pending"
          value={statsLoading ? "—" : String(((stats as any)?.assigned ?? 0) + ((stats as any)?.in_progress ?? 0))}
          variant="warning"
          icon={<Clock className="h-5 w-5" />}
          loading={statsLoading}
        />
        <StatCard
          title="Completion Rate"
          value={statsLoading ? "—" : `${completionRate}%`}
          variant={completionRate >= 80 ? "success" : "warning"}
          icon={<CheckCircle className="h-5 w-5" />}
          loading={statsLoading}
        />
      </StatCardGrid>

      {/* Filters */}
      <Card>
        <CardContent>
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-sm font-medium text-zinc-600">Filter:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="h-10 px-3 text-sm border border-zinc-200 rounded-lg bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="verified">Verified</option>
              <option value="failed">Failed</option>
              <option value="skipped">Skipped</option>
            </select>
            <div className="flex items-center gap-2 ml-auto text-sm text-zinc-500">
              <Calendar className="h-4 w-4" />
              <span>
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assignments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s Assignments</CardTitle>
        </CardHeader>
        {isLoading ? (
          <CardContent className="pt-0"><SkeletonTable rows={6} columns={5} /></CardContent>
        ) : filteredAssignments.length === 0 ? (
          <CardContent className="pt-0">
            <EmptyState
              iconType="inbox"
              title="No chore assignments found"
              description="Create chores or generate a rotation to get started."
            />
          </CardContent>
        ) : (
          <DataTable
            data={filteredAssignments}
            columns={columns}
            loading={isLoading}
            getRowId={(row) => row.id}
            className="border-0 rounded-none"
            rowActions={(row) => (
              <>
                {row.status === "completed" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-indigo-400"
                    onClick={() => verifyAssignment.mutate({ assignmentId: row.id, verified: true })}
                    disabled={verifyAssignment.isPending}
                  >
                    Verify
                  </Button>
                )}
                {(row.status === "assigned" || row.status === "in_progress") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-green-400"
                    onClick={() => updateAssignment.mutate({ assignmentId: row.id, status: "completed" })}
                    disabled={updateAssignment.isPending}
                  >
                    Mark Done
                  </Button>
                )}
                {row.status === "failed" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-amber-400"
                    onClick={() => updateAssignment.mutate({ assignmentId: row.id, status: "assigned" })}
                    disabled={updateAssignment.isPending}
                  >
                    Reassign
                  </Button>
                )}
              </>
            )}
          />
        )}
      </Card>

      {/* Create Chore Modal */}
      {showCreateModal && orgId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 border border-zinc-200">
            <div className="p-6 border-b border-zinc-200">
              <h2 className="text-xl font-bold text-zinc-800">New Chore</h2>
            </div>
            <form
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                createChore.mutate({
                  orgId,
                  houseId: choreForm.houseId,
                  title: choreForm.title,
                  area: choreForm.area || undefined,
                  frequency: choreForm.frequency as "daily" | "weekly" | "biweekly" | "monthly",
                });
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-zinc-600 mb-1.5">Property</label>
                <select className="w-full h-10 px-3 text-sm border border-zinc-200 rounded-lg bg-zinc-100" value={selectedPropertyId} onChange={(e) => { setSelectedPropertyId(e.target.value); setChoreForm({ ...choreForm, houseId: "" }); }}>
                  <option value="">Select property...</option>
                  {(propertiesData ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-600 mb-1.5">House <span className="text-red-400">*</span></label>
                <select className="w-full h-10 px-3 text-sm border border-zinc-200 rounded-lg bg-zinc-100" required value={choreForm.houseId} onChange={(e) => setChoreForm({ ...choreForm, houseId: e.target.value })} disabled={!selectedPropertyId}>
                  <option value="">Select house...</option>
                  {(housesForProp ?? []).map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-600 mb-1.5">Title <span className="text-red-400">*</span></label>
                <input type="text" className="w-full h-10 px-3 text-sm border border-zinc-200 rounded-lg bg-zinc-100" placeholder="e.g., Clean kitchen" required value={choreForm.title} onChange={(e) => setChoreForm({ ...choreForm, title: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-600 mb-1.5">Area</label>
                  <input type="text" className="w-full h-10 px-3 text-sm border border-zinc-200 rounded-lg bg-zinc-100" placeholder="Kitchen, Bathroom..." value={choreForm.area} onChange={(e) => setChoreForm({ ...choreForm, area: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-600 mb-1.5">Frequency</label>
                  <select className="w-full h-10 px-3 text-sm border border-zinc-200 rounded-lg bg-zinc-100" value={choreForm.frequency} onChange={(e) => setChoreForm({ ...choreForm, frequency: e.target.value })}>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Biweekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={createChore.isPending}>
                  {createChore.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</> : "Create Chore"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

"use client";

import { useState } from "react";
import {
  BadgeCheck,
  Plus,
  Clock,
  MapPin,
  User,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Calendar,
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
  SkeletonCard,
  useToast,
} from "@/components/ui";
import type { Column } from "@/components/ui";

export const dynamic = "force-dynamic";

type PassStatus = "requested" | "approved" | "denied" | "active" | "completed" | "violated" | "cancelled";
type PassType = "day_pass" | "overnight" | "weekend" | "extended" | "medical" | "work" | "family_visit";

const statusConfig: Record<PassStatus, { variant: "info" | "warning" | "success" | "error" | "default"; label: string }> = {
  requested: { variant: "warning", label: "Pending" },
  approved: { variant: "info", label: "Approved" },
  denied: { variant: "error", label: "Denied" },
  active: { variant: "success", label: "Active" },
  completed: { variant: "default", label: "Completed" },
  violated: { variant: "error", label: "Violated" },
  cancelled: { variant: "default", label: "Cancelled" },
};

const typeConfig: Record<PassType, { variant: "info" | "warning" | "success" | "error" | "default"; label: string }> = {
  day_pass: { variant: "info", label: "Day Pass" },
  overnight: { variant: "default", label: "Overnight" },
  weekend: { variant: "info", label: "Weekend" },
  extended: { variant: "warning", label: "Extended" },
  medical: { variant: "success", label: "Medical" },
  work: { variant: "warning", label: "Work" },
  family_visit: { variant: "default", label: "Family" },
};

type PassRow = {
  id: string;
  resident_first_name: string;
  resident_last_name: string;
  pass_type: string;
  status: string;
  start_time: string | Date;
  end_time: string | Date;
  destination: string | null;
  purpose: string | null;
  was_violated: boolean | null;
  [key: string]: unknown;
};

export default function PassesPage() {
  const { toast } = useToast();
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [denyModal, setDenyModal] = useState<{ passId: string; name: string } | null>(null);
  const [denyReason, setDenyReason] = useState("");

  const { data: userData } = trpc.user.getCurrentUser.useQuery(undefined, { retry: false });
  const orgId = userData?.org_id;

  const utils = trpc.useUtils();
  const approvePass = trpc.pass.approve.useMutation({
    onSuccess: () => {
      toast("success", "Pass approved");
      utils.pass.list.invalidate();
      utils.pass.getStats.invalidate();
    },
    onError: (err) => toast("error", "Failed to approve pass", err.message),
  });
  const denyPass = trpc.pass.deny.useMutation({
    onSuccess: () => {
      toast("success", "Pass denied");
      utils.pass.list.invalidate();
      utils.pass.getStats.invalidate();
    },
    onError: (err) => toast("error", "Failed to deny pass", err.message),
  });
  const completePass = trpc.pass.complete.useMutation({
    onSuccess: () => {
      toast("success", "Resident checked in");
      utils.pass.list.invalidate();
      utils.pass.getStats.invalidate();
    },
    onError: (err) => toast("error", "Failed to check in", err.message),
  });

  const { data: passes, isLoading, error } = trpc.pass.list.useQuery(
    { orgId: orgId!, limit: 100 },
    { enabled: !!orgId }
  );

  const { data: stats } = trpc.pass.getStats.useQuery(
    { orgId: orgId!, },
    { enabled: !!orgId }
  );

  const statsLoading = !stats && !!orgId;
  const statusCounts = stats?.byStatus ?? {};
  const getCount = (status: string) => (statusCounts as Record<string, number>)[status] ?? 0;

  const allPasses = (passes ?? []) as PassRow[];
  const filteredPasses = allPasses.filter((p) => {
    if (selectedStatus !== "all" && p.status !== selectedStatus) return false;
    if (selectedType !== "all" && p.pass_type !== selectedType) return false;
    return true;
  });

  const pendingPasses = filteredPasses.filter((p) => p.status === "requested");
  const activePasses = filteredPasses.filter((p) => p.status === "active");
  const otherPasses = filteredPasses.filter(
    (p) => p.status !== "requested" && p.status !== "active"
  );

  const historyColumns: Column<PassRow>[] = [
    {
      key: "resident_first_name",
      header: "Resident",
      render: (_val, row) => (
        <span className="text-sm font-medium text-zinc-800">
          {row.resident_first_name} {row.resident_last_name}
        </span>
      ),
    },
    {
      key: "pass_type",
      header: "Type",
      render: (_val, row) => {
        const tc = typeConfig[row.pass_type as PassType] ?? { variant: "default" as const, label: row.pass_type };
        return <Badge variant={tc.variant}>{tc.label}</Badge>;
      },
    },
    {
      key: "start_time",
      header: "Dates",
      render: (_val, row) => (
        <span className="text-sm text-zinc-400">
          {new Date(row.start_time).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          {" — "}
          {new Date(row.end_time).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (_val, row) => {
        const sc = statusConfig[row.status as PassStatus] ?? { variant: "default" as const, label: row.status };
        const label = row.status === "completed" && row.was_violated ? "Late Return" : sc.label;
        return <Badge variant={sc.variant} dot>{label}</Badge>;
      },
    },
  ];

  if (error) {
    return (
      <PageContainer>
        <Card><CardContent><ErrorState title="Failed to load passes" description={error.message} /></CardContent></Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Pass Management"
        description="Manage resident pass requests and tracking"
        actions={
          <Button variant="primary" icon={<Plus className="h-4 w-4" />}>
            New Pass Request
          </Button>
        }
      />

      <StatCardGrid columns={4}>
        <StatCard
          title="Pending Requests"
          value={statsLoading ? "—" : String(getCount("requested"))}
          variant="warning"
          icon={<Clock className="h-5 w-5" />}
          loading={statsLoading}
        />
        <StatCard
          title="Currently Out"
          value={statsLoading ? "—" : String(getCount("active"))}
          variant="success"
          icon={<BadgeCheck className="h-5 w-5" />}
          loading={statsLoading}
        />
        <StatCard
          title="Completed"
          value={statsLoading ? "—" : String(getCount("completed"))}
          variant="info"
          icon={<CheckCircle className="h-5 w-5" />}
          loading={statsLoading}
        />
        <StatCard
          title="Violations"
          value={statsLoading ? "—" : String(stats?.totalViolations ?? 0)}
          variant="error"
          icon={<AlertTriangle className="h-5 w-5" />}
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
              <option value="requested">Pending</option>
              <option value="approved">Approved</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="violated">Violated</option>
              <option value="denied">Denied</option>
            </select>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="h-10 px-3 text-sm border border-zinc-200 rounded-lg bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="all">All Types</option>
              <option value="day_pass">Day Pass</option>
              <option value="overnight">Overnight</option>
              <option value="weekend">Weekend</option>
              <option value="medical">Medical</option>
              <option value="work">Work</option>
              <option value="family_visit">Family Visit</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-4"><SkeletonCard /><SkeletonCard /></div>
      ) : (
        <>
          {/* Pending Requests */}
          {pendingPasses.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-400" />
                  <CardTitle>Pending Requests ({pendingPasses.length})</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="divide-y divide-zinc-200/50 -mx-6">
                  {pendingPasses.map((pass) => {
                    const tc = typeConfig[pass.pass_type as PassType] ?? { variant: "default" as const, label: pass.pass_type };
                    return (
                      <div key={pass.id} className="px-6 py-4 hover:bg-zinc-100 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-zinc-100 flex items-center justify-center">
                                <User className="h-4 w-4 text-zinc-500" />
                              </div>
                              <span className="font-medium text-sm text-zinc-800">
                                {pass.resident_first_name} {pass.resident_last_name}
                              </span>
                              <Badge variant={tc.variant}>{tc.label}</Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-zinc-500 ml-11">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5" />
                                <span>
                                  {new Date(pass.start_time).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                  {" — "}
                                  {new Date(pass.end_time).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                </span>
                              </div>
                              {pass.destination && (
                                <div className="flex items-center gap-1.5">
                                  <MapPin className="h-3.5 w-3.5" />
                                  <span>{pass.destination}</span>
                                </div>
                              )}
                            </div>
                            {pass.purpose && (
                              <p className="text-sm text-zinc-500 ml-11">
                                <span className="font-medium text-zinc-400">Purpose:</span> {pass.purpose}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="primary"
                              size="sm"
                              icon={<CheckCircle className="h-3.5 w-3.5" />}
                              onClick={() => approvePass.mutate({ passId: pass.id })}
                              disabled={approvePass.isPending}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              icon={<XCircle className="h-3.5 w-3.5" />}
                              onClick={() => setDenyModal({ passId: pass.id, name: `${pass.resident_first_name} ${pass.resident_last_name}` })}
                              disabled={denyPass.isPending}
                            >
                              Deny
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Active Passes */}
          {activePasses.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <BadgeCheck className="h-5 w-5 text-green-400" />
                  <CardTitle>Currently Out ({activePasses.length})</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="divide-y divide-zinc-200/50 -mx-6">
                  {activePasses.map((pass) => {
                    const tc = typeConfig[pass.pass_type as PassType] ?? { variant: "default" as const, label: pass.pass_type };
                    return (
                      <div key={pass.id} className="px-6 py-4 hover:bg-zinc-100 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                                <User className="h-4 w-4 text-green-400" />
                              </div>
                              <span className="font-medium text-sm text-zinc-800">
                                {pass.resident_first_name} {pass.resident_last_name}
                              </span>
                              <Badge variant={tc.variant}>{tc.label}</Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-zinc-500 ml-11">
                              {pass.destination && (
                                <div className="flex items-center gap-1.5">
                                  <MapPin className="h-3.5 w-3.5" />
                                  <span>{pass.destination}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5" />
                                <span>Due back: {new Date(pass.end_time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => completePass.mutate({ passId: pass.id })}
                            disabled={completePass.isPending}
                          >
                            Check In
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pass History */}
          <Card>
            <CardHeader>
              <CardTitle>Pass History</CardTitle>
            </CardHeader>
            {otherPasses.length === 0 ? (
              <CardContent className="pt-0">
                <EmptyState
                  iconType="inbox"
                  title="No pass history found"
                  description="Pass records will appear here after completion."
                />
              </CardContent>
            ) : (
              <DataTable
                data={otherPasses}
                columns={historyColumns}
                loading={false}
                getRowId={(row) => row.id}
                className="border-0 rounded-none"
                rowActions={() => (
                  <Button variant="ghost" size="sm" className="text-indigo-400">View Details</Button>
                )}
              />
            )}
          </Card>
        </>
      )}
      {/* Deny Reason Modal */}
      {denyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setDenyModal(null); setDenyReason(""); }} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 border border-zinc-200">
            <div className="p-6 border-b border-zinc-200">
              <h2 className="text-lg font-bold text-zinc-800">Deny Pass Request</h2>
              <p className="text-sm text-zinc-500 mt-1">{denyModal.name}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-600 mb-1.5">
                  Reason for Denial <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={denyReason}
                  onChange={(e) => setDenyReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                  placeholder="Reason for denying this pass request..."
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={() => { setDenyModal(null); setDenyReason(""); }}>Cancel</Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (denyReason.trim()) {
                      denyPass.mutate({ passId: denyModal.passId, denialReason: denyReason.trim() });
                      setDenyModal(null);
                      setDenyReason("");
                    }
                  }}
                  disabled={!denyReason.trim() || denyPass.isPending}
                >
                  {denyPass.isPending ? "Denying..." : "Deny Pass"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

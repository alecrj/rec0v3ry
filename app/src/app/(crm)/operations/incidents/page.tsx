"use client";

import { useState, FormEvent } from "react";
import {
  Plus,
  Calendar,
  User,
  Home,
  AlertTriangle,
  Shield,
  Clock,
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

const severityBadge: Record<string, { variant: "info" | "warning" | "error" | "default"; label: string }> = {
  low: { variant: "info", label: "Low" },
  medium: { variant: "warning", label: "Medium" },
  high: { variant: "error", label: "High" },
  critical: { variant: "error", label: "Critical" },
};

const incidentTypeLabels: Record<string, string> = {
  relapse: "Relapse",
  curfew_violation: "Curfew Violation",
  guest_policy: "Guest Policy",
  contraband: "Contraband",
  violence: "Violence",
  theft: "Theft",
  property_damage: "Property Damage",
  awol: "AWOL",
  other: "Other",
};

type IncidentRow = {
  id: string;
  incident_type: string;
  severity: string;
  resident_first_name: string | null;
  resident_last_name: string | null;
  house_name: string | null;
  occurred_at: string | Date;
  follow_up_required: boolean;
  [key: string]: unknown;
};

export default function IncidentsPage() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [incidentForm, setIncidentForm] = useState({
    incidentType: "other",
    severity: "medium",
    occurredAt: "",
    description: "",
    location: "",
    followUpRequired: false,
  });

  const { data: userData } = trpc.user.getCurrentUser.useQuery(undefined, { retry: false });
  const orgId = userData?.org_id;

  const createIncident = trpc.incident.create.useMutation({
    onSuccess: () => {
      toast("success", "Incident reported");
      utils.incident.list.invalidate();
      utils.incident.getStats.invalidate();
      setIncidentForm({ incidentType: "other", severity: "medium", occurredAt: "", description: "", location: "", followUpRequired: false });
      setShowCreateModal(false);
    },
    onError: (err) => toast("error", err.message),
  });

  const { data: incidents, isLoading, error } = trpc.incident.list.useQuery(
    { orgId: orgId!, limit: 100 },
    { enabled: !!orgId }
  );

  const { data: stats } = trpc.incident.getStats.useQuery(
    { orgId: orgId! },
    { enabled: !!orgId }
  );

  const statsLoading = !stats && !!orgId;
  const allIncidents = (incidents ?? []) as IncidentRow[];
  const filteredIncidents = allIncidents.filter((i) => {
    if (selectedSeverity !== "all" && i.severity !== selectedSeverity) return false;
    if (selectedType !== "all" && i.incident_type !== selectedType) return false;
    return true;
  });

  const columns: Column<IncidentRow>[] = [
    {
      key: "incident_type",
      header: "Type",
      sortable: true,
      render: (_val, row) => (
        <span className="text-sm font-medium text-zinc-800">
          {incidentTypeLabels[row.incident_type] ?? row.incident_type}
        </span>
      ),
    },
    {
      key: "severity",
      header: "Severity",
      render: (_val, row) => {
        const config = severityBadge[row.severity] ?? { variant: "default" as const, label: row.severity };
        return <Badge variant={config.variant} dot>{config.label}</Badge>;
      },
    },
    {
      key: "resident_first_name",
      header: "Resident",
      render: (_val, row) =>
        row.resident_first_name ? (
          <div className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-zinc-500" />
            <span className="text-sm text-zinc-800">
              {row.resident_first_name} {row.resident_last_name}
            </span>
          </div>
        ) : (
          <span className="text-sm text-zinc-500">—</span>
        ),
    },
    {
      key: "house_name",
      header: "House",
      render: (_val, row) => (
        <div className="flex items-center gap-1.5">
          <Home className="h-3.5 w-3.5 text-zinc-500" />
          <span className="text-sm text-zinc-400">{row.house_name ?? "—"}</span>
        </div>
      ),
    },
    {
      key: "occurred_at",
      header: "Date",
      sortable: true,
      render: (_val, row) => (
        <span className="text-sm text-zinc-400">
          {new Date(row.occurred_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
      ),
    },
    {
      key: "follow_up_required",
      header: "Follow-up",
      render: (_val, row) =>
        row.follow_up_required ? (
          <Badge variant="warning">Required</Badge>
        ) : (
          <span className="text-sm text-zinc-500">—</span>
        ),
    },
  ];

  if (error) {
    return (
      <PageContainer>
        <Card><CardContent><ErrorState title="Failed to load incidents" description={error.message} /></CardContent></Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Incident Reports"
        description="Track and manage incidents across all houses"
        actions={
          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setShowCreateModal(true)}>
            Report Incident
          </Button>
        }
      />

      <StatCardGrid columns={4}>
        <StatCard
          title="Total Incidents"
          value={statsLoading ? "—" : String(stats?.total ?? allIncidents.length)}
          icon={<Shield className="h-5 w-5" />}
          loading={statsLoading}
        />
        <StatCard
          title="Critical/High"
          value={statsLoading ? "—" : String((stats?.bySeverity?.critical ?? 0) + (stats?.bySeverity?.high ?? 0))}
          variant="error"
          icon={<AlertTriangle className="h-5 w-5" />}
          loading={statsLoading}
        />
        <StatCard
          title="Pending Follow-up"
          value={statsLoading ? "—" : String(stats?.pendingFollowUps ?? 0)}
          variant="warning"
          icon={<Clock className="h-5 w-5" />}
          loading={statsLoading}
        />
        <StatCard
          title="This Period"
          value={statsLoading ? "—" : String(stats?.total ?? 0)}
          icon={<Calendar className="h-5 w-5" />}
          loading={statsLoading}
        />
      </StatCardGrid>

      {/* Filters */}
      <Card>
        <CardContent>
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-sm font-medium text-zinc-600">Filter:</span>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="h-10 px-3 text-sm border border-zinc-200 rounded-lg bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="h-10 px-3 text-sm border border-zinc-200 rounded-lg bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="all">All Types</option>
              {Object.entries(incidentTypeLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Incidents Table */}
      <Card>
        <CardHeader>
          <CardTitle>Incident Log</CardTitle>
        </CardHeader>
        {isLoading ? (
          <CardContent className="pt-0"><SkeletonTable rows={6} columns={6} /></CardContent>
        ) : filteredIncidents.length === 0 ? (
          <CardContent className="pt-0">
            <EmptyState
              iconType="inbox"
              title="No incidents found"
              description="No incidents match the current filters."
            />
          </CardContent>
        ) : (
          <DataTable
            data={filteredIncidents}
            columns={columns}
            loading={isLoading}
            getRowId={(row) => row.id}
            className="border-0 rounded-none"
            rowActions={() => (
              <Button variant="ghost" size="sm" className="text-indigo-400">View Details</Button>
            )}
          />
        )}
      </Card>
      {/* Create Incident Modal */}
      {showCreateModal && orgId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 border border-zinc-200">
            <div className="p-6 border-b border-zinc-200">
              <h2 className="text-xl font-bold text-zinc-800">Report Incident</h2>
            </div>
            <form
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                createIncident.mutate({
                  orgId,
                  incidentType: incidentForm.incidentType as "relapse" | "curfew_violation" | "guest_policy" | "contraband" | "violence" | "theft" | "property_damage" | "awol" | "other",
                  severity: incidentForm.severity as "low" | "medium" | "high" | "critical",
                  occurredAt: incidentForm.occurredAt,
                  description: incidentForm.description,
                  location: incidentForm.location || undefined,
                  followUpRequired: incidentForm.followUpRequired,
                });
              }}
              className="p-6 space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-600 mb-1.5">Type <span className="text-red-400">*</span></label>
                  <select className="w-full h-10 px-3 text-sm border border-zinc-200 rounded-lg bg-zinc-100" required value={incidentForm.incidentType} onChange={(e) => setIncidentForm({ ...incidentForm, incidentType: e.target.value })}>
                    {Object.entries(incidentTypeLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-600 mb-1.5">Severity <span className="text-red-400">*</span></label>
                  <select className="w-full h-10 px-3 text-sm border border-zinc-200 rounded-lg bg-zinc-100" required value={incidentForm.severity} onChange={(e) => setIncidentForm({ ...incidentForm, severity: e.target.value })}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-600 mb-1.5">Date & Time <span className="text-red-400">*</span></label>
                  <input type="datetime-local" className="w-full h-10 px-3 text-sm border border-zinc-200 rounded-lg bg-zinc-100" required value={incidentForm.occurredAt} onChange={(e) => setIncidentForm({ ...incidentForm, occurredAt: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-600 mb-1.5">Location</label>
                  <input type="text" className="w-full h-10 px-3 text-sm border border-zinc-200 rounded-lg bg-zinc-100" placeholder="e.g., Common Room" value={incidentForm.location} onChange={(e) => setIncidentForm({ ...incidentForm, location: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-600 mb-1.5">Description <span className="text-red-400">*</span></label>
                <textarea className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-zinc-100 min-h-[80px]" required minLength={10} placeholder="Describe what happened (minimum 10 characters)..." value={incidentForm.description} onChange={(e) => setIncidentForm({ ...incidentForm, description: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded border-zinc-200 text-indigo-400 focus:ring-indigo-500" checked={incidentForm.followUpRequired} onChange={(e) => setIncidentForm({ ...incidentForm, followUpRequired: e.target.checked })} />
                <span className="text-sm text-zinc-600">Follow-up required</span>
              </label>
              <div className="pt-2 flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={createIncident.isPending}>
                  {createIncident.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</> : "Report Incident"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

"use client";

import { useState } from "react";
import { AlertTriangle, ShieldAlert } from "lucide-react";
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
  EmptyState,
  ErrorState,
  SkeletonTable,
  useToast,
} from "@/components/ui";

export const dynamic = "force-dynamic";

type EmergencyType = "medical" | "safety" | "legal" | "other";

const emergencyBadge: Record<string, { variant: "error" | "warning" | "info" | "default"; label: string }> = {
  medical: { variant: "error", label: "Medical Emergency" },
  safety: { variant: "warning", label: "Patient Safety" },
  legal: { variant: "info", label: "Legal Requirement" },
  other: { variant: "default", label: "Other" },
};

export default function BreakGlassPage() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [showModal, setShowModal] = useState(false);
  const [reason, setReason] = useState<EmergencyType | "">("");
  const [justification, setJustification] = useState("");
  const [residentId, setResidentId] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);

  const { data: residents } = trpc.resident.list.useQuery({});

  const { data, isLoading, error } = trpc.breakGlass.list.useQuery({
    limit: 25,
  });

  const activateMutation = trpc.breakGlass.activate.useMutation({
    onSuccess: () => {
      toast("warning", "Break-glass activated", "Emergency access has been granted and logged");
      setShowModal(false);
      setReason("");
      setJustification("");
      setResidentId("");
      setAcknowledged(false);
      utils.breakGlass.list.invalidate();
    },
    onError: (err) => {
      toast("error", "Activation failed", err.message);
    },
  });

  const events = data?.items || [];
  const stats = {
    total: events.length,
    pending: events.filter((e) => !e.reviewed_at).length,
    flagged: events.filter((e) => e.is_justified === false).length,
  };

  const handleActivate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!acknowledged) {
      toast("warning", "Acknowledgement required", "You must acknowledge that this action will be logged and reviewed");
      return;
    }
    if (!residentId || !reason || justification.length < 10) {
      toast("error", "Missing fields", "Please fill in all required fields");
      return;
    }
    activateMutation.mutate({
      residentId,
      reason: reason as EmergencyType,
      justification,
    });
  };

  if (error) {
    return (
      <PageContainer>
        <Card><CardContent><ErrorState title="Error loading break-glass events" description={error.message} /></CardContent></Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Break-Glass Access Log"
        description="Emergency access to protected health information"
        actions={
          <Button
            variant="destructive"
            icon={<ShieldAlert className="h-4 w-4" />}
            onClick={() => setShowModal(true)}
          >
            Activate Break-Glass
          </Button>
        }
      />

      {/* Warning Banner */}
      <Card variant="outlined" className="border-red-500/30 bg-red-500/10">
        <CardContent>
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-red-300">
                Critical: Emergency Access Only
              </h3>
              <p className="text-sm text-red-300 mt-1">
                Break-glass access bypasses normal consent controls and should only be used in
                genuine emergencies (medical emergency, patient safety, legal requirement). All
                actions are elevated-logged, time-limited, and subject to mandatory review by the
                compliance officer.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <StatCardGrid columns={3}>
        <StatCard
          title="Total Events"
          value={isLoading ? "—" : String(stats.total)}
          subtitle="All time"
          icon={<ShieldAlert className="h-5 w-5" />}
          loading={isLoading}
        />
        <StatCard
          title="Pending Review"
          value={isLoading ? "—" : String(stats.pending)}
          subtitle="Requires compliance officer review"
          variant="warning"
          icon={<ShieldAlert className="h-5 w-5" />}
          loading={isLoading}
        />
        <StatCard
          title="Flagged Events"
          value={isLoading ? "—" : String(stats.flagged)}
          subtitle="May require investigation"
          variant="error"
          icon={<AlertTriangle className="h-5 w-5" />}
          loading={isLoading}
        />
      </StatCardGrid>

      {/* Events Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Break-Glass Events</CardTitle>
        </CardHeader>
        {isLoading ? (
          <CardContent className="pt-0"><SkeletonTable rows={5} columns={6} /></CardContent>
        ) : events.length === 0 ? (
          <CardContent className="pt-0">
            <EmptyState
              iconType="inbox"
              title="No break-glass events"
              description="Emergency access events will appear here."
            />
          </CardContent>
        ) : (
          <CardContent className="pt-0">
            <div className="overflow-x-auto -mx-6">
              <table className="w-full">
                <thead>
                  <tr className="border-y border-zinc-800/50 bg-zinc-800/50">
                    <th className="text-left py-3 px-6 text-xs font-semibold uppercase tracking-wider text-zinc-500">Date</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">User</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Emergency Type</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Resident</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Review Status</th>
                    <th className="text-left py-3 px-6 text-xs font-semibold uppercase tracking-wider text-zinc-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => {
                    const ec = emergencyBadge[event.emergency_type] ?? emergencyBadge.other;
                    return (
                      <tr key={event.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/50 transition-colors">
                        <td className="py-3 px-6 text-sm text-zinc-400 whitespace-nowrap">
                          {new Date(event.created_at).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-sm font-medium text-zinc-100">
                          {event.user
                            ? `${event.user.first_name} ${event.user.last_name}`
                            : "Unknown"}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={ec.variant}>{ec.label}</Badge>
                        </td>
                        <td className="py-3 px-4 text-sm font-medium text-zinc-100">
                          {event.resident
                            ? `${event.resident.first_name} ${event.resident.last_name}`
                            : "—"}
                        </td>
                        <td className="py-3 px-4">
                          {!event.reviewed_at ? (
                            <Badge variant="warning" dot>Pending Review</Badge>
                          ) : event.is_justified === true ? (
                            <Badge variant="success" dot>Approved</Badge>
                          ) : (
                            <Badge variant="error" dot>Flagged</Badge>
                          )}
                        </td>
                        <td className="py-3 px-6">
                          <Button variant="ghost" size="sm" className="text-indigo-400">View Details</Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Break-Glass Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-zinc-800">
            <div className="p-6 border-b border-zinc-800">
              <h2 className="text-xl font-bold text-zinc-100">Activate Break-Glass Access</h2>
              <p className="text-sm text-zinc-500 mt-1">
                Emergency access to protected health information
              </p>
            </div>

            <form onSubmit={handleActivate} className="p-6 space-y-6">
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <p className="text-sm text-red-300">
                  This action will be logged with elevated sensitivity and reviewed by the
                  compliance officer. Use only in genuine emergencies.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                  Emergency Reason <span className="text-red-400">*</span>
                </label>
                <select
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value as EmergencyType | "")}
                  className="w-full h-12 px-4 text-sm border border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none"
                >
                  <option value="">Select reason</option>
                  <option value="medical">Medical Emergency</option>
                  <option value="legal">Legal Requirement</option>
                  <option value="safety">Patient Safety</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                  Resident <span className="text-red-400">*</span>
                </label>
                <select
                  required
                  value={residentId}
                  onChange={(e) => setResidentId(e.target.value)}
                  className="w-full h-12 px-4 text-sm border border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="">Select resident</option>
                  {(residents?.items ?? []).map((r) => (
                    <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>
                  ))}
                </select>
                <p className="text-xs text-zinc-500 mt-1.5">
                  Select the resident whose records you need emergency access to
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                  Justification <span className="text-red-400">*</span>
                </label>
                <textarea
                  required
                  minLength={10}
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 text-sm border border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                  placeholder="Provide detailed justification for this emergency access (minimum 10 characters)"
                />
                <p className="text-xs text-zinc-500 mt-1.5">
                  {justification.length} / 10 characters minimum
                </p>
              </div>

              <div className="bg-zinc-800/40 border border-zinc-800 rounded-lg p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acknowledged}
                    onChange={(e) => setAcknowledged(e.target.checked)}
                    className="w-4 h-4 text-indigo-400 border-zinc-700 rounded focus:ring-indigo-500 mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium text-zinc-100">
                      I understand this action will be logged and reviewed
                    </p>
                    <p className="text-xs text-zinc-400 mt-1">
                      This emergency access will be recorded in the audit log with elevated
                      sensitivity, time-stamped, and automatically flagged for compliance officer
                      review. Misuse may result in disciplinary action.
                    </p>
                  </div>
                </label>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-zinc-800">
                <Button
                  type="submit"
                  variant="destructive"
                  loading={activateMutation.isPending}
                >
                  {activateMutation.isPending ? "Activating..." : "Confirm & Activate"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

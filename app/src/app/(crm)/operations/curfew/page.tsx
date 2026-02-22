"use client";

import { useState, FormEvent } from "react";
import {
  Clock,
  Settings,
  CheckCircle,
  XCircle,
  AlertTriangle,
  User,
  Calendar,
  ChevronLeft,
  ChevronRight,
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

type CheckInStatus = "on_time" | "late" | "excused" | "pending" | "missed";

const statusBadgeConfig: Record<CheckInStatus, { variant: "success" | "error" | "warning" | "info" | "default"; label: string }> = {
  on_time: { variant: "success", label: "On Time" },
  late: { variant: "error", label: "Late" },
  excused: { variant: "warning", label: "Excused" },
  pending: { variant: "info", label: "Pending" },
  missed: { variant: "error", label: "Missed" },
};

function deriveStatus(checkIn: { was_on_time: boolean | null; was_excused: boolean | null; actual_check_in_time: string | Date | null }): CheckInStatus {
  if (checkIn.actual_check_in_time === null) return "pending";
  if (checkIn.was_excused) return "excused";
  if (checkIn.was_on_time) return "on_time";
  return "late";
}

type CurfewRow = {
  id: string;
  resident_id: string;
  resident_first_name: string;
  resident_last_name: string;
  expected_curfew_time: string | Date | null;
  actual_check_in_time: string | Date | null;
  was_on_time: boolean | null;
  was_excused: boolean | null;
  excuse_reason: string | null;
  derivedStatus: CheckInStatus;
  [key: string]: unknown;
};

export default function CurfewPage() {
  const { toast } = useToast();
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [excuseModal, setExcuseModal] = useState<{ residentId: string; name: string } | null>(null);
  const [excuseReason, setExcuseReason] = useState("");

  const { data: userData } = trpc.user.getCurrentUser.useQuery(undefined, { retry: false });
  const orgId = userData?.org_id;

  const utils = trpc.useUtils();
  const recordCheckIn = trpc.curfew.checkIn.useMutation({
    onSuccess: () => {
      toast("success", "Check-in recorded");
      utils.curfew.listCheckIns.invalidate();
      utils.curfew.getStats.invalidate();
    },
    onError: (err) => toast("error", "Failed to record check-in", err.message),
  });

  const { data: checkIns, isLoading, error } = trpc.curfew.listCheckIns.useQuery(
    { orgId: orgId!, startDate: selectedDate, endDate: selectedDate, limit: 100 },
    { enabled: !!orgId }
  );

  const { data: stats } = trpc.curfew.getStats.useQuery(
    { orgId: orgId!, startDate: selectedDate, endDate: selectedDate },
    { enabled: !!orgId }
  );

  const statsLoading = !stats && !!orgId;
  const complianceRate = stats?.complianceRate ?? 100;
  const isWeekend = [0, 6].includes(new Date(selectedDate!).getDay());

  const allCheckIns: CurfewRow[] = (checkIns ?? []).map((c) => ({
    ...c,
    derivedStatus: deriveStatus(c),
  })) as CurfewRow[];

  const filteredCheckIns = allCheckIns.filter((c) => {
    if (selectedStatus !== "all" && c.derivedStatus !== selectedStatus) return false;
    return true;
  });

  const handleExcuse = () => {
    if (!orgId || !excuseModal || !excuseReason.trim()) return;
    const row = allCheckIns.find((c) => c.resident_id === excuseModal.residentId);
    recordCheckIn.mutate({
      orgId,
      residentId: excuseModal.residentId,
      checkInDate: selectedDate!,
      expectedCurfewTime: row?.expected_curfew_time
        ? new Date(row.expected_curfew_time).toISOString()
        : new Date().toISOString(),
      wasExcused: true,
      excuseReason: excuseReason.trim(),
    });
    setExcuseModal(null);
    setExcuseReason("");
  };

  const columns: Column<CurfewRow>[] = [
    {
      key: "resident_first_name",
      header: "Resident",
      sortable: true,
      render: (_val, row) => (
        <div className="flex items-center gap-2">
          <User className="h-3.5 w-3.5 text-zinc-500" />
          <span className="text-sm font-medium text-zinc-800">
            {row.resident_first_name} {row.resident_last_name}
          </span>
        </div>
      ),
    },
    {
      key: "expected_curfew_time",
      header: "Expected",
      render: (_val, row) => (
        <span className="text-sm text-zinc-400">
          {row.expected_curfew_time
            ? (typeof row.expected_curfew_time === "string"
                ? row.expected_curfew_time
                : new Date(row.expected_curfew_time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }))
            : "—"}
        </span>
      ),
    },
    {
      key: "actual_check_in_time",
      header: "Actual",
      render: (_val, row) => (
        <span className="text-sm text-zinc-400">
          {row.actual_check_in_time
            ? new Date(row.actual_check_in_time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
            : "—"}
        </span>
      ),
    },
    {
      key: "derivedStatus",
      header: "Status",
      render: (_val, row) => {
        const config = statusBadgeConfig[row.derivedStatus];
        return <Badge variant={config.variant} dot>{config.label}</Badge>;
      },
    },
    {
      key: "excuse_reason",
      header: "Notes",
      render: (_val, row) => (
        <span className="text-sm text-zinc-500 truncate max-w-[200px] block">
          {row.excuse_reason ?? "—"}
        </span>
      ),
    },
  ];

  if (error) {
    return (
      <PageContainer>
        <Card><CardContent><ErrorState title="Failed to load curfew data" description={error.message} /></CardContent></Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Curfew Tracking"
        description="Monitor curfew compliance and check-ins"
        actions={
          <Button
            variant="secondary"
            icon={<Settings className="h-4 w-4" />}
            onClick={() => setShowConfigModal(true)}
          >
            Configure Curfews
          </Button>
        }
      />

      <StatCardGrid columns={4}>
        <StatCard
          title="On Time"
          value={statsLoading ? "—" : String(stats?.onTime ?? 0)}
          variant="success"
          icon={<CheckCircle className="h-5 w-5" />}
          loading={statsLoading}
        />
        <StatCard
          title="Late"
          value={statsLoading ? "—" : String(stats?.late ?? 0)}
          variant="error"
          icon={<XCircle className="h-5 w-5" />}
          loading={statsLoading}
        />
        <StatCard
          title="Excused"
          value={statsLoading ? "—" : String(stats?.excused ?? 0)}
          variant="warning"
          icon={<AlertTriangle className="h-5 w-5" />}
          loading={statsLoading}
        />
        <StatCard
          title="Compliance"
          value={statsLoading ? "—" : `${complianceRate}%`}
          variant={complianceRate >= 90 ? "success" : complianceRate >= 70 ? "warning" : "error"}
          icon={<CheckCircle className="h-5 w-5" />}
          loading={statsLoading}
        />
      </StatCardGrid>

      {/* Filters + Date Nav */}
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
              <option value="on_time">On Time</option>
              <option value="late">Late</option>
              <option value="excused">Excused</option>
              <option value="pending">Pending</option>
              <option value="missed">Missed</option>
            </select>
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={() => {
                  const d = new Date(selectedDate!);
                  d.setDate(d.getDate() - 1);
                  setSelectedDate(d.toISOString().split("T")[0]);
                }}
                className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="h-4 w-4 text-zinc-400" />
              </button>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-zinc-500" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="h-10 px-3 text-sm border border-zinc-200 rounded-lg bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              <button
                onClick={() => {
                  const d = new Date(selectedDate!);
                  d.setDate(d.getDate() + 1);
                  setSelectedDate(d.toISOString().split("T")[0]);
                }}
                className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
              >
                <ChevronRight className="h-4 w-4 text-zinc-400" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Check-ins Table */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Check-in Log</CardTitle>
            <p className="text-sm text-zinc-500 mt-1">
              {isWeekend ? "Weekend" : "Weekday"} curfew times apply
            </p>
          </div>
        </CardHeader>
        {isLoading ? (
          <CardContent className="pt-0"><SkeletonTable rows={8} columns={5} /></CardContent>
        ) : filteredCheckIns.length === 0 ? (
          <CardContent className="pt-0">
            <EmptyState
              iconType="inbox"
              title="No check-ins for this date"
              description="Select a different date or check back later."
            />
          </CardContent>
        ) : (
          <DataTable
            data={filteredCheckIns}
            columns={columns}
            loading={isLoading}
            getRowId={(row) => row.id}
            className="border-0 rounded-none"
            rowActions={(row) => (
              <>
                {row.derivedStatus === "pending" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-indigo-400"
                    onClick={() => {
                      if (!orgId) return;
                      recordCheckIn.mutate({
                        orgId,
                        residentId: row.resident_id,
                        checkInDate: selectedDate!,
                        expectedCurfewTime: row.expected_curfew_time
                          ? new Date(row.expected_curfew_time).toISOString()
                          : new Date().toISOString(),
                        actualCheckInTime: new Date().toISOString(),
                      });
                    }}
                    disabled={recordCheckIn.isPending}
                  >
                    Check In
                  </Button>
                )}
                {row.derivedStatus === "late" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-amber-400"
                    onClick={() => {
                      setExcuseModal({
                        residentId: row.resident_id,
                        name: `${row.resident_first_name} ${row.resident_last_name}`,
                      });
                    }}
                    disabled={recordCheckIn.isPending}
                  >
                    Mark Excused
                  </Button>
                )}
              </>
            )}
          />
        )}
      </Card>

      {/* Configure Curfew Modal */}
      {showConfigModal && orgId && (
        <ConfigureCurfewModal orgId={orgId} onClose={() => setShowConfigModal(false)} />
      )}

      {/* Excuse Reason Modal */}
      {excuseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setExcuseModal(null); setExcuseReason(""); }} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 border border-zinc-200">
            <div className="p-6 border-b border-zinc-200">
              <h2 className="text-lg font-bold text-zinc-800">Mark as Excused</h2>
              <p className="text-sm text-zinc-500 mt-1">{excuseModal.name}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-600 mb-1.5">
                  Excuse Reason <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={excuseReason}
                  onChange={(e) => setExcuseReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                  placeholder="Reason for excusing this late check-in..."
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={() => { setExcuseModal(null); setExcuseReason(""); }}>Cancel</Button>
                <Button
                  variant="primary"
                  onClick={handleExcuse}
                  disabled={!excuseReason.trim() || recordCheckIn.isPending}
                >
                  {recordCheckIn.isPending ? "Saving..." : "Mark Excused"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

function ConfigureCurfewModal({ orgId, onClose }: { orgId: string; onClose: () => void }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [selectedHouseId, setSelectedHouseId] = useState("");
  const [weekdayCurfew, setWeekdayCurfew] = useState("22:00");
  const [weekendCurfew, setWeekendCurfew] = useState("23:00");
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  const { data: houses } = trpc.property.listAllHouses.useQuery();

  // Load existing config when house is selected
  const { data: existingConfig } = trpc.curfew.getHouseConfig.useQuery(
    { orgId, houseId: selectedHouseId },
    { enabled: !!selectedHouseId }
  );

  // Pre-fill form when existing config loads
  const [configLoaded, setConfigLoaded] = useState("");
  if (existingConfig && selectedHouseId && configLoaded !== selectedHouseId) {
    setWeekdayCurfew(existingConfig.weekday_curfew?.slice(0, 5) ?? "22:00");
    setWeekendCurfew(existingConfig.weekend_curfew?.slice(0, 5) ?? "23:00");
    setNotes(existingConfig.notes ?? "");
    setConfigLoaded(selectedHouseId);
  }

  const setConfig = trpc.curfew.setHouseConfig.useMutation({
    onSuccess: () => {
      toast("success", "Curfew configuration saved");
      utils.curfew.getHouseConfig.invalidate();
      onClose();
    },
    onError: (err) => toast("error", "Failed to save configuration", err.message),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedHouseId) {
      toast("error", "Please select a house");
      return;
    }
    setConfig.mutate({
      orgId,
      houseId: selectedHouseId,
      weekdayCurfew: weekdayCurfew + ":00",
      weekendCurfew: weekendCurfew + ":00",
      effectiveFrom: effectiveFrom!,
      notes: notes || undefined,
    });
  };

  const inputClass = "w-full h-10 px-3 text-sm border border-zinc-200 rounded-lg bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 border border-zinc-200">
        <div className="p-6 border-b border-zinc-200">
          <h2 className="text-xl font-bold text-zinc-800">Configure Curfew</h2>
          <p className="text-sm text-zinc-500 mt-1">Set curfew times for a house</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-600 mb-1.5">
              House <span className="text-red-400">*</span>
            </label>
            <select
              required
              value={selectedHouseId}
              onChange={(e) => {
                setSelectedHouseId(e.target.value);
                setConfigLoaded("");
              }}
              className={inputClass}
            >
              <option value="">Select a house</option>
              {(houses ?? []).map((h) => (
                <option key={h.id} value={h.id}>
                  {h.property_name} — {h.name}
                </option>
              ))}
            </select>
          </div>

          {existingConfig && selectedHouseId && (
            <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-3">
              <p className="text-sm text-indigo-700">
                Existing config: {existingConfig.weekday_curfew?.slice(0, 5)} weekdays, {existingConfig.weekend_curfew?.slice(0, 5)} weekends.
                Saving will create a new config effective from the date below.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-600 mb-1.5">
                Weekday Curfew <span className="text-red-400">*</span>
              </label>
              <input
                type="time"
                required
                value={weekdayCurfew}
                onChange={(e) => setWeekdayCurfew(e.target.value)}
                className={inputClass}
              />
              <p className="text-xs text-zinc-500 mt-1">Mon — Fri</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-600 mb-1.5">
                Weekend Curfew <span className="text-red-400">*</span>
              </label>
              <input
                type="time"
                required
                value={weekendCurfew}
                onChange={(e) => setWeekendCurfew(e.target.value)}
                className={inputClass}
              />
              <p className="text-xs text-zinc-500 mt-1">Sat — Sun</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-600 mb-1.5">
              Effective From <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              required
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-600 mb-1.5">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
              placeholder="Optional notes about this curfew policy..."
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={setConfig.isPending}>
              {setConfig.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : "Save Configuration"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

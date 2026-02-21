"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import {
  Calendar,
  Plus,
  Clock,
  Home,
  Shuffle,
  CalendarDays,
  Play,
  Pause,
  Trash2,
  ChevronLeft,
  AlertCircle,
  CheckCircle,
  Users,
  BarChart3,
  Loader2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  PageContainer,
  Button,
  Badge,
  EmptyState,
  SkeletonTable,
  useToast,
} from "@/components/ui";

export const dynamic = "force-dynamic";

type ScheduleType = "random" | "scheduled" | "weekly" | "monthly";
type TestType = "urine" | "breathalyzer" | "oral_swab" | "blood" | "hair_follicle";

const scheduleTypeStyles: Record<ScheduleType, string> = {
  random: "bg-purple-500/15 text-purple-300",
  scheduled: "bg-indigo-500/15 text-indigo-300",
  weekly: "bg-green-500/15 text-green-300",
  monthly: "bg-orange-500/15 text-orange-300",
};

const testTypeStyles: Record<TestType, string> = {
  urine: "bg-indigo-500/15 text-indigo-300",
  breathalyzer: "bg-purple-500/15 text-purple-300",
  oral_swab: "bg-cyan-500/15 text-cyan-300",
  blood: "bg-red-500/15 text-red-300",
  hair_follicle: "bg-orange-500/15 text-orange-300",
};

const testTypeLabels: Record<TestType, string> = {
  urine: "Urine",
  breathalyzer: "Breathalyzer",
  oral_swab: "Oral Swab",
  blood: "Blood",
  hair_follicle: "Hair Follicle",
};

export default function DrugTestSchedulingPage() {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState({
    name: "",
    scheduleType: "random" as ScheduleType,
    testType: "urine" as TestType,
    houseId: "",
    randomPercentage: "25",
    notifyResidents: false,
  });

  const { data: userData } = trpc.user.getCurrentUser.useQuery(undefined, { retry: false });
  const orgId = userData?.org_id;

  const { data: schedules, isLoading } = trpc.drugTestSchedule.list.useQuery(
    { orgId: orgId! },
    { enabled: !!orgId }
  );

  const { data: stats } = trpc.drugTestSchedule.getStats.useQuery(
    { orgId: orgId! },
    { enabled: !!orgId }
  );

  const { data: houses } = trpc.property.listAllHouses.useQuery(undefined, { enabled: !!orgId });

  const createSchedule = trpc.drugTestSchedule.create.useMutation({
    onSuccess: () => {
      toast("success", "Schedule created");
      utils.drugTestSchedule.list.invalidate();
      utils.drugTestSchedule.getStats.invalidate();
      setForm({ name: "", scheduleType: "random", testType: "urine", houseId: "", randomPercentage: "25", notifyResidents: false });
      setShowCreateModal(false);
    },
    onError: (err) => toast("error", "Failed to create schedule", err.message),
  });

  const toggleActive = trpc.drugTestSchedule.update.useMutation({
    onSuccess: () => {
      toast("success", "Schedule updated");
      utils.drugTestSchedule.list.invalidate();
      utils.drugTestSchedule.getStats.invalidate();
    },
    onError: (err) => toast("error", "Failed to update", err.message),
  });

  const deleteSchedule = trpc.drugTestSchedule.delete.useMutation({
    onSuccess: () => {
      toast("success", "Schedule deleted");
      utils.drugTestSchedule.list.invalidate();
      utils.drugTestSchedule.getStats.invalidate();
    },
    onError: (err) => toast("error", "Failed to delete", err.message),
  });

  const executeSchedule = trpc.drugTestSchedule.execute.useMutation({
    onSuccess: (data) => {
      toast("success", "Tests created", `${data.testsCreated} drug tests have been created`);
      utils.drugTestSchedule.list.invalidate();
      utils.drugTestSchedule.getStats.invalidate();
    },
    onError: (err) => toast("error", "Failed to execute", err.message),
  });

  const allSchedules = schedules ?? [];

  return (
    <PageContainer>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/operations/drug-tests"
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-zinc-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">Drug Test Scheduling</h1>
            <p className="text-zinc-400 mt-1">Configure automated and random test schedules</p>
          </div>
        </div>
        <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setShowCreateModal(true)}>
          Create Schedule
        </Button>
      </div>

      {/* Stats */}
      <div className="flex items-start gap-0 divide-x divide-zinc-800">
        <div className="flex-1 pr-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Total Schedules</p>
          <p className="text-2xl font-bold text-zinc-100 mt-1">{stats?.total ?? 0}</p>
        </div>
        <div className="flex-1 px-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Active</p>
          <p className="text-2xl font-bold text-green-400 mt-1">{stats?.active ?? 0}</p>
        </div>
        <div className="flex-1 px-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Random Schedules</p>
          <p className="text-2xl font-bold text-purple-400 mt-1">{stats?.random ?? 0}</p>
        </div>
        <div className="flex-1 pl-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Tests (30 days)</p>
          <p className="text-2xl font-bold text-zinc-100 mt-1">{stats?.last30Days?.testsCreated ?? 0}</p>
        </div>
      </div>

      {/* Schedules List */}
      {isLoading ? (
        <SkeletonTable rows={4} columns={5} />
      ) : allSchedules.length === 0 ? (
        <EmptyState
          iconType="inbox"
          title="No test schedules"
          description="Create a drug test schedule to automate testing."
          action={{ label: "Create Schedule", onClick: () => setShowCreateModal(true) }}
        />
      ) : (
        <div className="space-y-3">
          {allSchedules.map((schedule) => (
            <div key={schedule.id} className="border border-zinc-800 rounded-lg p-4 hover:bg-zinc-800/30 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium text-zinc-100">{schedule.name}</h3>
                    {schedule.is_active ? (
                      <Badge variant="success" size="sm">Active</Badge>
                    ) : (
                      <Badge variant="default" size="sm">Paused</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${scheduleTypeStyles[schedule.schedule_type as ScheduleType] ?? ""}`}>
                      {schedule.schedule_type}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${testTypeStyles[schedule.test_type as TestType] ?? ""}`}>
                      {testTypeLabels[schedule.test_type as TestType] ?? schedule.test_type}
                    </span>
                    {schedule.house_name ? (
                      <span className="flex items-center gap-1 text-sm text-zinc-400">
                        <Home className="h-3 w-3" />
                        {schedule.house_name}
                      </span>
                    ) : (
                      <span className="text-sm text-zinc-500">All Houses</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-sm text-zinc-500">
                    {schedule.random_percentage && (
                      <span>{schedule.random_percentage}% of residents</span>
                    )}
                    {schedule.next_execution_at && (
                      <span className="flex items-center gap-1 text-indigo-400">
                        <Clock className="h-3 w-3" />
                        Next: {new Date(schedule.next_execution_at).toLocaleDateString()} at{" "}
                        {new Date(schedule.next_execution_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {schedule.is_active && (
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Shuffle className="h-3.5 w-3.5" />}
                      disabled={executeSchedule.isPending}
                      onClick={() => executeSchedule.mutate({ scheduleId: schedule.id })}
                    >
                      Run Now
                    </Button>
                  )}
                  <button
                    className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400"
                    title={schedule.is_active ? "Pause" : "Resume"}
                    onClick={() => toggleActive.mutate({ scheduleId: schedule.id, isActive: !schedule.is_active })}
                  >
                    {schedule.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </button>
                  <button
                    className="p-2 hover:bg-red-500/10 rounded-lg text-red-400"
                    title="Delete"
                    onClick={() => {
                      if (confirm("Delete this schedule?")) {
                        deleteSchedule.mutate({ scheduleId: schedule.id });
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Schedule Modal */}
      {showCreateModal && orgId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <div className="relative bg-zinc-900 rounded-xl shadow-2xl w-full max-w-lg mx-4 border border-zinc-800">
            <div className="p-6 border-b border-zinc-800">
              <h2 className="text-xl font-bold text-zinc-100">Create Test Schedule</h2>
            </div>
            <form
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                createSchedule.mutate({
                  orgId,
                  name: form.name,
                  scheduleType: form.scheduleType,
                  testType: form.testType,
                  houseId: form.houseId || undefined,
                  randomPercentage: form.scheduleType === "random" ? parseInt(form.randomPercentage) || 25 : undefined,
                  notifyResidents: form.notifyResidents,
                });
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Schedule Name <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full h-10 px-3 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="e.g., Weekly Random Testing"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Schedule Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["random", "scheduled", "weekly", "monthly"] as ScheduleType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setForm({ ...form, scheduleType: type })}
                      className={`px-4 py-2 border rounded-lg text-sm font-medium capitalize ${
                        form.scheduleType === type
                          ? "border-indigo-500 bg-indigo-500/10 text-indigo-300"
                          : "border-zinc-800 text-zinc-300 hover:bg-zinc-800/40"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Test Type</label>
                <select
                  value={form.testType}
                  onChange={(e) => setForm({ ...form, testType: e.target.value as TestType })}
                  className="w-full h-10 px-3 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="urine">Urine Test</option>
                  <option value="breathalyzer">Breathalyzer</option>
                  <option value="oral_swab">Oral Swab</option>
                  <option value="blood">Blood Test</option>
                  <option value="hair_follicle">Hair Follicle</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">House (optional)</label>
                <select
                  value={form.houseId}
                  onChange={(e) => setForm({ ...form, houseId: e.target.value })}
                  className="w-full h-10 px-3 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="">All Houses</option>
                  {(houses ?? []).map((h) => (
                    <option key={h.id} value={h.id}>{h.name} ({h.property_name})</option>
                  ))}
                </select>
              </div>

              {form.scheduleType === "random" && (
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">Percentage of Residents</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={form.randomPercentage}
                      onChange={(e) => setForm({ ...form, randomPercentage: e.target.value })}
                      className="w-24 h-10 px-3 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                    <span className="text-sm text-zinc-400">% of residents per execution</span>
                  </div>
                </div>
              )}

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.notifyResidents}
                  onChange={(e) => setForm({ ...form, notifyResidents: e.target.checked })}
                  className="rounded border-zinc-700 text-indigo-400 focus:ring-indigo-500"
                />
                <span className="text-sm text-zinc-300">Notify residents in advance</span>
              </label>

              <div className="p-3 bg-amber-500/10 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-amber-300">
                    Random testing helps maintain unpredictability and is recommended for compliance programs.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={createSchedule.isPending}>
                  {createSchedule.isPending ? "Creating..." : "Create Schedule"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

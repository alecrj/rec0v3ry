"use client";

import { useState, FormEvent } from "react";
import {
  TestTube,
  Plus,
  Calendar,
  User,
  CheckCircle,
  Clock,
  AlertTriangle,
  Shield,
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

const testTypeLabels: Record<string, string> = {
  urine: "Urine",
  breathalyzer: "Breathalyzer",
  oral_swab: "Oral Swab",
  blood: "Blood",
  hair_follicle: "Hair Follicle",
};

type TestRow = {
  id: string;
  resident_first_name: string;
  resident_last_name: string;
  test_type: string;
  test_date: string | Date;
  is_random: boolean | null;
  [key: string]: unknown;
};

export default function DrugTestsPage() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [selectedType, setSelectedType] = useState<string>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [testForm, setTestForm] = useState({
    residentId: "",
    testType: "urine",
    testDate: new Date().toISOString().split("T")[0],
    isRandom: false,
  });

  const { data: userData } = trpc.user.getCurrentUser.useQuery(undefined, { retry: false });
  const orgId = userData?.org_id;

  const { data: residentList } = trpc.resident.list.useQuery(
    {},
    { enabled: !!orgId }
  );

  const createTest = trpc.drugTest.create.useMutation({
    onSuccess: () => {
      toast("success", "Drug test recorded");
      utils.drugTest.list.invalidate();
      utils.drugTest.getStats.invalidate();
      setTestForm({ residentId: "", testType: "urine", testDate: new Date().toISOString().split("T")[0], isRandom: false });
      setShowCreateModal(false);
    },
    onError: (err) => toast("error", err.message),
  });

  const { data: tests, isLoading, error } = trpc.drugTest.list.useQuery(
    { orgId: orgId!, limit: 100 },
    { enabled: !!orgId }
  );

  const { data: stats } = trpc.drugTest.getStats.useQuery(
    { orgId: orgId! },
    { enabled: !!orgId }
  );

  const statsLoading = !stats && !!orgId;
  const allTests = (tests ?? []) as TestRow[];
  const filteredTests = allTests.filter((t) => {
    if (selectedType !== "all" && t.test_type !== selectedType) return false;
    return true;
  });

  const columns: Column<TestRow>[] = [
    {
      key: "resident_first_name",
      header: "Resident",
      sortable: true,
      render: (_val, row) => (
        <div className="flex items-center gap-2">
          <User className="h-3.5 w-3.5 text-zinc-500" />
          <span className="text-sm font-medium text-zinc-100">
            {row.resident_first_name} {row.resident_last_name}
          </span>
        </div>
      ),
    },
    {
      key: "test_type",
      header: "Type",
      render: (_val, row) => (
        <Badge variant="info">{testTypeLabels[row.test_type] ?? row.test_type}</Badge>
      ),
    },
    {
      key: "test_date",
      header: "Date",
      sortable: true,
      render: (_val, row) => (
        <span className="text-sm text-zinc-400">
          {new Date(row.test_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </span>
      ),
    },
    {
      key: "is_random",
      header: "Random",
      render: (_val, row) => (
        row.is_random
          ? <Badge variant="warning">Random</Badge>
          : <Badge variant="default">Scheduled</Badge>
      ),
    },
  ];

  if (error) {
    return (
      <PageContainer>
        <Card><CardContent><ErrorState title="Failed to load drug tests" description={error.message} /></CardContent></Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Drug Testing"
        description="Track drug tests and results"
        actions={
          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setShowCreateModal(true)}>
            New Test
          </Button>
        }
      />

      <StatCardGrid columns={4}>
        <StatCard
          title="Total Tests"
          value={statsLoading ? "—" : String(stats?.total ?? allTests.length)}
          icon={<TestTube className="h-5 w-5" />}
          loading={statsLoading}
        />
        <StatCard
          title="Negative"
          value={statsLoading ? "—" : String(stats?.negative ?? 0)}
          variant="success"
          icon={<CheckCircle className="h-5 w-5" />}
          loading={statsLoading}
        />
        <StatCard
          title="Positive"
          value={statsLoading ? "—" : String(stats?.positive ?? 0)}
          variant="error"
          icon={<AlertTriangle className="h-5 w-5" />}
          loading={statsLoading}
        />
        <StatCard
          title="Pending"
          value={statsLoading ? "—" : String(stats?.pending ?? 0)}
          variant="warning"
          icon={<Clock className="h-5 w-5" />}
          loading={statsLoading}
        />
      </StatCardGrid>

      {/* Filter */}
      <Card>
        <CardContent>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-zinc-300">Filter:</span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="h-10 px-3 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="all">All Types</option>
              <option value="urine">Urine</option>
              <option value="breathalyzer">Breathalyzer</option>
              <option value="oral_swab">Oral Swab</option>
              <option value="blood">Blood</option>
              <option value="hair_follicle">Hair Follicle</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Tests Table */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Test Log</CardTitle>
            <div className="flex items-center gap-1.5 mt-1.5">
              <Shield className="h-3.5 w-3.5 text-amber-400" />
              <p className="text-xs text-zinc-500">Protected records — consent required to view</p>
            </div>
          </div>
        </CardHeader>
        {isLoading ? (
          <CardContent className="pt-0"><SkeletonTable rows={6} columns={4} /></CardContent>
        ) : filteredTests.length === 0 ? (
          <CardContent className="pt-0">
            <EmptyState
              iconType="inbox"
              title="No drug tests found"
              description="Record a new test to get started."
            />
          </CardContent>
        ) : (
          <DataTable
            data={filteredTests}
            columns={columns}
            loading={isLoading}
            getRowId={(row) => row.id}
            className="border-0 rounded-none"
            rowActions={() => (
              <Button variant="ghost" size="sm" className="text-indigo-400">View Results</Button>
            )}
          />
        )}
      </Card>
      {/* Create Test Modal */}
      {showCreateModal && orgId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <div className="relative bg-zinc-900 rounded-xl shadow-2xl w-full max-w-md mx-4 border border-zinc-800">
            <div className="p-6 border-b border-zinc-800">
              <h2 className="text-xl font-bold text-zinc-100">Record Drug Test</h2>
              <div className="flex items-center gap-1.5 mt-1.5">
                <Shield className="h-3.5 w-3.5 text-amber-400" />
                <p className="text-xs text-zinc-500">Protected record</p>
              </div>
            </div>
            <form
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                createTest.mutate({
                  orgId,
                  residentId: testForm.residentId,
                  testType: testForm.testType as "urine" | "breathalyzer" | "oral_swab" | "blood" | "hair_follicle",
                  testDate: testForm.testDate,
                  isRandom: testForm.isRandom,
                });
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Resident <span className="text-red-400">*</span></label>
                <select className="w-full h-10 px-3 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40" required value={testForm.residentId} onChange={(e) => setTestForm({ ...testForm, residentId: e.target.value })}>
                  <option value="">Select resident...</option>
                  {(residentList?.items ?? []).map((r) => (
                    <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">Test Type <span className="text-red-400">*</span></label>
                  <select className="w-full h-10 px-3 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40" value={testForm.testType} onChange={(e) => setTestForm({ ...testForm, testType: e.target.value })}>
                    <option value="urine">Urine</option>
                    <option value="breathalyzer">Breathalyzer</option>
                    <option value="oral_swab">Oral Swab</option>
                    <option value="blood">Blood</option>
                    <option value="hair_follicle">Hair Follicle</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">Date <span className="text-red-400">*</span></label>
                  <input type="date" className="w-full h-10 px-3 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40" required value={testForm.testDate} onChange={(e) => setTestForm({ ...testForm, testDate: e.target.value })} />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded border-zinc-700 text-indigo-400 focus:ring-indigo-500" checked={testForm.isRandom} onChange={(e) => setTestForm({ ...testForm, isRandom: e.target.checked })} />
                <span className="text-sm text-zinc-300">Random test</span>
              </label>
              <div className="pt-2 flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={createTest.isPending}>
                  {createTest.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Recording...</> : "Record Test"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

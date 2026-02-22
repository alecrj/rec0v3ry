"use client";

import { useState } from "react";
import {
  ClipboardCheck,
  Calendar,
  User,
  Heart,
  Moon,
  Smile,
  ChevronLeft,
  ChevronRight,
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
  Badge,
  DataTable,
  EmptyState,
  ErrorState,
  SkeletonTable,
} from "@/components/ui";
import type { Column } from "@/components/ui";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type CheckInRow = {
  id: string;
  resident_first_name: string;
  resident_last_name: string;
  mood_rating: number | null;
  cravings_rating: number | null;
  sleep_hours: number | null;
  attended_meeting: boolean | null;
  created_at: string | Date;
  [key: string]: unknown;
};

export default function CheckInsPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  const { data: userData } = trpc.user.getCurrentUser.useQuery(undefined, { retry: false });
  const orgId = userData?.org_id;

  const { data: checkIns, isLoading, error } = trpc.checkIn.listDaily.useQuery(
    { orgId: orgId!, startDate: selectedDate, endDate: selectedDate, limit: 100 },
    { enabled: !!orgId }
  );

  const { data: stats } = trpc.checkIn.getStats.useQuery(
    { orgId: orgId! },
    { enabled: !!orgId }
  );

  const statsLoading = !stats && !!orgId;
  const allCheckIns = (checkIns ?? []) as CheckInRow[];

  const avgMood = allCheckIns.length > 0
    ? (allCheckIns.reduce((sum, c) => sum + (c.mood_rating ?? 0), 0) / allCheckIns.length).toFixed(1)
    : "—";

  const avgSleep = allCheckIns.length > 0
    ? (allCheckIns.reduce((sum, c) => sum + (c.sleep_hours ?? 0), 0) / allCheckIns.length).toFixed(1)
    : "—";

  const avgCravings = allCheckIns.length > 0
    ? (allCheckIns.reduce((sum, c) => sum + (c.cravings_rating ?? 0), 0) / allCheckIns.length).toFixed(1)
    : "—";

  const columns: Column<CheckInRow>[] = [
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
      key: "mood_rating",
      header: "Mood",
      render: (_val, row) => {
        const v = row.mood_rating ?? 0;
        return (
          <span className={cn(
            "text-sm font-bold",
            v >= 7 ? "text-green-400" : v >= 4 ? "text-amber-400" : "text-red-400"
          )}>
            {row.mood_rating ?? "—"}/10
          </span>
        );
      },
    },
    {
      key: "cravings_rating",
      header: "Cravings",
      render: (_val, row) => {
        const v = row.cravings_rating ?? 0;
        return (
          <span className={cn(
            "text-sm font-bold",
            v <= 3 ? "text-green-400" : v <= 6 ? "text-amber-400" : "text-red-400"
          )}>
            {row.cravings_rating ?? "—"}/10
          </span>
        );
      },
    },
    {
      key: "sleep_hours",
      header: "Sleep",
      render: (_val, row) => (
        <span className="text-sm text-zinc-400">{row.sleep_hours ?? "—"} hrs</span>
      ),
    },
    {
      key: "attended_meeting",
      header: "Meeting",
      render: (_val, row) =>
        row.attended_meeting
          ? <Badge variant="success">Yes</Badge>
          : <Badge variant="default">No</Badge>,
    },
    {
      key: "created_at",
      header: "Time",
      render: (_val, row) => (
        <span className="text-sm text-zinc-500">
          {new Date(row.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
        </span>
      ),
    },
  ];

  if (error) {
    return (
      <PageContainer>
        <Card><CardContent><ErrorState title="Failed to load check-ins" description={error.message} /></CardContent></Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Daily Check-Ins"
        description="Monitor resident wellness and daily status"
      />

      <StatCardGrid columns={4}>
        <StatCard
          title="Checked In Today"
          value={String(allCheckIns.length)}
          icon={<ClipboardCheck className="h-5 w-5" />}
          loading={isLoading}
        />
        <StatCard
          title="Avg Mood (1-10)"
          value={avgMood}
          variant="success"
          icon={<Smile className="h-5 w-5" />}
          loading={isLoading}
        />
        <StatCard
          title="Avg Sleep (hrs)"
          value={avgSleep}
          variant="info"
          icon={<Moon className="h-5 w-5" />}
          loading={isLoading}
        />
        <StatCard
          title="Avg Cravings (1-10)"
          value={avgCravings}
          variant={parseFloat(avgCravings) > 5 ? "error" : "warning"}
          icon={<Heart className="h-5 w-5" />}
          loading={isLoading}
        />
      </StatCardGrid>

      {/* Date Navigation */}
      <Card>
        <CardContent>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-zinc-600">Date:</span>
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
          <CardTitle>
            Check-Ins for {new Date(selectedDate!).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </CardTitle>
        </CardHeader>
        {isLoading ? (
          <CardContent className="pt-0"><SkeletonTable rows={6} columns={6} /></CardContent>
        ) : allCheckIns.length === 0 ? (
          <CardContent className="pt-0">
            <EmptyState
              iconType="inbox"
              title="No check-ins for this date"
              description="Check-ins will appear here as residents complete them."
            />
          </CardContent>
        ) : (
          <DataTable
            data={allCheckIns}
            columns={columns}
            loading={isLoading}
            getRowId={(row) => row.id}
            className="border-0 rounded-none"
          />
        )}
      </Card>
    </PageContainer>
  );
}

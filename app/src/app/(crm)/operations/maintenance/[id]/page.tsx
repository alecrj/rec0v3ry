"use client";

import { use } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Home,
  Clock,
  AlertTriangle,
  MapPin,
  Loader2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  PageContainer,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  ErrorState,
  SkeletonCard,
  useToast,
} from "@/components/ui";

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

export default function MaintenanceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const { data: request, isLoading, error } = trpc.maintenance.getById.useQuery(
    { requestId: id },
  );

  const updateRequest = trpc.maintenance.update.useMutation({
    onSuccess: () => {
      toast("success", "Status updated");
      utils.maintenance.getById.invalidate({ requestId: id });
      utils.maintenance.list.invalidate();
      utils.maintenance.getStats.invalidate();
    },
    onError: (err) => toast("error", err.message),
  });

  if (error) {
    return (
      <PageContainer>
        <Card><CardContent><ErrorState title="Failed to load request" description={error.message} /></CardContent></Card>
      </PageContainer>
    );
  }

  if (isLoading || !request) {
    return (
      <PageContainer>
        <SkeletonCard />
        <SkeletonCard />
      </PageContainer>
    );
  }

  const prConfig = priorityBadge[request.priority ?? "medium"] ?? { variant: "default" as const, label: request.priority ?? "medium" };
  const stConfig = statusBadge[request.status ?? "open"] ?? { variant: "default" as const, label: request.status ?? "open" };

  return (
    <PageContainer>
      {/* Back link + header */}
      <div className="flex items-center gap-4">
        <Link href="/operations/maintenance" className="p-2 hover:bg-zinc-100 rounded-lg transition-colors">
          <ChevronLeft className="h-5 w-5 text-zinc-400" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-zinc-800">{request.title}</h1>
            <Badge variant={stConfig.variant}>{stConfig.label}</Badge>
            <Badge variant={prConfig.variant} dot>{prConfig.label}</Badge>
          </div>
          <p className="text-sm text-zinc-500 mt-0.5">
            Created {new Date(request.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>Details</CardTitle></CardHeader>
            <CardContent className="pt-0 space-y-4">
              <div>
                <h3 className="text-sm font-medium text-zinc-600 mb-1">Description</h3>
                <p className="text-sm text-zinc-400">{request.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {request.location && (
                  <div>
                    <h3 className="text-sm font-medium text-zinc-600 mb-1">Location</h3>
                    <div className="flex items-center gap-1.5 text-sm text-zinc-400">
                      <MapPin className="h-3.5 w-3.5" />
                      {request.location}
                    </div>
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-medium text-zinc-600 mb-1">House</h3>
                  <div className="flex items-center gap-1.5 text-sm text-zinc-400">
                    <Home className="h-3.5 w-3.5" />
                    {request.house_name ?? "—"}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-zinc-600 mb-1">Created</h3>
                  <div className="flex items-center gap-1.5 text-sm text-zinc-400">
                    <Clock className="h-3.5 w-3.5" />
                    {new Date(request.created_at).toLocaleString()}
                  </div>
                </div>
                {request.completed_at && (
                  <div>
                    <h3 className="text-sm font-medium text-zinc-600 mb-1">Completed</h3>
                    <div className="flex items-center gap-1.5 text-sm text-zinc-400">
                      <Clock className="h-3.5 w-3.5" />
                      {new Date(request.completed_at).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
              {request.completion_notes && (
                <div>
                  <h3 className="text-sm font-medium text-zinc-600 mb-1">Completion Notes</h3>
                  <p className="text-sm text-zinc-400 italic">{request.completion_notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
            <CardContent className="pt-0 space-y-3">
              {(request.status === "open" || request.status === "in_progress") && (
                <>
                  {request.status === "open" && (
                    <Button
                      variant="primary"
                      className="w-full"
                      onClick={() => updateRequest.mutate({ requestId: id, status: "in_progress" })}
                      disabled={updateRequest.isPending}
                    >
                      {updateRequest.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Start Work"}
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => updateRequest.mutate({ requestId: id, status: "completed" })}
                    disabled={updateRequest.isPending}
                  >
                    Mark Complete
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full text-red-400"
                    onClick={() => updateRequest.mutate({ requestId: id, status: "cancelled" })}
                    disabled={updateRequest.isPending}
                  >
                    Cancel Request
                  </Button>
                </>
              )}
              {request.status === "completed" && (
                <p className="text-sm text-green-400 text-center py-2">This request has been completed.</p>
              )}
              {request.status === "cancelled" && (
                <p className="text-sm text-zinc-500 text-center py-2">This request was cancelled.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <h3 className="text-sm font-medium text-zinc-600 mb-1">Time Open</h3>
              <p className="text-2xl font-bold text-zinc-800">
                {request.completed_at
                  ? `${Math.round((new Date(request.completed_at).getTime() - new Date(request.created_at).getTime()) / (1000 * 60 * 60))} hrs`
                  : `${Math.round((Date.now() - new Date(request.created_at).getTime()) / (1000 * 60 * 60))} hrs`}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                Since {new Date(request.created_at).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}

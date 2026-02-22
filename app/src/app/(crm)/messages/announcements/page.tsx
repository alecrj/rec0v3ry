"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bell,
  Plus,
  Search,
  Pin,
  Clock,
  Users,
  Home,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  CheckCircle,
  ChevronLeft,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  PageContainer,
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
  SkeletonStatCard,
  useToast,
} from "@/components/ui";

export const dynamic = "force-dynamic";

type Priority = "low" | "normal" | "high" | "urgent";

const priorityConfig: Record<Priority, { variant: "default" | "info" | "warning" | "error"; label: string }> = {
  low: { variant: "default", label: "Low" },
  normal: { variant: "info", label: "Normal" },
  high: { variant: "warning", label: "High" },
  urgent: { variant: "error", label: "Urgent" },
};

export default function AnnouncementsPage() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedScope, setSelectedScope] = useState<"all" | "organization" | "house">("all");
  const [showDrafts, setShowDrafts] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Create modal state
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newHouseId, setNewHouseId] = useState("");
  const [newPriority, setNewPriority] = useState<"low" | "normal" | "high" | "urgent">("normal");
  const [newIsPinned, setNewIsPinned] = useState(false);
  const [newIsDraft, setNewIsDraft] = useState(false);

  const { data: userData } = trpc.user.getCurrentUser.useQuery();
  const { data: announcements, isLoading, error } = trpc.announcement.list.useQuery({
    includeDrafts: showDrafts,
  });
  const { data: stats } = trpc.announcement.getStats.useQuery();
  const { data: houseList } = trpc.property.listAllHouses.useQuery(undefined, {
    enabled: isCreateModalOpen,
  });

  const createMutation = trpc.announcement.create.useMutation({
    onSuccess: () => {
      toast("success", newIsDraft ? "Draft saved" : "Announcement published");
      utils.announcement.list.invalidate();
      utils.announcement.getStats.invalidate();
      setIsCreateModalOpen(false);
      setNewTitle("");
      setNewContent("");
      setNewHouseId("");
      setNewPriority("normal");
      setNewIsPinned(false);
      setNewIsDraft(false);
    },
    onError: (err) => toast("error", "Failed to create announcement", err.message),
  });

  const deleteMutation = trpc.announcement.delete.useMutation({
    onSuccess: () => {
      toast("success", "Announcement deleted");
      utils.announcement.list.invalidate();
      utils.announcement.getStats.invalidate();
    },
    onError: (err) => toast("error", "Failed to delete", err.message),
  });

  const filteredAnnouncements = (announcements ?? [])
    .filter((a) => {
      if (selectedScope === "organization" && a.house_id) return false;
      if (selectedScope === "house" && !a.house_id) return false;
      if (searchQuery && !a.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      const aTime = a.published_at ? new Date(a.published_at).getTime() : new Date(a.created_at).getTime();
      const bTime = b.published_at ? new Date(b.published_at).getTime() : new Date(b.created_at).getTime();
      return bTime - aTime;
    });

  const formatDate = (date: Date | null) => {
    if (!date) return "Not published";
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  const inputClass = "w-full h-10 px-3 text-sm border border-zinc-200 rounded-lg bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors";

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/messages" className="p-2 hover:bg-zinc-100 rounded-lg transition-colors">
            <ChevronLeft className="h-5 w-5 text-zinc-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-zinc-800">Announcements</h1>
            <p className="text-zinc-500 mt-1">Broadcast messages to houses and organization</p>
          </div>
        </div>
        <Button
          variant="primary"
          icon={<Plus className="h-4 w-4" />}
          onClick={() => setIsCreateModalOpen(true)}
        >
          New Announcement
        </Button>
      </div>

      {error && (
        <Card><CardContent><ErrorState title="Error loading announcements" description={error.message} /></CardContent></Card>
      )}

      {isLoading ? (
        <StatCardGrid columns={4}>
          <SkeletonStatCard /><SkeletonStatCard /><SkeletonStatCard /><SkeletonStatCard />
        </StatCardGrid>
      ) : (
        <StatCardGrid columns={4}>
          <StatCard
            title="Total Published"
            value={String(stats?.total ?? 0)}
            icon={<Bell className="h-5 w-5" />}
          />
          <StatCard
            title="Active"
            value={String(stats?.active ?? 0)}
            variant="success"
            icon={<CheckCircle className="h-5 w-5" />}
          />
          <StatCard
            title="Drafts"
            value={String(stats?.drafts ?? 0)}
            variant="warning"
            icon={<Edit className="h-5 w-5" />}
          />
          <StatCard
            title="Urgent"
            value={String(stats?.byPriority?.urgent ?? 0)}
            variant="error"
            icon={<EyeOff className="h-5 w-5" />}
          />
        </StatCardGrid>
      )}

      {/* Search and Filters */}
      <Card>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search announcements..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-zinc-200 rounded-lg bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
              />
            </div>
            <select
              value={selectedScope}
              onChange={(e) => setSelectedScope(e.target.value as typeof selectedScope)}
              className="h-10 px-3 text-sm border border-zinc-200 rounded-lg bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="all">All Scopes</option>
              <option value="organization">Organization-wide</option>
              <option value="house">House-specific</option>
            </select>
            <Button
              variant={showDrafts ? "primary" : "secondary"}
              size="sm"
              icon={<Edit className="h-4 w-4" />}
              onClick={() => setShowDrafts(!showDrafts)}
            >
              {showDrafts ? "Show Published" : "Show Drafts"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Announcements List */}
      <Card>
        <CardHeader>
          <CardTitle>{showDrafts ? "Draft Announcements" : "Published Announcements"}</CardTitle>
        </CardHeader>
        {isLoading ? (
          <CardContent className="pt-0">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex items-start gap-4">
                  <div className="w-9 h-9 bg-zinc-200 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-48 bg-zinc-200 rounded" />
                    <div className="h-3 w-full bg-zinc-200 rounded" />
                    <div className="h-3 w-32 bg-zinc-200 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        ) : filteredAnnouncements.length === 0 ? (
          <CardContent className="pt-0">
            <EmptyState
              iconType="inbox"
              title="No announcements yet"
              description="Create your first announcement to get started."
              action={{ label: "New Announcement", onClick: () => setIsCreateModalOpen(true) }}
            />
          </CardContent>
        ) : (
          <div className="divide-y divide-zinc-200/50">
            {filteredAnnouncements.map((announcement) => {
              const pc = priorityConfig[(announcement.priority as Priority) ?? "normal"];
              return (
                <div
                  key={announcement.id}
                  className={`px-6 py-4 hover:bg-zinc-100 transition-colors ${
                    !announcement.isRead && !announcement.is_draft ? "bg-indigo-500/10/30" : ""
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${announcement.is_pinned ? "bg-indigo-500/15" : "bg-zinc-100"}`}>
                      {announcement.is_pinned ? (
                        <Pin className="h-5 w-5 text-indigo-400" />
                      ) : (
                        <Bell className="h-5 w-5 text-zinc-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`text-sm font-medium ${!announcement.isRead && !announcement.is_draft ? "text-zinc-800" : "text-zinc-600"}`}>
                          {announcement.title}
                        </h3>
                        <Badge variant={pc.variant}>{pc.label}</Badge>
                        {announcement.is_draft && (
                          <Badge variant="warning">Draft</Badge>
                        )}
                      </div>
                      <p className="text-sm text-zinc-400 line-clamp-2 mb-2">
                        {announcement.content}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-zinc-500">
                        <span className="flex items-center gap-1">
                          {announcement.house_id ? (
                            <Home className="h-3 w-3" />
                          ) : (
                            <Users className="h-3 w-3" />
                          )}
                          {announcement.house_name || "Organization-wide"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(announcement.published_at)}
                        </span>
                        {!announcement.is_draft && (
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {announcement.readCount} read
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
                        onClick={() => {
                          if (confirm("Delete this announcement?")) {
                            deleteMutation.mutate({ announcementId: announcement.id });
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-zinc-500" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-zinc-200">
            <div className="p-6 border-b border-zinc-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-zinc-800">New Announcement</h2>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-zinc-500 hover:text-zinc-400 text-xl"
                >
                  &times;
                </button>
              </div>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!userData?.org_id) return;
                createMutation.mutate({
                  orgId: userData.org_id,
                  title: newTitle,
                  content: newContent,
                  houseId: newHouseId || undefined,
                  priority: newPriority,
                  isPinned: newIsPinned,
                  isDraft: newIsDraft,
                });
              }}
            >
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-600 mb-1.5">
                    Title <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Announcement title"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-600 mb-1.5">
                    Content <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    rows={6}
                    required
                    placeholder="Write your announcement..."
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    className="w-full px-4 py-3 text-sm border border-zinc-200 rounded-lg bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none transition-colors"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-600 mb-1.5">Scope</label>
                    <select
                      value={newHouseId}
                      onChange={(e) => setNewHouseId(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Organization-wide</option>
                      {(houseList ?? []).map((h: { id: string; name: string }) => (
                        <option key={h.id} value={h.id}>{h.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-600 mb-1.5">Priority</label>
                    <select
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value as typeof newPriority)}
                      className={inputClass}
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newIsPinned}
                      onChange={(e) => setNewIsPinned(e.target.checked)}
                      className="rounded border-zinc-200 text-indigo-400 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-zinc-600">Pin announcement</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newIsDraft}
                      onChange={(e) => setNewIsDraft(e.target.checked)}
                      className="rounded border-zinc-200 text-indigo-400 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-zinc-600">Save as draft</span>
                  </label>
                </div>
              </div>
              <div className="p-6 border-t border-zinc-200 flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Publishing..." : newIsDraft ? "Save Draft" : "Publish Announcement"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

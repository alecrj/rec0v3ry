"use client";

import { useState } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Plus,
  Search,
  Bell,
  Users,
  User,
  Clock,
  Archive,
  MoreVertical,
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
  EmptyState,
  ErrorState,
  SkeletonStatCard,
} from "@/components/ui";

export const dynamic = "force-dynamic";

type ConversationType = "direct" | "group" | "announcement";

interface Conversation {
  id: string;
  conversation_type: ConversationType;
  displayTitle: string;
  house_name: string | null;
  lastMessage: {
    content: string;
    sentAt: Date;
  } | null;
  unreadCount: number;
  is_archived: boolean;
}

export default function MessagesInboxPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<"all" | "unread" | "direct" | "group">("all");
  const [showArchived, setShowArchived] = useState(false);

  const { data: conversations, isLoading, error } = trpc.conversation.list.useQuery({
    includeArchived: showArchived,
  });

  const totalUnread = conversations?.reduce((sum, c) => sum + c.unreadCount, 0) ?? 0;
  const directCount = conversations?.filter((c) => c.conversation_type === "direct").length ?? 0;
  const groupCount = conversations?.filter((c) => c.conversation_type === "group").length ?? 0;

  const filteredConversations = (conversations ?? [])
    .filter((c) => {
      if (selectedFilter === "unread" && c.unreadCount === 0) return false;
      if (selectedFilter === "direct" && c.conversation_type !== "direct") return false;
      if (selectedFilter === "group" && c.conversation_type !== "group") return false;
      if (searchQuery && !c.displayTitle.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      const aTime = a.lastMessage ? new Date(a.lastMessage.sentAt).getTime() : 0;
      const bTime = b.lastMessage ? new Date(b.lastMessage.sentAt).getTime() : 0;
      return bTime - aTime;
    });

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(date).toLocaleDateString();
  };

  const getConversationIcon = (type: ConversationType) => {
    switch (type) {
      case "direct":
        return <User className="h-5 w-5 text-zinc-500" />;
      case "group":
        return <Users className="h-5 w-5 text-indigo-400" />;
      case "announcement":
        return <Bell className="h-5 w-5 text-amber-400" />;
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Messages"
        description={totalUnread > 0 ? `${totalUnread} unread messages` : "All caught up"}
        actions={
          <div className="flex gap-3">
            <Link href="/messages/announcements">
              <Button variant="secondary" icon={<Bell className="h-4 w-4" />}>
                Announcements
              </Button>
            </Link>
            <Link href="/messages/compose">
              <Button variant="primary" icon={<Plus className="h-4 w-4" />}>
                New Message
              </Button>
            </Link>
          </div>
        }
      />

      {error && (
        <Card><CardContent><ErrorState title="Error loading messages" description={error.message} /></CardContent></Card>
      )}

      {isLoading ? (
        <StatCardGrid columns={4}>
          <SkeletonStatCard /><SkeletonStatCard /><SkeletonStatCard /><SkeletonStatCard />
        </StatCardGrid>
      ) : (
        <StatCardGrid columns={4}>
          <StatCard
            title="Total Conversations"
            value={String(conversations?.length ?? 0)}
            icon={<MessageSquare className="h-5 w-5" />}
          />
          <StatCard
            title="Unread Messages"
            value={String(totalUnread)}
            variant={totalUnread > 0 ? "error" : "success"}
            icon={<Bell className="h-5 w-5" />}
          />
          <StatCard
            title="Direct Chats"
            value={String(directCount)}
            variant="success"
            icon={<User className="h-5 w-5" />}
          />
          <StatCard
            title="Group Chats"
            value={String(groupCount)}
            icon={<Users className="h-5 w-5" />}
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
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-zinc-200 rounded-lg bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
              />
            </div>
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value as typeof selectedFilter)}
              className="h-10 px-3 text-sm border border-zinc-200 rounded-lg bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="all">All Messages</option>
              <option value="unread">Unread</option>
              <option value="direct">Direct Messages</option>
              <option value="group">Group Chats</option>
            </select>
            <Button
              variant={showArchived ? "primary" : "secondary"}
              size="sm"
              icon={<Archive className="h-4 w-4" />}
              onClick={() => setShowArchived(!showArchived)}
            >
              {showArchived ? "Show Active" : "Archived"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Conversations List */}
      <Card>
        <CardHeader>
          <CardTitle>Conversations</CardTitle>
        </CardHeader>
        {isLoading ? (
          <CardContent className="pt-0">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex items-start gap-4">
                  <div className="w-9 h-9 bg-zinc-200 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 bg-zinc-200 rounded" />
                    <div className="h-3 w-48 bg-zinc-200 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        ) : filteredConversations.length === 0 ? (
          <CardContent className="pt-0">
            <EmptyState
              iconType="inbox"
              title="No conversations yet"
              description="Start a new conversation to get started."
              action={{ label: "New Message", onClick: () => window.location.href = "/messages/compose" }}
            />
          </CardContent>
        ) : (
          <div className="divide-y divide-zinc-200/50">
            {filteredConversations.map((conversation) => (
              <Link
                key={conversation.id}
                href={`/messages/${conversation.id}`}
                className="block px-6 py-4 hover:bg-zinc-100 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 p-2 bg-zinc-100 rounded-full">
                    {getConversationIcon(conversation.conversation_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className={`text-sm font-medium ${conversation.unreadCount > 0 ? "text-zinc-800" : "text-zinc-600"}`}>
                          {conversation.displayTitle}
                        </h3>
                        {conversation.house_name && (
                          <span className="text-xs text-zinc-500">
                            {conversation.house_name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {conversation.lastMessage && (
                          <span className="text-xs text-zinc-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(conversation.lastMessage.sentAt)}
                          </span>
                        )}
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                          }}
                          className="p-1 hover:bg-zinc-100 rounded"
                        >
                          <MoreVertical className="h-4 w-4 text-zinc-500" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <p className={`text-sm truncate ${conversation.unreadCount > 0 ? "text-zinc-600 font-medium" : "text-zinc-500"}`}>
                        {conversation.lastMessage?.content || "No messages yet"}
                      </p>
                      {conversation.unreadCount > 0 && (
                        <span className="flex-shrink-0 ml-2 px-2 py-0.5 bg-indigo-500 text-white text-xs font-medium rounded-full">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </PageContainer>
  );
}

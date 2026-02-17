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
  Filter,
  Archive,
  MoreVertical,
  Pin,
} from "lucide-react";

export const dynamic = "force-dynamic";

type ConversationType = "direct" | "group" | "announcement";

interface Conversation {
  id: string;
  conversationType: ConversationType;
  displayTitle: string;
  houseName: string | null;
  lastMessage: {
    content: string;
    sentAt: string;
  } | null;
  unreadCount: number;
  isArchived: boolean;
  isPinned?: boolean;
}

export default function MessagesInboxPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<"all" | "unread" | "direct" | "group">("all");
  const [showArchived, setShowArchived] = useState(false);

  // Mock data
  const conversations: Conversation[] = [
    {
      id: "1",
      conversationType: "direct",
      displayTitle: "Sarah Martinez",
      houseName: "Serenity House",
      lastMessage: {
        content: "Thank you for the update on my payment plan.",
        sentAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      },
      unreadCount: 2,
      isArchived: false,
      isPinned: true,
    },
    {
      id: "2",
      conversationType: "group",
      displayTitle: "Serenity House Chat",
      houseName: "Serenity House",
      lastMessage: {
        content: "Reminder: House meeting at 6pm today",
        sentAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      },
      unreadCount: 5,
      isArchived: false,
    },
    {
      id: "3",
      conversationType: "direct",
      displayTitle: "Michael Chen",
      houseName: "Hope Manor",
      lastMessage: {
        content: "I have a question about the curfew policy.",
        sentAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
      unreadCount: 0,
      isArchived: false,
    },
    {
      id: "4",
      conversationType: "group",
      displayTitle: "Hope Manor Chat",
      houseName: "Hope Manor",
      lastMessage: {
        content: "Chore rotation for next week is posted",
        sentAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      },
      unreadCount: 0,
      isArchived: false,
    },
    {
      id: "5",
      conversationType: "direct",
      displayTitle: "Jennifer Parker",
      houseName: "Serenity House",
      lastMessage: {
        content: "My family wants to visit this weekend",
        sentAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      },
      unreadCount: 1,
      isArchived: false,
    },
  ];

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  const filteredConversations = conversations
    .filter((c) => {
      if (showArchived !== c.isArchived) return false;
      if (selectedFilter === "unread" && c.unreadCount === 0) return false;
      if (selectedFilter === "direct" && c.conversationType !== "direct") return false;
      if (selectedFilter === "group" && c.conversationType !== "group") return false;
      if (searchQuery && !c.displayTitle.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      // Pinned first, then by last message time
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      const aTime = a.lastMessage ? new Date(a.lastMessage.sentAt).getTime() : 0;
      const bTime = b.lastMessage ? new Date(b.lastMessage.sentAt).getTime() : 0;
      return bTime - aTime;
    });

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getConversationIcon = (type: ConversationType) => {
    switch (type) {
      case "direct":
        return <User className="h-5 w-5 text-slate-500" />;
      case "group":
        return <Users className="h-5 w-5 text-blue-500" />;
      case "announcement":
        return <Bell className="h-5 w-5 text-orange-500" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Messages</h1>
          <p className="text-slate-600 mt-1">
            {totalUnread > 0 ? `${totalUnread} unread messages` : "All caught up"}
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/messages/announcements"
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 flex items-center gap-2"
          >
            <Bell className="h-4 w-4" />
            Announcements
          </Link>
          <Link
            href="/messages/compose"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Message
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MessageSquare className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Total Conversations</p>
              <p className="text-2xl font-bold text-slate-900">{conversations.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <Bell className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Unread Messages</p>
              <p className="text-2xl font-bold text-slate-900">{totalUnread}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <User className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Direct Chats</p>
              <p className="text-2xl font-bold text-slate-900">
                {conversations.filter((c) => c.conversationType === "direct").length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Group Chats</p>
              <p className="text-2xl font-bold text-slate-900">
                {conversations.filter((c) => c.conversationType === "group").length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500" />
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value as any)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Messages</option>
              <option value="unread">Unread</option>
              <option value="direct">Direct Messages</option>
              <option value="group">Group Chats</option>
            </select>
          </div>
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
              showArchived
                ? "bg-slate-100 text-slate-700"
                : "border border-slate-300 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Archive className="h-4 w-4" />
            {showArchived ? "Show Active" : "Archived"}
          </button>
        </div>
      </div>

      {/* Conversations List */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Conversations</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <MessageSquare className="h-12 w-12 mx-auto text-slate-300 mb-4" />
              <p>No conversations found</p>
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <Link
                key={conversation.id}
                href={`/messages/${conversation.id}`}
                className="block p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 p-2 bg-slate-100 rounded-full">
                    {getConversationIcon(conversation.conversationType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {conversation.isPinned && (
                          <Pin className="h-3 w-3 text-blue-500" />
                        )}
                        <h3 className={`font-medium ${conversation.unreadCount > 0 ? "text-slate-900" : "text-slate-700"}`}>
                          {conversation.displayTitle}
                        </h3>
                        {conversation.houseName && (
                          <span className="text-xs text-slate-500">
                            {conversation.houseName}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {conversation.lastMessage && (
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(conversation.lastMessage.sentAt)}
                          </span>
                        )}
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            // TODO: Show options menu
                          }}
                          className="p-1 hover:bg-slate-200 rounded"
                        >
                          <MoreVertical className="h-4 w-4 text-slate-400" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <p className={`text-sm truncate ${conversation.unreadCount > 0 ? "text-slate-700 font-medium" : "text-slate-500"}`}>
                        {conversation.lastMessage?.content || "No messages yet"}
                      </p>
                      {conversation.unreadCount > 0 && (
                        <span className="flex-shrink-0 ml-2 px-2 py-0.5 bg-blue-600 text-white text-xs font-medium rounded-full">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

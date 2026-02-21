"use client";

import { useState } from "react";
import {
  MessageSquare,
  Bell,
  Search,
  User,
  Users,
  Clock,
  ChevronRight,
  Send,
  ArrowLeft,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

export const dynamic = "force-dynamic";

type View = "list" | "conversation";

interface Conversation {
  id: string;
  displayTitle: string;
  conversation_type: "direct" | "group";
  lastMessage: {
    content: string;
    sentAt: Date;
  } | null;
  unreadCount: number;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  published_at: Date | null;
  priority: "low" | "normal" | "high" | "urgent";
  isRead: boolean;
}

function ListSkeleton() {
  return (
    <div className="divide-y divide-zinc-800/50 bg-zinc-900">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-zinc-700 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 bg-zinc-700 rounded"></div>
              <div className="h-3 w-48 bg-zinc-700 rounded"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ResidentMessagesPage() {
  const [view, setView] = useState<View>("list");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"messages" | "announcements">("messages");

  const { data: conversations, isLoading: conversationsLoading, error: conversationsError } = trpc.conversation.list.useQuery();
  const { data: announcements, isLoading: announcementsLoading, error: announcementsError } = trpc.announcement.list.useQuery();
  const { data: selectedConversation } = trpc.conversation.getById.useQuery(
    { conversationId: selectedConversationId! },
    { enabled: !!selectedConversationId }
  );
  const { data: messagesData } = trpc.message.list.useQuery(
    { conversationId: selectedConversationId!, limit: 50 },
    { enabled: !!selectedConversationId }
  );

  const utils = trpc.useUtils();
  const sendMessage = trpc.message.send.useMutation({
    onSuccess: () => {
      setNewMessage("");
      if (selectedConversationId) {
        utils.message.list.invalidate({ conversationId: selectedConversationId });
        utils.conversation.list.invalidate();
      }
    },
  });

  const isLoading = activeTab === "messages" ? conversationsLoading : announcementsLoading;
  const error = activeTab === "messages" ? conversationsError : announcementsError;

  const totalUnread = conversations?.reduce((sum, c) => sum + c.unreadCount, 0) ?? 0;
  const unreadAnnouncements = announcements?.filter((a) => !a.isRead).length ?? 0;

  const formatTime = (date: Date | null) => {
    if (!date) return "";
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // List View
  if (view === "list") {
    return (
      <div className="flex flex-col h-full bg-zinc-800/40">
        {/* Header */}
        <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-3">
          <h1 className="text-xl font-bold text-zinc-100">Messages</h1>
        </div>

        {/* Tabs */}
        <div className="bg-zinc-900 border-b border-zinc-800 flex">
          <button
            onClick={() => setActiveTab("messages")}
            className={`flex-1 py-3 text-sm font-medium relative ${
              activeTab === "messages" ? "text-indigo-400" : "text-zinc-400"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Messages
              {totalUnread > 0 && (
                <span className="px-1.5 py-0.5 bg-indigo-500 text-white text-xs rounded-full">
                  {totalUnread}
                </span>
              )}
            </div>
            {activeTab === "messages" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("announcements")}
            className={`flex-1 py-3 text-sm font-medium relative ${
              activeTab === "announcements" ? "text-indigo-400" : "text-zinc-400"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Bell className="h-4 w-4" />
              Announcements
              {unreadAnnouncements > 0 && (
                <span className="px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  {unreadAnnouncements}
                </span>
              )}
            </div>
            {activeTab === "announcements" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
            )}
          </button>
        </div>

        {/* Search */}
        <div className="p-4 bg-zinc-900 border-b border-zinc-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-zinc-800 border-0 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="m-4 bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-400">{error.message}</p>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <ListSkeleton />
          ) : activeTab === "messages" ? (
            <div className="divide-y divide-zinc-800/50 bg-zinc-900">
              {!conversations || conversations.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageSquare className="h-12 w-12 mx-auto text-zinc-600 mb-4" />
                  <p className="font-medium text-zinc-100">No messages yet</p>
                  <p className="text-sm text-zinc-500 mt-1">Your conversations will appear here</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => {
                      setSelectedConversationId(conv.id);
                      setView("conversation");
                    }}
                    className="w-full flex items-center gap-3 p-4 hover:bg-zinc-800/40 text-left"
                  >
                    <div className="p-2 bg-zinc-800 rounded-full">
                      {conv.conversation_type === "direct" ? (
                        <User className="h-5 w-5 text-zinc-400" />
                      ) : (
                        <Users className="h-5 w-5 text-indigo-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className={`font-medium ${conv.unreadCount > 0 ? "text-zinc-100" : "text-zinc-300"}`}>
                          {conv.displayTitle}
                        </h3>
                        {conv.lastMessage && (
                          <span className="text-xs text-zinc-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(conv.lastMessage.sentAt)}
                          </span>
                        )}
                      </div>
                      <p className={`text-sm truncate ${conv.unreadCount > 0 ? "text-zinc-300 font-medium" : "text-zinc-500"}`}>
                        {conv.lastMessage?.content ?? "No messages yet"}
                      </p>
                    </div>
                    {conv.unreadCount > 0 && (
                      <span className="px-2 py-0.5 bg-indigo-500 text-white text-xs font-medium rounded-full">
                        {conv.unreadCount}
                      </span>
                    )}
                    <ChevronRight className="h-5 w-5 text-zinc-500" />
                  </button>
                ))
              )}
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/50 bg-zinc-900">
              {!announcements || announcements.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="h-12 w-12 mx-auto text-zinc-600 mb-4" />
                  <p className="font-medium text-zinc-100">No announcements</p>
                  <p className="text-sm text-zinc-500 mt-1">Announcements from your house will appear here</p>
                </div>
              ) : (
                announcements.map((ann) => (
                  <div
                    key={ann.id}
                    className={`p-4 ${!ann.isRead ? "bg-indigo-500/10" : ""}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${
                        ann.priority === "urgent" ? "bg-red-500/15" :
                        ann.priority === "high" ? "bg-amber-500/15" : "bg-zinc-800"
                      }`}>
                        <Bell className={`h-5 w-5 ${
                          ann.priority === "urgent" ? "text-red-400" :
                          ann.priority === "high" ? "text-amber-400" : "text-zinc-400"
                        }`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className={`font-medium ${!ann.isRead ? "text-zinc-100" : "text-zinc-300"}`}>
                            {ann.title}
                          </h3>
                          {!ann.isRead && (
                            <span className="w-2 h-2 bg-indigo-500 rounded-full" />
                          )}
                        </div>
                        <p className="text-sm text-zinc-400 mb-2">{ann.content}</p>
                        <p className="text-xs text-zinc-500">{formatTime(ann.published_at)}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Conversation View
  const messages = messagesData?.messages ?? [];

  return (
    <div className="flex flex-col h-full bg-zinc-900">
      {/* Header */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => setView("list")}
          className="p-1 hover:bg-zinc-800 rounded"
        >
          <ArrowLeft className="h-5 w-5 text-zinc-400" />
        </button>
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-zinc-800 rounded-full">
            {selectedConversation?.conversation_type === "direct" ? (
              <User className="h-4 w-4 text-zinc-400" />
            ) : (
              <Users className="h-4 w-4 text-indigo-400" />
            )}
          </div>
          <h1 className="font-semibold text-zinc-100">
            {selectedConversation?.title ?? "Conversation"}
          </h1>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 mx-auto text-zinc-600 mb-4" />
            <p className="text-zinc-500">No messages yet</p>
            <p className="text-sm text-zinc-500 mt-1">Send a message to start the conversation</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.isOwnMessage ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                  msg.isOwnMessage
                    ? "bg-indigo-500 text-white rounded-br-md"
                    : "bg-zinc-800 text-zinc-100 rounded-bl-md"
                }`}
              >
                <p className="text-sm">{msg.content}</p>
                <p className={`text-xs mt-1 ${msg.isOwnMessage ? "text-indigo-600" : "text-zinc-500"}`}>
                  {formatTime(msg.sentAt)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="border-t border-zinc-800 p-4 bg-zinc-900">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && newMessage.trim() && selectedConversationId) {
                e.preventDefault();
                sendMessage.mutate({ conversationId: selectedConversationId, content: newMessage.trim() });
              }
            }}
            className="flex-1 px-4 py-2 bg-zinc-800 border-0 rounded-full text-sm focus:ring-2 focus:ring-indigo-500"
          />
          <button
            disabled={!newMessage.trim() || sendMessage.isPending}
            onClick={() => {
              if (!newMessage.trim() || !selectedConversationId) return;
              sendMessage.mutate({
                conversationId: selectedConversationId,
                content: newMessage.trim(),
              });
            }}
            className={`p-2 rounded-full ${
              newMessage.trim() && !sendMessage.isPending
                ? "bg-indigo-500 text-white"
                : "bg-zinc-800 text-zinc-500"
            }`}
          >
            {sendMessage.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

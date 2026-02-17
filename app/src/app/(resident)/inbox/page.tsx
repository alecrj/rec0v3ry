"use client";

import { useState } from "react";
import Link from "next/link";
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
} from "lucide-react";

export const dynamic = "force-dynamic";

type View = "list" | "conversation" | "announcements";

interface Conversation {
  id: string;
  displayTitle: string;
  conversationType: "direct" | "group";
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  publishedAt: string;
  priority: "low" | "normal" | "high" | "urgent";
  isRead: boolean;
}

interface Message {
  id: string;
  content: string;
  senderName: string;
  sentAt: string;
  isOwnMessage: boolean;
}

export default function ResidentMessagesPage() {
  const [view, setView] = useState<View>("list");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"messages" | "announcements">("messages");

  // Mock data
  const conversations: Conversation[] = [
    {
      id: "1",
      displayTitle: "House Manager",
      conversationType: "direct",
      lastMessage: "Yes, I can help you with that.",
      lastMessageTime: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      unreadCount: 1,
    },
    {
      id: "2",
      displayTitle: "Serenity House Chat",
      conversationType: "group",
      lastMessage: "Reminder: House meeting at 6pm",
      lastMessageTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      unreadCount: 3,
    },
    {
      id: "3",
      displayTitle: "Case Manager",
      conversationType: "direct",
      lastMessage: "Your appointment is confirmed for Thursday.",
      lastMessageTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      unreadCount: 0,
    },
  ];

  const announcements: Announcement[] = [
    {
      id: "1",
      title: "Holiday Schedule",
      content: "The office will be closed on February 19th for Presidents Day.",
      publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      priority: "high",
      isRead: false,
    },
    {
      id: "2",
      title: "Community Meeting",
      content: "Weekly community meeting this Wednesday at 6 PM.",
      publishedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      priority: "urgent",
      isRead: true,
    },
  ];

  const messages: Message[] = [
    {
      id: "1",
      content: "Hi, I have a question about the curfew policy.",
      senderName: "You",
      sentAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      isOwnMessage: true,
    },
    {
      id: "2",
      content: "Of course! What would you like to know?",
      senderName: "House Manager",
      sentAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      isOwnMessage: false,
    },
    {
      id: "3",
      content: "Can I request a late return for this weekend?",
      senderName: "You",
      sentAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      isOwnMessage: true,
    },
    {
      id: "4",
      content: "Yes, I can help you with that.",
      senderName: "House Manager",
      sentAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      isOwnMessage: false,
    },
  ];

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);
  const unreadAnnouncements = announcements.filter((a) => !a.isRead).length;

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const selectedConversation = conversations.find((c) => c.id === selectedConversationId);

  // List View
  if (view === "list") {
    return (
      <div className="flex flex-col h-full bg-slate-50">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-4 py-3">
          <h1 className="text-xl font-bold text-slate-900">Messages</h1>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b border-slate-200 flex">
          <button
            onClick={() => setActiveTab("messages")}
            className={`flex-1 py-3 text-sm font-medium relative ${
              activeTab === "messages" ? "text-blue-600" : "text-slate-600"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Messages
              {totalUnread > 0 && (
                <span className="px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                  {totalUnread}
                </span>
              )}
            </div>
            {activeTab === "messages" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("announcements")}
            className={`flex-1 py-3 text-sm font-medium relative ${
              activeTab === "announcements" ? "text-blue-600" : "text-slate-600"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Bell className="h-4 w-4" />
              Announcements
              {unreadAnnouncements > 0 && (
                <span className="px-1.5 py-0.5 bg-red-600 text-white text-xs rounded-full">
                  {unreadAnnouncements}
                </span>
              )}
            </div>
            {activeTab === "announcements" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
            )}
          </button>
        </div>

        {/* Search */}
        <div className="p-4 bg-white border-b border-slate-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-100 border-0 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === "messages" ? (
            <div className="divide-y divide-slate-100 bg-white">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => {
                    setSelectedConversationId(conv.id);
                    setView("conversation");
                  }}
                  className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 text-left"
                >
                  <div className="p-2 bg-slate-100 rounded-full">
                    {conv.conversationType === "direct" ? (
                      <User className="h-5 w-5 text-slate-600" />
                    ) : (
                      <Users className="h-5 w-5 text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className={`font-medium ${conv.unreadCount > 0 ? "text-slate-900" : "text-slate-700"}`}>
                        {conv.displayTitle}
                      </h3>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(conv.lastMessageTime)}
                      </span>
                    </div>
                    <p className={`text-sm truncate ${conv.unreadCount > 0 ? "text-slate-700 font-medium" : "text-slate-500"}`}>
                      {conv.lastMessage}
                    </p>
                  </div>
                  {conv.unreadCount > 0 && (
                    <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-medium rounded-full">
                      {conv.unreadCount}
                    </span>
                  )}
                  <ChevronRight className="h-5 w-5 text-slate-400" />
                </button>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 bg-white">
              {announcements.map((ann) => (
                <div
                  key={ann.id}
                  className={`p-4 ${!ann.isRead ? "bg-blue-50/50" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      ann.priority === "urgent" ? "bg-red-100" :
                      ann.priority === "high" ? "bg-orange-100" : "bg-slate-100"
                    }`}>
                      <Bell className={`h-5 w-5 ${
                        ann.priority === "urgent" ? "text-red-600" :
                        ann.priority === "high" ? "text-orange-600" : "text-slate-600"
                      }`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`font-medium ${!ann.isRead ? "text-slate-900" : "text-slate-700"}`}>
                          {ann.title}
                        </h3>
                        {!ann.isRead && (
                          <span className="w-2 h-2 bg-blue-600 rounded-full" />
                        )}
                      </div>
                      <p className="text-sm text-slate-600 mb-2">{ann.content}</p>
                      <p className="text-xs text-slate-500">{formatTime(ann.publishedAt)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Conversation View
  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => setView("list")}
          className="p-1 hover:bg-slate-100 rounded"
        >
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </button>
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-slate-100 rounded-full">
            {selectedConversation?.conversationType === "direct" ? (
              <User className="h-4 w-4 text-slate-600" />
            ) : (
              <Users className="h-4 w-4 text-blue-600" />
            )}
          </div>
          <h1 className="font-semibold text-slate-900">
            {selectedConversation?.displayTitle}
          </h1>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.isOwnMessage ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                msg.isOwnMessage
                  ? "bg-blue-600 text-white rounded-br-md"
                  : "bg-slate-100 text-slate-900 rounded-bl-md"
              }`}
            >
              <p className="text-sm">{msg.content}</p>
              <p className={`text-xs mt-1 ${msg.isOwnMessage ? "text-blue-200" : "text-slate-500"}`}>
                {formatTime(msg.sentAt)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="border-t border-slate-200 p-4 bg-white">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 bg-slate-100 border-0 rounded-full text-sm focus:ring-2 focus:ring-blue-500"
          />
          <button
            disabled={!newMessage.trim()}
            className={`p-2 rounded-full ${
              newMessage.trim()
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-400"
            }`}
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

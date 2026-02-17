"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bell,
  Plus,
  Search,
  Filter,
  Pin,
  Clock,
  Users,
  Home,
  Eye,
  EyeOff,
  MoreVertical,
  ArrowLeft,
  Edit,
  Trash2,
  CheckCircle,
} from "lucide-react";

export const dynamic = "force-dynamic";

type Priority = "low" | "normal" | "high" | "urgent";

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: Priority;
  isPinned: boolean;
  isDraft: boolean;
  publishedAt: string | null;
  expiresAt: string | null;
  houseName: string | null;
  scope: "organization" | "house";
  readCount: number;
  totalRecipients: number;
  isRead: boolean;
  createdAt: string;
}

export default function AnnouncementsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedScope, setSelectedScope] = useState<"all" | "organization" | "house">("all");
  const [showDrafts, setShowDrafts] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Mock data
  const announcements: Announcement[] = [
    {
      id: "1",
      title: "Holiday Schedule Update",
      content: "The office will be closed on February 19th for Presidents Day. Emergency contacts will be available as usual.",
      priority: "high",
      isPinned: true,
      isDraft: false,
      publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      houseName: null,
      scope: "organization",
      readCount: 45,
      totalRecipients: 52,
      isRead: true,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "2",
      title: "New House Rules - Quiet Hours",
      content: "Effective immediately, quiet hours are now 10 PM to 7 AM. Please be respectful of other residents during these times.",
      priority: "normal",
      isPinned: false,
      isDraft: false,
      publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      expiresAt: null,
      houseName: "Serenity House",
      scope: "house",
      readCount: 8,
      totalRecipients: 12,
      isRead: false,
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "3",
      title: "Weekly Community Meeting",
      content: "Reminder: Our weekly community meeting is this Wednesday at 6 PM in the common room. Attendance is mandatory for all residents.",
      priority: "urgent",
      isPinned: true,
      isDraft: false,
      publishedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      houseName: null,
      scope: "organization",
      readCount: 48,
      totalRecipients: 52,
      isRead: true,
      createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "4",
      title: "Kitchen Deep Clean Schedule",
      content: "This Saturday we will be doing a deep clean of the kitchen. Please remove all personal items from the refrigerator by Friday.",
      priority: "low",
      isPinned: false,
      isDraft: false,
      publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      expiresAt: null,
      houseName: "Hope Manor",
      scope: "house",
      readCount: 10,
      totalRecipients: 10,
      isRead: true,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "5",
      title: "Draft: February Newsletter",
      content: "Welcome to the February edition of our newsletter...",
      priority: "normal",
      isPinned: false,
      isDraft: true,
      publishedAt: null,
      expiresAt: null,
      houseName: null,
      scope: "organization",
      readCount: 0,
      totalRecipients: 52,
      isRead: false,
      createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    },
  ];

  const stats = {
    total: announcements.filter(a => !a.isDraft).length,
    active: announcements.filter(a => !a.isDraft && (!a.expiresAt || new Date(a.expiresAt) > new Date())).length,
    drafts: announcements.filter(a => a.isDraft).length,
    unread: announcements.filter(a => !a.isDraft && !a.isRead).length,
  };

  const filteredAnnouncements = announcements
    .filter((a) => {
      if (showDrafts !== a.isDraft) return false;
      if (selectedScope !== "all" && a.scope !== selectedScope) return false;
      if (searchQuery && !a.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      // Pinned first, then by published date
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      const aTime = a.publishedAt ? new Date(a.publishedAt).getTime() : new Date(a.createdAt).getTime();
      const bTime = b.publishedAt ? new Date(b.publishedAt).getTime() : new Date(b.createdAt).getTime();
      return bTime - aTime;
    });

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Not published";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getPriorityBadge = (priority: Priority) => {
    const styles: Record<Priority, string> = {
      low: "bg-slate-100 text-slate-600",
      normal: "bg-blue-100 text-blue-700",
      high: "bg-orange-100 text-orange-700",
      urgent: "bg-red-100 text-red-700",
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[priority]}`}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </span>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/messages" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Announcements</h1>
            <p className="text-slate-600 mt-1">
              Broadcast messages to houses and organization
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Announcement
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Bell className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Total Published</p>
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Active</p>
              <p className="text-2xl font-bold text-slate-900">{stats.active}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Edit className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Drafts</p>
              <p className="text-2xl font-bold text-slate-900">{stats.drafts}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <EyeOff className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Unread</p>
              <p className="text-2xl font-bold text-slate-900">{stats.unread}</p>
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
              placeholder="Search announcements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500" />
            <select
              value={selectedScope}
              onChange={(e) => setSelectedScope(e.target.value as any)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Scopes</option>
              <option value="organization">Organization-wide</option>
              <option value="house">House-specific</option>
            </select>
          </div>
          <button
            onClick={() => setShowDrafts(!showDrafts)}
            className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
              showDrafts
                ? "bg-slate-100 text-slate-700"
                : "border border-slate-300 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Edit className="h-4 w-4" />
            {showDrafts ? "Show Published" : "Show Drafts"}
          </button>
        </div>
      </div>

      {/* Announcements List */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">
            {showDrafts ? "Draft Announcements" : "Published Announcements"}
          </h2>
        </div>
        <div className="divide-y divide-slate-100">
          {filteredAnnouncements.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <Bell className="h-12 w-12 mx-auto text-slate-300 mb-4" />
              <p>No announcements found</p>
            </div>
          ) : (
            filteredAnnouncements.map((announcement) => (
              <div
                key={announcement.id}
                className={`p-4 hover:bg-slate-50 transition-colors ${
                  !announcement.isRead && !announcement.isDraft ? "bg-blue-50/30" : ""
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-lg ${announcement.isPinned ? "bg-blue-100" : "bg-slate-100"}`}>
                    {announcement.isPinned ? (
                      <Pin className="h-5 w-5 text-blue-600" />
                    ) : (
                      <Bell className="h-5 w-5 text-slate-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`font-medium ${!announcement.isRead && !announcement.isDraft ? "text-slate-900" : "text-slate-700"}`}>
                        {announcement.title}
                      </h3>
                      {getPriorityBadge(announcement.priority)}
                      {announcement.isDraft && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700">
                          Draft
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 line-clamp-2 mb-2">
                      {announcement.content}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        {announcement.scope === "organization" ? (
                          <Users className="h-3 w-3" />
                        ) : (
                          <Home className="h-3 w-3" />
                        )}
                        {announcement.houseName || "Organization-wide"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(announcement.publishedAt)}
                      </span>
                      {!announcement.isDraft && (
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {announcement.readCount}/{announcement.totalRecipients} read
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
                      <Edit className="h-4 w-4 text-slate-400" />
                    </button>
                    <button className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
                      <Trash2 className="h-4 w-4 text-slate-400" />
                    </button>
                    <button className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
                      <MoreVertical className="h-4 w-4 text-slate-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create Modal Placeholder */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">New Announcement</h2>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  &times;
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  placeholder="Announcement title"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Content</label>
                <textarea
                  rows={6}
                  placeholder="Write your announcement..."
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Scope</label>
                  <select className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="organization">Organization-wide</option>
                    <option value="serenity">Serenity House</option>
                    <option value="hope">Hope Manor</option>
                    <option value="recovery">Recovery Haven</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                  <select className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500" />
                  <span className="text-sm text-slate-700">Pin announcement</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500" />
                  <span className="text-sm text-slate-700">Save as draft</span>
                </label>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
                Publish Announcement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

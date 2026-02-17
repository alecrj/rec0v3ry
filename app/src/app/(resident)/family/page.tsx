"use client";

import { useState } from "react";
import Link from "next/link";
import {
  User,
  Home,
  DollarSign,
  MessageSquare,
  FileText,
  Shield,
  Calendar,
  ChevronRight,
  Clock,
  CheckCircle,
  AlertCircle,
  CreditCard,
  Phone,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface Resident {
  id: string;
  firstName: string;
  lastName: string;
  preferredName: string | null;
  profilePhoto: string | null;
  houseName: string;
  admissionDate: string;
  relationship: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  status: "pending" | "paid" | "overdue";
  dueDate: string;
}

interface Announcement {
  id: string;
  title: string;
  date: string;
  houseName: string;
}

export default function FamilyPortalPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "payments" | "messages">("overview");

  // Mock data - would be fetched from API
  const resident: Resident = {
    id: "r1",
    firstName: "Sarah",
    lastName: "Martinez",
    preferredName: null,
    profilePhoto: null,
    houseName: "Serenity House",
    admissionDate: "2026-01-15",
    relationship: "Parent",
  };

  const invoices: Invoice[] = [
    { id: "1", invoiceNumber: "INV-2026-0087", amount: 1200.00, status: "pending", dueDate: "2026-02-28" },
    { id: "2", invoiceNumber: "INV-2026-0065", amount: 1200.00, status: "paid", dueDate: "2026-01-31" },
    { id: "3", invoiceNumber: "INV-2026-0043", amount: 1200.00, status: "paid", dueDate: "2025-12-31" },
  ];

  const announcements: Announcement[] = [
    { id: "1", title: "House meeting scheduled for Friday", date: "2026-02-17", houseName: "Serenity House" },
    { id: "2", title: "Visitor hours updated for February", date: "2026-02-15", houseName: "Serenity House" },
  ];

  const balance = invoices
    .filter(i => i.status === "pending" || i.status === "overdue")
    .reduce((sum, i) => sum + i.amount, 0);

  const getStatusBadge = (status: "pending" | "paid" | "overdue") => {
    const styles = {
      pending: "bg-yellow-100 text-yellow-700",
      paid: "bg-green-100 text-green-700",
      overdue: "bg-red-100 text-red-700",
    };
    const labels = { pending: "Due", paid: "Paid", overdue: "Overdue" };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const daysInProgram = Math.floor(
    (Date.now() - new Date(resident.admissionDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
            <User className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{resident.firstName} {resident.lastName}</h1>
            <p className="text-blue-100 text-sm">{resident.houseName}</p>
            <p className="text-blue-200 text-xs mt-1">{daysInProgram} days in program</p>
          </div>
        </div>
      </div>

      {/* Part 2 Notice */}
      <div className="mx-4 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
        <div className="flex items-start gap-2">
          <Shield className="h-4 w-4 text-amber-600 mt-0.5" />
          <div>
            <p className="text-xs text-amber-700">
              Your access is protected under 42 CFR Part 2. You can only view information you have been
              consented to access.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white mt-4">
        {(["overview", "payments", "messages"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-600"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {activeTab === "overview" && (
          <>
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Status</p>
                    <p className="font-semibold text-slate-900">Active</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <DollarSign className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Balance Due</p>
                    <p className="font-semibold text-slate-900">${balance.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl border border-slate-200">
              <div className="p-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-900">Quick Actions</h2>
              </div>
              <div className="divide-y divide-slate-100">
                <button
                  onClick={() => setActiveTab("payments")}
                  className="w-full p-4 flex items-center justify-between active:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <CreditCard className="h-5 w-5 text-green-600" />
                    </div>
                    <span className="font-medium text-slate-900">Make a Payment</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-400" />
                </button>
                <button
                  onClick={() => setActiveTab("messages")}
                  className="w-full p-4 flex items-center justify-between active:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <MessageSquare className="h-5 w-5 text-blue-600" />
                    </div>
                    <span className="font-medium text-slate-900">Contact House Manager</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-400" />
                </button>
              </div>
            </div>

            {/* Recent Announcements */}
            <div className="bg-white rounded-xl border border-slate-200">
              <div className="p-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-900">House Announcements</h2>
              </div>
              <div className="divide-y divide-slate-100">
                {announcements.map((announcement) => (
                  <div key={announcement.id} className="p-4">
                    <p className="font-medium text-slate-900">{announcement.title}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                      <Calendar className="h-3 w-3" />
                      {new Date(announcement.date).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* House Info */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h2 className="font-semibold text-slate-900 mb-3">House Information</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Home className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="font-medium text-slate-900">{resident.houseName}</p>
                    <p className="text-xs text-slate-500">Sober Living Residence</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="font-medium text-slate-900">(555) 123-4567</p>
                    <p className="text-xs text-slate-500">House Phone</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="font-medium text-slate-900">Visiting Hours</p>
                    <p className="text-xs text-slate-500">Sat-Sun, 1pm-5pm</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === "payments" && (
          <>
            {/* Balance Card */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl p-4">
              <p className="text-blue-100 text-sm">Current Balance</p>
              <p className="text-3xl font-bold mt-1">${balance.toFixed(2)}</p>
              <button className="mt-4 w-full py-2 bg-white text-blue-600 rounded-lg font-medium active:bg-blue-50">
                Pay Now
              </button>
            </div>

            {/* Invoices */}
            <div className="bg-white rounded-xl border border-slate-200">
              <div className="p-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-900">Recent Invoices</h2>
              </div>
              <div className="divide-y divide-slate-100">
                {invoices.map((invoice) => (
                  <div key={invoice.id} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">{invoice.invoiceNumber}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-slate-500">
                          Due {new Date(invoice.dueDate).toLocaleDateString()}
                        </span>
                        {getStatusBadge(invoice.status)}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900">${invoice.amount.toFixed(2)}</p>
                      {invoice.status === "pending" && (
                        <button className="text-sm text-blue-600 font-medium mt-1">
                          Pay
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Methods */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h2 className="font-semibold text-slate-900 mb-3">Payment Methods</h2>
              <button className="w-full p-3 border border-dashed border-slate-300 rounded-lg text-slate-600 flex items-center justify-center gap-2">
                <CreditCard className="h-4 w-4" />
                Add Payment Method
              </button>
            </div>
          </>
        )}

        {activeTab === "messages" && (
          <>
            {/* Message House Manager */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h2 className="font-semibold text-slate-900 mb-3">Contact House Manager</h2>
              <p className="text-sm text-slate-600 mb-4">
                Send a message to the house manager. Messages are logged for compliance purposes.
              </p>
              <textarea
                rows={4}
                placeholder="Type your message..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-base resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button className="mt-3 w-full py-2 bg-blue-600 text-white rounded-lg font-medium active:bg-blue-700">
                Send Message
              </button>
            </div>

            {/* Previous Messages */}
            <div className="bg-white rounded-xl border border-slate-200">
              <div className="p-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-900">Recent Messages</h2>
              </div>
              <div className="p-8 text-center">
                <MessageSquare className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500">No messages yet</p>
              </div>
            </div>

            {/* Consent Notice */}
            <div className="p-3 bg-slate-100 rounded-xl">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-slate-500 mt-0.5" />
                <p className="text-xs text-slate-600">
                  All communications are recorded and protected under 42 CFR Part 2 regulations.
                  Your messages are only visible to authorized staff.
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Your Relationship Banner */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">
            Viewing as: <span className="font-medium text-slate-900">{resident.relationship}</span>
          </span>
          <button className="text-blue-600 font-medium">Consent Details</button>
        </div>
      </div>
    </div>
  );
}

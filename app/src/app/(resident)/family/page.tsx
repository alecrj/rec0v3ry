"use client";

import { useState } from "react";
import {
  User,
  Home,
  DollarSign,
  MessageSquare,
  Shield,
  Calendar,
  ChevronRight,
  Clock,
  CheckCircle,
  AlertCircle,
  CreditCard,
  Loader2,
  Send,
  X,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useUser } from "@clerk/nextjs";
import { useToast } from "@/components/ui";

export const dynamic = "force-dynamic";

function OverviewSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 h-20"></div>
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 h-20"></div>
      </div>
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 h-32"></div>
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 h-40"></div>
    </div>
  );
}

function PaymentsSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="bg-indigo-500 rounded-xl p-4 h-32"></div>
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 h-48"></div>
    </div>
  );
}

export default function FamilyPortalPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"overview" | "payments" | "messages">("overview");
  const { user } = useUser();
  const userEmail = user?.primaryEmailAddress?.emailAddress;

  // Payment modal state
  const [showPayModal, setShowPayModal] = useState(false);
  const [payInvoiceId, setPayInvoiceId] = useState<string | undefined>();
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<"cash" | "check" | "wire" | "other">("check");

  // Message state
  const [messageText, setMessageText] = useState("");

  // Consent detail state
  const [showConsents, setShowConsents] = useState(false);

  const utils = trpc.useUtils();

  // Get linked residents for this family member
  const { data: linkedResidents, isLoading: residentsLoading, error: residentsError } =
    trpc.familyPortal.getLinkedResidents.useQuery(
      { userEmail: userEmail ?? "" },
      { enabled: !!userEmail }
    );

  // Use first linked resident for now
  const residentId = linkedResidents?.[0]?.resident_id;

  // Get resident summary
  const { data: residentSummary, isLoading: summaryLoading } =
    trpc.familyPortal.getResidentSummary.useQuery(
      { residentId: residentId! },
      { enabled: !!residentId }
    );

  // Get payment summary
  const { data: paymentSummary, isLoading: paymentsLoading } =
    trpc.familyPortal.getPaymentSummary.useQuery(
      { residentId: residentId! },
      { enabled: !!residentId }
    );

  // Get announcements for the house
  const { data: announcements } = trpc.announcement.list.useQuery();

  // Get active consents
  const { data: activeConsents } = trpc.familyPortal.getActiveConsents.useQuery(
    { residentId: residentId!, contactEmail: userEmail },
    { enabled: !!residentId }
  );

  // Get current user data for orgId
  const { data: userData } = trpc.user.getCurrentUser.useQuery();
  const orgId = userData?.org_id;

  // Mutations
  const recordPayment = trpc.payment.recordManual.useMutation({
    onSuccess: () => {
      toast("success", "Payment recorded successfully");
      setShowPayModal(false);
      setPayInvoiceId(undefined);
      setPayAmount("");
      utils.familyPortal.getPaymentSummary.invalidate();
    },
    onError: (err) => toast("error", "Payment failed", err.message),
  });

  const createConversation = trpc.conversation.create.useMutation();
  const sendMessage = trpc.message.send.useMutation({
    onSuccess: () => {
      toast("success", "Message sent to house manager");
      setMessageText("");
    },
    onError: (err) => toast("error", "Failed to send message", err.message),
  });

  const isLoading = residentsLoading || summaryLoading;
  const resident = linkedResidents?.[0];
  const balance = paymentSummary?.balance?.totalDue ?? 0;
  const invoices = paymentSummary?.recentInvoices ?? [];

  const daysInProgram = residentSummary?.admission?.admissionDate
    ? Math.floor((Date.now() - new Date(residentSummary.admission.admissionDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-amber-500/15 text-amber-300",
      paid: "bg-green-500/15 text-green-300",
      overdue: "bg-red-500/15 text-red-300",
      partially_paid: "bg-amber-500/15 text-amber-300",
    };
    const labels: Record<string, string> = {
      pending: "Due",
      paid: "Paid",
      overdue: "Overdue",
      partially_paid: "Partial"
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[status] ?? "bg-zinc-800 text-zinc-300"}`}>
        {labels[status] ?? status}
      </span>
    );
  };

  const handlePayNow = (invoiceId?: string, amount?: number) => {
    setPayInvoiceId(invoiceId);
    setPayAmount(amount ? amount.toFixed(2) : balance.toFixed(2));
    setShowPayModal(true);
  };

  const handleSubmitPayment = () => {
    if (!residentId || !payAmount) return;
    recordPayment.mutate({
      residentId,
      invoiceId: payInvoiceId,
      amount: payAmount,
      paymentMethodType: payMethod,
      paymentDate: new Date().toISOString(),
      notes: "Payment from family portal",
    });
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !orgId) return;
    try {
      // Create or find a DM conversation (the backend handles dedup)
      const conv = await createConversation.mutateAsync({
        orgId,
        conversationType: "direct",
        title: "Family Portal Message",
        // No memberUserIds — will create a general conversation
      });
      await sendMessage.mutateAsync({
        conversationId: conv.id,
        content: messageText.trim(),
      });
    } catch {
      // Error handled by onError callbacks
    }
  };

  // Empty state - no linked residents
  if (!residentsLoading && (!linkedResidents || linkedResidents.length === 0)) {
    return (
      <div className="min-h-screen bg-zinc-800/40 flex items-center justify-center p-4">
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-8 max-w-md text-center">
          <User className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-zinc-100 mb-2">No Linked Residents</h2>
          <p className="text-zinc-400 text-sm">
            You don&apos;t have access to any resident profiles yet. Please contact the house manager to set up your family portal access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-800/40 pb-16">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white px-4 py-6">
        {isLoading ? (
          <div className="flex items-center gap-4 animate-pulse">
            <div className="w-16 h-16 rounded-full bg-zinc-900/20"></div>
            <div className="space-y-2">
              <div className="h-5 w-32 bg-zinc-900/20 rounded"></div>
              <div className="h-4 w-24 bg-zinc-900/20 rounded"></div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-zinc-900/20 flex items-center justify-center">
              <User className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">
                {residentSummary?.resident.firstName} {resident?.resident_last_name}
              </h1>
              <p className="text-indigo-700 text-sm">{resident?.house_name ?? "Residence"}</p>
              <p className="text-indigo-600 text-xs mt-1">{daysInProgram} days in program</p>
            </div>
          </div>
        )}
      </div>

      {/* Part 2 Notice */}
      <div className="mx-4 mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
        <div className="flex items-start gap-2">
          <Shield className="h-4 w-4 text-amber-400 mt-0.5" />
          <div>
            <p className="text-xs text-amber-300">
              Your access is protected under 42 CFR Part 2. You can only view information you have been
              consented to access.
            </p>
          </div>
        </div>
      </div>

      {/* Error State */}
      {residentsError && (
        <div className="mx-4 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-400 mt-0.5" />
            <p className="text-xs text-red-300">{residentsError.message}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-zinc-800 bg-zinc-900 mt-4">
        {(["overview", "payments", "messages"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-zinc-400"
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
            {isLoading ? (
              <OverviewSkeleton />
            ) : (
              <>
                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500/15 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-green-400" />
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500">Status</p>
                        <p className="font-semibold text-zinc-100">
                          {residentSummary?.admission?.status === "active" ? "Active" : "Inactive"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-500/15 rounded-lg">
                        <DollarSign className="h-5 w-5 text-indigo-400" />
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500">Balance Due</p>
                        <p className="font-semibold text-zinc-100">${balance.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-zinc-900 rounded-xl border border-zinc-800">
                  <div className="p-4 border-b border-zinc-800/50">
                    <h2 className="font-semibold text-zinc-100">Quick Actions</h2>
                  </div>
                  <div className="divide-y divide-zinc-800/50">
                    <button
                      onClick={() => setActiveTab("payments")}
                      className="w-full p-4 flex items-center justify-between active:bg-zinc-800/40"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500/15 rounded-lg">
                          <CreditCard className="h-5 w-5 text-green-400" />
                        </div>
                        <span className="font-medium text-zinc-100">Make a Payment</span>
                      </div>
                      <ChevronRight className="h-5 w-5 text-zinc-500" />
                    </button>
                    <button
                      onClick={() => setActiveTab("messages")}
                      className="w-full p-4 flex items-center justify-between active:bg-zinc-800/40"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/15 rounded-lg">
                          <MessageSquare className="h-5 w-5 text-indigo-400" />
                        </div>
                        <span className="font-medium text-zinc-100">Contact House Manager</span>
                      </div>
                      <ChevronRight className="h-5 w-5 text-zinc-500" />
                    </button>
                  </div>
                </div>

                {/* Recent Announcements */}
                <div className="bg-zinc-900 rounded-xl border border-zinc-800">
                  <div className="p-4 border-b border-zinc-800/50">
                    <h2 className="font-semibold text-zinc-100">House Announcements</h2>
                  </div>
                  {!announcements || announcements.length === 0 ? (
                    <div className="p-6 text-center">
                      <p className="text-zinc-500 text-sm">No recent announcements</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-800/50">
                      {announcements.slice(0, 3).map((announcement) => (
                        <div key={announcement.id} className="p-4">
                          <p className="font-medium text-zinc-100">{announcement.title}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
                            <Calendar className="h-3 w-3" />
                            {announcement.published_at
                              ? new Date(announcement.published_at).toLocaleDateString()
                              : "Draft"}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* House Info */}
                <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
                  <h2 className="font-semibold text-zinc-100 mb-3">House Information</h2>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Home className="h-4 w-4 text-zinc-500" />
                      <div>
                        <p className="font-medium text-zinc-100">{resident?.house_name ?? "Residence"}</p>
                        <p className="text-xs text-zinc-500">Sober Living Residence</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-zinc-500" />
                      <div>
                        <p className="font-medium text-zinc-100">Visiting Hours</p>
                        <p className="text-xs text-zinc-500">Contact house manager for schedule</p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {activeTab === "payments" && (
          <>
            {paymentsLoading ? (
              <PaymentsSkeleton />
            ) : (
              <>
                {/* Balance Card */}
                <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-xl p-4">
                  <p className="text-indigo-700 text-sm">Current Balance</p>
                  <p className="text-3xl font-bold mt-1">${balance.toFixed(2)}</p>
                  {balance > 0 && (
                    <button
                      onClick={() => handlePayNow()}
                      className="mt-4 w-full py-2 bg-zinc-900 text-indigo-400 rounded-lg font-medium active:bg-indigo-500/10"
                    >
                      Pay Now
                    </button>
                  )}
                </div>

                {/* Invoices */}
                <div className="bg-zinc-900 rounded-xl border border-zinc-800">
                  <div className="p-4 border-b border-zinc-800/50">
                    <h2 className="font-semibold text-zinc-100">Recent Invoices</h2>
                  </div>
                  {invoices.length === 0 ? (
                    <div className="p-6 text-center">
                      <p className="text-zinc-500 text-sm">No invoices yet</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-800/50">
                      {invoices.map((invoice) => (
                        <div key={invoice.id} className="p-4 flex items-center justify-between">
                          <div>
                            <p className="font-medium text-zinc-100">{invoice.invoice_number}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-sm text-zinc-500">
                                Due {new Date(invoice.due_date).toLocaleDateString()}
                              </span>
                              {getStatusBadge(invoice.status)}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-zinc-100">
                              ${Number(invoice.total).toFixed(2)}
                            </p>
                            {(invoice.status === "pending" || invoice.status === "overdue") && (
                              <button
                                onClick={() => handlePayNow(invoice.id, Number(invoice.total))}
                                className="text-sm text-indigo-400 font-medium mt-1"
                              >
                                Pay
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Payment Methods */}
                <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
                  <h2 className="font-semibold text-zinc-100 mb-3">Payment Methods</h2>
                  <button
                    onClick={() => toast("info", "Card payments coming soon", "Stripe integration is being configured. Use check or cash for now.")}
                    className="w-full p-3 border border-dashed border-zinc-700 rounded-lg text-zinc-400 flex items-center justify-center gap-2"
                  >
                    <CreditCard className="h-4 w-4" />
                    Add Payment Method
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {activeTab === "messages" && (
          <>
            {/* Message House Manager */}
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
              <h2 className="font-semibold text-zinc-100 mb-3">Contact House Manager</h2>
              <p className="text-sm text-zinc-400 mb-4">
                Send a message to the house manager. Messages are logged for compliance purposes.
              </p>
              <textarea
                rows={4}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Type your message..."
                className="w-full px-3 py-2 border border-zinc-700 rounded-lg text-base resize-none bg-zinc-800/40 text-zinc-100 placeholder:text-zinc-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <button
                onClick={handleSendMessage}
                disabled={!messageText.trim() || sendMessage.isPending || createConversation.isPending}
                className="mt-3 w-full py-2 bg-indigo-500 text-white rounded-lg font-medium active:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {sendMessage.isPending || createConversation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {sendMessage.isPending ? "Sending..." : "Send Message"}
              </button>
            </div>

            {/* Previous Messages */}
            <div className="bg-zinc-900 rounded-xl border border-zinc-800">
              <div className="p-4 border-b border-zinc-800/50">
                <h2 className="font-semibold text-zinc-100">Recent Messages</h2>
              </div>
              {paymentSummary?.recentPayments && paymentSummary.recentPayments.length > 0 ? (
                <div className="divide-y divide-zinc-800/50">
                  {/* Show payment confirmations as "messages" for now */}
                  {paymentSummary.recentPayments.map((p) => (
                    <div key={p.id} className="p-4">
                      <p className="text-sm text-zinc-300">
                        Payment of ${Number(p.amount).toFixed(2)} ({p.payment_method_type})
                      </p>
                      <p className="text-xs text-zinc-500 mt-1">
                        {p.created_at ? new Date(p.created_at).toLocaleDateString() : ""}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <MessageSquare className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
                  <p className="text-zinc-500">No messages yet</p>
                </div>
              )}
            </div>

            {/* Consent Notice */}
            <div className="p-3 bg-zinc-800 rounded-xl">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-zinc-500 mt-0.5" />
                <p className="text-xs text-zinc-400">
                  All communications are recorded and protected under 42 CFR Part 2 regulations.
                  Your messages are only visible to authorized staff.
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Your Relationship Banner */}
      <div className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 px-4 py-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-400">
            Viewing as: <span className="font-medium text-zinc-100">{resident?.relationship ?? "Family"}</span>
          </span>
          <button
            onClick={() => setShowConsents(true)}
            className="text-indigo-400 font-medium"
          >
            Consent Details
          </button>
        </div>
      </div>

      {/* Payment Modal */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
          <div className="bg-zinc-900 border-t border-zinc-800 rounded-t-2xl p-6 w-full max-w-lg animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-zinc-100">Record Payment</h3>
              <button onClick={() => setShowPayModal(false)} className="p-1 text-zinc-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-2 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Payment Method</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as typeof payMethod)}
                  className="w-full px-3 py-2 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="check">Check</option>
                  <option value="cash">Cash</option>
                  <option value="wire">Wire Transfer</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <button
                onClick={handleSubmitPayment}
                disabled={recordPayment.isPending || !payAmount}
                className="w-full py-3 bg-indigo-500 text-white rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {recordPayment.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <DollarSign className="h-4 w-4" />
                )}
                {recordPayment.isPending ? "Processing..." : `Pay $${payAmount}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Consent Details Modal */}
      {showConsents && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
          <div className="bg-zinc-900 border-t border-zinc-800 rounded-t-2xl p-6 w-full max-w-lg max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-zinc-100">Active Consents</h3>
              <button onClick={() => setShowConsents(false)} className="p-1 text-zinc-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            {!activeConsents || activeConsents.length === 0 ? (
              <p className="text-sm text-zinc-400">No active consents found.</p>
            ) : (
              <div className="space-y-3">
                {activeConsents.map((c) => (
                  <div key={c.id} className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-800">
                    <p className="text-sm font-medium text-zinc-100">
                      {c.consent_type.replace(/_/g, " ")}
                    </p>
                    <p className="text-xs text-zinc-400 mt-1">{c.purpose}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
                      <span>Scope: {c.scope_of_information}</span>
                      {c.expires_at && (
                        <span>Expires: {new Date(c.expires_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

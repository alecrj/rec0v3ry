"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Search,
  User,
  Users,
  X,
  Send,
  Home,
  AlertTriangle,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface Recipient {
  id: string;
  name: string;
  type: "user" | "resident" | "house";
  houseName?: string;
  email?: string;
  hasConsent?: boolean;
}

export default function ComposeMessagePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRecipients, setSelectedRecipients] = useState<Recipient[]>([]);
  const [messageContent, setMessageContent] = useState("");
  const [conversationType, setConversationType] = useState<"direct" | "group">("direct");
  const [groupName, setGroupName] = useState("");
  const [showConsentWarning, setShowConsentWarning] = useState(false);

  // Mock data
  const availableRecipients: Recipient[] = [
    { id: "1", name: "Sarah Martinez", type: "resident", houseName: "Serenity House", hasConsent: true },
    { id: "2", name: "Michael Chen", type: "resident", houseName: "Hope Manor", hasConsent: true },
    { id: "3", name: "Jennifer Parker", type: "resident", houseName: "Serenity House", hasConsent: false },
    { id: "4", name: "David Wilson", type: "resident", houseName: "Hope Manor", hasConsent: true },
    { id: "5", name: "Emily Thompson", type: "resident", houseName: "Recovery Haven", hasConsent: true },
    { id: "6", name: "John Smith (House Manager)", type: "user", email: "john@recoveryos.com" },
    { id: "7", name: "Jane Doe (Case Manager)", type: "user", email: "jane@recoveryos.com" },
    { id: "8", name: "Serenity House", type: "house" },
    { id: "9", name: "Hope Manor", type: "house" },
    { id: "10", name: "Recovery Haven", type: "house" },
  ];

  const filteredRecipients = availableRecipients.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !selectedRecipients.find((s) => s.id === r.id)
  );

  const addRecipient = (recipient: Recipient) => {
    // If selecting a house, switch to group mode
    if (recipient.type === "house") {
      setConversationType("group");
      setGroupName(recipient.name + " Chat");
    }

    // Check consent for residents
    if (recipient.type === "resident" && !recipient.hasConsent) {
      setShowConsentWarning(true);
    }

    setSelectedRecipients([...selectedRecipients, recipient]);
    setSearchQuery("");

    // If more than one recipient, switch to group
    if (selectedRecipients.length >= 1) {
      setConversationType("group");
    }
  };

  const removeRecipient = (recipientId: string) => {
    const newRecipients = selectedRecipients.filter((r) => r.id !== recipientId);
    setSelectedRecipients(newRecipients);

    // If only one recipient left, switch back to direct
    if (newRecipients.length <= 1 && newRecipients[0]?.type !== "house") {
      setConversationType("direct");
    }

    // Update consent warning
    if (!newRecipients.some((r) => r.type === "resident" && !r.hasConsent)) {
      setShowConsentWarning(false);
    }
  };

  const handleSend = () => {
    if (selectedRecipients.length === 0 || !messageContent.trim()) return;

    // TODO: Call API to create conversation and send message
    console.log("Creating conversation:", {
      type: conversationType,
      recipients: selectedRecipients,
      groupName: conversationType === "group" ? groupName : undefined,
      message: messageContent,
    });

    // Redirect to the new conversation
    router.push("/messages");
  };

  const getRecipientIcon = (type: string) => {
    switch (type) {
      case "resident":
        return <User className="h-4 w-4 text-green-600" />;
      case "user":
        return <User className="h-4 w-4 text-blue-600" />;
      case "house":
        return <Home className="h-4 w-4 text-purple-600" />;
      default:
        return <User className="h-4 w-4 text-slate-500" />;
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/messages"
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">New Message</h1>
      </div>

      <div className="bg-white rounded-lg border border-slate-200">
        {/* Recipients Section */}
        <div className="p-4 border-b border-slate-200">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            To:
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {selectedRecipients.map((recipient) => (
              <span
                key={recipient.id}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm ${
                  recipient.type === "resident" && !recipient.hasConsent
                    ? "bg-amber-100 text-amber-800"
                    : "bg-blue-100 text-blue-800"
                }`}
              >
                {getRecipientIcon(recipient.type)}
                {recipient.name}
                <button
                  onClick={() => removeRecipient(recipient.id)}
                  className="ml-1 hover:text-blue-900"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search residents, staff, or houses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Search Results */}
          {searchQuery && filteredRecipients.length > 0 && (
            <div className="mt-2 border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-48 overflow-y-auto">
              {filteredRecipients.map((recipient) => (
                <button
                  key={recipient.id}
                  onClick={() => addRecipient(recipient)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 text-left"
                >
                  <div className="p-1.5 bg-slate-100 rounded-full">
                    {getRecipientIcon(recipient.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">{recipient.name}</p>
                    <p className="text-xs text-slate-500">
                      {recipient.houseName || recipient.email || `${recipient.type}`}
                    </p>
                  </div>
                  {recipient.type === "resident" && !recipient.hasConsent && (
                    <span className="text-xs text-amber-600 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      No consent
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Consent Warning */}
        {showConsentWarning && (
          <div className="px-4 py-3 bg-amber-50 border-b border-amber-100">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  Consent Required
                </p>
                <p className="text-sm text-amber-700 mt-1">
                  One or more recipients do not have active Part 2 consent.
                  Messages containing protected health information cannot be sent
                  without proper consent on file.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Group Name (if group chat) */}
        {conversationType === "group" && (
          <div className="p-4 border-b border-slate-200">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Group Name:
            </label>
            <input
              type="text"
              placeholder="Enter group name..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        )}

        {/* Message Content */}
        <div className="p-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Message:
          </label>
          <textarea
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value)}
            placeholder="Type your message..."
            rows={6}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-slate-200 flex justify-between items-center">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            {conversationType === "group" ? (
              <>
                <Users className="h-4 w-4" />
                <span>Group conversation with {selectedRecipients.length} recipients</span>
              </>
            ) : selectedRecipients.length > 0 ? (
              <>
                <User className="h-4 w-4" />
                <span>Direct message to {selectedRecipients[0]?.name}</span>
              </>
            ) : (
              <span>Select recipients to start a conversation</span>
            )}
          </div>
          <div className="flex gap-3">
            <Link
              href="/messages"
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50"
            >
              Cancel
            </Link>
            <button
              onClick={handleSend}
              disabled={selectedRecipients.length === 0 || !messageContent.trim()}
              className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${
                selectedRecipients.length > 0 && messageContent.trim()
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
              }`}
            >
              <Send className="h-4 w-4" />
              Send Message
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

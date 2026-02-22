"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Search,
  User,
  Users,
  X,
  Send,
  Home,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  PageContainer,
  Card,
  CardContent,
  Button,
} from "@/components/ui";

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

  const { data: usersData, isLoading: usersLoading } = trpc.user.list.useQuery({ limit: 100 });
  const { data: residentsData, isLoading: residentsLoading } = trpc.resident.list.useQuery({
    status: "active",
    limit: 100,
  });

  const isLoading = usersLoading || residentsLoading;

  const userItems = Array.isArray(usersData) ? usersData : (usersData?.items ?? []);
  const residentItems = Array.isArray(residentsData) ? residentsData : (residentsData?.items ?? []);

  const availableRecipients: Recipient[] = [
    ...userItems.map((u: { id: string; first_name: string; last_name: string; email: string | null }) => ({
      id: u.id,
      name: `${u.first_name} ${u.last_name}`,
      type: "user" as const,
      email: u.email ?? undefined,
    })),
    ...residentItems.map((r: { id: string; first_name: string; last_name: string; house_name: string | null }) => ({
      id: r.id,
      name: `${r.first_name} ${r.last_name}`,
      type: "resident" as const,
      houseName: r.house_name ?? undefined,
      hasConsent: true,
    })),
  ];

  const filteredRecipients = availableRecipients.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !selectedRecipients.find((s) => s.id === r.id)
  );

  const addRecipient = (recipient: Recipient) => {
    if (recipient.type === "house") {
      setConversationType("group");
      setGroupName(recipient.name + " Chat");
    }
    if (recipient.type === "resident" && !recipient.hasConsent) {
      setShowConsentWarning(true);
    }
    setSelectedRecipients([...selectedRecipients, recipient]);
    setSearchQuery("");
    if (selectedRecipients.length >= 1) {
      setConversationType("group");
    }
  };

  const removeRecipient = (recipientId: string) => {
    const newRecipients = selectedRecipients.filter((r) => r.id !== recipientId);
    setSelectedRecipients(newRecipients);
    if (newRecipients.length <= 1 && newRecipients[0]?.type !== "house") {
      setConversationType("direct");
    }
    if (!newRecipients.some((r) => r.type === "resident" && !r.hasConsent)) {
      setShowConsentWarning(false);
    }
  };

  const createConversation = trpc.conversation.create.useMutation();
  const sendMessage = trpc.message.send.useMutation();

  const handleSend = async () => {
    if (selectedRecipients.length === 0 || !messageContent.trim()) return;

    try {
      const result = await createConversation.mutateAsync({
        orgId: "",
        conversationType: conversationType,
        title: conversationType === "group" ? groupName : undefined,
        memberUserIds: selectedRecipients
          .filter((r) => r.type === "user")
          .map((r) => r.id),
        memberResidentIds: selectedRecipients
          .filter((r) => r.type === "resident")
          .map((r) => r.id),
      });

      await sendMessage.mutateAsync({
        conversationId: result.id,
        content: messageContent,
      });

      router.push(`/messages/${result.id}`);
    } catch (error) {
      console.error("Error creating conversation:", error);
    }
  };

  const getRecipientIcon = (type: string) => {
    switch (type) {
      case "resident":
        return <User className="h-4 w-4 text-green-400" />;
      case "user":
        return <User className="h-4 w-4 text-indigo-400" />;
      case "house":
        return <Home className="h-4 w-4 text-zinc-400" />;
      default:
        return <User className="h-4 w-4 text-zinc-500" />;
    }
  };

  const isSending = createConversation.isPending || sendMessage.isPending;

  const inputClass = "w-full h-10 px-3 text-sm border border-zinc-200 rounded-lg bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors";

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/messages" className="p-2 hover:bg-zinc-100 rounded-lg transition-colors">
          <ChevronLeft className="h-5 w-5 text-zinc-400" />
        </Link>
        <h1 className="text-2xl font-bold text-zinc-800">New Message</h1>
      </div>

      <Card className="max-w-3xl">
        {/* Recipients Section */}
        <div className="p-4 border-b border-zinc-200">
          <label className="block text-sm font-medium text-zinc-600 mb-2">To:</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {selectedRecipients.map((recipient) => (
              <span
                key={recipient.id}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm ${
                  recipient.type === "resident" && !recipient.hasConsent
                    ? "bg-amber-500/15 text-amber-600"
                    : "bg-indigo-500/15 text-indigo-700"
                }`}
              >
                {getRecipientIcon(recipient.type)}
                {recipient.name}
                <button onClick={() => removeRecipient(recipient.id)} className="ml-1 hover:opacity-70">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search residents or staff..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-zinc-200 rounded-lg bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
            />
          </div>

          {isLoading && searchQuery && (
            <div className="mt-2 p-4 text-center text-zinc-500">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
              <p className="text-sm">Loading...</p>
            </div>
          )}

          {searchQuery && !isLoading && filteredRecipients.length > 0 && (
            <div className="mt-2 border border-zinc-200 rounded-lg divide-y divide-zinc-200/50 max-h-48 overflow-y-auto">
              {filteredRecipients.map((recipient) => (
                <button
                  key={recipient.id}
                  onClick={() => addRecipient(recipient)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-zinc-100/40 text-left"
                >
                  <div className="p-1.5 bg-zinc-100 rounded-full">
                    {getRecipientIcon(recipient.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-800">{recipient.name}</p>
                    <p className="text-xs text-zinc-500">
                      {recipient.houseName || recipient.email || `${recipient.type}`}
                    </p>
                  </div>
                  {recipient.type === "resident" && !recipient.hasConsent && (
                    <span className="text-xs text-amber-400 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      No consent
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {searchQuery && !isLoading && filteredRecipients.length === 0 && (
            <div className="mt-2 p-4 text-center text-zinc-500 border border-zinc-200 rounded-lg">
              <p className="text-sm">No results found for &quot;{searchQuery}&quot;</p>
            </div>
          )}
        </div>

        {/* Consent Warning */}
        {showConsentWarning && (
          <div className="px-4 py-3 bg-amber-500/10 border-b border-amber-500/20">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-600">Consent Required</p>
                <p className="text-sm text-amber-600 mt-1">
                  One or more recipients do not have active consent.
                  Messages containing sensitive information cannot be sent
                  without proper consent on file.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Group Name */}
        {conversationType === "group" && (
          <div className="p-4 border-b border-zinc-200">
            <label className="block text-sm font-medium text-zinc-600 mb-1.5">Group Name:</label>
            <input
              type="text"
              placeholder="Enter group name..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className={inputClass}
            />
          </div>
        )}

        {/* Message Content */}
        <div className="p-4">
          <label className="block text-sm font-medium text-zinc-600 mb-1.5">Message:</label>
          <textarea
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value)}
            placeholder="Type your message..."
            rows={6}
            className="w-full px-4 py-3 text-sm border border-zinc-200 rounded-lg bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none transition-colors"
          />
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-zinc-200 flex justify-between items-center">
          <div className="flex items-center gap-2 text-sm text-zinc-500">
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
            <Link href="/messages">
              <Button variant="secondary">Cancel</Button>
            </Link>
            <Button
              variant="primary"
              icon={isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              onClick={handleSend}
              disabled={selectedRecipients.length === 0 || !messageContent.trim() || isSending}
            >
              {isSending ? "Sending..." : "Send Message"}
            </Button>
          </div>
        </div>
      </Card>
    </PageContainer>
  );
}

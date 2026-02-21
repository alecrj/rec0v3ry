"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Send,
  Paperclip,
  MoreVertical,
  User,
  Users,
  Phone,
  Video,
  Info,
  Image,
  Smile,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function ConversationPage({
  params,
}: {
  params: { conversationId: string };
}) {
  const [newMessage, setNewMessage] = useState("");
  const [showMembers, setShowMembers] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  const { data: conversation, isLoading: convLoading } =
    trpc.conversation.getById.useQuery({ conversationId: params.conversationId });

  const { data: messagesData, isLoading: msgsLoading } =
    trpc.message.list.useQuery(
      { conversationId: params.conversationId, limit: 50 },
      { enabled: !!conversation }
    );

  const sendMutation = trpc.message.send.useMutation({
    onSuccess: () => {
      setNewMessage("");
      utils.message.list.invalidate({ conversationId: params.conversationId });
    },
  });

  const messages = messagesData?.messages ?? [];
  const isLoading = convLoading || msgsLoading;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const formatTime = (dateVal: Date | string | null) => {
    if (!dateVal) return "";
    const date = new Date(dateVal);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (dateVal: Date | string) => {
    const date = new Date(dateVal);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    sendMutation.mutate({
      conversationId: params.conversationId,
      content: newMessage.trim(),
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Group messages by date
  const groupedMessages: { date: string; messages: typeof messages }[] = [];
  let currentDate = "";
  messages.forEach((msg) => {
    const msgDate = formatDate(msg.sentAt);
    if (msgDate !== currentDate) {
      currentDate = msgDate;
      groupedMessages.push({ date: msgDate, messages: [msg] });
    } else {
      groupedMessages[groupedMessages.length - 1]?.messages.push(msg);
    }
  });

  const displayTitle =
    conversation?.title ??
    conversation?.members?.find((m) => m.userId !== conversation?.created_by)?.name ??
    "Conversation";

  const sensitivityLevel = conversation?.sensitivity_level ?? "internal";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] text-center">
        <p className="text-zinc-400 mb-4">Conversation not found</p>
        <Link href="/messages" className="text-indigo-400 hover:underline">
          Back to Messages
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="bg-zinc-900 border-b border-zinc-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/messages"
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-zinc-400" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-zinc-800 rounded-full">
                {conversation.conversation_type === "direct" ? (
                  <User className="h-5 w-5 text-zinc-400" />
                ) : (
                  <Users className="h-5 w-5 text-indigo-400" />
                )}
              </div>
              <div>
                <h1 className="font-semibold text-zinc-100">{displayTitle}</h1>
                <p className="text-sm text-zinc-500">
                  {conversation.conversation_type === "direct"
                    ? "Direct Message"
                    : `${conversation.members.length} members`}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
              <Phone className="h-5 w-5 text-zinc-400" />
            </button>
            <button className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
              <Video className="h-5 w-5 text-zinc-400" />
            </button>
            <button
              onClick={() => setShowMembers(!showMembers)}
              className={`p-2 rounded-lg transition-colors ${
                showMembers ? "bg-zinc-800" : "hover:bg-zinc-800"
              }`}
            >
              <Info className="h-5 w-5 text-zinc-400" />
            </button>
            <button className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
              <MoreVertical className="h-5 w-5 text-zinc-400" />
            </button>
          </div>
        </div>

        {/* Confidentiality Notice */}
        {sensitivityLevel === "part2_protected" && messagesData?.redisclosureNotice && (
          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-300">
                <strong>Confidentiality Notice:</strong> {messagesData.redisclosureNotice}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Messages Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-center">
                <div>
                  <p className="text-zinc-500">No messages yet</p>
                  <p className="text-sm text-zinc-500 mt-1">Send a message to start the conversation</p>
                </div>
              </div>
            ) : (
              groupedMessages.map((group) => (
                <div key={group.date}>
                  <div className="flex items-center justify-center mb-4">
                    <span className="px-3 py-1 bg-zinc-800 text-zinc-400 text-xs font-medium rounded-full">
                      {group.date}
                    </span>
                  </div>
                  <div className="space-y-4">
                    {group.messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.isOwnMessage ? "justify-end" : "justify-start"}`}
                      >
                        {message.isSystemMessage ? (
                          <div className="text-center text-sm text-zinc-500 py-2">
                            {message.content}
                          </div>
                        ) : (
                          <div
                            className={`max-w-[70%] ${
                              message.isOwnMessage
                                ? "bg-indigo-500 text-white rounded-l-lg rounded-tr-lg"
                                : "bg-zinc-800 text-zinc-100 rounded-r-lg rounded-tl-lg"
                            } p-3`}
                          >
                            {!message.isOwnMessage && conversation.conversation_type === "group" && (
                              <p className="text-xs font-medium text-indigo-400 mb-1">
                                {message.senderName}
                              </p>
                            )}
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            <div
                              className={`flex items-center justify-end gap-1 mt-1 ${
                                message.isOwnMessage ? "text-indigo-600" : "text-zinc-500"
                              }`}
                            >
                              <span className="text-xs">{formatTime(message.sentAt)}</span>
                              {message.isOwnMessage && (
                                <span className="text-xs">
                                  {message.status === "read" ? "✓✓" : message.status === "delivered" ? "✓✓" : "✓"}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="bg-zinc-900 border-t border-zinc-800 p-4">
            <div className="flex items-end gap-2">
              <button className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
                <Paperclip className="h-5 w-5 text-zinc-400" />
              </button>
              <button className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
                <Image className="h-5 w-5 text-zinc-400" />
              </button>
              <div className="flex-1 relative">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Type a message..."
                  rows={1}
                  className="w-full px-4 py-2 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                  style={{ minHeight: "40px", maxHeight: "120px" }}
                />
              </div>
              <button className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
                <Smile className="h-5 w-5 text-zinc-400" />
              </button>
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sendMutation.isPending}
                className={`p-2 rounded-lg transition-colors ${
                  newMessage.trim() && !sendMutation.isPending
                    ? "bg-indigo-500 text-white hover:bg-indigo-400"
                    : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                }`}
              >
                {sendMutation.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Members Sidebar */}
        {showMembers && (
          <div className="w-80 bg-zinc-800/40 border-l border-zinc-800 p-4 overflow-y-auto">
            <h2 className="font-semibold text-zinc-100 mb-4">
              {conversation.conversation_type === "direct" ? "Contact Info" : "Members"}
            </h2>
            <div className="space-y-3">
              {conversation.members.map((member) => (
                <div key={member.id} className="flex items-center gap-3 p-2 hover:bg-zinc-800 rounded-lg">
                  <div className="p-2 bg-zinc-700 rounded-full">
                    <User className="h-4 w-4 text-zinc-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-100 truncate">{member.name}</p>
                    {member.email && (
                      <p className="text-xs text-zinc-500 truncate">{member.email}</p>
                    )}
                  </div>
                  {member.isMuted && (
                    <Badge variant="default">Muted</Badge>
                  )}
                </div>
              ))}
            </div>

            {conversation.conversation_type === "group" && (
              <button className="mt-4 w-full px-4 py-2 border border-zinc-700 text-zinc-300 rounded-lg text-sm font-medium hover:bg-zinc-800">
                Add Member
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

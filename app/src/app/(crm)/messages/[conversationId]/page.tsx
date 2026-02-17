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
} from "lucide-react";

export const dynamic = "force-dynamic";

interface Message {
  id: string;
  senderName: string;
  senderUserId: string | null;
  content: string;
  sentAt: string;
  isOwnMessage: boolean;
  isSystemMessage: boolean;
  status: "sent" | "delivered" | "read";
  replyToMessageId: string | null;
}

interface ConversationDetails {
  id: string;
  conversationType: "direct" | "group";
  displayTitle: string;
  members: Array<{
    id: string;
    name: string;
    email?: string;
    isOnline?: boolean;
  }>;
  sensitivityLevel: "internal" | "part2_protected";
  redisclosureNotice: string | null;
}

export default function ConversationPage({
  params,
}: {
  params: { conversationId: string };
}) {
  const [newMessage, setNewMessage] = useState("");
  const [showMembers, setShowMembers] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mock data
  const conversation: ConversationDetails = {
    id: params.conversationId,
    conversationType: "direct",
    displayTitle: "Sarah Martinez",
    members: [
      { id: "1", name: "Sarah Martinez", email: "sarah@example.com", isOnline: true },
      { id: "2", name: "House Manager", email: "manager@recoveryos.com", isOnline: true },
    ],
    sensitivityLevel: "internal",
    redisclosureNotice: null,
  };

  const messages: Message[] = [
    {
      id: "1",
      senderName: "Sarah Martinez",
      senderUserId: "resident-1",
      content: "Hi, I wanted to ask about my payment schedule.",
      sentAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      isOwnMessage: false,
      isSystemMessage: false,
      status: "read",
      replyToMessageId: null,
    },
    {
      id: "2",
      senderName: "You",
      senderUserId: "manager-1",
      content: "Of course! Let me pull up your account. Your next payment is due on February 28th for $450.",
      sentAt: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
      isOwnMessage: true,
      isSystemMessage: false,
      status: "read",
      replyToMessageId: null,
    },
    {
      id: "3",
      senderName: "Sarah Martinez",
      senderUserId: "resident-1",
      content: "Is it possible to set up automatic payments? I don't want to miss any deadlines.",
      sentAt: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
      isOwnMessage: false,
      isSystemMessage: false,
      status: "read",
      replyToMessageId: null,
    },
    {
      id: "4",
      senderName: "You",
      senderUserId: "manager-1",
      content: "Absolutely! You can set that up in the resident portal under Payments > Auto-Pay. Would you like me to walk you through it?",
      sentAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      isOwnMessage: true,
      isSystemMessage: false,
      status: "delivered",
      replyToMessageId: null,
    },
    {
      id: "5",
      senderName: "Sarah Martinez",
      senderUserId: "resident-1",
      content: "That would be great, thank you so much!",
      sentAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
      isOwnMessage: false,
      isSystemMessage: false,
      status: "read",
      replyToMessageId: null,
    },
    {
      id: "6",
      senderName: "Sarah Martinez",
      senderUserId: "resident-1",
      content: "Thank you for the update on my payment plan.",
      sentAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      isOwnMessage: false,
      isSystemMessage: false,
      status: "read",
      replyToMessageId: null,
    },
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    // TODO: Call API to send message
    console.log("Sending:", newMessage);
    setNewMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Group messages by date
  const groupedMessages: { date: string; messages: Message[] }[] = [];
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

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/messages"
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-slate-600" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-full">
                {conversation.conversationType === "direct" ? (
                  <User className="h-5 w-5 text-slate-600" />
                ) : (
                  <Users className="h-5 w-5 text-blue-600" />
                )}
              </div>
              <div>
                <h1 className="font-semibold text-slate-900">
                  {conversation.displayTitle}
                </h1>
                <p className="text-sm text-slate-500">
                  {conversation.conversationType === "direct"
                    ? conversation.members.find((m) => m.id !== "2")?.isOnline
                      ? "Online"
                      : "Offline"
                    : `${conversation.members.length} members`}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <Phone className="h-5 w-5 text-slate-600" />
            </button>
            <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <Video className="h-5 w-5 text-slate-600" />
            </button>
            <button
              onClick={() => setShowMembers(!showMembers)}
              className={`p-2 rounded-lg transition-colors ${
                showMembers ? "bg-slate-100" : "hover:bg-slate-100"
              }`}
            >
              <Info className="h-5 w-5 text-slate-600" />
            </button>
            <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <MoreVertical className="h-5 w-5 text-slate-600" />
            </button>
          </div>
        </div>

        {/* Redisclosure Notice for Part 2 Data */}
        {conversation.sensitivityLevel === "part2_protected" && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                <strong>Confidentiality Notice:</strong> This conversation may contain
                information protected by federal law (42 CFR Part 2). Federal rules
                prohibit further disclosure without express written consent.
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
            {groupedMessages.map((group) => (
              <div key={group.date}>
                {/* Date Separator */}
                <div className="flex items-center justify-center mb-4">
                  <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-full">
                    {group.date}
                  </span>
                </div>

                {/* Messages for this date */}
                <div className="space-y-4">
                  {group.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.isOwnMessage ? "justify-end" : "justify-start"}`}
                    >
                      {message.isSystemMessage ? (
                        <div className="text-center text-sm text-slate-500 py-2">
                          {message.content}
                        </div>
                      ) : (
                        <div
                          className={`max-w-[70%] ${
                            message.isOwnMessage
                              ? "bg-blue-600 text-white rounded-l-lg rounded-tr-lg"
                              : "bg-slate-100 text-slate-900 rounded-r-lg rounded-tl-lg"
                          } p-3`}
                        >
                          {!message.isOwnMessage && conversation.conversationType === "group" && (
                            <p className="text-xs font-medium text-blue-600 mb-1">
                              {message.senderName}
                            </p>
                          )}
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          <div
                            className={`flex items-center justify-end gap-1 mt-1 ${
                              message.isOwnMessage ? "text-blue-200" : "text-slate-400"
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
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="bg-white border-t border-slate-200 p-4">
            <div className="flex items-end gap-2">
              <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <Paperclip className="h-5 w-5 text-slate-600" />
              </button>
              <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <Image className="h-5 w-5 text-slate-600" />
              </button>
              <div className="flex-1 relative">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  rows={1}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  style={{ minHeight: "40px", maxHeight: "120px" }}
                />
              </div>
              <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <Smile className="h-5 w-5 text-slate-600" />
              </button>
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                className={`p-2 rounded-lg transition-colors ${
                  newMessage.trim()
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-slate-100 text-slate-400 cursor-not-allowed"
                }`}
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Members Sidebar */}
        {showMembers && (
          <div className="w-80 bg-slate-50 border-l border-slate-200 p-4 overflow-y-auto">
            <h2 className="font-semibold text-slate-900 mb-4">
              {conversation.conversationType === "direct" ? "Contact Info" : "Members"}
            </h2>
            <div className="space-y-3">
              {conversation.members.map((member) => (
                <div key={member.id} className="flex items-center gap-3 p-2 hover:bg-slate-100 rounded-lg">
                  <div className="relative">
                    <div className="p-2 bg-slate-200 rounded-full">
                      <User className="h-4 w-4 text-slate-600" />
                    </div>
                    {member.isOnline && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-slate-50 rounded-full" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{member.name}</p>
                    {member.email && (
                      <p className="text-xs text-slate-500 truncate">{member.email}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {conversation.conversationType === "group" && (
              <button className="mt-4 w-full px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-100">
                Add Member
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

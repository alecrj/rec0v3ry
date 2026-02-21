"use client";

import Link from "next/link";
import {
  Users,
  UserCheck,
  Crown,
  CreditCard,
  Zap,
  ShieldCheck,
  Shield,
  FileSearch,
  BookOpen,
  ShieldAlert,
  FolderOpen,
  FileStack,
  PenTool,
  Archive,
  ChevronRight,
  Link2,
  Building2,
} from "lucide-react";
import { PageContainer, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

const settingsSections = [
  {
    title: "Organization",
    items: [
      { label: "Team & Users", description: "Manage staff accounts and roles", href: "/admin/users", icon: Users, color: "text-blue-400 bg-blue-500/10" },
      { label: "Family Portal", description: "Family contact access settings", href: "/admin/family-portal", icon: UserCheck, color: "text-purple-400 bg-purple-500/10" },
      { label: "Subscription", description: "Plan and billing", href: "/admin/subscription", icon: Crown, color: "text-amber-400 bg-amber-500/10" },
    ],
  },
  {
    title: "Payments & Billing",
    items: [
      { label: "Payment Settings", description: "Stripe, fees, reminders, late fees", href: "/settings/payments", icon: CreditCard, color: "text-indigo-400 bg-indigo-500/10" },
      { label: "Automations", description: "Automatic reminders and alerts", href: "/settings/automations", icon: Zap, color: "text-amber-400 bg-amber-500/10" },
    ],
  },
  {
    title: "Compliance",
    items: [
      { label: "Compliance Dashboard", description: "Overview of consent and audit status", href: "/settings/compliance/dashboard", icon: ShieldCheck, color: "text-green-400 bg-green-500/10" },
      { label: "Consents", description: "Consent management", href: "/settings/compliance/consents", icon: Shield, color: "text-green-400 bg-green-500/10" },
      { label: "Disclosures", description: "Accounting of disclosures", href: "/settings/compliance/disclosures", icon: FileSearch, color: "text-green-400 bg-green-500/10" },
      { label: "Audit Log", description: "Full activity audit trail", href: "/settings/compliance/audit-log", icon: BookOpen, color: "text-green-400 bg-green-500/10" },
      { label: "Break-Glass Access", description: "Emergency access log", href: "/settings/compliance/break-glass", icon: ShieldAlert, color: "text-red-400 bg-red-500/10" },
    ],
  },
  {
    title: "Documents & E-Sign",
    items: [
      { label: "Document Library", description: "All uploaded documents", href: "/documents/library", icon: FolderOpen, color: "text-zinc-400 bg-zinc-500/10" },
      { label: "Templates", description: "Document templates", href: "/documents/templates", icon: FileStack, color: "text-zinc-400 bg-zinc-500/10" },
      { label: "Signatures", description: "E-signature tracking", href: "/documents/signatures", icon: PenTool, color: "text-zinc-400 bg-zinc-500/10" },
      { label: "Retention Policies", description: "Document retention rules", href: "/documents/retention", icon: Archive, color: "text-zinc-400 bg-zinc-500/10" },
      { label: "DocuSign Integration", description: "E-signature connection and setup", href: "/settings/docusign", icon: Link2, color: "text-indigo-400 bg-indigo-500/10" },
    ],
  },
  {
    title: "Connections",
    items: [
      { label: "Bank Connections", description: "Plaid bank account linking", href: "/settings/connections", icon: Building2, color: "text-blue-400 bg-blue-500/10" },
    ],
  },
];

export default function SettingsPage() {
  return (
    <PageContainer>
      <PageHeader title="Settings" />

      <div className="space-y-8">
        {settingsSections.map((section) => (
          <div key={section.title}>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3 px-1">
              {section.title}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex items-center gap-3 p-4 rounded-xl border border-zinc-800 hover:border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800/40 transition-all"
                >
                  <div className={`p-2 rounded-lg ${item.color}`}>
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-100">{item.label}</p>
                    <p className="text-xs text-zinc-500 mt-0.5 truncate">{item.description}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-zinc-400 transition-colors flex-shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </PageContainer>
  );
}

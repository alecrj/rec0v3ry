"use client";

import Link from "next/link";
import {
  ListTodo,
  Calendar,
  BadgeCheck,
  Clock,
  TestTube,
  AlertCircle,
  ClipboardCheck,
  Wrench,
  ChevronRight,
} from "lucide-react";
import { PageContainer, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

const operationsLinks = [
  {
    label: "Chores",
    description: "Assign and track house chores",
    href: "/operations/chores",
    icon: ListTodo,
    color: "text-blue-400 bg-blue-500/10",
  },
  {
    label: "Meetings",
    description: "Schedule and track attendance",
    href: "/operations/meetings",
    icon: Calendar,
    color: "text-purple-400 bg-purple-500/10",
  },
  {
    label: "Passes",
    description: "Approve overnight and day passes",
    href: "/operations/passes",
    icon: BadgeCheck,
    color: "text-green-400 bg-green-500/10",
  },
  {
    label: "Curfew",
    description: "Check-ins and curfew configuration",
    href: "/operations/curfew",
    icon: Clock,
    color: "text-amber-400 bg-amber-500/10",
  },
  {
    label: "Drug Tests",
    description: "Log tests and manage scheduling",
    href: "/operations/drug-tests",
    icon: TestTube,
    color: "text-red-400 bg-red-500/10",
  },
  {
    label: "Incidents",
    description: "Report and track incidents",
    href: "/operations/incidents",
    icon: AlertCircle,
    color: "text-orange-400 bg-orange-500/10",
  },
  {
    label: "Check-ins",
    description: "Daily wellness check-ins",
    href: "/operations/check-ins",
    icon: ClipboardCheck,
    color: "text-teal-400 bg-teal-500/10",
  },
  {
    label: "Maintenance",
    description: "Repair requests and work orders",
    href: "/operations/maintenance",
    icon: Wrench,
    color: "text-zinc-400 bg-zinc-500/10",
  },
];

export default function OperationsPage() {
  return (
    <PageContainer>
      <PageHeader title="Operations" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {operationsLinks.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group flex items-center gap-4 p-4 rounded-xl border border-zinc-800 hover:border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800/40 transition-all"
          >
            <div className={`p-2.5 rounded-lg ${item.color}`}>
              <item.icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-zinc-100">{item.label}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{item.description}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-zinc-400 transition-colors flex-shrink-0" />
          </Link>
        ))}
      </div>
    </PageContainer>
  );
}

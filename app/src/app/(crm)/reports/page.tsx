"use client";

import Link from "next/link";
import {
  BedDouble,
  TrendingUp,
  BarChart3,
  Shield,
  ChevronRight,
} from "lucide-react";
import { PageContainer, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

const reportLinks = [
  {
    label: "Occupancy",
    description: "Bed utilization, availability trends, property breakdown",
    href: "/reports/occupancy",
    icon: BedDouble,
    color: "text-blue-400 bg-blue-500/10",
  },
  {
    label: "Financial",
    description: "Revenue, collections, aging, delinquent accounts",
    href: "/reports/financial",
    icon: TrendingUp,
    color: "text-green-400 bg-green-500/10",
  },
  {
    label: "Operations",
    description: "Chore completion, meeting attendance, incidents, drug tests",
    href: "/reports/operations",
    icon: BarChart3,
    color: "text-purple-400 bg-purple-500/10",
  },
  {
    label: "Compliance",
    description: "Consent status, audit activity, breach incidents",
    href: "/reports/compliance",
    icon: Shield,
    color: "text-amber-400 bg-amber-500/10",
  },
];

export default function ReportsPage() {
  return (
    <PageContainer>
      <PageHeader title="Reports" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {reportLinks.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group flex items-center gap-4 p-5 rounded-xl border border-zinc-200 hover:border-zinc-200 bg-white/50 hover:bg-zinc-100/40 transition-all"
          >
            <div className={`p-3 rounded-lg ${item.color}`}>
              <item.icon className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-zinc-800">{item.label}</p>
              <p className="text-sm text-zinc-500 mt-0.5">{item.description}</p>
            </div>
            <ChevronRight className="h-5 w-5 text-zinc-600 group-hover:text-zinc-400 transition-colors flex-shrink-0" />
          </Link>
        ))}
      </div>
    </PageContainer>
  );
}

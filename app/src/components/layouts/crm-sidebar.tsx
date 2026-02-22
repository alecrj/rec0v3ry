"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  BedDouble,
  ClipboardList,
  Users,
  DollarSign,
  Wrench,
  FileText,
  MessageSquare,
  BarChart3,
  Shield,
  Settings,
  ChevronDown,
  ChevronRight,
  CreditCard,
  BookOpen,
  Receipt,
  Layers,
  CircleDollarSign,
  ListTodo,
  Calendar,
  BadgeCheck,
  TestTube,
  AlertCircle,
  ClipboardCheck,
  Clock,
  FolderOpen,
  FileStack,
  PenTool,
  Archive,
  Inbox,
  Megaphone,
  TrendingUp,
  Building2,
  UserCheck,
  ShieldCheck,
  FileSearch,
  ShieldAlert,
  UserPlus,
  Crown,
} from "lucide-react";
import { useState } from "react";

interface NavItem {
  label: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavItem[];
}

const navigation: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Occupancy",
    icon: BedDouble,
    children: [
      { label: "Bed Grid", href: "/occupancy/beds", icon: Layers },
      { label: "Waitlist", href: "/occupancy/waitlist", icon: ClipboardList },
    ],
  },
  {
    label: "Admissions",
    href: "/admissions",
    icon: UserPlus,
  },
  {
    label: "Residents",
    href: "/residents",
    icon: Users,
  },
  {
    label: "Billing",
    icon: DollarSign,
    children: [
      { label: "Overview", href: "/billing", icon: LayoutDashboard },
      { label: "Invoices", href: "/billing/invoices", icon: Receipt },
      { label: "Expenses", href: "/billing/expenses", icon: CircleDollarSign },
      { label: "P&L", href: "/billing/expenses/pnl", icon: TrendingUp },
      { label: "Ledger", href: "/billing/ledger", icon: BookOpen },
      { label: "Rates", href: "/billing/rates", icon: DollarSign },
    ],
  },
  {
    label: "Operations",
    icon: Wrench,
    children: [
      { label: "Chores", href: "/operations/chores", icon: ListTodo },
      { label: "Meetings", href: "/operations/meetings", icon: Calendar },
      { label: "Passes", href: "/operations/passes", icon: BadgeCheck },
      { label: "Curfew", href: "/operations/curfew", icon: Clock },
      { label: "Drug Tests", href: "/operations/drug-tests", icon: TestTube },
      { label: "Incidents", href: "/operations/incidents", icon: AlertCircle },
      { label: "Check-ins", href: "/operations/check-ins", icon: ClipboardCheck },
    ],
  },
  {
    label: "Documents",
    icon: FileText,
    children: [
      { label: "Library", href: "/documents/library", icon: FolderOpen },
      { label: "Templates", href: "/documents/templates", icon: FileStack },
      { label: "Signatures", href: "/documents/signatures", icon: PenTool },
      { label: "Retention", href: "/documents/retention", icon: Archive },
    ],
  },
  {
    label: "Messages",
    icon: MessageSquare,
    children: [
      { label: "Inbox", href: "/messages/inbox", icon: Inbox },
      { label: "Announcements", href: "/messages/announcements", icon: Megaphone },
    ],
  },
  {
    label: "Reports",
    icon: BarChart3,
    children: [
      { label: "Occupancy", href: "/reports/occupancy", icon: BedDouble },
      { label: "Financial", href: "/reports/financial", icon: TrendingUp },
      { label: "Operations", href: "/reports/operations", icon: Wrench },
      { label: "Compliance", href: "/reports/compliance", icon: Shield },
      { label: "Outcomes", href: "/reports/outcomes", icon: BarChart3 },
      { label: "Grants", href: "/reports/grants", icon: FileText },
    ],
  },
  {
    label: "Compliance",
    icon: Shield,
    children: [
      { label: "Dashboard", href: "/compliance/dashboard", icon: LayoutDashboard },
      { label: "Consents", href: "/compliance/consents", icon: ShieldCheck },
      { label: "Disclosures", href: "/compliance/disclosures", icon: FileSearch },
      { label: "Audit Log", href: "/compliance/audit-log", icon: BookOpen },
      { label: "Break-Glass Log", href: "/compliance/break-glass", icon: ShieldAlert },
      { label: "BAA Registry", href: "/compliance/baa", icon: UserCheck },
    ],
  },
  {
    label: "Admin",
    icon: Settings,
    children: [
      { label: "Users", href: "/admin/users", icon: Users },
      { label: "Settings", href: "/admin/settings", icon: Settings },
      { label: "Properties", href: "/admin/properties", icon: Building2 },
      { label: "Bank Connections", href: "/settings/plaid", icon: CreditCard },
      { label: "Subscription", href: "/admin/subscription", icon: Crown },
    ],
  },
];

function NavLink({ item, depth = 0 }: { item: NavItem; depth?: number }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(true);
  const hasChildren = item.children && item.children.length > 0;
  const isActive = item.href ? pathname === item.href : false;

  if (hasChildren) {
    return (
      <div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full flex items-center justify-between px-3 py-2 text-sm font-medium transition-colors",
            depth === 0
              ? "text-[#525252] hover:text-[#0a0a0a] hover:bg-[#f5f5f5]"
              : "text-[#737373] hover:text-[#525252] hover:bg-[#f5f5f5]"
          )}
        >
          <div className="flex items-center gap-3">
            <item.icon className="h-4 w-4" />
            <span>{item.label}</span>
          </div>
          {isOpen ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>
        {isOpen && item.children && (
          <div className="ml-4 mt-0.5 space-y-0.5 border-l border-[#e5e5e5]">
            {item.children.map((child) => (
              <NavLink key={child.label} item={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={item.href!}
      className={cn(
        "flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors",
        depth === 0
          ? isActive
            ? "text-[#dc2626] bg-[rgba(220,38,38,0.04)] border-l-2 border-[#dc2626] -ml-px"
            : "text-[#525252] hover:text-[#0a0a0a] hover:bg-[#f5f5f5]"
          : isActive
          ? "text-[#dc2626] bg-[rgba(220,38,38,0.04)]"
          : "text-[#737373] hover:text-[#525252] hover:bg-[#f5f5f5]"
      )}
    >
      <item.icon className="h-4 w-4" />
      <span>{item.label}</span>
    </Link>
  );
}

export function CrmSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "bg-white border-r border-[#e5e5e5] flex flex-col transition-all duration-300",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      <div className="p-4 border-b border-[#e5e5e5]">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#dc2626] flex items-center justify-center">
                <span className="text-base font-bold text-white">R</span>
              </div>
              <div>
                <h2 className="text-xs font-bold text-[#0a0a0a] tracking-[0.12em] uppercase">RecoveryOS</h2>
                <p className="text-[11px] text-[#a3a3a3] tracking-wide uppercase">Operator CRM</p>
              </div>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 hover:bg-[#f5f5f5] text-[#a3a3a3] hover:text-[#525252] transition-colors"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4 rotate-[-90deg]" />
            )}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {navigation.map((item) => (
            <NavLink key={item.label} item={item} />
          ))}
        </nav>
      )}

      <div className="p-4 border-t border-[#e5e5e5]">
        <div className="flex items-center gap-2 text-[11px] text-[#a3a3a3] tracking-wide uppercase">
          <Shield className="h-3.5 w-3.5" />
          {!isCollapsed && <span>HIPAA Compliant</span>}
        </div>
      </div>
    </aside>
  );
}

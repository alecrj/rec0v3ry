"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  Users,
  DollarSign,
  Wrench,
  MessageSquare,
  BarChart3,
  Settings,
  Bell,
  Search,
  Menu,
  X,
  PanelLeftClose,
  PanelLeft,
  Shield,
  ChevronRight,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Properties", href: "/admin/properties", icon: Building2 },
  { label: "Residents", href: "/residents", icon: Users },
  { label: "Billing", href: "/billing", icon: DollarSign },
  { label: "Operations", href: "/operations", icon: Wrench },
  { label: "Messages", href: "/messages", icon: MessageSquare },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings },
];

// Map sub-routes to their parent nav item for active state highlighting
const routeParentMap: Record<string, string> = {
  "/admin/properties": "/admin/properties",
  "/residents": "/residents",
  "/admissions": "/residents",
  "/occupancy": "/admin/properties",
  "/billing": "/billing",
  "/operations": "/operations",
  "/messages": "/messages",
  "/reports": "/reports",
  "/compliance": "/settings",
  "/admin/users": "/settings",
  "/admin/family-portal": "/settings",
  "/admin/subscription": "/settings",
  "/documents": "/settings",
  "/settings": "/settings",
};

function getActiveParent(pathname: string): string {
  // Check exact matches first, then prefix matches (longest first)
  const sortedKeys = Object.keys(routeParentMap).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (pathname === key || pathname.startsWith(key + "/")) {
      return routeParentMap[key];
    }
  }
  return "/dashboard";
}

function NavLink({
  item,
  isCollapsed,
  isActive,
  onNavigate,
}: {
  item: NavItem;
  isCollapsed: boolean;
  isActive: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "group relative flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-150",
        isCollapsed ? "justify-center px-0 py-2.5" : "",
        isActive
          ? "text-zinc-100 bg-zinc-800/80"
          : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
      )}
      data-tooltip={isCollapsed ? item.label : undefined}
    >
      {isActive && !isCollapsed && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-indigo-500 rounded-r" />
      )}
      <item.icon
        className={cn(
          "h-[18px] w-[18px] flex-shrink-0 transition-colors duration-150",
          isActive ? "text-indigo-400" : "text-zinc-500 group-hover:text-zinc-400"
        )}
      />
      {!isCollapsed && (
        <span className="flex-1">{item.label}</span>
      )}
      {!isCollapsed && item.badge && (
        <span className="text-[10px] font-semibold bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full">
          {item.badge}
        </span>
      )}
    </Link>
  );
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return isMobile;
}

export function CrmSidebar() {
  const isMobile = useIsMobile();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const activeParent = getActiveParent(pathname);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Escape to close mobile
  useEffect(() => {
    if (!mobileOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mobileOpen]);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  const sidebarContent = (
    <>
      {/* Logo + Collapse / Close */}
      <div className="flex items-center justify-between h-14 px-3">
        <div className={cn("flex items-center gap-2.5 overflow-hidden", !isMobile && isCollapsed && "justify-center w-full")}>
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-white">R</span>
          </div>
          {(isMobile || !isCollapsed) && (
            <span className="text-sm font-semibold text-zinc-100 tracking-tight">RecoveryOS</span>
          )}
        </div>
        {isMobile ? (
          <button
            onClick={closeMobile}
            className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors flex-shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        ) : (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors flex-shrink-0"
          >
            {isCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            isCollapsed={!isMobile && isCollapsed}
            isActive={activeParent === item.href}
            onNavigate={isMobile ? closeMobile : undefined}
          />
        ))}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-zinc-800/80 space-y-1">
        {/* User */}
        <div className={cn(
          "flex items-center gap-2.5 px-3 py-2 rounded-lg",
          !isMobile && isCollapsed ? "justify-center" : ""
        )}>
          <UserButton
            appearance={{
              elements: {
                avatarBox: "w-8 h-8",
                userButtonTrigger: "rounded-lg p-0 transition-colors",
              },
            }}
          />
          {(isMobile || !isCollapsed) && (
            <div className="flex items-center gap-1.5">
              <Shield className="h-3 w-3 text-green-500 flex-shrink-0" />
              <span className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider">HIPAA</span>
            </div>
          )}
        </div>
      </div>
    </>
  );

  // Mobile: hamburger trigger + overlay sidebar
  if (isMobile) {
    return (
      <>
        {/* Mobile top bar */}
        <div className="fixed top-0 left-0 right-0 z-40 h-12 bg-[#09090B] border-b border-zinc-800/80 flex items-center px-3 gap-3 lg:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-indigo-500 flex items-center justify-center">
              <span className="text-[10px] font-bold text-white">R</span>
            </div>
            <span className="text-sm font-semibold text-zinc-100">RecoveryOS</span>
          </div>
        </div>

        {/* Overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/60" onClick={closeMobile} />
            <aside className="absolute inset-y-0 left-0 w-[260px] flex flex-col bg-[#09090B] border-r border-zinc-800/80 shadow-2xl">
              {sidebarContent}
            </aside>
          </div>
        )}
      </>
    );
  }

  // Desktop: standard sidebar
  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col border-r border-zinc-800/80 transition-all duration-200 ease-out bg-[#09090B]",
        isCollapsed ? "w-[60px]" : "w-[220px]"
      )}
    >
      {sidebarContent}
    </aside>
  );
}

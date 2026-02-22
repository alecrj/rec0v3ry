"use client";

import { UserButton } from "@clerk/nextjs";
import { Bell, ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";

function getBreadcrumbs(pathname: string): { label: string; href: string }[] {
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs: { label: string; href: string }[] = [];

  let currentPath = "";
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    currentPath += "/" + segment;

    const formatted = segment
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    breadcrumbs.push({
      label: formatted,
      href: currentPath,
    });
  }

  return breadcrumbs;
}

export function CrmHeader() {
  const pathname = usePathname();
  const breadcrumbs = getBreadcrumbs(pathname);

  return (
    <header className="h-14 bg-white border-b border-zinc-200 flex items-center justify-between px-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 text-sm">
        {breadcrumbs.length > 0 ? (
          breadcrumbs.map((crumb, index) => (
            <div key={index} className="flex items-center">
              {index > 0 && <ChevronRight className="h-4 w-4 text-zinc-600 mx-1" />}
              {index === breadcrumbs.length - 1 ? (
                <span className="font-semibold text-zinc-800">{crumb.label}</span>
              ) : (
                <Link
                  href={crumb.href}
                  className="text-zinc-500 hover:text-zinc-400 transition-colors"
                >
                  {crumb.label}
                </Link>
              )}
            </div>
          ))
        ) : (
          <span className="font-semibold text-zinc-800">Dashboard</span>
        )}
      </nav>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button className="relative p-2 rounded-md hover:bg-zinc-100 transition-colors group">
          <Bell className="h-5 w-5 text-zinc-500 group-hover:text-zinc-400 transition-colors" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
        </button>

        <div className="h-6 w-px bg-zinc-100 mx-1" />

        <UserButton
          appearance={{
            elements: {
              avatarBox: "w-8 h-8 ring-2 ring-zinc-800",
              userButtonTrigger: "rounded-md hover:bg-zinc-100 p-0.5 transition-colors",
            },
          }}
        />
      </div>
    </header>
  );
}

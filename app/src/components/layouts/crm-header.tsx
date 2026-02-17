"use client";

import { UserButton, OrganizationSwitcher } from "@clerk/nextjs";
import { Bell } from "lucide-react";
import { usePathname } from "next/navigation";

function getBreadcrumbs(pathname: string): string[] {
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs: string[] = [];

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const formatted = segment
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
    breadcrumbs.push(formatted);
  }

  return breadcrumbs;
}

export function CrmHeader() {
  const pathname = usePathname();
  const breadcrumbs = getBreadcrumbs(pathname);

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <nav className="flex items-center gap-2 text-sm">
          {breadcrumbs.length > 0 ? (
            <>
              {breadcrumbs.map((crumb, index) => (
                <div key={index} className="flex items-center gap-2">
                  {index > 0 && <span className="text-slate-400">/</span>}
                  <span
                    className={
                      index === breadcrumbs.length - 1
                        ? "font-semibold text-slate-900"
                        : "text-slate-600"
                    }
                  >
                    {crumb}
                  </span>
                </div>
              ))}
            </>
          ) : (
            <span className="font-semibold text-slate-900">Dashboard</span>
          )}
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <OrganizationSwitcher
          appearance={{
            elements: {
              rootBox: "h-9",
              organizationSwitcherTrigger:
                "px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50",
            },
          }}
        />

        <button className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors">
          <Bell className="h-5 w-5 text-slate-600" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        <UserButton
          appearance={{
            elements: {
              avatarBox: "w-9 h-9",
            },
          }}
        />
      </div>
    </header>
  );
}

import { CrmSidebar } from "@/components/layouts/crm-sidebar";

export const dynamic = 'force-dynamic';

export default function CrmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen flex overflow-hidden bg-[#fafafa]">
      <CrmSidebar />
      {/* pt-12 on mobile for the fixed top bar, pt-0 on desktop */}
      <main className="flex-1 overflow-y-auto pt-12 lg:pt-0">
        {children}
      </main>
    </div>
  );
}

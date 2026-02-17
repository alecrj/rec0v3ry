import { CrmSidebar } from "@/components/layouts/crm-sidebar";
import { CrmHeader } from "@/components/layouts/crm-header";

export const dynamic = 'force-dynamic';

export default function CrmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen flex overflow-hidden">
      <CrmSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <CrmHeader />
        <main className="flex-1 overflow-y-auto bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  );
}

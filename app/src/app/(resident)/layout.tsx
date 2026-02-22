import { ResidentNav } from "@/components/layouts/resident-nav";

export const dynamic = 'force-dynamic';

export default function ResidentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-100 pb-16">
      <main className="max-w-2xl mx-auto">
        {children}
      </main>
      <ResidentNav />
    </div>
  );
}

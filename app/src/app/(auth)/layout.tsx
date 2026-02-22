export const dynamic = 'force-dynamic';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-900 to-zinc-800 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500 mb-4">
            <span className="text-2xl font-bold text-white">R</span>
          </div>
          <h1 className="text-3xl font-bold text-zinc-800">RecoveryOS</h1>
          <p className="text-zinc-400 mt-2">Sober Living Management Platform</p>
        </div>
        <div className="bg-white rounded-xl shadow-lg border border-zinc-200 p-8">
          {children}
        </div>
        <p className="text-center text-sm text-zinc-500 mt-6">
          HIPAA-compliant and 42 CFR Part 2 ready
        </p>
      </div>
    </div>
  );
}

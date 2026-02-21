"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { CheckCircle, XCircle, Loader2, Building2, ArrowRight } from "lucide-react";

type SetupStatus = "checking" | "needs-setup" | "creating" | "done" | "error" | "already-setup";

export default function SetupPage() {
  const { user, isLoaded } = useUser();
  const [status, setStatus] = useState<SetupStatus>("checking");
  const [error, setError] = useState<string | null>(null);
  const [orgName, setOrgName] = useState("");
  const [details, setDetails] = useState<{
    userId?: string;
    orgId?: string;
    role?: string;
  } | null>(null);

  useEffect(() => {
    if (!isLoaded || !user) return;

    const checkUser = async () => {
      try {
        const checkRes = await fetch("/api/setup-user", { method: "GET" });
        if (!checkRes.ok) throw new Error("Failed to check user status");

        const checkData = await checkRes.json();

        if (checkData.exists && checkData.orgId) {
          setStatus("already-setup");
          setDetails({
            userId: checkData.user?.id,
            orgId: checkData.orgId,
            role: checkData.role,
          });
          setTimeout(() => {
            window.location.href = "/dashboard";
          }, 1500);
          return;
        }

        // User doesn't exist — show org name form
        setStatus("needs-setup");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setStatus("error");
      }
    };

    checkUser();
  }, [isLoaded, user]);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !orgName.trim()) return;

    setStatus("creating");
    setError(null);

    try {
      const setupRes = await fetch("/api/setup-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clerkId: user.id,
          email: user.primaryEmailAddress?.emailAddress || "",
          firstName: user.firstName || "",
          lastName: user.lastName || "",
          orgName: orgName.trim(),
        }),
      });

      if (!setupRes.ok) {
        const data = await setupRes.json();
        throw new Error(data.error || "Setup failed");
      }

      const setupData = await setupRes.json();
      setStatus("done");
      setDetails({
        userId: setupData.userId,
        orgId: setupData.orgId,
        role: setupData.role,
      });

      // Redirect to properties page to continue onboarding
      setTimeout(() => {
        window.location.href = "/admin/properties";
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    }
  };

  const inputClass =
    "w-full h-12 px-4 text-base border border-zinc-800 rounded-lg bg-zinc-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-900 to-zinc-800">
      <div className="bg-zinc-900 rounded-xl shadow-xl p-8 max-w-md w-full">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-xl bg-indigo-500 flex items-center justify-center">
            <span className="text-2xl font-bold text-white">R</span>
          </div>
        </div>

        {status === "checking" && (
          <div className="text-center">
            <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-zinc-100">
              Checking account status...
            </h1>
            <p className="text-zinc-500 mt-2">Please wait a moment.</p>
          </div>
        )}

        {status === "needs-setup" && (
          <form onSubmit={handleSetup}>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-zinc-100">
                Welcome to RecoveryOS
              </h1>
              <p className="text-zinc-500 mt-2">
                Let&apos;s set up your organization to get started.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                  Organization Name
                </label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className={inputClass}
                  placeholder="e.g., Sunrise Recovery Homes"
                  autoFocus
                  required
                />
                <p className="text-xs text-zinc-500 mt-1.5">
                  This is the name of your sober living business.
                </p>
              </div>

              {user && (
                <div className="p-3 bg-zinc-800/40 rounded-lg text-sm text-zinc-400">
                  Setting up as{" "}
                  <span className="font-medium text-zinc-100">
                    {user.firstName} {user.lastName}
                  </span>{" "}
                  ({user.primaryEmailAddress?.emailAddress})
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={!orgName.trim()}
              className="w-full mt-6 h-12 bg-indigo-500 text-white rounded-lg hover:bg-indigo-400 font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {status === "creating" && (
          <div className="text-center">
            <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-zinc-100">
              Setting up your account...
            </h1>
            <p className="text-zinc-500 mt-2">
              Creating your organization and profile.
            </p>
          </div>
        )}

        {status === "already-setup" && (
          <div className="text-center">
            <div className="w-12 h-12 bg-indigo-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-6 h-6 text-indigo-400" />
            </div>
            <h1 className="text-xl font-semibold text-zinc-100">
              Welcome back!
            </h1>
            <p className="text-zinc-500 mt-2">
              Your account is already set up. Redirecting to dashboard...
            </p>
            {details?.role && (
              <p className="text-sm text-zinc-500 mt-3">
                Role: <span className="font-medium">{details.role.replace("_", " ")}</span>
              </p>
            )}
          </div>
        )}

        {status === "done" && (
          <div className="text-center">
            <div className="w-12 h-12 bg-green-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-6 h-6 text-green-400" />
            </div>
            <h1 className="text-xl font-semibold text-zinc-100">
              You&apos;re all set!
            </h1>
            <p className="text-zinc-500 mt-2">
              Your organization has been created. Let&apos;s add your first property...
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="text-center">
            <div className="w-12 h-12 bg-red-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-6 h-6 text-red-400" />
            </div>
            <h1 className="text-xl font-semibold text-zinc-100">
              Setup failed
            </h1>
            <p className="text-red-400 mt-2 text-sm">{error}</p>
            <div className="mt-6 space-y-3">
              <button
                onClick={() => {
                  setError(null);
                  setStatus("needs-setup");
                }}
                className="w-full px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-400 font-medium transition-colors"
              >
                Try again
              </button>
              <p className="text-xs text-zinc-500">
                If this persists, please contact support.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

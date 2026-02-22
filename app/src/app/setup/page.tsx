"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import {
  CheckCircle,
  XCircle,
  Loader2,
  Building2,
  ArrowRight,
  ArrowLeft,
  Home,
  Users,
  DollarSign,
  Bed,
} from "lucide-react";

type SetupStatus = "checking" | "wizard" | "creating" | "done" | "error" | "already-setup";

interface SetupData {
  // Screen 1: Organization
  orgName: string;
  // Screen 2: First house
  houseName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  bedCount: number;
  rentAmount: string;
  // Screen 3: First resident (optional)
  residentFirstName: string;
  residentLastName: string;
  residentPhone: string;
  residentEmail: string;
  residentMoveIn: string;
}

const initialData: SetupData = {
  orgName: "",
  houseName: "",
  address: "",
  city: "",
  state: "",
  zip: "",
  bedCount: 4,
  rentAmount: "",
  residentFirstName: "",
  residentLastName: "",
  residentPhone: "",
  residentEmail: "",
  residentMoveIn: new Date().toISOString().split("T")[0],
};

const inputClass =
  "w-full h-11 px-3 text-sm border border-zinc-200 rounded-lg bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors text-zinc-800 placeholder:text-zinc-400";

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 justify-center mb-6">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i <= current ? "bg-indigo-500 w-8" : "bg-zinc-200 w-4"
          }`}
        />
      ))}
    </div>
  );
}

export default function SetupPage() {
  const { user, isLoaded } = useUser();
  const [status, setStatus] = useState<SetupStatus>("checking");
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [data, setData] = useState<SetupData>(initialData);

  useEffect(() => {
    if (!isLoaded || !user) return;

    const checkUser = async () => {
      try {
        const checkRes = await fetch("/api/setup-user", { method: "GET" });
        if (!checkRes.ok) throw new Error("Failed to check user status");

        const checkData = await checkRes.json();

        if (checkData.exists && checkData.orgId) {
          setStatus("already-setup");
          setTimeout(() => {
            window.location.href = "/dashboard";
          }, 1500);
          return;
        }

        setStatus("wizard");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setStatus("error");
      }
    };

    checkUser();
  }, [isLoaded, user]);

  const update = (fields: Partial<SetupData>) => setData((d) => ({ ...d, ...fields }));

  const canAdvance = () => {
    if (step === 0) return data.orgName.trim().length > 0;
    if (step === 1) return data.houseName.trim().length > 0 && data.bedCount > 0 && data.rentAmount.trim().length > 0;
    return true; // Step 2 (resident) is optional
  };

  const handleSubmit = async () => {
    if (!user) return;
    setStatus("creating");
    setError(null);

    try {
      const res = await fetch("/api/setup-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clerkId: user.id,
          email: user.primaryEmailAddress?.emailAddress || "",
          firstName: user.firstName || "",
          lastName: user.lastName || "",
          orgName: data.orgName.trim(),
          house: {
            name: data.houseName.trim(),
            address: data.address.trim(),
            city: data.city.trim(),
            state: data.state.trim(),
            zip: data.zip.trim(),
            bedCount: data.bedCount,
            rentAmount: data.rentAmount.trim(),
          },
          resident: data.residentFirstName.trim()
            ? {
                firstName: data.residentFirstName.trim(),
                lastName: data.residentLastName.trim(),
                phone: data.residentPhone.trim(),
                email: data.residentEmail.trim(),
                moveInDate: data.residentMoveIn,
              }
            : undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Setup failed");
      }

      setStatus("done");
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    }
  };

  const handleNext = () => {
    if (step < 2) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa] px-4">
      <div className="bg-white border border-zinc-200 rounded-xl shadow-xl p-8 max-w-lg w-full">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 rounded-xl bg-indigo-500 flex items-center justify-center">
            <span className="text-xl font-bold text-white">R</span>
          </div>
        </div>

        {status === "checking" && (
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-4" />
            <h1 className="text-lg font-semibold text-zinc-800">Checking account...</h1>
          </div>
        )}

        {status === "wizard" && (
          <>
            <StepIndicator current={step} total={3} />

            {/* Screen 1: Organization */}
            {step === 0 && (
              <div>
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-500/15 mb-3">
                    <Building2 className="w-5 h-5 text-indigo-400" />
                  </div>
                  <h1 className="text-xl font-bold text-zinc-800">Name your organization</h1>
                  <p className="text-sm text-zinc-500 mt-1">What&apos;s your sober living business called?</p>
                </div>

                <div className="space-y-3">
                  <input
                    type="text"
                    value={data.orgName}
                    onChange={(e) => update({ orgName: e.target.value })}
                    className={inputClass}
                    placeholder="e.g., Sunrise Recovery Homes"
                    autoFocus
                  />
                  {user && (
                    <p className="text-xs text-zinc-600">
                      Signed in as {user.firstName} {user.lastName}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Screen 2: First House */}
            {step === 1 && (
              <div>
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-500/15 mb-3">
                    <Home className="w-5 h-5 text-indigo-400" />
                  </div>
                  <h1 className="text-xl font-bold text-zinc-800">Add your first house</h1>
                  <p className="text-sm text-zinc-500 mt-1">You can add more later.</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">House Name *</label>
                    <input
                      type="text"
                      value={data.houseName}
                      onChange={(e) => update({ houseName: e.target.value })}
                      className={inputClass}
                      placeholder="e.g., Sunrise Men's House"
                      autoComplete="off"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">Address</label>
                    <input
                      type="text"
                      value={data.address}
                      onChange={(e) => update({ address: e.target.value })}
                      className={inputClass}
                      placeholder="123 Recovery Lane"
                      autoComplete="street-address"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1">City</label>
                      <input
                        type="text"
                        value={data.city}
                        onChange={(e) => update({ city: e.target.value })}
                        className={inputClass}
                        autoComplete="address-level2"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1">State</label>
                      <input
                        type="text"
                        value={data.state}
                        onChange={(e) => update({ state: e.target.value })}
                        className={inputClass}
                        maxLength={2}
                        placeholder="CA"
                        autoComplete="address-level1"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1">Zip</label>
                      <input
                        type="text"
                        value={data.zip}
                        onChange={(e) => update({ zip: e.target.value })}
                        className={inputClass}
                        placeholder="90001"
                        autoComplete="postal-code"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1">
                        <Bed className="inline w-3 h-3 mr-1" />
                        Number of Beds *
                      </label>
                      <input
                        type="number"
                        value={data.bedCount}
                        onChange={(e) => update({ bedCount: Math.max(1, parseInt(e.target.value) || 1) })}
                        className={inputClass}
                        min={1}
                        max={50}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1">
                        <DollarSign className="inline w-3 h-3 mr-1" />
                        Rate Per Bed / Month *
                      </label>
                      <input
                        type="text"
                        value={data.rentAmount}
                        onChange={(e) => update({ rentAmount: e.target.value.replace(/[^0-9.]/g, "") })}
                        className={inputClass}
                        placeholder="700"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Screen 3: First Resident (optional) */}
            {step === 2 && (
              <div>
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-500/15 mb-3">
                    <Users className="w-5 h-5 text-indigo-400" />
                  </div>
                  <h1 className="text-xl font-bold text-zinc-800">Add your first resident</h1>
                  <p className="text-sm text-zinc-500 mt-1">Optional — you can skip and add residents later.</p>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1">First Name</label>
                      <input
                        type="text"
                        value={data.residentFirstName}
                        onChange={(e) => update({ residentFirstName: e.target.value })}
                        className={inputClass}
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1">Last Name</label>
                      <input
                        type="text"
                        value={data.residentLastName}
                        onChange={(e) => update({ residentLastName: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={data.residentPhone}
                      onChange={(e) => update({ residentPhone: e.target.value })}
                      className={inputClass}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">Email</label>
                    <input
                      type="email"
                      value={data.residentEmail}
                      onChange={(e) => update({ residentEmail: e.target.value })}
                      className={inputClass}
                      placeholder="optional"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">Move-in Date</label>
                    <input
                      type="date"
                      value={data.residentMoveIn}
                      onChange={(e) => update({ residentMoveIn: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-6 gap-3">
              {step > 0 ? (
                <button
                  onClick={() => setStep(step - 1)}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-zinc-400 hover:text-zinc-700 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              ) : (
                <div />
              )}
              <button
                onClick={handleNext}
                disabled={!canAdvance()}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-400 font-medium text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {step === 2 ? (data.residentFirstName.trim() ? "Finish Setup" : "Skip & Finish") : "Continue"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}

        {status === "creating" && (
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-4" />
            <h1 className="text-lg font-semibold text-zinc-800">Setting up your business...</h1>
            <p className="text-sm text-zinc-500 mt-1">Creating your organization, house, and beds.</p>
          </div>
        )}

        {status === "already-setup" && (
          <div className="text-center">
            <div className="w-12 h-12 bg-indigo-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-6 h-6 text-indigo-400" />
            </div>
            <h1 className="text-lg font-semibold text-zinc-800">Welcome back!</h1>
            <p className="text-sm text-zinc-500 mt-1">Redirecting to dashboard...</p>
          </div>
        )}

        {status === "done" && (
          <div className="text-center">
            <div className="w-12 h-12 bg-green-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-6 h-6 text-green-400" />
            </div>
            <h1 className="text-lg font-semibold text-zinc-800">You&apos;re all set!</h1>
            <p className="text-sm text-zinc-500 mt-1">
              {data.houseName ? `${data.houseName} is ready with ${data.bedCount} beds.` : "Your organization is ready."}
            </p>
            <p className="text-xs text-zinc-600 mt-2">Redirecting to dashboard...</p>
          </div>
        )}

        {status === "error" && (
          <div className="text-center">
            <div className="w-12 h-12 bg-red-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-6 h-6 text-red-400" />
            </div>
            <h1 className="text-lg font-semibold text-zinc-800">Setup failed</h1>
            <p className="text-red-400 mt-2 text-sm">{error}</p>
            <button
              onClick={() => {
                setError(null);
                setStatus("wizard");
              }}
              className="mt-4 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-400 font-medium text-sm transition-colors"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

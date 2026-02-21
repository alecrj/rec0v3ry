"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { CheckCircle, Loader2, AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

const inputClass =
  "w-full h-10 px-3 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors";

const REFERRAL_SOURCES = [
  { value: "treatment_center", label: "Treatment Center" },
  { value: "court", label: "Court / Probation" },
  { value: "hospital", label: "Hospital" },
  { value: "aa_na", label: "AA / NA Meeting" },
  { value: "church", label: "Church / Faith Organization" },
  { value: "self", label: "Self" },
  { value: "family", label: "Family Member" },
  { value: "online", label: "Found Online" },
  { value: "other", label: "Other" },
];

export default function PublicApplyPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [orgName, setOrgName] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "form" | "submitting" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [source, setSource] = useState("");
  const [substanceHistory, setSubstanceHistory] = useState("");
  const [desiredMoveInDate, setDesiredMoveInDate] = useState("");
  const [notes, setNotes] = useState("");

  // Validate the org slug exists by doing a quick dry call
  useEffect(() => {
    async function checkOrg() {
      try {
        // Try a minimal POST to check if the org exists
        // We'll use a HEAD-like approach: submit with obviously invalid data to check if 404 or 400
        const res = await fetch("/api/public/apply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, firstName: "", lastName: "" }),
        });

        if (res.status === 404) {
          setStatus("error");
          setErrorMessage("This organization was not found. Please check the URL.");
          return;
        }

        // Even if it returns 400 (validation error), the org was found
        // We can parse the error to find the org name if needed
        setStatus("form");
      } catch {
        setStatus("error");
        setErrorMessage("Unable to connect. Please try again.");
      }
    }
    checkOrg();
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");

    try {
      const res = await fetch("/api/public/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          firstName,
          lastName,
          phone: phone || undefined,
          email: email || undefined,
          source: source || undefined,
          substanceHistory: substanceHistory || undefined,
          desiredMoveInDate: desiredMoveInDate || undefined,
          notes: notes || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Something went wrong");
      }

      const data = await res.json();
      setOrgName(data.orgName);
      setStatus("success");
    } catch (err: any) {
      setStatus("form");
      setErrorMessage(err.message || "Something went wrong. Please try again.");
    }
  };

  // Loading state
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  // Error state (org not found)
  if (status === "error" && !errorMessage.includes("Something")) {
    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center space-y-4">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="h-8 w-8 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-zinc-100">Page Not Found</h1>
          <p className="text-zinc-400">{errorMessage}</p>
        </div>
      </div>
    );
  }

  // Success state
  if (status === "success") {
    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="h-10 w-10 text-green-400" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-zinc-100">Thank You!</h1>
            <p className="text-zinc-400 text-lg">
              Your application has been submitted{orgName ? ` to ${orgName}` : ""}.
            </p>
            <p className="text-zinc-500">
              We&apos;ll be in touch within 24 hours.
            </p>
          </div>
          <div className="pt-4">
            <p className="text-xs text-zinc-600">
              If you have urgent needs, please contact the facility directly.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Form
  return (
    <div className="min-h-screen bg-[#09090B] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-indigo-500 flex items-center justify-center mx-auto mb-4">
            <span className="text-lg font-bold text-white">R</span>
          </div>
          <h1 className="text-2xl font-bold text-zinc-100">Apply for Housing</h1>
          <p className="text-zinc-400 mt-2">
            Fill out this form and we&apos;ll get back to you shortly.
          </p>
        </div>

        {/* Error banner */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-300">{errorMessage}</p>
          </div>
        )}

        {/* Form Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-zinc-900 rounded-xl border border-zinc-800 shadow-xl"
        >
          <div className="p-6 space-y-5">
            {/* Name */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                  First Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={inputClass}
                  placeholder="John"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                  Last Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className={inputClass}
                  placeholder="Doe"
                />
              </div>
            </div>

            {/* Contact */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputClass}
                  placeholder="(555) 123-4567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  placeholder="john@example.com"
                />
              </div>
            </div>

            {/* Referral Source */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                How did you hear about us?
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className={inputClass}
              >
                <option value="">Select...</option>
                {REFERRAL_SOURCES.map((s) => (
                  <option key={s.value} value={s.label}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Desired Move-in Date */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Desired Move-in Date
              </label>
              <input
                type="date"
                value={desiredMoveInDate}
                onChange={(e) => setDesiredMoveInDate(e.target.value)}
                className={inputClass}
              />
            </div>

            {/* Substance History */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Substance History <span className="text-zinc-500">(optional)</span>
              </label>
              <textarea
                rows={3}
                value={substanceHistory}
                onChange={(e) => setSubstanceHistory(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none transition-colors"
                placeholder="Brief history, current sobriety, etc."
              />
            </div>

            {/* Additional Notes */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Additional Notes <span className="text-zinc-500">(optional)</span>
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-zinc-800 rounded-lg bg-zinc-800/40 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none transition-colors"
                placeholder="Anything else you'd like us to know..."
              />
            </div>
          </div>

          {/* Submit */}
          <div className="p-6 pt-0">
            <button
              type="submit"
              disabled={status === "submitting" || !firstName || !lastName}
              className="w-full h-11 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-500/50 disabled:cursor-not-allowed text-white font-medium text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {status === "submitting" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Application"
              )}
            </button>
          </div>
        </form>

        <p className="mt-6 text-center text-xs text-zinc-600">
          Your information is kept confidential and secure.
        </p>
      </div>
    </div>
  );
}

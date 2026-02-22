"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

interface OrgProperty {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
}

interface OrgData {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  properties: OrgProperty[];
}

type SubmitStatus = "idle" | "submitting" | "success" | "error";

export default function OrgIntakePage() {
  const params = useParams();
  const orgSlug = params.slug as string;

  const [org, setOrg] = useState<OrgData | null>(null);
  const [orgLoading, setOrgLoading] = useState(true);
  const [orgError, setOrgError] = useState<string | null>(null);

  const [selectedPropertySlug, setSelectedPropertySlug] = useState<string>("");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    preferredMoveInDate: "",
    notes: "",
  });
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrg() {
      try {
        const res = await fetch(`/api/public/org/${orgSlug}`);
        if (!res.ok) {
          const data = await res.json();
          setOrgError(data.error ?? "Organization not found");
          return;
        }
        const data: OrgData = await res.json();
        setOrg(data);
        // Pre-select first property if only one
        if (data.properties.length === 1) {
          setSelectedPropertySlug(data.properties[0].slug);
        }
      } catch {
        setOrgError("Failed to load organization info");
      } finally {
        setOrgLoading(false);
      }
    }
    loadOrg();
  }, [orgSlug]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!org) return;

    setSubmitStatus("submitting");
    setSubmitError(null);

    try {
      const res = await fetch("/api/public/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgSlug,
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email || undefined,
          phone: form.phone || undefined,
          preferredMoveInDate: form.preferredMoveInDate || undefined,
          notes: form.notes || undefined,
          propertySlug: selectedPropertySlug || undefined,
          source: "Intake Form",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setSubmitError(data.error ?? "Submission failed");
        setSubmitStatus("error");
        return;
      }

      setSubmitStatus("success");
    } catch {
      setSubmitError("Network error — please try again");
      setSubmitStatus("error");
    }
  }

  if (orgLoading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (orgError || !org) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center px-4">
        <div className="bg-white border border-zinc-200 rounded-xl p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-400 text-xl">!</span>
          </div>
          <h1 className="text-zinc-900 text-xl font-semibold mb-2">Link Not Found</h1>
          <p className="text-zinc-400 text-sm">{orgError ?? "This intake link is no longer active."}</p>
        </div>
      </div>
    );
  }

  if (submitStatus === "success") {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center px-4">
        <div className="bg-white border border-zinc-200 rounded-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-zinc-900 text-xl font-semibold mb-2">Application Submitted</h1>
          <p className="text-zinc-400 text-sm">
            Thank you, {form.firstName}! The team at <strong className="text-zinc-900">{org.name}</strong> will reach out to you soon.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] py-12 px-4">
      <div className="max-w-lg mx-auto">
        {/* Org Branding */}
        <div className="flex flex-col items-center mb-8">
          {org.logo_url ? (
            <img
              src={org.logo_url}
              alt={org.name}
              className="w-16 h-16 rounded-xl object-cover mb-4"
            />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-indigo-600 flex items-center justify-center mb-4">
              <span className="text-white text-2xl font-bold">
                {org.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <h1 className="text-zinc-900 text-2xl font-bold text-center">{org.name}</h1>
          <p className="text-zinc-400 text-sm mt-1 text-center">
            Sober Living Application
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white border border-zinc-200 rounded-xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Property Selector — only if multiple properties */}
            {org.properties.length > 1 && (
              <div>
                <label className="block text-sm font-medium text-zinc-600 mb-1.5">
                  Which location are you interested in?
                </label>
                <select
                  value={selectedPropertySlug}
                  onChange={(e) => setSelectedPropertySlug(e.target.value)}
                  className="w-full bg-white border border-zinc-200 text-zinc-900 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Any location</option>
                  {org.properties.map((prop) => (
                    <option key={prop.id} value={prop.slug}>
                      {prop.name} — {prop.city}, {prop.state}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Name */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-zinc-600 mb-1.5">
                  First Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  placeholder="John"
                  className="w-full bg-white border border-zinc-200 text-zinc-900 rounded-lg px-3 py-2.5 text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-600 mb-1.5">
                  Last Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  placeholder="Smith"
                  className="w-full bg-white border border-zinc-200 text-zinc-900 rounded-lg px-3 py-2.5 text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Contact */}
            <div>
              <label className="block text-sm font-medium text-zinc-600 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="john@example.com"
                className="w-full bg-white border border-zinc-200 text-zinc-900 rounded-lg px-3 py-2.5 text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-600 mb-1.5">
                Phone
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="(512) 555-0100"
                className="w-full bg-white border border-zinc-200 text-zinc-900 rounded-lg px-3 py-2.5 text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Move-in date */}
            <div>
              <label className="block text-sm font-medium text-zinc-600 mb-1.5">
                Preferred Move-in Date
              </label>
              <input
                type="date"
                value={form.preferredMoveInDate}
                onChange={(e) => setForm({ ...form, preferredMoveInDate: e.target.value })}
                className="w-full bg-white border border-zinc-200 text-zinc-900 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-zinc-600 mb-1.5">
                Additional Notes
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                placeholder="Tell us a bit about yourself or ask a question..."
                className="w-full bg-white border border-zinc-200 text-zinc-900 rounded-lg px-3 py-2.5 text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
            </div>

            {submitError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                <p className="text-red-400 text-sm">{submitError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitStatus === "submitting"}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg px-4 py-3 text-sm transition-colors"
            >
              {submitStatus === "submitting" ? "Submitting..." : "Submit Application"}
            </button>
          </form>
        </div>

        <p className="text-center text-zinc-600 text-xs mt-6">
          Powered by RecoveryOS
        </p>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { RedisclosureBanner } from "./redisclosure-banner";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/components/ui";

interface ConsentWizardProps {
  residentId?: string;
  onComplete?: () => void;
  onCancel?: () => void;
}

const steps = [
  { number: 1, title: "Patient Information" },
  { number: 2, title: "Disclosure Details" },
  { number: 3, title: "Scope & Purpose" },
  { number: 4, title: "Terms & Rights" },
  { number: 5, title: "Review & Sign" },
];

interface ConsentFormData {
  residentId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  patientId: string;
  recipientName: string;
  recipientAddress: string;
  purpose: string;
  purposeDetails: string;
  informationScope: string[];
  expirationDate: string;
  signatureDate: string;
  witness: string;
}

const defaultFormData: ConsentFormData = {
  residentId: "",
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  patientId: "",
  recipientName: "",
  recipientAddress: "",
  purpose: "",
  purposeDetails: "",
  informationScope: [],
  expirationDate: "",
  signatureDate: new Date().toISOString().split("T")[0]!,
  witness: "",
};

const purposeMap: Record<string, string> = {
  treatment: "treatment",
  employment: "healthcare_operations",
  legal: "audit",
  family: "general_disclosure",
  insurance: "payment",
  research: "research",
  other: "general_disclosure",
};

const scopeOptions = [
  "Admission and discharge dates",
  "Treatment plan and progress notes",
  "Drug test results",
  "Medication records",
  "Attendance and participation records",
];

export function ConsentWizard({ residentId, onComplete, onCancel }: ConsentWizardProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<ConsentFormData>({
    ...defaultFormData,
    residentId: residentId || "",
  });

  // Load residents for selection if no residentId provided
  const { data: residentsData } = trpc.resident.list.useQuery(
    { status: "active", limit: 200 },
    { enabled: !residentId }
  );
  const residents = residentsData?.items ?? [];

  const utils = trpc.useUtils();
  const createConsent = trpc.consent.create.useMutation({
    onSuccess: () => {
      toast("success", "Consent created", "42 CFR Part 2 consent has been recorded.");
      utils.consent.list.invalidate();
      onComplete?.();
    },
    onError: (error) => {
      toast("error", "Failed to create consent", error.message);
    },
  });

  const update = (field: keyof ConsentFormData, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleScope = (item: string) => {
    setFormData((prev) => ({
      ...prev,
      informationScope: prev.informationScope.includes(item)
        ? prev.informationScope.filter((s) => s !== item)
        : [...prev.informationScope, item],
    }));
  };

  const handleSubmit = () => {
    if (!formData.residentId || !formData.recipientName || !formData.purpose) {
      toast("warning", "Missing required fields", "Please complete all required fields.");
      return;
    }
    const consentType = purposeMap[formData.purpose] || "general_disclosure";
    createConsent.mutate({
      residentId: formData.residentId,
      consentType: consentType as "general_disclosure" | "treatment" | "payment" | "healthcare_operations" | "research" | "audit" | "medical_emergency",
      patientName: `${formData.firstName} ${formData.lastName}`.trim(),
      disclosingEntity: "Organization Facility",
      recipient: formData.recipientName,
      purpose: formData.purposeDetails || formData.purpose,
      informationScope: formData.informationScope.join("; ") || "General health information",
      expirationDate: formData.expirationDate ? new Date(formData.expirationDate).toISOString() : undefined,
      patientSignature: "electronic-consent-" + Date.now(),
      signatureDate: new Date(formData.signatureDate).toISOString(),
      notes: formData.witness ? `Witness: ${formData.witness}` : undefined,
    });
  };

  const goNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const goBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const inputClass = "w-full px-3 py-2 bg-zinc-900 text-zinc-100 border border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500";

  return (
    <div className="bg-zinc-900 rounded-lg border border-zinc-800">
      {/* Progress Steps */}
      <div className="border-b border-zinc-800 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-zinc-100">
            Create 42 CFR Part 2 Consent
          </h2>
          <button onClick={onCancel} className="text-sm text-zinc-400 hover:text-zinc-100">
            Cancel
          </button>
        </div>
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-colors",
                    currentStep >= step.number ? "bg-indigo-500 text-white" : "bg-zinc-700 text-zinc-400"
                  )}
                >
                  {step.number}
                </div>
                <span className={cn("text-xs mt-2 text-center", currentStep >= step.number ? "text-zinc-100 font-medium" : "text-zinc-500")}>
                  {step.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={cn("h-0.5 flex-1 mx-2 transition-colors", currentStep > step.number ? "bg-indigo-500" : "bg-zinc-700")} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <div className="p-6">
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-zinc-100 mb-4">Patient Information</h3>
              <p className="text-sm text-zinc-400 mb-6">Enter the patient&apos;s identifying information as required by 42 CFR 2.31(a)(1).</p>
            </div>
            {!residentId && (
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Select Resident <span className="text-red-500">*</span></label>
                <select value={formData.residentId} onChange={(e) => {
                  update("residentId", e.target.value);
                  const r = residents.find((res) => res.id === e.target.value);
                  if (r) {
                    update("firstName", r.first_name);
                    update("lastName", r.last_name);
                  }
                }} className={inputClass}>
                  <option value="">Select a resident...</option>
                  {residents.map((r) => (
                    <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">First Name <span className="text-red-500">*</span></label>
                <input type="text" value={formData.firstName} onChange={(e) => update("firstName", e.target.value)} className={inputClass} placeholder="Enter first name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Last Name <span className="text-red-500">*</span></label>
                <input type="text" value={formData.lastName} onChange={(e) => update("lastName", e.target.value)} className={inputClass} placeholder="Enter last name" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Date of Birth</label>
                <input type="date" value={formData.dateOfBirth} onChange={(e) => update("dateOfBirth", e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Patient ID</label>
                <input type="text" value={formData.patientId} onChange={(e) => update("patientId", e.target.value)} className={inputClass} placeholder="Optional patient identifier" />
              </div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-zinc-100 mb-4">Disclosure Details</h3>
              <p className="text-sm text-zinc-400 mb-6">Identify the disclosing entity and recipient as required by 42 CFR 2.31(a)(2-3).</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Disclosing Entity <span className="text-red-500">*</span></label>
              <input type="text" className={cn(inputClass, "bg-zinc-800/40")} value="Organization Facility" disabled />
              <p className="text-xs text-zinc-500 mt-1">Pre-filled from your organization settings</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Recipient Name <span className="text-red-500">*</span></label>
              <input type="text" value={formData.recipientName} onChange={(e) => update("recipientName", e.target.value)} className={inputClass} placeholder="Enter recipient name or organization" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Recipient Address</label>
              <textarea rows={3} value={formData.recipientAddress} onChange={(e) => update("recipientAddress", e.target.value)} className={inputClass} placeholder="Enter complete mailing address" />
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-zinc-100 mb-4">Scope & Purpose</h3>
              <p className="text-sm text-zinc-400 mb-6">Define the purpose and scope of information to be disclosed per 42 CFR 2.31(a)(4-5).</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Purpose of Disclosure <span className="text-red-500">*</span></label>
              <select value={formData.purpose} onChange={(e) => update("purpose", e.target.value)} className={inputClass}>
                <option value="">Select purpose</option>
                <option value="treatment">Treatment Coordination</option>
                <option value="employment">Employment Verification</option>
                <option value="legal">Legal/Court Proceedings</option>
                <option value="family">Family Communication</option>
                <option value="insurance">Insurance/Benefits</option>
                <option value="research">Research (De-identified)</option>
                <option value="other">Other (specify below)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Additional Purpose Details</label>
              <textarea rows={3} value={formData.purposeDetails} onChange={(e) => update("purposeDetails", e.target.value)} className={inputClass} placeholder="Provide specific details about the disclosure purpose" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-3">Information to be Disclosed <span className="text-red-500">*</span></label>
              <div className="space-y-2">
                {scopeOptions.map((item) => (
                  <label key={item} className="flex items-center gap-3">
                    <input type="checkbox" checked={formData.informationScope.includes(item)} onChange={() => toggleScope(item)} className="w-4 h-4 text-indigo-500 border-zinc-700 rounded focus:ring-indigo-500 accent-indigo-500" />
                    <span className="text-sm text-zinc-300">{item}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-zinc-100 mb-4">Terms & Rights</h3>
              <p className="text-sm text-zinc-400 mb-6">Set expiration and review patient rights per 42 CFR 2.31(a)(6-9).</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Expiration Date <span className="text-red-500">*</span></label>
              <input type="date" value={formData.expirationDate} onChange={(e) => update("expirationDate", e.target.value)} className={inputClass} />
              <p className="text-xs text-zinc-500 mt-1">Maximum recommended duration: 1 year from signature</p>
            </div>
            <RedisclosureBanner />
            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-indigo-200 mb-2">Patient Rights Notice</h4>
              <ul className="text-sm text-indigo-300 space-y-1 list-disc list-inside">
                <li>You have the right to revoke this consent at any time by providing written notice to the facility.</li>
                <li>Revocation will not apply to information already disclosed based on this consent.</li>
                <li>Your treatment or benefits cannot be conditioned on signing this consent, except as permitted by law.</li>
                <li>Once disclosed to the recipient, this information may no longer be protected by federal privacy rules.</li>
              </ul>
            </div>
          </div>
        )}

        {currentStep === 5 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-zinc-100 mb-4">Review & Sign</h3>
              <p className="text-sm text-zinc-400 mb-6">Review the consent details and capture the patient&apos;s signature.</p>
            </div>
            <div className="bg-zinc-800/40 border border-zinc-800 rounded-lg p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-zinc-500 uppercase">Patient Name</p>
                  <p className="text-sm text-zinc-100 mt-1">{formData.firstName} {formData.lastName}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-500 uppercase">Date of Birth</p>
                  <p className="text-sm text-zinc-100 mt-1">{formData.dateOfBirth || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-500 uppercase">Recipient</p>
                  <p className="text-sm text-zinc-100 mt-1">{formData.recipientName || "Not set"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-500 uppercase">Purpose</p>
                  <p className="text-sm text-zinc-100 mt-1">{formData.purpose || "Not set"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-500 uppercase">Expiration Date</p>
                  <p className="text-sm text-zinc-100 mt-1">{formData.expirationDate || "No expiration"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-500 uppercase">Information Scope</p>
                  <p className="text-sm text-zinc-100 mt-1">{formData.informationScope.length} categories selected</p>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Patient Signature <span className="text-red-500">*</span></label>
              <div className="border-2 border-dashed border-zinc-700 rounded-lg p-8 text-center bg-zinc-800/40">
                <FileText className="h-12 w-12 text-zinc-500 mx-auto mb-3" />
                <p className="text-sm text-zinc-400 mb-2">Electronic consent will be recorded</p>
                <p className="text-xs text-zinc-500">By clicking Complete, the patient consents to this disclosure</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Signature Date <span className="text-red-500">*</span></label>
                <input type="date" value={formData.signatureDate} onChange={(e) => update("signatureDate", e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Witness (if applicable)</label>
                <input type="text" value={formData.witness} onChange={(e) => update("witness", e.target.value)} className={inputClass} placeholder="Witness name" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="border-t border-zinc-800 p-6 flex items-center justify-between">
        <button
          onClick={goBack}
          disabled={currentStep === 1}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-300 hover:text-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>
        <button
          onClick={goNext}
          disabled={createConsent.isPending}
          className="flex items-center gap-2 px-6 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-400 font-medium text-sm disabled:opacity-50"
        >
          {currentStep === steps.length ? (
            createConsent.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</>
            ) : (
              "Complete"
            )
          ) : (
            "Next"
          )}
          {currentStep < steps.length && <ChevronRight className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

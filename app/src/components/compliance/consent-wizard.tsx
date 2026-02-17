"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { RedisclosureBanner } from "./redisclosure-banner";

interface ConsentWizardProps {
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

export function ConsentWizard({ onComplete, onCancel }: ConsentWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);

  const goNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    } else if (onComplete) {
      onComplete();
    }
  };

  const goBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200">
      {/* Progress Steps */}
      <div className="border-b border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-slate-900">
            Create 42 CFR Part 2 Consent
          </h2>
          <button
            onClick={onCancel}
            className="text-sm text-slate-600 hover:text-slate-900"
          >
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
                    currentStep >= step.number
                      ? "bg-blue-600 text-white"
                      : "bg-slate-200 text-slate-600"
                  )}
                >
                  {step.number}
                </div>
                <span
                  className={cn(
                    "text-xs mt-2 text-center",
                    currentStep >= step.number
                      ? "text-slate-900 font-medium"
                      : "text-slate-500"
                  )}
                >
                  {step.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 mx-2 transition-colors",
                    currentStep > step.number ? "bg-blue-600" : "bg-slate-200"
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <div className="p-6">
        {currentStep === 1 && <Step1PatientInfo />}
        {currentStep === 2 && <Step2DisclosureDetails />}
        {currentStep === 3 && <Step3ScopePurpose />}
        {currentStep === 4 && <Step4TermsRights />}
        {currentStep === 5 && <Step5ReviewSign />}
      </div>

      {/* Navigation */}
      <div className="border-t border-slate-200 p-6 flex items-center justify-between">
        <button
          onClick={goBack}
          disabled={currentStep === 1}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>
        <button
          onClick={goNext}
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
        >
          {currentStep === steps.length ? "Complete" : "Next"}
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function Step1PatientInfo() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Patient Information
        </h3>
        <p className="text-sm text-slate-600 mb-6">
          Enter the patient's identifying information as required by 42 CFR
          2.31(a)(1).
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            First Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter first name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Last Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter last name"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Date of Birth <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Patient ID
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Optional patient identifier"
          />
        </div>
      </div>
    </div>
  );
}

function Step2DisclosureDetails() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Disclosure Details
        </h3>
        <p className="text-sm text-slate-600 mb-6">
          Identify the disclosing entity and recipient as required by 42 CFR
          2.31(a)(2-3).
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Disclosing Entity <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50"
          value="Serenity Recovery House - Main Facility"
          disabled
        />
        <p className="text-xs text-slate-500 mt-1">
          Pre-filled from your organization settings
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Recipient Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter recipient name or organization"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Recipient Address <span className="text-red-500">*</span>
        </label>
        <textarea
          rows={3}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter complete mailing address"
        />
      </div>
    </div>
  );
}

function Step3ScopePurpose() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Scope & Purpose
        </h3>
        <p className="text-sm text-slate-600 mb-6">
          Define the purpose and scope of information to be disclosed per 42 CFR
          2.31(a)(4-5).
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Purpose of Disclosure <span className="text-red-500">*</span>
        </label>
        <select className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
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
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Additional Purpose Details
        </label>
        <textarea
          rows={3}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Provide specific details about the disclosure purpose"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-3">
          Information to be Disclosed <span className="text-red-500">*</span>
        </label>
        <div className="space-y-2">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-slate-700">
              Admission and discharge dates
            </span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-slate-700">
              Treatment plan and progress notes
            </span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-slate-700">
              Drug test results
            </span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-slate-700">
              Medication records
            </span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-slate-700">
              Attendance and participation records
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}

function Step4TermsRights() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Terms & Rights
        </h3>
        <p className="text-sm text-slate-600 mb-6">
          Set expiration and review patient rights per 42 CFR 2.31(a)(6-9).
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Expiration Type <span className="text-red-500">*</span>
        </label>
        <select className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="date">Specific Date</option>
          <option value="event">Specific Event</option>
          <option value="duration">Duration from Signature</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Expiration Date <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-slate-500 mt-1">
          Maximum recommended duration: 1 year from signature
        </p>
      </div>

      <RedisclosureBanner />

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">
          Patient Rights Notice
        </h4>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>
            You have the right to revoke this consent at any time by providing
            written notice to the facility.
          </li>
          <li>
            Revocation will not apply to information already disclosed based on
            this consent.
          </li>
          <li>
            Your treatment or benefits cannot be conditioned on signing this
            consent, except as permitted by law.
          </li>
          <li>
            Once disclosed to the recipient, this information may no longer be
            protected by federal privacy rules.
          </li>
        </ul>
      </div>
    </div>
  );
}

function Step5ReviewSign() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Review & Sign
        </h3>
        <p className="text-sm text-slate-600 mb-6">
          Review the consent details and capture the patient's signature.
        </p>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase">
              Patient Name
            </p>
            <p className="text-sm text-slate-900 mt-1">[Preview data]</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase">
              Date of Birth
            </p>
            <p className="text-sm text-slate-900 mt-1">[Preview data]</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase">
              Recipient
            </p>
            <p className="text-sm text-slate-900 mt-1">[Preview data]</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase">
              Purpose
            </p>
            <p className="text-sm text-slate-900 mt-1">[Preview data]</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase">
              Expiration Date
            </p>
            <p className="text-sm text-slate-900 mt-1">[Preview data]</p>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Patient Signature <span className="text-red-500">*</span>
        </label>
        <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center bg-slate-50">
          <FileText className="h-12 w-12 text-slate-400 mx-auto mb-3" />
          <p className="text-sm text-slate-600 mb-2">
            Signature capture placeholder
          </p>
          <p className="text-xs text-slate-500">
            In production: DocuSign or canvas signature pad
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Signature Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Witness (if applicable)
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Witness name"
          />
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Shield, Printer } from "lucide-react";

export function PatientNotice() {
  const [acknowledged, setAcknowledged] = useState(false);
  const [signatureDate, setSignatureDate] = useState("");

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto bg-white">
      {/* Print button - hidden when printing */}
      <div className="mb-6 print:hidden">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          <Printer className="h-4 w-4" />
          Print Notice
        </button>
      </div>

      {/* Document */}
      <div className="border border-slate-200 rounded-lg p-8 space-y-6 print:border-0">
        {/* Header */}
        <div className="text-center border-b border-slate-200 pb-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">R</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-900">RecoveryOS</h1>
          </div>
          <h2 className="text-2xl font-semibold text-slate-900">Notice of Privacy Practices</h2>
          <p className="text-sm text-slate-600 mt-2">
            Effective Date: February 16, 2026 | Version 1.0
          </p>
        </div>

        {/* Introduction */}
        <div className="space-y-3">
          <p className="text-sm text-slate-700 leading-relaxed">
            This notice describes how information about you may be used and disclosed and how you
            can get access to this information. Please review it carefully.
          </p>
          <p className="text-sm text-slate-700 leading-relaxed">
            RecoveryOS is committed to protecting your privacy and maintaining the confidentiality
            of your health information in accordance with federal and state law, including the
            Health Insurance Portability and Accountability Act (HIPAA) and 42 CFR Part 2 (federal
            substance use disorder confidentiality regulations).
          </p>
        </div>

        {/* Your Rights Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-slate-900">
              Your Rights Under 42 CFR Part 2
            </h3>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900 font-medium mb-3">
              As a patient receiving substance use disorder treatment services, you have the
              following rights:
            </p>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <span className="font-bold mt-0.5">•</span>
                <span>
                  <strong>Right to Consent:</strong> We cannot disclose your information to anyone
                  outside our program without your written consent, except in limited circumstances
                  permitted by law.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold mt-0.5">•</span>
                <span>
                  <strong>Right to Revoke Consent:</strong> You may revoke your consent at any
                  time by providing written notice to our facility. Revocation will not apply to
                  information already disclosed.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold mt-0.5">•</span>
                <span>
                  <strong>Right to Accounting of Disclosures:</strong> You have the right to
                  receive a list of disclosures made without your consent for the past six years.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold mt-0.5">•</span>
                <span>
                  <strong>Right to File a Complaint:</strong> You may file a complaint with the
                  U.S. Department of Health and Human Services if you believe your privacy rights
                  have been violated. We will not retaliate against you for filing a complaint.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold mt-0.5">•</span>
                <span>
                  <strong>Right to Access Your Records:</strong> You have the right to inspect and
                  obtain a copy of your treatment records, subject to certain limitations.
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* How We Use Your Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900">How We Use Your Information</h3>
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-semibold text-slate-900 mb-1">
                Uses Without Your Consent
              </h4>
              <p className="text-sm text-slate-700 leading-relaxed">
                We may use and disclose your information within our program for treatment,
                payment, and healthcare operations without your written consent. We may also
                disclose information without consent in certain limited circumstances, including:
                medical emergencies, child abuse reporting, crimes on our premises or against
                personnel, and qualified audits.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900 mb-1">
                Uses Requiring Your Consent
              </h4>
              <p className="text-sm text-slate-700 leading-relaxed">
                For all other disclosures to external entities (e.g., family members, employers,
                insurance companies, other treatment providers), we will obtain your written
                consent before releasing any information.
              </p>
            </div>
          </div>
        </div>

        {/* Redisclosure Notice */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900">
            Federal Redisclosure Notice (42 CFR § 2.32)
          </h3>
          <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4">
            <p className="text-sm text-amber-900 font-semibold mb-2">
              IMPORTANT NOTICE TO RECIPIENT OF INFORMATION:
            </p>
            <p className="text-sm text-amber-900 leading-relaxed">
              This information has been disclosed to you from records protected by federal
              confidentiality rules (42 CFR Part 2). The federal rules prohibit you from making
              any further disclosure of information in this record that identifies a patient as
              having or having had a substance use disorder either directly, by reference to
              publicly available information, or through verification of such identification by
              another person unless further disclosure is expressly permitted by the written
              consent of the individual whose information is being disclosed or as otherwise
              permitted by 42 CFR Part 2. A general authorization for the release of medical or
              other information is NOT sufficient for this purpose (see § 2.31). The federal rules
              restrict any use of the information to investigate or prosecute with regard to a
              crime any patient with a substance use disorder, except as provided at §§ 2.12(c)(5)
              and 2.65.
            </p>
          </div>
        </div>

        {/* Breach Notification */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900">Breach Notification</h3>
          <p className="text-sm text-slate-700 leading-relaxed">
            If a breach of your unsecured protected health information occurs, we will notify you
            within 60 days of discovering the breach. We will provide information about what
            happened, what information was involved, steps you can take to protect yourself, and
            what we are doing to investigate and prevent future breaches.
          </p>
        </div>

        {/* Contact Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900">Contact Information</h3>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
            <div>
              <p className="text-sm font-semibold text-slate-900">Privacy Officer</p>
              <p className="text-sm text-slate-700">RecoveryOS Compliance Department</p>
            </div>
            <div>
              <p className="text-sm text-slate-700">Email: privacy@recoveryos.com</p>
              <p className="text-sm text-slate-700">Phone: (555) 123-4567</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 mt-3">
                U.S. Department of Health and Human Services
              </p>
              <p className="text-sm text-slate-700">Office for Civil Rights</p>
              <p className="text-sm text-slate-700">Website: www.hhs.gov/ocr/privacy</p>
              <p className="text-sm text-slate-700">Phone: 1-800-368-1019</p>
            </div>
          </div>
        </div>

        {/* Changes to This Notice */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-slate-900">Changes to This Notice</h3>
          <p className="text-sm text-slate-700 leading-relaxed">
            We reserve the right to change this notice. We will post a copy of the current notice
            in our facility and on our website. You may request a paper copy at any time.
          </p>
        </div>

        {/* Acknowledgment Section */}
        <div className="border-t-2 border-slate-300 pt-6 mt-8 space-y-6 print:page-break-before-always">
          <h3 className="text-lg font-semibold text-slate-900">Acknowledgment of Receipt</h3>

          <div className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 mt-0.5 print:hidden"
              />
              <span className="text-sm text-slate-700">
                I acknowledge that I have received a copy of RecoveryOS's Notice of Privacy
                Practices and have been given the opportunity to review it. I understand that I
                have rights regarding my protected health information under 42 CFR Part 2 and
                HIPAA.
              </span>
            </label>

            <div className="grid grid-cols-2 gap-6 mt-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Patient Signature
                </label>
                <div className="border-b-2 border-slate-300 pb-2 min-h-[40px]">
                  <span className="text-sm text-slate-400 print:hidden">
                    [Signature capture in production]
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Date</label>
                <input
                  type="date"
                  value={signatureDate}
                  onChange={(e) => setSignatureDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 print:border-0 print:border-b-2"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mt-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Print Name
                </label>
                <div className="border-b-2 border-slate-300 pb-2 min-h-[40px]">
                  <input
                    type="text"
                    className="w-full border-0 focus:outline-none print:bg-transparent"
                    placeholder="Patient name"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Date of Birth
                </label>
                <div className="border-b-2 border-slate-300 pb-2 min-h-[40px]">
                  <input
                    type="date"
                    className="w-full border-0 focus:outline-none print:bg-transparent"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-200">
              <p className="text-xs text-slate-500 italic">
                For facility use only: If patient refuses or is unable to sign, staff member must
                document reason and witness.
              </p>
              <div className="grid grid-cols-2 gap-6 mt-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-2">
                    Staff Witness Signature
                  </label>
                  <div className="border-b border-slate-300 pb-2 min-h-[30px]"></div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-2">Date</label>
                  <div className="border-b border-slate-300 pb-2 min-h-[30px]"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-500 mt-8 pt-6 border-t border-slate-200">
          <p>RecoveryOS Notice of Privacy Practices | Version 1.0 | Effective February 16, 2026</p>
          <p className="mt-1">© 2026 RecoveryOS. All rights reserved.</p>
        </div>
      </div>

      {/* Print styles */}
      <style jsx>{`
        @media print {
          @page {
            margin: 0.75in;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}

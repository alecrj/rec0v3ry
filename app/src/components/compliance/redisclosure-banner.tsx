import { AlertCircle } from "lucide-react";

export function RedisclosureBanner() {
  return (
    <div className="bg-amber-500/10 border-l-4 border-amber-500 p-4 rounded-r-lg">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-semibold text-amber-200">
            42 CFR Part 2 Redisclosure Notice
          </h3>
          <p className="text-sm text-amber-300 mt-1">
            This information has been disclosed to you from records protected by
            Federal confidentiality rules (42 CFR Part 2). The Federal rules
            prohibit you from making any further disclosure of this information
            unless further disclosure is expressly permitted by the written
            consent of the person to whom it pertains or as otherwise permitted
            by 42 CFR Part 2. A general authorization for the release of medical
            or other information is NOT sufficient for this purpose. The Federal
            rules restrict any use of the information to criminally investigate
            or prosecute any alcohol or drug abuse patient.
          </p>
        </div>
      </div>
    </div>
  );
}

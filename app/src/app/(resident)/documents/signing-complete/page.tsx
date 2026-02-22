"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Clock, ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * DocuSign signing return URL page.
 *
 * DocuSign redirects here after the embedded signing ceremony completes.
 * URL params: event=signing_complete|decline|cancel|session_timeout|ttl_expired
 *
 * The resident is shown a status message and redirected back to their documents.
 */
export default function SigningCompletePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [countdown, setCountdown] = useState(4);

  const event = searchParams.get("event") ?? "";

  const isSuccess = event === "signing_complete";
  const isDeclined = event === "decline";
  const isCancelled = event === "cancel" || event === "session_timeout" || event === "ttl_expired";

  useEffect(() => {
    // Auto-redirect back to documents after countdown
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push("/documents");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4">
      <div className="bg-white border border-zinc-200 rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
        {isSuccess ? (
          <>
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-green-500/15 rounded-full">
                <CheckCircle className="h-12 w-12 text-green-400" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-zinc-800 mb-2">Document Signed!</h1>
            <p className="text-zinc-400 mb-6">
              You have successfully signed the document. A copy will be sent to your email.
            </p>
          </>
        ) : isDeclined ? (
          <>
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-red-500/15 rounded-full">
                <XCircle className="h-12 w-12 text-red-400" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-zinc-800 mb-2">Document Declined</h1>
            <p className="text-zinc-400 mb-6">
              You have declined to sign. Your house manager has been notified. Contact them if you have questions.
            </p>
          </>
        ) : isCancelled ? (
          <>
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-amber-500/15 rounded-full">
                <Clock className="h-12 w-12 text-amber-400" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-zinc-800 mb-2">Signing Cancelled</h1>
            <p className="text-zinc-400 mb-6">
              The signing session was cancelled or timed out. You can return to your documents to sign later.
            </p>
          </>
        ) : (
          <>
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-zinc-100 rounded-full">
                <CheckCircle className="h-12 w-12 text-zinc-500" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-zinc-800 mb-2">Signing Complete</h1>
            <p className="text-zinc-400 mb-6">Your document has been processed.</p>
          </>
        )}

        <p className="text-sm text-zinc-500 mb-4">
          Redirecting to your documents in {countdown}s...
        </p>

        <button
          onClick={() => router.push("/documents")}
          className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-zinc-100 text-zinc-800 rounded-lg font-medium text-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Documents
        </button>
      </div>
    </div>
  );
}

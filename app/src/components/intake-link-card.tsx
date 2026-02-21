"use client";

import { useState, useEffect, useRef } from "react";
import { Copy, Check, Download, Code, QrCode, X } from "lucide-react";
import QRCode from "qrcode";

interface IntakeLinkCardProps {
  /**
   * The full intake URL to display and generate QR for.
   * e.g. "https://app.recoveryos.com/apply/hope-house" or
   *      "https://app.recoveryos.com/apply/hope-house/main-campus"
   */
  intakeUrl: string;
  /**
   * Display label for context (e.g. "Org-wide link" or "Recovery Ranch")
   */
  label?: string;
  /**
   * Optional property name for per-property links
   */
  propertyName?: string;
}

export function IntakeLinkCard({ intakeUrl, label, propertyName }: IntakeLinkCardProps) {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [embedExpanded, setEmbedExpanded] = useState(false);
  const [embedCopied, setEmbedCopied] = useState(false);

  // Generate QR code data URL on mount / URL change
  useEffect(() => {
    QRCode.toDataURL(intakeUrl, {
      width: 256,
      margin: 2,
      color: {
        dark: "#18181B",   // zinc-900 — dark modules
        light: "#FAFAFA",  // almost white — background
      },
      errorCorrectionLevel: "M",
    })
      .then((dataUrl) => setQrDataUrl(dataUrl))
      .catch((err) => console.error("[IntakeLinkCard] QR generation failed:", err));
  }, [intakeUrl]);

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(intakeUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const el = document.createElement("textarea");
      el.value = intakeUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleDownloadQR() {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `intake-qr${propertyName ? `-${propertyName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` : ""}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  const embedHtml = `<!-- ${label ?? "RecoveryOS Intake Form"} -->
<a href="${intakeUrl}"
   target="_blank"
   rel="noopener noreferrer"
   style="display:inline-block;background:#6366F1;color:#fff;font-family:sans-serif;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none;">
  Apply Now
</a>`;

  async function handleCopyEmbed() {
    try {
      await navigator.clipboard.writeText(embedHtml);
      setEmbedCopied(true);
      setTimeout(() => setEmbedCopied(false), 2000);
    } catch {
      const el = document.createElement("textarea");
      el.value = embedHtml;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setEmbedCopied(true);
      setTimeout(() => setEmbedCopied(false), 2000);
    }
  }

  return (
    <div className="bg-[#18181B] border border-zinc-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
        <QrCode className="h-4 w-4 text-indigo-400" />
        <span className="text-sm font-medium text-zinc-200">
          {label ?? "Intake Link"}
        </span>
        {propertyName && (
          <span className="ml-auto text-xs text-zinc-500">{propertyName}</span>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* URL Row */}
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 overflow-hidden">
            <p className="text-sm text-zinc-300 truncate font-mono">{intakeUrl}</p>
          </div>
          <button
            onClick={handleCopyLink}
            className="flex-shrink-0 flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy
              </>
            )}
          </button>
        </div>

        {/* QR Code */}
        <div className="flex items-start gap-4">
          <div className="bg-white rounded-lg p-2 flex-shrink-0">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Intake form QR code"
                width={96}
                height={96}
                className="w-24 h-24"
              />
            ) : (
              <div className="w-24 h-24 flex items-center justify-center bg-zinc-100 rounded">
                <div className="w-6 h-6 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 flex-1">
            <p className="text-xs text-zinc-400">
              Print this QR code on flyers, business cards, or intake packets so applicants can apply from their phone.
            </p>
            <button
              onClick={handleDownloadQR}
              disabled={!qrDataUrl}
              className="flex items-center gap-1.5 text-sm text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-2 rounded-lg transition-colors w-fit"
            >
              <Download className="h-4 w-4" />
              Download PNG
            </button>
          </div>
        </div>

        {/* Embed on Website */}
        <div className="border border-zinc-800 rounded-lg overflow-hidden">
          <button
            onClick={() => setEmbedExpanded(!embedExpanded)}
            className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              Embed on Website
            </span>
            {embedExpanded ? (
              <X className="h-3.5 w-3.5" />
            ) : (
              <span className="text-xs text-zinc-500">Expand</span>
            )}
          </button>

          {embedExpanded && (
            <div className="border-t border-zinc-800 p-3 space-y-2">
              <p className="text-xs text-zinc-500">
                Paste this HTML snippet anywhere on your website to add an &quot;Apply Now&quot; button.
              </p>
              <div className="relative bg-zinc-900 rounded-lg p-3">
                <pre className="text-xs text-zinc-300 whitespace-pre-wrap break-all font-mono leading-relaxed overflow-x-auto">
                  {embedHtml}
                </pre>
                <button
                  onClick={handleCopyEmbed}
                  className="absolute top-2 right-2 flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded transition-colors"
                >
                  {embedCopied ? (
                    <>
                      <Check className="h-3 w-3" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      Copy
                    </>
                  )}
                </button>
              </div>
              {/* Live preview */}
              <div>
                <p className="text-xs text-zinc-600 mb-1.5">Preview:</p>
                <a
                  href={intakeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-6 py-3 rounded-lg transition-colors"
                >
                  Apply Now
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

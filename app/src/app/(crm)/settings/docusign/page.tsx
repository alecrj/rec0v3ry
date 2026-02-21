"use client";

import Link from "next/link";
import {
  CheckCircle,
  XCircle,
  ExternalLink,
  FileText,
  PenTool,
  Shield,
  Settings2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import {
  PageContainer,
  PageHeader,
  Badge,
  Button,
} from "@/components/ui";
import { trpc } from "@/lib/trpc";

export const dynamic = "force-dynamic";

const configItemLabels: Record<string, { label: string; description: string }> = {
  integrationKey: {
    label: "Integration Key",
    description: "OAuth integration key from DocuSign admin",
  },
  accountId: {
    label: "Account ID",
    description: "DocuSign account identifier",
  },
  userId: {
    label: "User ID",
    description: "API user ID for JWT authentication",
  },
  rsaPrivateKey: {
    label: "RSA Private Key",
    description: "Private key for JWT token signing",
  },
  webhookSecret: {
    label: "Webhook Secret",
    description: "HMAC secret for webhook signature verification",
  },
};

const templateGuides = [
  {
    name: "House Rules Agreement",
    description: "Standard house rules every resident signs on move-in",
    docType: "house_rules",
  },
  {
    name: "Move-In Agreement",
    description: "Financial and behavioral expectations for residency",
    docType: "resident_agreement",
  },
  {
    name: "Financial Responsibility Agreement",
    description: "Payment terms, fees, and financial obligations",
    docType: "financial_agreement",
  },
  {
    name: "Emergency Contact Form",
    description: "Emergency contact information and medical consent",
    docType: "intake_form",
  },
  {
    name: "Consent to Drug Testing",
    description: "Authorization for random and scheduled drug testing",
    docType: "consent_form",
  },
];

export default function DocuSignSettingsPage() {
  const { data: connection, isLoading } = trpc.esign.checkConnection.useQuery();

  return (
    <PageContainer>
      <PageHeader
        title="DocuSign Integration"
        actions={
          <Button
            variant="secondary"
            icon={<ExternalLink className="h-4 w-4" />}
            onClick={() => window.open("https://admin.docusign.com", "_blank")}
          >
            DocuSign Admin
          </Button>
        }
      />

      {/* Connection Status */}
      <div className="border border-zinc-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 rounded-lg">
            <PenTool className="h-5 w-5 text-indigo-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-zinc-100">Connection Status</h2>
            <p className="text-sm text-zinc-500">
              DocuSign e-signature integration for document signing workflows
            </p>
          </div>
          {isLoading ? (
            <Loader2 className="h-5 w-5 text-zinc-500 animate-spin" />
          ) : connection?.isConfigured ? (
            <Badge variant="success">
              <CheckCircle className="h-3.5 w-3.5 mr-1" />
              {connection.isDemo ? "Connected (Demo)" : "Connected (Live)"}
            </Badge>
          ) : (
            <Badge variant="warning">
              <AlertTriangle className="h-3.5 w-3.5 mr-1" />
              Not Configured
            </Badge>
          )}
        </div>

        {!isLoading && !connection?.isConfigured && (
          <div className="bg-zinc-800/30 rounded-lg p-4 space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-zinc-400">
                DocuSign connection requires server-side environment variables.
                Configure the missing variables below to enable e-signature functionality.
              </p>
            </div>
          </div>
        )}

        {!isLoading && connection?.isConfigured && connection.isDemo && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-300">
                Connected to DocuSign Demo environment ({connection.baseUrl}).
                Envelopes sent here are for testing only. Switch to production env vars to go live.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Required Configuration
          </h3>
          <div className="space-y-2">
            {Object.entries(connection?.envVars ?? {
              integrationKey: false,
              accountId: false,
              userId: false,
              rsaPrivateKey: false,
              webhookSecret: false,
            }).map(([key, isSet]) => {
              const meta = configItemLabels[key];
              if (!meta) return null;
              return (
                <div
                  key={key}
                  className="flex items-center justify-between py-2 px-3 bg-zinc-800/20 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 text-zinc-600 animate-spin" />
                    ) : isSet ? (
                      <CheckCircle className="h-4 w-4 text-green-400" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-400" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-zinc-300">{meta.label}</p>
                      <p className="text-xs text-zinc-500">{meta.description}</p>
                    </div>
                  </div>
                  <Badge variant={isSet ? "success" : "error"} size="sm">
                    {isSet ? "Set" : "Missing"}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>

        <div className="pt-2 border-t border-zinc-800/50">
          <div className="flex items-center gap-3 text-sm">
            <span className="text-zinc-400">Webhook Endpoint:</span>
            <code className="text-xs text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded font-mono">
              /api/webhooks/docusign
            </code>
            <Badge variant="success" size="sm">Active</Badge>
          </div>
        </div>
      </div>

      {/* Features Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-4 w-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-zinc-100">Document Templates</h3>
          </div>
          <p className="text-sm text-zinc-400 mb-3">
            Create reusable templates for common documents like house rules, agreements, and consent forms.
          </p>
          <Link
            href="/documents/templates"
            className="text-sm text-indigo-400 hover:text-indigo-300 font-medium"
          >
            Manage Templates
          </Link>
        </div>

        <div className="border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <PenTool className="h-4 w-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-zinc-100">Signature Tracking</h3>
          </div>
          <p className="text-sm text-zinc-400 mb-3">
            Track signature status for all documents. View pending, signed, and voided envelopes.
          </p>
          <Link
            href="/documents/signatures"
            className="text-sm text-indigo-400 hover:text-indigo-300 font-medium"
          >
            View Signatures
          </Link>
        </div>

        <div className="border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-4 w-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-zinc-100">Compliance</h3>
          </div>
          <p className="text-sm text-zinc-400 mb-3">
            42 CFR Part 2 compliant. No SUD data in envelope metadata. Full audit trail for all signature events.
          </p>
          <Link
            href="/settings/compliance/audit-log"
            className="text-sm text-indigo-400 hover:text-indigo-300 font-medium"
          >
            View Audit Log
          </Link>
        </div>
      </div>

      {/* Recommended Templates */}
      <div className="border border-zinc-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">Recommended Templates</h2>
            <p className="text-sm text-zinc-500 mt-0.5">
              Pre-built templates for common sober living documents
            </p>
          </div>
          <Link href="/documents/templates">
            <Button variant="secondary" size="sm">
              View All Templates
            </Button>
          </Link>
        </div>

        <div className="space-y-2">
          {templateGuides.map((template) => (
            <div
              key={template.name}
              className="flex items-center justify-between py-3 px-4 bg-zinc-800/20 rounded-lg hover:bg-zinc-800/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-zinc-500" />
                <div>
                  <p className="text-sm font-medium text-zinc-200">{template.name}</p>
                  <p className="text-xs text-zinc-500">{template.description}</p>
                </div>
              </div>
              <Badge variant="default" size="sm">{template.docType.replace(/_/g, " ")}</Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Setup Guide */}
      <div className="border border-zinc-800 rounded-xl p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-zinc-400" />
          <h2 className="text-lg font-semibold text-zinc-100">Setup Guide</h2>
        </div>
        <ol className="space-y-3 text-sm text-zinc-400 list-decimal list-inside">
          <li>
            <span className="text-zinc-300">Create a DocuSign developer account</span> at{" "}
            <a
              href="https://developers.docusign.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300"
            >
              developers.docusign.com
            </a>
          </li>
          <li>
            <span className="text-zinc-300">Create an integration key</span> in the DocuSign admin panel under Apps and Keys
          </li>
          <li>
            <span className="text-zinc-300">Generate an RSA keypair</span> and add the public key to your integration
          </li>
          <li>
            <span className="text-zinc-300">Grant consent</span> for the integration to act on behalf of your account
          </li>
          <li>
            <span className="text-zinc-300">Configure environment variables</span> with the values from above
          </li>
          <li>
            <span className="text-zinc-300">Set up Connect webhook</span> pointing to{" "}
            <code className="text-xs text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded font-mono">
              https://your-domain.com/api/webhooks/docusign
            </code>
          </li>
        </ol>
      </div>
    </PageContainer>
  );
}

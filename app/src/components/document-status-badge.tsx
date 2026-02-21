"use client";

import { Badge } from "@/components/ui";

/**
 * Document signature status badge with Obsidian design system colors.
 *
 * Statuses:
 *   draft          -> zinc (default)
 *   sent           -> info (blue)
 *   delivered      -> info (blue)
 *   pending_signature -> warning (amber)
 *   viewed         -> info (blue)
 *   signed         -> success (green)
 *   completed      -> success (green)
 *   voided         -> default (zinc)
 *   declined       -> error (red)
 *   expired        -> error (red)
 */

type DocStatus =
  | "draft"
  | "sent"
  | "delivered"
  | "pending_signature"
  | "viewed"
  | "signed"
  | "completed"
  | "voided"
  | "declined"
  | "expired";

const statusConfig: Record<
  DocStatus,
  { variant: "success" | "warning" | "error" | "info" | "default"; label: string }
> = {
  draft: { variant: "default", label: "Draft" },
  sent: { variant: "info", label: "Sent" },
  delivered: { variant: "info", label: "Delivered" },
  pending_signature: { variant: "warning", label: "Pending Signature" },
  viewed: { variant: "info", label: "Viewed" },
  signed: { variant: "success", label: "Signed" },
  completed: { variant: "success", label: "Completed" },
  voided: { variant: "default", label: "Voided" },
  declined: { variant: "error", label: "Declined" },
  expired: { variant: "error", label: "Expired" },
};

export function DocumentStatusBadge({
  status,
  size,
}: {
  status: string;
  size?: "sm" | "md";
}) {
  const config = statusConfig[status as DocStatus] ?? {
    variant: "default" as const,
    label: status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
  };

  return (
    <Badge variant={config.variant} size={size}>
      {config.label}
    </Badge>
  );
}

/**
 * DocuSign-specific envelope status badge.
 * Maps DocuSign API statuses to our visual statuses.
 */
export function EnvelopeStatusBadge({
  docusignStatus,
  documentStatus,
  size,
}: {
  docusignStatus?: string | null;
  documentStatus?: string | null;
  size?: "sm" | "md";
}) {
  // Prefer docusign_status if available, fall back to document status
  const status = docusignStatus || documentStatus || "draft";
  return <DocumentStatusBadge status={status} size={size} />;
}

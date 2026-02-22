import { cn } from "@/lib/utils";

export type ConsentStatus = "active" | "expired" | "revoked" | "pending";

interface ConsentStatusBadgeProps {
  status: ConsentStatus;
  className?: string;
}

const statusConfig: Record<ConsentStatus, { label: string; className: string }> = {
  active: {
    label: "Active",
    className: "bg-green-50 text-green-700 border-green-200",
  },
  expired: {
    label: "Expired",
    className: "bg-yellow-50 text-yellow-700 border-yellow-200",
  },
  revoked: {
    label: "Revoked",
    className: "bg-red-50 text-red-700 border-red-200",
  },
  pending: {
    label: "Pending",
    className: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
};

export function ConsentStatusBadge({
  status,
  className,
}: ConsentStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}

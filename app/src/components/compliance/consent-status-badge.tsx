import { cn } from "@/lib/utils";

export type ConsentStatus = "active" | "expired" | "revoked" | "pending";

interface ConsentStatusBadgeProps {
  status: ConsentStatus;
  className?: string;
}

const statusConfig: Record<ConsentStatus, { label: string; className: string }> = {
  active: {
    label: "Active",
    className: "bg-green-500/15 text-green-300 border-green-500/20",
  },
  expired: {
    label: "Expired",
    className: "bg-yellow-500/15 text-yellow-300 border-yellow-500/20",
  },
  revoked: {
    label: "Revoked",
    className: "bg-red-500/15 text-red-300 border-red-500/20",
  },
  pending: {
    label: "Pending",
    className: "bg-indigo-500/15 text-indigo-300 border-indigo-500/20",
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

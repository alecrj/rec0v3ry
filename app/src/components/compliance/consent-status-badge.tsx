import { cn } from "@/lib/utils";

type ConsentStatus = "active" | "expired" | "revoked";

interface ConsentStatusBadgeProps {
  status: ConsentStatus;
  className?: string;
}

const statusConfig = {
  active: {
    label: "Active",
    className: "bg-green-100 text-green-700 border-green-200",
  },
  expired: {
    label: "Expired",
    className: "bg-yellow-100 text-yellow-700 border-yellow-200",
  },
  revoked: {
    label: "Revoked",
    className: "bg-red-100 text-red-700 border-red-200",
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

import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "error" | "info" | "outline";
  size?: "sm" | "md";
  dot?: boolean;
}

function Badge({
  className,
  variant = "default",
  size = "sm",
  dot = false,
  children,
  ...props
}: BadgeProps) {
  const variants = {
    default: "bg-zinc-100 text-zinc-600",
    success: "bg-green-500/12 text-green-400",
    warning: "bg-yellow-500/12 text-yellow-400",
    error: "bg-red-500/12 text-red-400",
    info: "bg-indigo-500/12 text-indigo-400",
    outline: "border border-zinc-200 text-zinc-400",
  };

  const sizes = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-0.5 text-xs",
  };

  const dotColors = {
    default: "bg-zinc-500",
    success: "bg-green-400",
    warning: "bg-yellow-400",
    error: "bg-red-400",
    info: "bg-indigo-400",
    outline: "bg-zinc-500",
  };

  return (
    <span className={cn("inline-flex items-center gap-1.5 font-medium rounded-full", variants[variant], sizes[size], className)} {...props}>
      {dot && <span className={cn("w-1.5 h-1.5 rounded-full", dotColors[variant])} />}
      {children}
    </span>
  );
}

export interface StatusBadgeProps {
  status: "active" | "pending" | "inactive" | "error" | "success" | "warning";
  label?: string;
  className?: string;
}

function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const statusConfig = {
    active: { variant: "success" as const, defaultLabel: "Active" },
    success: { variant: "success" as const, defaultLabel: "Success" },
    pending: { variant: "warning" as const, defaultLabel: "Pending" },
    warning: { variant: "warning" as const, defaultLabel: "Warning" },
    inactive: { variant: "default" as const, defaultLabel: "Inactive" },
    error: { variant: "error" as const, defaultLabel: "Error" },
  };

  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} dot className={className}>
      {label || config.defaultLabel}
    </Badge>
  );
}

export interface PriorityBadgeProps {
  priority: "high" | "medium" | "low";
  className?: string;
}

function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const priorityConfig = {
    high: { variant: "error" as const, label: "HIGH" },
    medium: { variant: "warning" as const, label: "MED" },
    low: { variant: "default" as const, label: "LOW" },
  };

  const config = priorityConfig[priority];

  return (
    <Badge variant={config.variant} size="sm" className={cn("uppercase tracking-wide", className)}>
      {config.label}
    </Badge>
  );
}

export interface CountBadgeProps {
  count: number;
  max?: number;
  className?: string;
}

function CountBadge({ count, max = 99, className }: CountBadgeProps) {
  const displayCount = count > max ? `${max}+` : count;
  if (count === 0) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center min-w-[18px] h-[18px] px-1",
        "text-[10px] font-semibold text-white bg-indigo-500 rounded-full",
        className
      )}
    >
      {displayCount}
    </span>
  );
}

export { Badge, StatusBadge, PriorityBadge, CountBadge };

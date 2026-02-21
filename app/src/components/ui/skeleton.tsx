import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circular" | "rectangular" | "rounded";
  width?: string | number;
  height?: string | number;
  animation?: "pulse" | "shimmer" | "none";
}

function Skeleton({
  className,
  variant = "text",
  width,
  height,
  animation = "shimmer",
  style,
  ...props
}: SkeletonProps) {
  const variants = {
    text: "rounded",
    circular: "rounded-full",
    rectangular: "rounded-none",
    rounded: "rounded-md",
  };

  const animations = {
    pulse: "animate-pulse",
    shimmer: "animate-shimmer",
    none: "",
  };

  return (
    <div
      className={cn(
        "bg-zinc-800",
        variants[variant],
        animations[animation],
        className
      )}
      style={{
        width: width,
        height: height || (variant === "text" ? "1em" : undefined),
        ...style,
      }}
      {...props}
    />
  );
}

function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          height={16}
          className={i === lines - 1 ? "w-3/4" : "w-full"}
        />
      ))}
    </div>
  );
}

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("p-6", className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton variant="text" height={14} className="w-24" />
          <Skeleton variant="text" height={32} className="w-32" />
          <Skeleton variant="text" height={14} className="w-40" />
        </div>
      </div>
    </div>
  );
}

function SkeletonStatCard({ className }: { className?: string }) {
  return (
    <div className={cn("py-1", className)}>
      <div className="h-3 w-20 rounded animate-shimmer mb-3" />
      <div className="h-8 w-24 rounded animate-shimmer mb-2" />
      <div className="h-3 w-28 rounded animate-shimmer" />
    </div>
  );
}

function SkeletonTable({ rows = 5, columns = 4, className }: { rows?: number; columns?: number; className?: string }) {
  return (
    <div className={cn("overflow-hidden", className)}>
      <div className="flex gap-4 px-4 py-3 border-b border-zinc-800">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} variant="text" height={14} className="flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 px-4 py-3 border-b border-zinc-800/50 last:border-b-0">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              variant="text"
              height={16}
              className={cn("flex-1", colIndex === 0 && "w-32", colIndex === columns - 1 && "w-20")}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function SkeletonAvatar({ size = 40, className }: { size?: number; className?: string }) {
  return <Skeleton variant="circular" width={size} height={size} className={className} />;
}

function SkeletonListItem({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 p-3", className)}>
      <SkeletonAvatar size={40} />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" height={14} className="w-32" />
        <Skeleton variant="text" height={12} className="w-48" />
      </div>
      <Skeleton variant="rounded" width={60} height={24} />
    </div>
  );
}

export {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonStatCard,
  SkeletonTable,
  SkeletonAvatar,
  SkeletonListItem,
};

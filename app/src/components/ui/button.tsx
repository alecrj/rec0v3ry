import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      icon,
      iconPosition = "left",
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles = cn(
      "inline-flex items-center justify-center gap-2 font-medium text-sm rounded-md transition-all duration-150",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#dc2626] focus-visible:ring-offset-2 focus-visible:ring-offset-white",
      "disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none"
    );

    const variants = {
      primary: "bg-indigo-500 text-white hover:bg-indigo-400 active:bg-indigo-600",
      secondary: "bg-zinc-100 text-zinc-700 border border-zinc-200 hover:bg-zinc-200 hover:text-zinc-800 active:bg-zinc-300",
      ghost: "text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 active:bg-zinc-200",
      destructive: "bg-red-500/90 text-white hover:bg-red-500 active:bg-red-600",
      outline: "text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/10 active:bg-indigo-500/20",
    };

    const sizes = {
      sm: "h-7 px-2.5 text-xs",
      md: "h-9 px-4 text-sm",
      lg: "h-11 px-5 text-sm",
    };

    const iconSizes = {
      sm: "h-3.5 w-3.5",
      md: "h-4 w-4",
      lg: "h-4 w-4",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {loading && <Loader2 className={cn("animate-spin", iconSizes[size])} />}
        {!loading && icon && iconPosition === "left" && (
          <span className={iconSizes[size]}>{icon}</span>
        )}
        {children}
        {!loading && icon && iconPosition === "right" && (
          <span className={iconSizes[size]}>{icon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };

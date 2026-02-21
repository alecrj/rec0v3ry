import { forwardRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Eye, EyeOff, AlertCircle, Check } from "lucide-react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  success?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
      label,
      error,
      hint,
      success,
      icon,
      iconPosition = "left",
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    const isPassword = type === "password";

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              "block mb-1.5 text-sm font-medium",
              error ? "text-red-400" : "text-zinc-300"
            )}
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && iconPosition === "left" && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">
              {icon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            type={isPassword && showPassword ? "text" : type}
            disabled={disabled}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            className={cn(
              "w-full h-10 px-3 text-sm text-zinc-100 bg-zinc-900",
              "border rounded-md transition-all duration-150",
              "placeholder:text-zinc-600",
              "focus:outline-none focus:ring-1",
              !error && !success && "border-zinc-800 focus:border-zinc-600 focus:ring-indigo-500/30",
              error && "border-red-500/50 focus:border-red-500 focus:ring-red-500/30",
              success && !error && "border-green-500/50 focus:border-green-500 focus:ring-green-500/30",
              disabled && "bg-zinc-900/50 text-zinc-600 cursor-not-allowed",
              icon && iconPosition === "left" && "pl-10",
              icon && iconPosition === "right" && "pr-10",
              isPassword && "pr-10",
              className
            )}
            {...props}
          />

          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}

          {icon && iconPosition === "right" && !isPassword && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">
              {icon}
            </div>
          )}

          {!isPassword && !icon && (error || success) && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {error && <AlertCircle className="h-4 w-4 text-red-400" />}
              {success && !error && <Check className="h-4 w-4 text-green-400" />}
            </div>
          )}
        </div>

        {(error || hint) && (
          <p
            className={cn(
              "mt-1.5 text-xs",
              error ? "text-red-400" : "text-zinc-500"
            )}
          >
            {error || hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, disabled, id, ...props }, ref) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className={cn(
              "block mb-1.5 text-sm font-medium",
              error ? "text-red-400" : "text-zinc-300"
            )}
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          disabled={disabled}
          className={cn(
            "w-full min-h-[100px] px-3 py-2.5 text-sm text-zinc-100 bg-zinc-900",
            "border rounded-md transition-all duration-150 resize-y",
            "placeholder:text-zinc-600",
            "focus:outline-none focus:ring-1 focus:ring-indigo-500/30",
            !error && "border-zinc-800 focus:border-zinc-600",
            error && "border-red-500/50 focus:border-red-500 focus:ring-red-500/30",
            disabled && "bg-zinc-900/50 text-zinc-600 cursor-not-allowed",
            className
          )}
          {...props}
        />
        {(error || hint) && (
          <p className={cn("mt-1.5 text-xs", error ? "text-red-400" : "text-zinc-500")}>
            {error || hint}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, hint, options, placeholder, disabled, id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className={cn(
              "block mb-1.5 text-sm font-medium",
              error ? "text-red-400" : "text-zinc-300"
            )}
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          disabled={disabled}
          className={cn(
            "w-full h-10 px-3 text-sm text-zinc-100 bg-zinc-900",
            "border rounded-md transition-all duration-150",
            "focus:outline-none focus:ring-1 focus:ring-indigo-500/30",
            "appearance-none cursor-pointer",
            "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2371717A%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')]",
            "bg-[length:20px] bg-[right_12px_center] bg-no-repeat",
            !error && "border-zinc-800 focus:border-zinc-600",
            error && "border-red-500/50 focus:border-red-500 focus:ring-red-500/30",
            disabled && "bg-zinc-900/50 text-zinc-600 cursor-not-allowed",
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {(error || hint) && (
          <p className={cn("mt-1.5 text-xs", error ? "text-red-400" : "text-zinc-500")}>
            {error || hint}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";

export { Input, Textarea, Select };

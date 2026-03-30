"use client";

import { forwardRef, useState } from "react";
import { Eye, EyeSlash, CheckCircle } from "@phosphor-icons/react";
import { cn } from "../utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  success?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, helperText, error, success, id, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";
    const inputType = isPassword && showPassword ? "text" : type;

    return (
      <div className="space-y-2">
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-[var(--foreground)]"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={id}
            type={inputType}
            className={cn(
              "h-10 w-full relative rounded-[var(--radius-sm)] border bg-transparent px-3 text-sm text-[var(--foreground)] outline-none transition-colors",
              "placeholder:text-[var(--muted-foreground)]",
              "focus:border-[var(--ring)] focus:ring-1 focus:ring-[var(--ring)]",
              "disabled:cursor-not-allowed disabled:opacity-50",
              error
                ? "border-[var(--destructive)] focus:border-[var(--destructive)] focus:ring-[var(--destructive)]"
                : success
                  ? "border-[var(--success)] focus:border-[var(--success)] focus:ring-[var(--success)]"
                  : "border-[var(--input)]",
              (isPassword || success) && "pr-12",
              className
            )}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 bg-white top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
            </button>
          )}
          {success && !isPassword && (
            <CheckCircle
              size={18}
              weight="fill"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--success)]"
            />
          )}
        </div>
        {error && (
          <p className="text-xs text-[var(--destructive)]">{error}</p>
        )}
        {helperText && !error && (
          <p className="text-xs text-[var(--muted-foreground)]">{helperText}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };

/* ── Textarea ── */

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, helperText, error, id, ...props }, ref) => (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-[var(--foreground)]">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={id}
        className={cn(
          "min-h-[80px] w-full rounded-[var(--radius-sm)] border bg-transparent px-3 py-2 text-sm text-[var(--foreground)] outline-none transition-colors",
          "placeholder:text-[var(--muted-foreground)]",
          "focus:border-[var(--ring)] focus:ring-1 focus:ring-[var(--ring)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error
            ? "border-[var(--destructive)] focus:border-[var(--destructive)] focus:ring-[var(--destructive)]"
            : "border-[var(--input)]",
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-[var(--destructive)]">{error}</p>}
      {helperText && !error && (
        <p className="text-xs text-[var(--muted-foreground)]">{helperText}</p>
      )}
    </div>
  )
);
Textarea.displayName = "Textarea";

export { Textarea };

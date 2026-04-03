"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Eye, EyeOff } from "lucide-react";

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  hint?: string;
}

export const AuthInput = React.forwardRef<HTMLInputElement, AuthInputProps>(
  ({ label, error, icon, hint, className, type, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const isPassword = type === "password";
    const inputType = isPassword ? (showPassword ? "text" : "password") : type;

    return (
      <div className="space-y-1.5">
        {label && (
          <label className="font-mono text-[11px] sm:text-xs uppercase tracking-widest text-zinc-500 block px-1">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700 pointer-events-none">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            type={inputType}
            className={cn(
              "w-full h-12 sm:h-14 bg-white/2 border rounded-xl sm:rounded-2xl pr-4 font-display text-white placeholder:text-zinc-800 focus:outline-none transition-all text-sm sm:text-base",
              icon ? "pl-12" : "pl-4 sm:pl-6",
              error
                ? "border-red/50 focus:border-red/70 focus:bg-red/5"
                : "border-white/5 focus:border-white/20 focus:bg-white/5",
              isPassword && "pr-12",
              className
            )}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-700 hover:text-zinc-400 transition-colors"
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}
        </div>
        {error && (
          <p className="auth-field-error font-mono text-[10px] sm:text-[11px] text-red px-1 flex items-center gap-1.5">
            <span className="inline-block w-1 h-1 rounded-full bg-red flex-shrink-0" />
            {error}
          </p>
        )}
        {hint && !error && (
          <p className="font-mono text-[10px] sm:text-[11px] text-zinc-700 px-1">
            {hint}
          </p>
        )}
      </div>
    );
  }
);
AuthInput.displayName = "AuthInput";

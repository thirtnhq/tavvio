"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface AuthCardProps {
  children: React.ReactNode;
  className?: string;
}

export function AuthCard({ children, className }: AuthCardProps) {
  return (
    <div
      className={cn(
        "relative w-full max-w-md overflow-hidden rounded-2xl sm:rounded-3xl border border-white/10 bg-zinc-950 p-6 sm:p-8 shadow-2xl",
        className
      )}
    >
      {/* Top shine line */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-px bg-linear-to-r from-transparent via-white/20 to-transparent" />
      {/* Subtle inner gradient */}
      <div className="absolute -inset-px bg-linear-to-b from-white/5 to-transparent rounded-[inherit] -z-10" />
      {children}
    </div>
  );
}

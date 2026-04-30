"use client";

import { type ReactNode } from "react";
import { useWaitlist } from "./PageShell";

interface WaitlistButtonProps {
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}

/**
 * Tiny client island that opens the page-level WaitlistModal via the
 * PageShell context. Use it from server components where we'd otherwise
 * need to pass a function across the boundary.
 */
export function WaitlistButton({
  children,
  className,
  ariaLabel,
}: WaitlistButtonProps) {
  const { open } = useWaitlist();
  return (
    <button
      type="button"
      onClick={open}
      aria-label={ariaLabel}
      className={className}
    >
      {children}
    </button>
  );
}

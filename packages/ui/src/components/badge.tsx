"use client";

import { cva, type VariantProps } from "class-variance-authority";
import {
  CheckCircle,
  Clock,
  ArrowsClockwise,
  XCircle,
  Prohibit,
  Warning,
  FileText,
} from "@phosphor-icons/react";
import { cn } from "../utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-[var(--secondary)] text-[var(--secondary-foreground)]",
        completed: "bg-[var(--green)]/15 text-[var(--green)]",
        pending: "bg-[var(--amber)]/15 text-[var(--amber)]",
        processing: "bg-[var(--blue)]/15 text-[var(--blue)]",
        failed: "bg-[var(--red)]/15 text-[var(--red)]",
        cancelled: "bg-[var(--muted)] text-[var(--muted-foreground)]",
        overdue: "border border-[var(--red)]/40 text-[var(--red)]",
        draft: "border border-[var(--border)] text-[var(--muted-foreground)]",
        active: "bg-[var(--green)]/15 text-[var(--green)]",
        expired: "bg-[var(--muted)] text-[var(--muted-foreground)]",
        deactivated: "bg-[var(--red)]/15 text-[var(--red)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const BADGE_ICONS = {
  completed: CheckCircle,
  pending: Clock,
  processing: ArrowsClockwise,
  failed: XCircle,
  cancelled: Prohibit,
  overdue: Warning,
  draft: FileText,
  active: CheckCircle,
  expired: Clock,
  deactivated: Prohibit,
  default: null,
} as const;

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  showIcon?: boolean;
}

function Badge({ className, variant = "default", showIcon = true, children, ...props }: BadgeProps) {
  const Icon = variant ? BADGE_ICONS[variant] : null;

  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {showIcon && Icon && <Icon size={14} weight="fill" />}
      {children}
    </span>
  );
}

export { Badge, badgeVariants };

"use client";

import { Badge } from "@useroutr/ui";
import { type PayoutStatus } from "@/hooks/usePayouts";

interface PayoutStatusBadgeProps {
  status: PayoutStatus;
}

const STATUS_VARIANTS: Record<
  PayoutStatus,
  "pending" | "processing" | "completed" | "failed" | "cancelled"
> = {
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled",
};

const STATUS_LABELS: Record<PayoutStatus, string> = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  COMPLETED: "Completed",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
};

export function PayoutStatusBadge({ status }: PayoutStatusBadgeProps) {
  const variant = STATUS_VARIANTS[status];
  const label = STATUS_LABELS[status];

  return <Badge variant={variant}>{label}</Badge>;
}

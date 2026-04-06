"use client";

import { Badge } from "@useroutr/ui";
import { type PaymentStatus } from "@/hooks/usePayments";

interface StatusBadgeProps {
  status: PaymentStatus;
}

const STATUS_VARIANTS: Record<PaymentStatus, "pending" | "processing" | "completed" | "failed" | "cancelled"> = {
  PENDING: "pending",
  QUOTE_LOCKED: "processing",
  SOURCE_LOCKED: "processing",
  STELLAR_LOCKED: "processing",
  PROCESSING: "processing",
  COMPLETED: "completed",
  REFUNDING: "pending",
  REFUNDED: "completed",
  EXPIRED: "failed",
  FAILED: "failed",
};

const STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "Pending",
  QUOTE_LOCKED: "Quote Locked",
  SOURCE_LOCKED: "Source Locked",
  STELLAR_LOCKED: "Stellar Locked",
  PROCESSING: "Processing",
  COMPLETED: "Completed",
  REFUNDING: "Refund Pending",
  REFUNDED: "Refunded",
  EXPIRED: "Expired",
  FAILED: "Failed",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const variant = STATUS_VARIANTS[status];
  const label = STATUS_LABELS[status];

  return <Badge variant={variant}>{label}</Badge>;
}
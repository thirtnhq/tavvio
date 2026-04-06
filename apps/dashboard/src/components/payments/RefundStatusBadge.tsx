"use client";

import { Badge } from "@useroutr/ui";

export type RefundBadgeStatus = "REFUNDING" | "REFUNDED" | "PARTIAL_REFUND";

const VARIANT_MAP: Record<RefundBadgeStatus, "pending" | "completed" | "processing"> = {
  REFUNDING: "pending",
  REFUNDED: "completed",
  PARTIAL_REFUND: "processing",
};

const LABEL_MAP: Record<RefundBadgeStatus, string> = {
  REFUNDING: "Refund Pending",
  REFUNDED: "Refunded",
  PARTIAL_REFUND: "Partial Refund",
};

interface RefundStatusBadgeProps {
  status: RefundBadgeStatus;
}

export function RefundStatusBadge({ status }: RefundStatusBadgeProps) {
  return <Badge variant={VARIANT_MAP[status]}>{LABEL_MAP[status]}</Badge>;
}

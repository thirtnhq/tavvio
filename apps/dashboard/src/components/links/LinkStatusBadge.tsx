"use client";

import { Badge } from "@tavvio/ui";
import type { LinkStatus } from "@tavvio/types";

const STATUS_LABELS: Record<LinkStatus, string> = {
  active: "Active",
  expired: "Expired",
  deactivated: "Deactivated",
};

interface LinkStatusBadgeProps {
  status: LinkStatus;
  className?: string;
}

export function LinkStatusBadge({ status, className }: LinkStatusBadgeProps) {
  return (
    <Badge variant={status} className={className}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

"use client";

import { Badge } from "@useroutr/ui";
import type { LinkStatus } from "@useroutr/types";

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

"use client";

import type { Refund } from "@/lib/refund";
import { REFUND_REASONS, getRefundEta } from "@/lib/refund";
import { formatCurrency } from "@/lib/utils";
import {
  ArrowCounterClockwise,
  ArrowsClockwise,
  CheckCircle,
  XCircle,
  Clock,
} from "@phosphor-icons/react";

interface RefundTimelineProps {
  refunds: Refund[];
  currency: string;
  sourceChain: string;
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  PENDING: <Clock size={16} weight="bold" />,
  PROCESSING: <ArrowsClockwise size={16} weight="bold" />,
  COMPLETED: <CheckCircle size={16} weight="bold" />,
  FAILED: <XCircle size={16} weight="bold" />,
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-[var(--amber)]/15 text-[var(--amber)]",
  PROCESSING: "bg-[var(--blue)]/15 text-[var(--blue)]",
  COMPLETED: "bg-[var(--green)]/15 text-[var(--green)]",
  FAILED: "bg-[var(--red)]/15 text-[var(--red)]",
};

const STATUS_LINE_COLOR: Record<string, string> = {
  PENDING: "bg-[var(--amber)]",
  PROCESSING: "bg-[var(--blue)]",
  COMPLETED: "bg-[var(--green)]",
  FAILED: "bg-[var(--red)]",
};

function formatTimestamp(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })} at ${d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export function RefundTimeline({ refunds, currency, sourceChain }: RefundTimelineProps) {
  if (!refunds.length) return null;

  const eta = getRefundEta(sourceChain);

  // Build timeline events from refunds
  const events = refunds.flatMap((refund) => {
    const items: Array<{
      key: string;
      icon: React.ReactNode;
      color: string;
      lineColor: string;
      label: string;
      detail: string;
      timestamp: string;
    }> = [];

    // Initiated
    items.push({
      key: `${refund.id}-initiated`,
      icon: <ArrowCounterClockwise size={16} weight="bold" />,
      color: "bg-[var(--amber)]/15 text-[var(--amber)]",
      lineColor: STATUS_LINE_COLOR[refund.status] ?? "bg-[var(--muted)]/30",
      label: "Refund initiated",
      detail: `${formatCurrency(refund.amount, currency)} — ${
        REFUND_REASONS.find((r) => r.value === refund.reason)?.label ?? refund.reason
      }${refund.notes ? ` · ${refund.notes}` : ""}`,
      timestamp: formatTimestamp(refund.createdAt),
    });

    // Processing (implied if status >= PROCESSING)
    if (
      refund.status === "PROCESSING" ||
      refund.status === "COMPLETED"
    ) {
      items.push({
        key: `${refund.id}-processing`,
        icon: <ArrowsClockwise size={16} weight="bold" />,
        color: "bg-[var(--blue)]/15 text-[var(--blue)]",
        lineColor:
          refund.status === "COMPLETED"
            ? "bg-[var(--green)]"
            : "bg-[var(--muted)]/30",
        label: "Refund processing",
        detail: `Est. delivery: ${eta}`,
        timestamp: formatTimestamp(refund.createdAt),
      });
    }

    // Completed
    if (refund.status === "COMPLETED" && refund.completedAt) {
      items.push({
        key: `${refund.id}-completed`,
        icon: <CheckCircle size={16} weight="bold" />,
        color: "bg-[var(--green)]/15 text-[var(--green)]",
        lineColor: "bg-transparent",
        label: "Refund completed",
        detail: `${formatCurrency(refund.amount, currency)} refunded`,
        timestamp: formatTimestamp(refund.completedAt),
      });
    }

    // Failed
    if (refund.status === "FAILED") {
      items.push({
        key: `${refund.id}-failed`,
        icon: <XCircle size={16} weight="bold" />,
        color: "bg-[var(--red)]/15 text-[var(--red)]",
        lineColor: "bg-transparent",
        label: "Refund failed",
        detail: "The refund could not be processed",
        timestamp: formatTimestamp(refund.createdAt),
      });
    }

    return items;
  });

  return (
    <div className="space-y-0">
      {events.map((event, index) => (
        <div key={event.key} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className={`rounded-full p-2 ${event.color}`}>
              {event.icon}
            </div>
            {index < events.length - 1 && (
              <div className={`my-1 h-8 w-0.5 ${event.lineColor}`} />
            )}
          </div>
          <div className="pt-1 pb-4">
            <p className="text-sm font-medium text-foreground">
              {event.label}
            </p>
            <p className="text-xs text-muted-foreground">
              {event.detail}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {event.timestamp}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

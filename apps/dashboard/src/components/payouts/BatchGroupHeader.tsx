"use client";

import { useState, useMemo } from "react";
import { CaretDown, CaretRight, Users, CurrencyDollar } from "@phosphor-icons/react";
import type { Payout, PayoutStatus } from "@/hooks/usePayouts";
import { formatCurrency } from "@/lib/utils";
import { PayoutStatusBadge } from "./PayoutStatusBadge";

interface BatchGroupHeaderProps {
  batchId: string;
  payouts: Payout[];
  isExpanded: boolean;
  onToggle: () => void;
}

interface BatchStats {
  totalPayouts: number;
  totalAmount: number;
  currencies: string[];
  statusCounts: Record<PayoutStatus, number>;
  dominantCurrency: string;
}

function calculateBatchStats(payouts: Payout[]): BatchStats {
  const stats = payouts.reduce(
    (acc, payout) => {
      acc.totalPayouts++;
      acc.totalAmount += Number(payout.amount);
      acc.statusCounts[payout.status] = (acc.statusCounts[payout.status] || 0) + 1;
      if (!acc.currencies.includes(payout.currency)) {
        acc.currencies.push(payout.currency);
      }
      return acc;
    },
    {
      totalPayouts: 0,
      totalAmount: 0,
      currencies: [] as string[],
      statusCounts: {} as Record<PayoutStatus, number>,
    }
  );

  // Determine dominant currency (most frequent)
  const currencyCounts = payouts.reduce((acc, p) => {
    acc[p.currency] = (acc[p.currency] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const dominantCurrency = Object.entries(currencyCounts).sort(
    (a, b) => b[1] - a[1]
  )[0]?.[0] || "USD";

  return {
    ...stats,
    dominantCurrency,
  };
}

export function BatchGroupHeader({
  batchId,
  payouts,
  isExpanded,
  onToggle,
}: BatchGroupHeaderProps) {
  const stats = useMemo(() => calculateBatchStats(payouts), [payouts]);

  const statusEntries = Object.entries(stats.statusCounts).sort(
    (a, b) => b[1] - a[1]
  );

  return (
    <div
      onClick={onToggle}
      className="flex cursor-pointer items-center gap-4 rounded-lg border border-border bg-muted/50 p-4 hover:bg-muted transition-colors"
    >
      {/* Expand/Collapse Icon */}
      <button className="text-muted-foreground hover:text-foreground">
        {isExpanded ? <CaretDown size={20} /> : <CaretRight size={20} />}
      </button>

      {/* Batch ID */}
      <div className="flex min-w-[180px] items-center gap-2">
        <span className="text-sm font-medium text-foreground">Batch</span>
        <code className="rounded bg-background px-2 py-1 text-xs font-mono">
          {batchId.slice(0, 12)}...
        </code>
      </div>

      {/* Stats */}
      <div className="flex flex-1 items-center gap-6">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-muted-foreground" />
          <span className="text-sm">
            <span className="font-medium">{stats.totalPayouts}</span>
            <span className="text-muted-foreground ml-1">recipients</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <CurrencyDollar size={16} className="text-muted-foreground" />
          <span className="text-sm">
            <span className="font-medium">
              {formatCurrency(stats.totalAmount, stats.dominantCurrency)}
            </span>
            {stats.currencies.length > 1 && (
              <span className="text-muted-foreground ml-1">
                +{stats.currencies.length - 1} more
              </span>
            )}
          </span>
        </div>

        {/* Status Breakdown */}
        <div className="flex items-center gap-2">
          {statusEntries.slice(0, 3).map(([status, count]) => (
            <div
              key={status}
              className="flex items-center gap-1 rounded-full bg-background px-2 py-1 text-xs"
            >
              <PayoutStatusBadge status={status as PayoutStatus} />
              <span className="text-muted-foreground">({count})</span>
            </div>
          ))}
          {statusEntries.length > 3 && (
            <span className="text-xs text-muted-foreground">
              +{statusEntries.length - 3} more
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

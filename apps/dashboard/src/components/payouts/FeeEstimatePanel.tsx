"use client";

import { formatCurrency } from "@/lib/utils";
import { Skeleton } from "@useroutr/ui";
import { Info, AlertCircle } from "lucide-react";

interface FeeEstimatePanelProps {
  amount: string;
  currency: string;
  fee?: string;
  feeCurrency?: string;
  total?: string;
  exchangeRate?: string;
  isLoading: boolean;
  error?: Error | null;
}

export function FeeEstimatePanel({
  amount,
  currency,
  fee,
  feeCurrency,
  total,
  exchangeRate,
  isLoading,
  error,
}: FeeEstimatePanelProps) {
  const amountNum = parseFloat(amount) || 0;

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
        <Skeleton className="h-4 w-24" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-3/4" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-950/30">
        <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
          <AlertCircle size={16} />
          <span className="text-sm font-medium">Fee estimate unavailable</span>
        </div>
        <p className="mt-1 text-xs text-yellow-600 dark:text-yellow-400">
          Fees will be calculated at time of submission
        </p>
      </div>
    );
  }

  if (!fee || amountNum <= 0) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Info size={16} />
          <span className="text-sm">Enter an amount to see fee estimate</span>
        </div>
      </div>
    );
  }

  const feeNum = parseFloat(fee) || 0;
  const totalNum = parseFloat(total || "0") || amountNum + feeNum;
  const displayCurrency = feeCurrency || currency;

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">Fee Estimate</span>
        <span className="text-sm text-muted-foreground">{formatCurrency(feeNum, displayCurrency)}</span>
      </div>

      {exchangeRate && exchangeRate !== "1" && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Exchange Rate</span>
          <span className="text-muted-foreground">1 {currency} = {exchangeRate}</span>
        </div>
      )}

      <div className="border-t border-border pt-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">Total</span>
          <span className="text-lg font-semibold text-foreground">
            {formatCurrency(totalNum, displayCurrency)}
          </span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Fees are estimates and may vary slightly at time of processing
      </p>
    </div>
  );
}

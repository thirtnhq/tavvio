import React from "react";
import { formatCurrency } from "@/lib/utils";
import type { ChangeEvent } from "react";

interface LinkCardProps {
  merchantName: string;
  merchantLogo?: string;
  description?: string;
  amount?: number;
  currency: string;
  isOpenAmount?: boolean;
  onAmountChange?: (amount: number) => void;
  enteredAmount?: number;
  amountError?: string;
}

export function LinkCard({
  merchantName,
  merchantLogo,
  description,
  amount,
  currency,
  isOpenAmount = false,
  onAmountChange,
  enteredAmount,
  amountError,
}: LinkCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="space-y-4">
        {/* Merchant branding */}
        <div className="flex items-center gap-3">
          {merchantLogo ? (
            <img
              src={merchantLogo}
              alt={`${merchantName} logo`}
              className="h-10 w-10 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <span className="text-sm font-medium text-muted-foreground">
                {merchantName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <h1 className="font-medium text-foreground">{merchantName}</h1>
          </div>
        </div>

        {/* Description */}
        {description && (
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        )}

        {/* Amount section */}
        <div className="border-t border-border pt-4">
          {isOpenAmount ? (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Enter amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-medium text-muted-foreground">
                  $
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={enteredAmount || ""}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => onAmountChange?.(parseFloat(e.target.value) || 0)}
                  className={`w-full rounded-lg border pl-8 pr-16 py-3 text-lg font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 ${
                    amountError
                      ? "border-destructive focus:border-destructive focus:ring-destructive"
                      : "border-border bg-background focus:border-primary focus:ring-primary"
                  }`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                  {currency}
                </span>
              </div>
              {amountError && (
                <p className="text-xs text-destructive">{amountError}</p>
              )}
            </div>
          ) : (
            <div className="text-center">
              <div className="text-3xl font-bold text-foreground">
                {formatCurrency(amount || 0, currency)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
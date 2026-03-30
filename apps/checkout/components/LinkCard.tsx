"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { AmountInput } from "./AmountInput";
import { ExpiryBadge } from "./ExpiryBadge";
import { PaymentLink } from "@/hooks/usePaymentLink";

interface LinkCardProps {
  link: PaymentLink;
  onSubmit: (amount?: number) => void;
  isSubmitting: boolean;
}

export function LinkCard({ link, onSubmit, isSubmitting }: LinkCardProps) {
  const [amount, setAmount] = useState("");
  const [amountError, setAmountError] = useState("");

  const isFixedAmount = link.amount !== null && link.amount !== undefined;
  const isOpenAmount = !isFixedAmount;

  const handleSubmit = () => {
    if (isFixedAmount) {
      onSubmit(link.amount!);
      return;
    }

    // Validate open amount
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setAmountError("Please enter a valid amount");
      return;
    }

    setAmountError("");
    onSubmit(numAmount);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="space-y-4">
        {/* Description */}
        {link.description && (
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {link.description}
            </h2>
          </div>
        )}

        {/* Amount */}
        <div className="border-t border-border pt-4">
          {isFixedAmount ? (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Amount</span>
              <span className="text-lg font-semibold text-foreground">
                {formatCurrency(link.amount!, link.currency)}
              </span>
            </div>
          ) : (
            <AmountInput
              currency={link.currency}
              value={amount}
              onChange={setAmount}
              error={amountError}
            />
          )}
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="h-4 w-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Processing...
            </span>
          ) : isFixedAmount ? (
            "Pay Now"
          ) : (
            "Continue to Payment"
          )}
        </button>

        {/* Expiry Badge */}
        {link.expiresAt && (
          <div className="flex justify-center pt-2">
            <ExpiryBadge expiresAt={link.expiresAt} />
          </div>
        )}
      </div>
    </div>
  );
}

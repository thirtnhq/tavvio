"use client";

import { WarningCircle } from "@phosphor-icons/react/dist/ssr";
import type { PaymentStatus } from "@useroutr/types";

const ERROR_MESSAGES: Record<string, { title: string; message: string }> = {
  EXPIRED: {
    title: "Conversion rate expired",
    message:
      "The exchange rate expired. Please start the payment again to get a fresh quote.",
  },
  HTLC_TIMEOUT: {
    title: "Payment timed out",
    message:
      "Your payment timed out. Your funds will be automatically refunded within 24 hours.",
  },
  INSUFFICIENT_LIQUIDITY: {
    title: "Conversion not available",
    message:
      "We couldn't find a conversion path for this amount. Please try a different payment method.",
  },
  NETWORK_ERROR: {
    title: "Connection lost",
    message:
      "We lost connection. Please check your internet and try again.",
  },
  WALLET_REJECTED: {
    title: "Transaction cancelled",
    message:
      "The transaction was cancelled in your wallet.",
  },
  FAILED: {
    title: "Payment failed",
    message:
      "Something went wrong processing your payment. Please try again.",
  },
};

interface ErrorCardProps {
  errorType?: string;
  onRetry?: () => void;
  onSupportClick?: () => void;
}

export function ErrorCard({
  errorType = "FAILED",
  onRetry,
  onSupportClick,
}: ErrorCardProps) {
  const errorInfo = ERROR_MESSAGES[errorType] || ERROR_MESSAGES.FAILED;

  return (
    <div className="rounded-xl border border-red/20 bg-red/5 p-6">
      <div className="flex gap-4">
        <div className="flex-shrink-0">
          <WarningCircle
            size={24}
            weight="fill"
            className="text-red"
          />
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-foreground">{errorInfo.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {errorInfo.message}
          </p>
          <div className="mt-4 flex gap-2">
            {onRetry && (
              <button
                onClick={onRetry}
                className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:brightness-110"
              >
                Try again
              </button>
            )}
            {onSupportClick && (
              <button
                onClick={onSupportClick}
                className="flex-1 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
              >
                Contact support
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
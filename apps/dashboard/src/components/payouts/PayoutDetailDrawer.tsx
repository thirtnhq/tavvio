"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle, Badge, Button } from "@useroutr/ui";
import { ArrowSquareOut, Copy, CheckCircle } from "@phosphor-icons/react";
import { useState } from "react";
import type { Payout } from "@/hooks/usePayouts";
import { formatCurrency, truncateAddress } from "@/lib/utils";
import { PayoutStatusBadge } from "./PayoutStatusBadge";

interface PayoutDetailDrawerProps {
  payout: Payout | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRetry?: (id: string) => void;
  onCancel?: (id: string) => void;
  isRetrying?: boolean;
  isCancelling?: boolean;
}

const STELLAR_EXPLORER_URL = "https://stellar.expert/explorer/public";

function DetailRow({ label, value, copyable = false }: { label: string; value: string; copyable?: boolean }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-start justify-between py-3 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-foreground text-right">{value}</span>
        {copyable && (
          <button
            onClick={handleCopy}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {copied ? <CheckCircle size={14} className="text-green-500" /> : <Copy size={14} />}
          </button>
        )}
      </div>
    </div>
  );
}

function formatDestination(payout: Payout): string {
  const dest = payout.destination;
  switch (payout.destinationType) {
    case "STELLAR":
      return dest.address ? truncateAddress(dest.address, 8) : "N/A";
    case "CRYPTO_WALLET":
      return dest.address ? truncateAddress(dest.address, 8) : "N/A";
    case "BANK_ACCOUNT":
      return dest.accountNumber
        ? `****${dest.accountNumber.slice(-4)}`
        : dest.iban
        ? `****${dest.iban.slice(-4)}`
        : "N/A";
    case "MOBILE_MONEY":
      return dest.phoneNumber || "N/A";
    default:
      return "N/A";
  }
}

function formatDestinationFull(payout: Payout): string {
  const dest = payout.destination;
  switch (payout.destinationType) {
    case "STELLAR":
      return dest.address || "N/A";
    case "CRYPTO_WALLET":
      return dest.address || "N/A";
    case "BANK_ACCOUNT":
      return dest.accountNumber || dest.iban || "N/A";
    case "MOBILE_MONEY":
      return dest.phoneNumber || "N/A";
    default:
      return "N/A";
  }
}

export function PayoutDetailDrawer({
  payout,
  open,
  onOpenChange,
  onRetry,
  onCancel,
  isRetrying,
  isCancelling,
}: PayoutDetailDrawerProps) {
  if (!payout) return null;

  const canRetry = payout.status === "FAILED" && onRetry;
  const canCancel = payout.status === "PENDING" && onCancel;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display text-lg">Payout Details</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Status and Amount Header */}
          <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <PayoutStatusBadge status={payout.status} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Amount</span>
              <span className="text-2xl font-semibold">
                {formatCurrency(Number(payout.amount), payout.currency)}
              </span>
            </div>
          </div>

          {/* Actions */}
          {(canRetry || canCancel) && (
            <div className="flex gap-3">
              {canRetry && (
                <Button
                  onClick={() => onRetry(payout.id)}
                  disabled={isRetrying}
                  className="flex-1"
                >
                  {isRetrying ? "Retrying..." : "Retry Payout"}
                </Button>
              )}
              {canCancel && (
                <Button
                  variant="outline"
                  onClick={() => onCancel(payout.id)}
                  disabled={isCancelling}
                  className="flex-1"
                >
                  {isCancelling ? "Cancelling..." : "Cancel Payout"}
                </Button>
              )}
            </div>
          )}

          {/* Failure Reason (only for failed) */}
          {payout.status === "FAILED" && payout.failureReason && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/50">
              <h4 className="text-sm font-medium text-red-800 dark:text-red-200">
                Failure Reason
              </h4>
              <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                {payout.failureReason}
              </p>
            </div>
          )}

          {/* Details Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">Details</h3>
            <div className="rounded-lg border border-border bg-card p-4">
              <DetailRow label="Payout ID" value={payout.id} copyable />
              <DetailRow label="Recipient" value={payout.recipientName} />
              <DetailRow label="Destination Type" value={payout.destinationType.replace("_", " ")} />
              <DetailRow label="Destination" value={formatDestinationFull(payout)} copyable />
              <DetailRow label="Currency" value={payout.currency} />
              <DetailRow label="Created" value={new Date(payout.createdAt).toLocaleString()} />
              {payout.completedAt && (
                <DetailRow label="Completed" value={new Date(payout.completedAt).toLocaleString()} />
              )}
              {payout.scheduledAt && (
                <DetailRow label="Scheduled" value={new Date(payout.scheduledAt).toLocaleString()} />
              )}
            </div>
          </div>

          {/* Batch Information */}
          {payout.batchId && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-foreground">Batch Information</h3>
              <div className="rounded-lg border border-border bg-card p-4">
                <DetailRow label="Batch ID" value={payout.batchId} copyable />
              </div>
            </div>
          )}

          {/* Stellar Transaction */}
          {payout.stellarTxHash && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-foreground">Blockchain</h3>
              <div className="rounded-lg border border-border bg-card p-4">
                <DetailRow label="Transaction Hash" value={payout.stellarTxHash} copyable />
                <a
                  href={`${STELLAR_EXPLORER_URL}/tx/${payout.stellarTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex items-center justify-center gap-2 text-sm text-primary hover:underline"
                >
                  View on Stellar Explorer
                  <ArrowSquareOut size={14} />
                </a>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

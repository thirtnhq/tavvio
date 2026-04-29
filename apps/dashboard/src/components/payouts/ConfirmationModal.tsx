"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Badge,
} from "@useroutr/ui";
import { formatCurrency, truncateAddress } from "@/lib/utils";
import { AlertTriangle, Wallet, Building2, Smartphone, Sparkles } from "lucide-react";
import type { DestType, PayoutDestination } from "@useroutr/types";

interface ConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading: boolean;
  recipientName: string;
  destinationType: DestType;
  destination: PayoutDestination;
  amount: string;
  currency: string;
  fee?: string;
  feeCurrency?: string;
}

const DESTINATION_ICONS: Record<DestType, typeof Wallet> = {
  BANK_ACCOUNT: Building2,
  MOBILE_MONEY: Smartphone,
  CRYPTO_WALLET: Wallet,
  STELLAR: Sparkles,
};

const DESTINATION_LABELS: Record<DestType, string> = {
  BANK_ACCOUNT: "Bank Account",
  MOBILE_MONEY: "Mobile Money",
  CRYPTO_WALLET: "Crypto Wallet",
  STELLAR: "Stellar",
};

function formatDestinationDisplay(type: DestType, destination: PayoutDestination): string {
  switch (type) {
    case "BANK_ACCOUNT":
      if (destination.accountNumber) {
        return `****${destination.accountNumber.slice(-4)}`;
      }
      return destination.bankName || "Bank Account";
    case "MOBILE_MONEY":
      return destination.phoneNumber || "Mobile";
    case "CRYPTO_WALLET":
      return destination.address ? truncateAddress(destination.address, 6) : "Wallet";
    case "STELLAR":
      return destination.address ? truncateAddress(destination.address, 6) : "Stellar";
    default:
      return "Unknown";
  }
}

function getDestinationDetails(type: DestType, destination: PayoutDestination): string[] {
  const details: string[] = [];
  
  switch (type) {
    case "BANK_ACCOUNT":
      if (destination.bankName) details.push(destination.bankName);
      if (destination.country) details.push(destination.country);
      break;
    case "MOBILE_MONEY":
      if (destination.provider) details.push(destination.provider);
      if (destination.country) details.push(destination.country);
      break;
    case "CRYPTO_WALLET":
      if (destination.network) details.push(destination.network);
      if (destination.asset) details.push(destination.asset);
      break;
    case "STELLAR":
      if (destination.asset && destination.asset !== "native") {
        details.push(destination.asset);
      } else {
        details.push("XLM");
      }
      if (destination.memo) details.push(`Memo: ${destination.memo}`);
      break;
  }
  
  return details;
}

export function ConfirmationModal({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
  recipientName,
  destinationType,
  destination,
  amount,
  currency,
  fee,
  feeCurrency,
}: ConfirmationModalProps) {
  const Icon = DESTINATION_ICONS[destinationType];
  const amountNum = parseFloat(amount) || 0;
  const feeNum = parseFloat(fee || "0") || 0;
  const total = amountNum + feeNum;
  const displayFeeCurrency = feeCurrency || currency;
  const destinationDetails = getDestinationDetails(destinationType, destination);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Confirm Payout
          </DialogTitle>
          <DialogDescription>
            Please review the details before sending. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Recipient Section */}
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Recipient</span>
              <span className="font-medium">{recipientName}</span>
            </div>
          </div>

          {/* Destination Section */}
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Destination</span>
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <Badge variant="secondary">{DESTINATION_LABELS[destinationType]}</Badge>
              </div>
            </div>
            <div className="text-sm font-medium">
              {formatDestinationDisplay(destinationType, destination)}
            </div>
            {destinationDetails.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {destinationDetails.map((detail, i) => (
                  <span
                    key={i}
                    className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded"
                  >
                    {detail}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Amount Section */}
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Amount</span>
              <span className="text-xl font-semibold">
                {formatCurrency(amountNum, currency)}
              </span>
            </div>
            
            {feeNum > 0 && (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Fee</span>
                  <span className="text-muted-foreground">
                    {formatCurrency(feeNum, displayFeeCurrency)}
                  </span>
                </div>
                <div className="border-t border-border pt-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Total</span>
                    <span className="text-lg font-semibold">
                      {formatCurrency(total, displayFeeCurrency)}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Warning */}
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
            <p className="text-xs text-amber-700 dark:text-amber-300">
              By confirming, you authorize this payout. Funds will be sent to the recipient
              and cannot be recalled once processed.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            loading={isLoading}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {isLoading ? "Processing..." : "Confirm & Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

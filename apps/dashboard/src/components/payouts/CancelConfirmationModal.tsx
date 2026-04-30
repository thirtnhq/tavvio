"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@useroutr/ui";
import { Warning } from "@phosphor-icons/react";

interface CancelConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading?: boolean;
  recipientName?: string;
  amount?: string;
  currency?: string;
}

export function CancelConfirmationModal({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
  recipientName,
  amount,
  currency,
}: CancelConfirmationModalProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-amber-100 p-2 dark:bg-amber-900/50">
              <Warning size={24} className="text-amber-600 dark:text-amber-400" />
            </div>
            <AlertDialogTitle>Cancel Payout?</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-2">
            Are you sure you want to cancel this payout?
            {recipientName && amount && currency && (
              <div className="mt-2 rounded-lg bg-muted p-3 text-sm">
                <span className="font-medium">{recipientName}</span>
                <span className="text-muted-foreground"> — </span>
                <span className="font-medium">
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: currency,
                  }).format(Number(amount))}
                </span>
              </div>
            )}
            <p className="mt-3 text-sm text-muted-foreground">
              This action cannot be undone. The payout will be marked as cancelled and
              the funds will remain in your account.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onOpenChange(false)} disabled={isLoading}>
            Keep Payout
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isLoading ? "Cancelling..." : "Yes, Cancel Payout"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

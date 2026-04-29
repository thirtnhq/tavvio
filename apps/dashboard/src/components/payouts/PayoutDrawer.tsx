"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@useroutr/ui";
import { Wallet } from "lucide-react";
import { PayoutForm } from "./PayoutForm";
import type { DestType, PayoutDestination } from "@useroutr/types";

interface PayoutDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    recipientName: string;
    destinationType: DestType;
    destination: PayoutDestination;
    amount: string;
    currency: string;
    saveRecipient: boolean;
  }) => void;
  isSubmitting: boolean;
}

export function PayoutDrawer({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: PayoutDrawerProps) {
  const handleCancel = () => {
    onOpenChange(false);
  };

  const handleSubmit = (data: {
    recipientName: string;
    destinationType: DestType;
    destination: PayoutDestination;
    amount: string;
    currency: string;
    saveRecipient: boolean;
  }) => {
    onSubmit(data);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        className="w-full sm:w-[540px] sm:max-w-[540px] overflow-y-auto p-0"
        side="right"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <SheetHeader className="px-6 py-4 border-b border-border">
            <SheetTitle className="flex items-center gap-2 font-display text-lg">
              <Wallet className="h-5 w-5 text-muted-foreground" />
              New Payout
            </SheetTitle>
            <SheetDescription>
              Send money to a recipient. All fields marked with * are required.
            </SheetDescription>
          </SheetHeader>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <PayoutForm
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isSubmitting={isSubmitting}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

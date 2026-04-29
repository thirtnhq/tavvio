"use client";

import { useState } from "react";
import { Button } from "@useroutr/ui";
import { Plus } from "lucide-react";
import { PayoutDrawer } from "./PayoutDrawer";
import { useCreatePayout } from "@/hooks/useCreatePayout";
import { useCreateRecipient } from "@/hooks/useRecipients";
import { useToast } from "@useroutr/ui";
import type { DestType, PayoutDestination } from "@useroutr/types";

interface NewPayoutButtonProps {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function NewPayoutButton({
  variant = "default",
  size = "default",
  className,
}: NewPayoutButtonProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const createPayoutMutation = useCreatePayout();
  const createRecipientMutation = useCreateRecipient();

  const handleSubmit = async (data: {
    recipientName: string;
    destinationType: DestType;
    destination: PayoutDestination;
    amount: string;
    currency: string;
    saveRecipient: boolean;
  }) => {
    try {
      // If save recipient is checked, create the recipient first
      if (data.saveRecipient) {
        await createRecipientMutation.mutateAsync({
          name: data.recipientName,
          destinationType: data.destinationType,
          destination: data.destination,
        });
      }

      // Create the payout
      await createPayoutMutation.mutateAsync({
        recipientName: data.recipientName,
        destinationType: data.destinationType,
        destination: data.destination,
        amount: data.amount,
        currency: data.currency,
      });

      toast({
        title: "Payout Created",
        description: `Successfully created payout to ${data.recipientName}`,
        variant: "default",
      });

      setOpen(false);
    } catch (err) {
      toast({
        title: "Failed to Create Payout",
        description: err instanceof Error ? err.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
        className={className}
      >
        <Plus className="mr-2 h-4 w-4" />
        New Payout
      </Button>

      <PayoutDrawer
        open={open}
        onOpenChange={setOpen}
        onSubmit={handleSubmit}
        isSubmitting={createPayoutMutation.isPending || createRecipientMutation.isPending}
      />
    </>
  );
}

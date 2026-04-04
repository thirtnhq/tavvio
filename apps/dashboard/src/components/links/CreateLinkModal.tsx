"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Switch,
  Label,
  Separator,
  CurrencyInput,
  DatePicker,
} from "@useroutr/ui";
import type { CreatePaymentLinkInput } from "@useroutr/types";

interface CreateLinkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: CreatePaymentLinkInput) => void;
  isLoading?: boolean;
}

export function CreateLinkModal({
  open,
  onOpenChange,
  onCreate,
  isLoading,
}: CreateLinkModalProps) {
  const [amountType, setAmountType] = useState<"fixed" | "open">("fixed");
  const [amount, setAmount] = useState<number | undefined>(undefined);
  const [currency, setCurrency] = useState("USD");
  const [description, setDescription] = useState("");
  const [isSingleUse, setIsSingleUse] = useState(false);
  const [hasExpiry, setHasExpiry] = useState(false);
  const [expiryDate, setExpiryDate] = useState("");

  const handleSubmit = () => {
    const data: CreatePaymentLinkInput = {
      description: description || undefined,
      single_use: isSingleUse,
    };

    if (amountType === "fixed" && amount) {
      data.amount = amount;
      data.currency = currency;
    }

    if (hasExpiry && expiryDate) {
      data.expires_at = new Date(expiryDate).toISOString();
    }

    onCreate(data);
  };

  const canSubmit = !hasExpiry || expiryDate !== "";

  const handleReset = () => {
    setAmountType("fixed");
    setAmount(undefined);
    setCurrency("USD");
    setDescription("");
    setIsSingleUse(false);
    setHasExpiry(false);
    setExpiryDate("");
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      handleReset();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>New Payment Link</DialogTitle>
          <DialogDescription>
            Configure your payment link settings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 max-h-[60vh] overflow-y-auto py-1">
          {/* Amount Type */}
          <div className="space-y-3">
            <Label>Amount</Label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="amountType"
                  checked={amountType === "fixed"}
                  onChange={() => setAmountType("fixed")}
                  className="h-4 w-4 accent-[var(--primary)]"
                />
                <span className="text-sm text-[var(--foreground)]">Fixed amount</span>
              </label>
              {amountType === "fixed" && (
                <div className="pl-6">
                  <CurrencyInput
                    value={amount?.toString() || ""}
                    currency={currency}
                    onCurrencyChange={setCurrency}
                    onAmountChange={(val) => setAmount(val ? parseFloat(val) : undefined)}
                    placeholder="0.00"
                  />
                </div>
              )}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="amountType"
                  checked={amountType === "open"}
                  onChange={() => setAmountType("open")}
                  className="h-4 w-4 accent-[var(--primary)]"
                />
                <span className="text-sm text-[var(--foreground)]">
                  Open amount (payer decides)
                </span>
              </label>
            </div>
          </div>

          {/* Description */}
          <Input
            label="Description (optional)"
            placeholder="e.g., Design consultation - 1hr"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <Separator />

          {/* Options */}
          <div className="space-y-4">
            <Label>Options</Label>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="single-use" className="cursor-pointer">Single-use</Label>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Accept only one payment
                </p>
              </div>
              <Switch
                id="single-use"
                checked={isSingleUse}
                onCheckedChange={setIsSingleUse}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="has-expiry" className="cursor-pointer">Set expiry date</Label>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Link will expire after this date
                </p>
              </div>
              <Switch
                id="has-expiry"
                checked={hasExpiry}
                onCheckedChange={setHasExpiry}
              />
            </div>

            {hasExpiry && (
              <DatePicker
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            loading={isLoading}
            disabled={!canSubmit || isLoading}
          >
            Create Link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

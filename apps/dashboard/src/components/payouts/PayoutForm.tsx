"use client";

import { useState, useCallback, useEffect } from "react";
import { z } from "zod";
import {
  Input,
  Label,
  Select,
  Button,
  Checkbox,
  Skeleton,
  Separator,
} from "@useroutr/ui";
import { User, ArrowRight, ChevronDown } from "lucide-react";
import { DestinationTypeFields } from "./DestinationTypeFields";
import { FeeEstimatePanel } from "./FeeEstimatePanel";
import { ConfirmationModal } from "./ConfirmationModal";
import { PayoutFormSchema, defaultDestinationByType, defaultFormValues } from "@/schemas/payout.schema";
import { useFeeEstimate } from "@/hooks/useFeeEstimate";
import { useRecipients, type Recipient } from "@/hooks/useRecipients";
import type { DestType, PayoutDestination } from "@useroutr/types";

// ── Types ───────────────────────────────────────────────────────────────────

interface PayoutFormProps {
  onSubmit: (data: {
    recipientName: string;
    destinationType: DestType;
    destination: PayoutDestination;
    amount: string;
    currency: string;
    saveRecipient: boolean;
  }) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

type FormErrors = Partial<Record<string, string>>;

const CURRENCIES = [
  { value: "USD", label: "USD - US Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British Pound" },
  { value: "NGN", label: "NGN - Nigerian Naira" },
  { value: "KES", label: "KES - Kenyan Shilling" },
  { value: "GHS", label: "GHS - Ghana Cedi" },
  { value: "ZAR", label: "ZAR - South African Rand" },
  { value: "CAD", label: "CAD - Canadian Dollar" },
  { value: "AUD", label: "AUD - Australian Dollar" },
  { value: "JPY", label: "JPY - Japanese Yen" },
  { value: "XLM", label: "XLM - Stellar Lumens" },
  { value: "USDC", label: "USDC - USD Coin" },
];

const DESTINATION_TYPES: { value: DestType; label: string }[] = [
  { value: "STELLAR", label: "Stellar" },
  { value: "BANK_ACCOUNT", label: "Bank Account" },
  { value: "MOBILE_MONEY", label: "Mobile Money" },
  { value: "CRYPTO_WALLET", label: "Crypto Wallet" },
];

// ── Component ───────────────────────────────────────────────────────────────

export function PayoutForm({ onSubmit, onCancel, isSubmitting }: PayoutFormProps) {
  // ── Form State ─────────────────────────────────────────────────────────────
  const [recipientName, setRecipientName] = useState(defaultFormValues.recipientName);
  const [destinationType, setDestinationType] = useState<DestType>(defaultFormValues.destinationType);
  const [destination, setDestination] = useState<PayoutDestination>(defaultDestinationByType["STELLAR"]);
  const [amount, setAmount] = useState(defaultFormValues.amount);
  const [currency, setCurrency] = useState(defaultFormValues.currency);
  const [saveRecipient, setSaveRecipient] = useState(defaultFormValues.saveRecipient);
  const [errors, setErrors] = useState<FormErrors>({});
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showRecipientDropdown, setShowRecipientDropdown] = useState(false);

  // ── Data Fetching ──────────────────────────────────────────────────────────
  const { data: savedRecipients = [], isLoading: isLoadingRecipients } = useRecipients();
  const { data: feeEstimate, isLoading: isLoadingFee, error: feeError } = useFeeEstimate({
    destinationType,
    amount,
    currency,
    enabled: !!amount && parseFloat(amount) > 0,
  });

  // ── Handlers ───────────────────────────────────────────────────────────────
  const clearFieldError = useCallback((field: string) => {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const handleDestinationTypeChange = (newType: DestType) => {
    setDestinationType(newType);
    setDestination(defaultDestinationByType[newType]);
    clearFieldError("destinationType");
    // Clear destination-specific errors
    setErrors((prev) => {
      const next: FormErrors = {};
      Object.keys(prev).forEach((key) => {
        if (!key.startsWith("destination.")) {
          next[key] = prev[key];
        }
      });
      return next;
    });
  };

  const handleDestinationChange = (newDestination: PayoutDestination) => {
    setDestination(newDestination);
    clearFieldError("destination");
  };

  const validate = useCallback((): boolean => {
    const result = PayoutFormSchema.safeParse({
      recipientName,
      destinationType,
      destination,
      amount,
      currency,
      saveRecipient,
    });

    if (result.success) {
      setErrors({});
      return true;
    }

    const fieldErrors: FormErrors = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join(".");
      if (!fieldErrors[path]) {
        fieldErrors[path] = issue.message;
      }
    }
    setErrors(fieldErrors);
    return false;
  }, [recipientName, destinationType, destination, amount, currency, saveRecipient]);

  const handleReview = () => {
    if (validate()) {
      setShowConfirmation(true);
    }
  };

  const handleConfirm = () => {
    onSubmit({
      recipientName,
      destinationType,
      destination,
      amount,
      currency,
      saveRecipient,
    });
  };

  const handleSelectRecipient = (recipient: Recipient) => {
    setRecipientName(recipient.name);
    setDestinationType(recipient.destinationType);
    setDestination(recipient.destination);
    setShowRecipientDropdown(false);
    setErrors({});
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Recipient Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Recipient
          </Label>
          {savedRecipients.length > 0 && (
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRecipientDropdown(!showRecipientDropdown)}
                className="h-6 text-xs"
              >
                <User className="h-3 w-3 mr-1" />
                Saved
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
              {showRecipientDropdown && (
                <div className="absolute right-0 top-full mt-1 w-64 rounded-md border border-border bg-popover shadow-md z-50">
                  <div className="p-2 max-h-48 overflow-y-auto">
                    {isLoadingRecipients ? (
                      <Skeleton className="h-8 w-full" />
                    ) : savedRecipients.length === 0 ? (
                      <p className="text-sm text-muted-foreground px-2 py-1">
                        No saved recipients
                      </p>
                    ) : (
                      savedRecipients.map((recipient) => (
                        <button
                          key={recipient.id}
                          onClick={() => handleSelectRecipient(recipient)}
                          className="w-full text-left px-2 py-2 text-sm hover:bg-muted rounded-sm"
                        >
                          <div className="font-medium">{recipient.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {recipient.destinationType.replace("_", " ")}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="recipientName">Recipient Name *</Label>
          <Input
            id="recipientName"
            placeholder="e.g. John Doe"
            value={recipientName}
            onChange={(e) => {
              setRecipientName(e.target.value);
              clearFieldError("recipientName");
            }}
            error={errors.recipientName}
          />
        </div>
      </section>

      <Separator />

      {/* Destination Type Selection */}
      <section className="space-y-3">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Destination Type
        </Label>

        <div className="grid grid-cols-2 gap-2">
          {DESTINATION_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => handleDestinationTypeChange(type.value)}
              className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                destinationType === type.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card hover:bg-muted"
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </section>

      {/* Dynamic Destination Fields */}
      <section className="space-y-3">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Destination Details
        </Label>

        <DestinationTypeFields
          destinationType={destinationType}
          destination={destination}
          onChange={handleDestinationChange}
          errors={errors}
        />
      </section>

      <Separator />

      {/* Amount Section */}
      <section className="space-y-3">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Amount
        </Label>

        <div className="grid grid-cols-[1fr,auto] gap-3">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount *</Label>
            <Input
              id="amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                clearFieldError("amount");
              }}
              error={errors.amount}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">Currency *</Label>
            <Select
              id="currency"
              value={currency}
              onChange={(e) => {
                setCurrency(e.target.value);
                clearFieldError("currency");
              }}
              error={errors.currency}
            >
              {CURRENCIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </section>

      {/* Fee Estimate */}
      <FeeEstimatePanel
        amount={amount}
        currency={currency}
        fee={feeEstimate?.fee}
        feeCurrency={feeEstimate?.feeCurrency}
        total={feeEstimate?.total}
        exchangeRate={feeEstimate?.exchangeRate}
        isLoading={isLoadingFee}
        error={feeError}
      />

      {/* Save Recipient Checkbox */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="saveRecipient"
          checked={saveRecipient}
          onCheckedChange={(checked) => setSaveRecipient(checked === true)}
        />
        <Label htmlFor="saveRecipient" className="text-sm cursor-pointer">
          Save recipient for future payouts
        </Label>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          onClick={handleReview}
          disabled={isSubmitting}
          className="flex-1"
        >
          Review
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        open={showConfirmation}
        onOpenChange={setShowConfirmation}
        onConfirm={handleConfirm}
        isLoading={isSubmitting}
        recipientName={recipientName}
        destinationType={destinationType}
        destination={destination}
        amount={amount}
        currency={currency}
        fee={feeEstimate?.fee}
        feeCurrency={feeEstimate?.feeCurrency}
      />
    </div>
  );
}

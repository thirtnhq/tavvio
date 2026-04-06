"use client";

import { useState, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Select,
  Textarea,
  useToast,
} from "@useroutr/ui";
import { Info, Warning, ArrowLeft } from "@phosphor-icons/react";
import { type Payment } from "@/hooks/usePayments";
import { useCreateRefund } from "@/hooks/useRefunds";
import {
  REFUND_REASONS,
  getRefundEta,
  getPaymentMethodLabel,
  refundWindowDaysRemaining,
} from "@/lib/refund";
import { formatCurrency } from "@/lib/utils";

type RefundType = "full" | "partial";
type Step = "form" | "confirm";

interface RefundModalProps {
  payment: Payment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const REASON_OPTIONS = REFUND_REASONS.map((r) => ({
  value: r.value,
  label: r.label,
}));

const NOTES_MAX_LENGTH = 500;

export function RefundModal({ payment, open, onOpenChange }: RefundModalProps) {
  const { toast } = useToast();
  const createRefund = useCreateRefund();

  const fullAmount = Number(payment.amount);
  const currency = payment.currency;

  // ── Form state ───────────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>("form");
  const [refundType, setRefundType] = useState<RefundType>("full");
  const [amountStr, setAmountStr] = useState(String(fullAmount));
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  // ── Derived ──────────────────────────────────────────────────────────────────
  const amount = Number(amountStr);
  const daysRemaining = refundWindowDaysRemaining(payment.completedAt);
  const methodLabel = getPaymentMethodLabel(payment.sourceChain);
  const eta = getRefundEta(payment.sourceChain);

  // ── Validation ───────────────────────────────────────────────────────────────
  const amountError = useMemo(() => {
    if (refundType === "full") return undefined;
    if (!amountStr || isNaN(amount)) return "Enter a valid amount";
    if (amount <= 0) return "Amount must be greater than zero";
    if (amount > fullAmount)
      return `Cannot exceed ${formatCurrency(fullAmount, currency)}`;
    return undefined;
  }, [refundType, amountStr, amount, fullAmount, currency]);

  const canSubmit = reason !== "" && !amountError && amount > 0;

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    setStep("form");
    setRefundType("full");
    setAmountStr(String(fullAmount));
    setReason("");
    setNotes("");
  }, [fullAmount]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) reset();
      onOpenChange(next);
    },
    [onOpenChange, reset],
  );

  const handleTypeToggle = (type: RefundType) => {
    setRefundType(type);
    if (type === "full") setAmountStr(String(fullAmount));
  };

  const handleConfirm = async () => {
    try {
      await createRefund.mutateAsync({
        paymentId: payment.id,
        amount: refundType === "full" ? fullAmount : amount,
        reason,
        notes: notes.trim() || undefined,
      });
      toast("Refund initiated successfully", "success");
      handleOpenChange(false);
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Failed to create refund",
        "error",
      );
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        {step === "form" ? (
          <>
            <DialogHeader>
              <DialogTitle>Refund Payment</DialogTitle>
              <DialogDescription>
                Issue a refund for payment{" "}
                <span className="font-mono">{payment.id.slice(0, 8)}…</span>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-2">
              {/* Refund type toggle */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">
                  Refund Type
                </label>
                <div className="flex rounded-md border border-border p-0.5">
                  {(["full", "partial"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleTypeToggle(type)}
                      className={`flex-1 rounded-sm px-4 py-2 text-sm font-medium transition-colors ${
                        refundType === type
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {type === "full" ? "Full Refund" : "Partial Refund"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount */}
              <Input
                id="refund-amount"
                label="Refund Amount"
                type="number"
                step="0.01"
                min={0}
                max={fullAmount}
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                readOnly={refundType === "full"}
                error={amountError}
                helperText={
                  refundType === "full"
                    ? "Full amount will be refunded"
                    : `Max ${formatCurrency(fullAmount, currency)}`
                }
              />

              {/* Reason */}
              <Select
                label="Reason"
                placeholder="Select a reason…"
                options={REASON_OPTIONS}
                value={reason}
                onValueChange={setReason}
                error={reason === "" ? undefined : undefined}
              />

              {/* Notes */}
              <div className="space-y-1.5">
                <Textarea
                  id="refund-notes"
                  label="Notes (optional)"
                  placeholder="Additional context for this refund…"
                  value={notes}
                  onChange={(e) => {
                    if (e.target.value.length <= NOTES_MAX_LENGTH)
                      setNotes(e.target.value);
                  }}
                  rows={3}
                />
                <p className="text-right text-xs text-muted-foreground">
                  {notes.length}/{NOTES_MAX_LENGTH}
                </p>
              </div>

              {/* Refund rules */}
              <div className="rounded-md border border-border bg-(--blue)/5 p-3">
                <div className="mb-2 flex items-center gap-1.5 text-sm font-medium text-blue">
                  <Info size={16} weight="bold" /> Refund Rules
                </div>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li>• Refunds allowed up to 180 days ({daysRemaining} days remaining)</li>
                  <li>• Partial refunds are supported</li>
                  <li>• Crypto network fees may be deducted</li>
                  <li>
                    • Estimated delivery:{" "}
                    <span className="font-medium text-foreground">{eta}</span>{" "}
                    ({methodLabel})
                  </li>
                </ul>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={!canSubmit}
                onClick={() => setStep("confirm")}
              >
                Review Refund
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Confirm Refund</DialogTitle>
              <DialogDescription>
                Please review the refund details before submitting.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Summary table */}
              <div className="space-y-3 rounded-md border border-border p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Payment</span>
                  <span className="font-mono text-foreground">
                    {payment.id.slice(0, 8)}…
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Refund Amount</span>
                  <span className="font-semibold text-foreground">
                    {formatCurrency(
                      refundType === "full" ? fullAmount : amount,
                      currency,
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Type</span>
                  <span className="text-foreground">
                    {refundType === "full" ? "Full Refund" : "Partial Refund"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Reason</span>
                  <span className="text-foreground">
                    {REFUND_REASONS.find((r) => r.value === reason)?.label}
                  </span>
                </div>
                {notes.trim() && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Notes</span>
                    <span className="max-w-50 text-right text-foreground">
                      {notes.trim()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Est. Delivery</span>
                  <span className="text-foreground">
                    {eta} ({methodLabel})
                  </span>
                </div>
              </div>

              {/* Warning notice */}
              <div className="rounded-md border border-(--amber)/30 bg-(--amber)/5 p-3">
                <div className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-amber">
                  <Warning size={16} weight="bold" /> Important
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  This refund will be processed immediately. The customer may receive
                  funds within {eta} depending on payment method. Crypto network fees
                  may be deducted and this action may not be reversible.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep("form")}
                disabled={createRefund.isPending}
              >
                <ArrowLeft size={14} />
                Back
              </Button>
              <Button
                variant="destructive"
                size="sm"
                loading={createRefund.isPending}
                onClick={handleConfirm}
              >
                Confirm Refund
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@useroutr/ui";
import { Button, Separator } from "@useroutr/ui";
import { Send, User, DollarSign, FileText } from "lucide-react";
import type { Invoice } from "@/hooks/useInvoices";

// ── Props ──────────────────────────────────────────────────────────────────────

interface SendInvoiceModalProps {
  invoice: Invoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (invoice: Invoice, message?: string) => Promise<void>;
  isSending?: boolean;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function SendInvoiceModal({
  invoice,
  open,
  onOpenChange,
  onConfirm,
  isSending,
}: SendInvoiceModalProps) {
  const [recipientEmail, setRecipientEmail] = useState("");
  const [message, setMessage] = useState("");
  const [emailError, setEmailError] = useState("");

  // Sync recipient email whenever the invoice changes
  useEffect(() => {
    if (invoice) {
      setRecipientEmail(invoice.customerEmail);
      setMessage("");
      setEmailError("");
    }
  }, [invoice?.id]);

  if (!invoice) return null;

  const fmtCurrency = (amount: string, currency: string) => {
    const num = parseFloat(amount);
    return isNaN(num)
      ? `—`
      : new Intl.NumberFormat("en-US", { style: "currency", currency }).format(num);
  };

  const validate = () => {
    if (!recipientEmail.trim()) {
      setEmailError("Recipient email is required");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail.trim())) {
      setEmailError("Enter a valid email address");
      return false;
    }
    setEmailError("");
    return true;
  };

  const handleSend = async () => {
    if (!validate()) return;
    await onConfirm(invoice, message.trim() || undefined);
    onOpenChange(false);
  };

  const invoiceLabel = invoice.invoiceNumber
    ? `Invoice ${invoice.invoiceNumber}`
    : `Invoice #${invoice.id.slice(0, 8).toUpperCase()}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-4 w-4 text-muted-foreground" />
            Send Invoice
          </DialogTitle>
          <DialogDescription>
            Send {invoiceLabel} to your client via email with a PDF attachment.
          </DialogDescription>
        </DialogHeader>

        {/* ── Invoice summary card ── */}
        <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-2.5 text-sm">
          <div className="flex items-center gap-2.5 text-muted-foreground">
            <FileText className="h-3.5 w-3.5 shrink-0" />
            <span className="font-medium text-foreground">{invoiceLabel}</span>
          </div>
          <div className="flex items-center gap-2.5 text-muted-foreground">
            <User className="h-3.5 w-3.5 shrink-0" />
            <span>{invoice.customerName ?? invoice.customerEmail}</span>
          </div>
          <div className="flex items-center gap-2.5 text-muted-foreground">
            <DollarSign className="h-3.5 w-3.5 shrink-0" />
            <span className="font-semibold text-foreground">
              {fmtCurrency(invoice.total, invoice.currency)}
            </span>
            {invoice.dueDate && (
              <span className="text-xs">
                · Due{" "}
                {new Date(invoice.dueDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            )}
          </div>
        </div>

        <Separator />

        {/* ── Recipient email ── */}
        <div className="space-y-1.5">
          <label
            htmlFor="send-recipient"
            className="text-sm font-medium text-foreground"
          >
            Recipient email
          </label>
          <input
            id="send-recipient"
            type="email"
            value={recipientEmail}
            onChange={(e) => {
              setRecipientEmail(e.target.value);
              if (emailError) setEmailError("");
            }}
            className={`w-full h-9 rounded-md border bg-transparent px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors ${
              emailError ? "border-destructive" : "border-input"
            }`}
            placeholder="client@example.com"
            autoComplete="email"
          />
          {emailError && (
            <p className="text-xs text-destructive">{emailError}</p>
          )}
        </div>

        {/* ── Custom message ── */}
        <div className="space-y-1.5">
          <label
            htmlFor="send-message"
            className="text-sm font-medium text-foreground"
          >
            Message{" "}
            <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <textarea
            id="send-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Hi Jane, please find your invoice attached. Let me know if you have any questions."
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
          <p className="text-xs text-muted-foreground text-right">
            {message.length}/1000
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            loading={isSending}
            disabled={isSending}
          >
            <Send className="mr-1.5 h-3.5 w-3.5" />
            Send Invoice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

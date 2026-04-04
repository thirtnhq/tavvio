"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Separator } from "@useroutr/ui";
import {
  Send,
  FileDown,
  Link2,
  XCircle,
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Hash,
} from "lucide-react";
import { Button } from "@useroutr/ui";
import type { Invoice, InvoiceStatus } from "@/hooks/useInvoices";

// ── Status badge ───────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-muted text-muted-foreground" },
  SENT: { label: "Sent", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  VIEWED: { label: "Viewed", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" },
  PARTIALLY_PAID: { label: "Partially Paid", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  PAID: { label: "Paid", className: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  OVERDUE: { label: "Overdue", className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
  CANCELLED: { label: "Cancelled", className: "bg-muted text-muted-foreground line-through" },
};

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const { label, className } = STATUS_CONFIG[status] ?? STATUS_CONFIG.DRAFT;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface InvoiceDetailSheetProps {
  invoice: Invoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: (invoice: Invoice) => void;
  onDownloadPdf: (invoice: Invoice) => void;
  onCopyLink: (invoice: Invoice) => void;
  onCancel: (invoice: Invoice) => void;
  onEdit: (invoice: Invoice) => void;
  isSendPending?: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtCurrency(amount: string | number, currency: string) {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return `0.00 ${currency}`;
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(num);
}

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ── Component ──────────────────────────────────────────────────────────────────

export function InvoiceDetailSheet({
  invoice,
  open,
  onOpenChange,
  onSend,
  onDownloadPdf,
  onCopyLink,
  onCancel,
  onEdit,
  isSendPending,
}: InvoiceDetailSheetProps) {
  if (!invoice) return null;

  const subtotal = parseFloat(invoice.subtotal ?? "0");
  const taxAmount = parseFloat(invoice.taxAmount ?? "0");
  const discount = parseFloat(invoice.discount ?? "0");
  const total = parseFloat(invoice.total ?? "0");
  const amountPaid = parseFloat(invoice.amountPaid ?? "0");
  const amountDue = total - amountPaid;

  const isDraft = invoice.status === "DRAFT";
  const isCancellable = !["PAID", "CANCELLED"].includes(invoice.status);
  const address = invoice.customerAddress;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col gap-0 p-0 overflow-hidden">
        {/* ── Header ── */}
        <SheetHeader className="px-6 py-5 border-b border-border shrink-0">
          <div className="flex items-start justify-between gap-3 pr-6">
            <div className="space-y-1">
              <SheetTitle className="font-display text-base font-semibold">
                {invoice.invoiceNumber
                  ? `Invoice ${invoice.invoiceNumber}`
                  : `Invoice #${invoice.id.slice(0, 8).toUpperCase()}`}
              </SheetTitle>
              <SheetDescription className="sr-only">Invoice details</SheetDescription>
              <div className="flex items-center gap-2">
                <StatusBadge status={invoice.status} />
                <span className="text-xs text-muted-foreground">
                  Created {fmtDate(invoice.createdAt)}
                </span>
              </div>
            </div>
          </div>
        </SheetHeader>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-6">

            {/* Customer info */}
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Customer
              </h3>
              <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-2.5">
                {invoice.customerName && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="font-medium text-foreground">{invoice.customerName}</span>
                  </div>
                )}
                <div className="flex items-center gap-2.5 text-sm">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <a
                    href={`mailto:${invoice.customerEmail}`}
                    className="text-foreground hover:underline truncate"
                  >
                    {invoice.customerEmail}
                  </a>
                </div>
                {invoice.customerPhone && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-foreground">{invoice.customerPhone}</span>
                  </div>
                )}
                {address && (
                  <div className="flex items-start gap-2.5 text-sm">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    <span className="text-foreground leading-snug">
                      {address.line1}
                      {address.line2 ? `, ${address.line2}` : ""}
                      {address.city ? `, ${address.city}` : ""}
                      {address.state ? `, ${address.state}` : ""}
                      {address.country ? `, ${address.country}` : ""}
                      {address.zip ? ` ${address.zip}` : ""}
                    </span>
                  </div>
                )}
              </div>
            </section>

            {/* Invoice meta */}
            <section className="grid grid-cols-2 gap-3">
              {invoice.invoiceNumber && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Hash className="h-3 w-3" /> Invoice #
                  </p>
                  <p className="text-sm font-medium text-foreground">{invoice.invoiceNumber}</p>
                </div>
              )}
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-3 w-3" /> Currency
                </p>
                <p className="text-sm font-medium text-foreground">{invoice.currency}</p>
              </div>
              {invoice.dueDate && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Due Date
                  </p>
                  <p
                    className={`text-sm font-medium ${
                      invoice.status === "OVERDUE"
                        ? "text-red-600"
                        : "text-foreground"
                    }`}
                  >
                    {fmtDate(invoice.dueDate)}
                  </p>
                </div>
              )}
              {invoice.paidAt && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Paid On</p>
                  <p className="text-sm font-medium text-green-600">{fmtDate(invoice.paidAt)}</p>
                </div>
              )}
            </section>

            <Separator />

            {/* Line items */}
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Line Items
              </h3>
              <div className="rounded-lg border border-border overflow-hidden">
                {/* Header */}
                <div className="grid grid-cols-[1fr_48px_80px_80px] gap-2 px-4 py-2 bg-muted/40 border-b border-border">
                  <span className="text-xs font-medium text-muted-foreground">Description</span>
                  <span className="text-xs font-medium text-muted-foreground text-center">Qty</span>
                  <span className="text-xs font-medium text-muted-foreground text-right">Price</span>
                  <span className="text-xs font-medium text-muted-foreground text-right">Total</span>
                </div>
                {/* Rows */}
                {invoice.lineItems.map((item, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[1fr_48px_80px_80px] gap-2 px-4 py-2.5 border-b border-border last:border-0 text-sm"
                  >
                    <span className="text-foreground truncate">{item.description}</span>
                    <span className="text-muted-foreground text-center tabular-nums">{item.qty}</span>
                    <span className="text-muted-foreground text-right tabular-nums">
                      {fmtCurrency(item.unitPrice, invoice.currency)}
                    </span>
                    <span className="text-foreground text-right font-medium tabular-nums">
                      {fmtCurrency(item.amount, invoice.currency)}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Totals */}
            <section className="rounded-lg border border-border bg-muted/20 p-4 space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="tabular-nums">{fmtCurrency(subtotal, invoice.currency)}</span>
              </div>
              {taxAmount > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax</span>
                  <span className="tabular-nums">{fmtCurrency(taxAmount, invoice.currency)}</span>
                </div>
              )}
              {discount > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Discount</span>
                  <span className="tabular-nums text-green-600">
                    −{fmtCurrency(discount, invoice.currency)}
                  </span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-semibold text-foreground text-base">
                <span>Total</span>
                <span className="tabular-nums">{fmtCurrency(total, invoice.currency)}</span>
              </div>
              {amountPaid > 0 && (
                <>
                  <div className="flex justify-between text-green-600 text-xs">
                    <span>Amount Paid</span>
                    <span className="tabular-nums">{fmtCurrency(amountPaid, invoice.currency)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-foreground">
                    <span>Balance Due</span>
                    <span className="tabular-nums">{fmtCurrency(amountDue, invoice.currency)}</span>
                  </div>
                </>
              )}
            </section>

            {/* Notes */}
            {invoice.notes && (
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Notes
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed rounded-lg border border-border bg-muted/20 p-3">
                  {invoice.notes}
                </p>
              </section>
            )}
          </div>
        </div>

        {/* ── Footer actions ── */}
        <div className="shrink-0 border-t border-border px-6 py-4 space-y-2">
          <div className="flex gap-2">
            {isDraft && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => onEdit(invoice)}
              >
                Edit Draft
              </Button>
            )}
            {isDraft && (
              <Button
                size="sm"
                className="flex-1"
                onClick={() => onSend(invoice)}
                loading={isSendPending}
                disabled={isSendPending}
              >
                <Send className="mr-1.5 h-3.5 w-3.5" />
                Send
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onDownloadPdf(invoice)}
            >
              <FileDown className="mr-1.5 h-3.5 w-3.5" />
              Download PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onCopyLink(invoice)}
            >
              <Link2 className="mr-1.5 h-3.5 w-3.5" />
              Copy Link
            </Button>
          </div>
          {isCancellable && (
            <Button
              variant="outline"
              size="sm"
              className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
              onClick={() => onCancel(invoice)}
            >
              <XCircle className="mr-1.5 h-3.5 w-3.5" />
              Cancel Invoice
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

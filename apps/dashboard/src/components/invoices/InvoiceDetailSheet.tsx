"use client";

import { useState } from "react";
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
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Hash,
  Eye,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Ban,
  FilePlus,
  CreditCard,
  FileSearch,
} from "lucide-react";
import { Button } from "@useroutr/ui";
import { SendInvoiceModal } from "./SendInvoiceModal";
import { InvoicePdfPreview } from "./InvoicePdfPreview";
import type { Invoice, InvoiceStatus } from "@/hooks/useInvoices";

// ── Status badge ───────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-muted text-muted-foreground" },
  SENT: { label: "Sent", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  VIEWED: { label: "Viewed", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" },
  PARTIALLY_PAID: { label: "Partially Paid", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  PAID: { label: "Paid", className: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  OVERDUE: { label: "Overdue", className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
  CANCELLED: { label: "Cancelled", className: "bg-muted text-muted-foreground" },
};

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const { label, className } = STATUS_CONFIG[status] ?? STATUS_CONFIG.DRAFT;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

// ── Activity timeline ─────────────────────────────────────────────────────────

interface TimelineEvent {
  key: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  timestamp?: string;
  completed: boolean;
  active: boolean;
}

const STATUS_ORDER: InvoiceStatus[] = [
  "DRAFT",
  "SENT",
  "VIEWED",
  "PARTIALLY_PAID",
  "PAID",
  "OVERDUE",
  "CANCELLED",
];

function buildTimeline(invoice: Invoice): TimelineEvent[] {
  const status = invoice.status;
  const statusIndex = STATUS_ORDER.indexOf(status);

  const fmtTs = (iso?: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
      : undefined;

  const reached = (s: InvoiceStatus) =>
    STATUS_ORDER.indexOf(s) <= statusIndex ||
    // For cancelled, treat as its own branch
    (status === "CANCELLED" && s === "CANCELLED");

  const events: TimelineEvent[] = [
    {
      key: "created",
      icon: <FilePlus className="h-3.5 w-3.5" />,
      label: "Invoice created",
      description: "Invoice was created as a draft.",
      timestamp: fmtTs(invoice.createdAt),
      completed: true,
      active: status === "DRAFT",
    },
  ];

  if (status === "CANCELLED") {
    events.push({
      key: "cancelled",
      icon: <Ban className="h-3.5 w-3.5" />,
      label: "Invoice cancelled",
      description: "Invoice was cancelled and can no longer be paid.",
      timestamp: fmtTs(invoice.updatedAt),
      completed: true,
      active: true,
    });
    return events;
  }

  events.push({
    key: "sent",
    icon: <Send className="h-3.5 w-3.5" />,
    label: "Invoice sent",
    description: "Invoice was emailed to the customer with a PDF attachment.",
    timestamp: reached("SENT") ? fmtTs(invoice.updatedAt) : undefined,
    completed: reached("SENT") && status !== "DRAFT",
    active: status === "SENT",
  });

  events.push({
    key: "viewed",
    icon: <Eye className="h-3.5 w-3.5" />,
    label: "Invoice viewed",
    description: "Customer opened the invoice email.",
    completed: reached("VIEWED") && !["DRAFT", "SENT"].includes(status),
    active: status === "VIEWED",
  });

  if (status === "OVERDUE") {
    events.push({
      key: "overdue",
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      label: "Invoice overdue",
      description: "Payment was not received by the due date.",
      timestamp: invoice.dueDate ? fmtTs(invoice.dueDate) : undefined,
      completed: true,
      active: true,
    });
    return events;
  }

  if (status === "PARTIALLY_PAID") {
    events.push({
      key: "partial",
      icon: <CreditCard className="h-3.5 w-3.5" />,
      label: "Partial payment received",
      description: "A partial payment was recorded against this invoice.",
      timestamp: fmtTs(invoice.paidAt),
      completed: true,
      active: true,
    });
    return events;
  }

  events.push({
    key: "paid",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    label: "Invoice paid",
    description: "Full payment was received.",
    timestamp: fmtTs(invoice.paidAt),
    completed: status === "PAID",
    active: status === "PAID",
  });

  return events;
}

function ActivityTimeline({ invoice }: { invoice: Invoice }) {
  const events = buildTimeline(invoice);

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-[13px] top-4 bottom-4 w-px bg-border" />

      <ol className="space-y-4">
        {events.map((ev) => (
          <li key={ev.key} className="relative flex gap-3 pl-1">
            {/* Dot + icon */}
            <div
              className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                ev.completed && ev.active
                  ? "border-primary bg-primary text-primary-foreground"
                  : ev.completed
                  ? "border-muted-foreground/40 bg-muted text-muted-foreground"
                  : "border-border bg-background text-muted-foreground/40"
              }`}
            >
              {ev.icon}
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1 pb-0.5">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span
                  className={`text-sm font-medium ${
                    ev.completed ? "text-foreground" : "text-muted-foreground/50"
                  }`}
                >
                  {ev.label}
                </span>
                {ev.timestamp && (
                  <span className="text-xs text-muted-foreground">{ev.timestamp}</span>
                )}
                {!ev.completed && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground/50">
                    <Clock className="h-2.5 w-2.5" />
                    Pending
                  </span>
                )}
              </div>
              <p
                className={`text-xs leading-relaxed mt-0.5 ${
                  ev.completed ? "text-muted-foreground" : "text-muted-foreground/40"
                }`}
              >
                {ev.description}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface InvoiceDetailSheetProps {
  invoice: Invoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after user confirms in the send modal */
  onSend: (invoice: Invoice, message?: string) => Promise<void>;
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
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);

  if (!invoice) return null;

  const subtotal = parseFloat(invoice.subtotal ?? "0");
  const taxAmount = parseFloat(invoice.taxAmount ?? "0");
  const discount = parseFloat(invoice.discount ?? "0");
  const total = parseFloat(invoice.total ?? "0");
  const amountPaid = parseFloat(invoice.amountPaid ?? "0");
  const amountDue = total - amountPaid;

  const isDraft = invoice.status === "DRAFT";
  const isPaid = invoice.status === "PAID" || invoice.status === "PARTIALLY_PAID";
  const isCancellable = !["PAID", "CANCELLED"].includes(invoice.status);
  const address = invoice.customerAddress;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-[520px] flex flex-col gap-0 p-0 overflow-hidden">
          {/* ── Header ── */}
          <SheetHeader className="px-6 py-4 border-b border-border shrink-0">
            <div className="flex items-start justify-between gap-3 pr-6">
              <div className="space-y-1.5 min-w-0">
                <SheetTitle className="font-display text-base font-semibold truncate">
                  {invoice.invoiceNumber
                    ? `Invoice ${invoice.invoiceNumber}`
                    : `Invoice #${invoice.id.slice(0, 8).toUpperCase()}`}
                </SheetTitle>
                <SheetDescription className="sr-only">Invoice details</SheetDescription>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={invoice.status} />
                  <span className="text-xs text-muted-foreground">
                    Created {fmtDate(invoice.createdAt)}
                  </span>
                </div>
              </div>
              {/* PDF preview button in header */}
              <button
                onClick={() => setPdfPreviewOpen(true)}
                className="shrink-0 flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                title="Preview PDF"
              >
                <FileSearch className="h-3.5 w-3.5" />
                Preview
              </button>
            </div>
          </SheetHeader>

          {/* ── Scrollable body ── */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-6 py-5 space-y-6">

              {/* Customer info */}
              <section className="space-y-2.5">
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
                  <p className="text-xs text-muted-foreground">Currency</p>
                  <p className="text-sm font-medium text-foreground">{invoice.currency}</p>
                </div>
                {invoice.dueDate && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Due Date
                    </p>
                    <p
                      className={`text-sm font-medium ${
                        invoice.status === "OVERDUE" ? "text-red-600" : "text-foreground"
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
              <section className="space-y-2.5">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Line Items
                </h3>
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="grid grid-cols-[1fr_44px_76px_76px] gap-2 px-4 py-2 bg-muted/40 border-b border-border">
                    <span className="text-xs font-medium text-muted-foreground">Description</span>
                    <span className="text-xs font-medium text-muted-foreground text-center">Qty</span>
                    <span className="text-xs font-medium text-muted-foreground text-right">Price</span>
                    <span className="text-xs font-medium text-muted-foreground text-right">Total</span>
                  </div>
                  {invoice.lineItems.map((item, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-[1fr_44px_76px_76px] gap-2 px-4 py-2.5 border-b border-border last:border-0 text-sm"
                    >
                      <span className="text-foreground">{item.description}</span>
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

              {/* Payment details (when paid / partially paid) */}
              {isPaid && (
                <section className="space-y-2.5">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Payment Details
                  </h3>
                  <div className="rounded-lg border border-border bg-green-50/50 dark:bg-green-900/10 p-4 space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                      <span className="font-medium text-green-700 dark:text-green-400">
                        {invoice.status === "PAID" ? "Fully paid" : "Partially paid"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="space-y-0.5">
                        <p className="text-xs text-muted-foreground">Amount received</p>
                        <p className="font-semibold text-foreground">
                          {fmtCurrency(amountPaid, invoice.currency)}
                        </p>
                      </div>
                      {invoice.paidAt && (
                        <div className="space-y-0.5">
                          <p className="text-xs text-muted-foreground">Payment date</p>
                          <p className="font-medium text-foreground">{fmtDate(invoice.paidAt)}</p>
                        </div>
                      )}
                      {amountDue > 0 && (
                        <div className="space-y-0.5">
                          <p className="text-xs text-muted-foreground">Balance due</p>
                          <p className="font-semibold text-amber-600">
                            {fmtCurrency(amountDue, invoice.currency)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              )}

              {/* Notes */}
              {invoice.notes && (
                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Notes
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed rounded-lg border border-border bg-muted/20 p-3 whitespace-pre-wrap">
                    {invoice.notes}
                  </p>
                </section>
              )}

              <Separator />

              {/* Activity timeline */}
              <section className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Activity
                </h3>
                <ActivityTimeline invoice={invoice} />
              </section>

              {/* Bottom padding */}
              <div className="h-2" />
            </div>
          </div>

          {/* ── Footer actions ── */}
          <div className="shrink-0 border-t border-border px-6 py-4 space-y-2">
            {/* Primary row: Edit + Send */}
            {isDraft && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => onEdit(invoice)}
                >
                  Edit Draft
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => setSendModalOpen(true)}
                  disabled={isSendPending}
                >
                  <Send className="mr-1.5 h-3.5 w-3.5" />
                  Send Invoice
                </Button>
              </div>
            )}
            {/* Secondary row: Download + Copy link */}
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
            {/* Destructive: Cancel */}
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

      {/* ── Send modal (rendered outside sheet to avoid z-index nesting issues) ── */}
      <SendInvoiceModal
        invoice={invoice}
        open={sendModalOpen}
        onOpenChange={setSendModalOpen}
        onConfirm={onSend}
        isSending={isSendPending}
      />

      {/* ── PDF preview dialog ── */}
      <InvoicePdfPreview
        invoice={invoice}
        open={pdfPreviewOpen}
        onOpenChange={setPdfPreviewOpen}
        onDownload={onDownloadPdf}
      />
    </>
  );
}

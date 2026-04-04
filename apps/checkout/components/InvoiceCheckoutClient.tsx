"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  ArrowRight,
  FileText,
} from "@phosphor-icons/react";
import { MerchantBranding } from "@/components/MerchantBranding";
import { TrustBadges } from "@/components/TrustBadges";
import { SecurityNote } from "@/components/SecurityNote";
import { formatCurrency } from "@/lib/utils";
import {
  useInvoiceCheckout,
  useInitiateInvoicePayment,
  type InvoiceCheckoutStatus,
  type InvoiceCheckoutData,
} from "@/hooks/useInvoiceCheckout";

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(iso?: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function InvoiceSkeleton() {
  return (
    <div className="flex min-h-screen justify-center bg-muted/30 px-4 py-8 sm:px-8">
      <div className="w-full max-w-[480px] space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto h-12 w-12 skeleton rounded-xl" />
          <div className="mx-auto h-4 w-36 skeleton rounded" />
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
          <div className="h-5 w-40 skeleton rounded" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex justify-between items-center">
                <div className="h-4 w-32 skeleton rounded" />
                <div className="h-4 w-16 skeleton rounded" />
              </div>
            ))}
            <div className="border-t border-border pt-3 flex justify-between items-center">
              <div className="h-5 w-16 skeleton rounded" />
              <div className="h-6 w-24 skeleton rounded" />
            </div>
          </div>
        </div>
        <div className="h-12 w-full skeleton rounded-xl" />
      </div>
    </div>
  );
}

// ── Terminal states ────────────────────────────────────────────────────────────

interface TerminalStateProps {
  invoice: InvoiceCheckoutData;
}

function PaidState({ invoice }: TerminalStateProps) {
  const amountPaid = parseFloat(invoice.amountPaid);
  return (
    <div className="rounded-xl border border-border bg-card p-8 shadow-sm text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
        <CheckCircle size={36} weight="fill" className="text-green-600" />
      </div>
      <h2 className="mt-4 font-display text-lg font-semibold text-foreground">
        Invoice Paid
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {formatCurrency(amountPaid, invoice.currency)} was received
        {invoice.paidAt ? ` on ${fmtDate(invoice.paidAt)}` : ""}.
      </p>
      {invoice.merchant.email && (
        <p className="mt-4 text-xs text-muted-foreground">
          Questions?{" "}
          <a
            href={`mailto:${invoice.merchant.email}`}
            className="text-primary underline"
          >
            Contact {invoice.merchant.name}
          </a>
        </p>
      )}
    </div>
  );
}

function CancelledState({ invoice }: TerminalStateProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-8 shadow-sm text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <XCircle size={36} weight="fill" className="text-muted-foreground" />
      </div>
      <h2 className="mt-4 font-display text-lg font-semibold text-foreground">
        Invoice Cancelled
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        This invoice has been cancelled and can no longer be paid.
      </p>
      {invoice.merchant.email && (
        <p className="mt-4 text-xs text-muted-foreground">
          Questions?{" "}
          <a
            href={`mailto:${invoice.merchant.email}`}
            className="text-primary underline"
          >
            Contact {invoice.merchant.name}
          </a>
        </p>
      )}
    </div>
  );
}

function OverdueState({
  invoice,
  onPay,
  isPaying,
}: TerminalStateProps & { onPay: () => void; isPaying: boolean }) {
  const amountDue =
    parseFloat(invoice.total) - parseFloat(invoice.amountPaid);
  return (
    <div className="rounded-xl border border-red-200 bg-red-50/50 p-8 shadow-sm">
      <div className="flex flex-col items-center text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <AlertTriangle size={36} weight="fill" className="text-red-600" />
        </div>
        <h2 className="mt-4 font-display text-lg font-semibold text-foreground">
          Payment Overdue
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This invoice was due on {fmtDate(invoice.dueDate)}. You can still
          pay the outstanding balance to settle the invoice.
        </p>
        <p className="mt-3 font-mono text-2xl font-semibold text-red-700">
          {formatCurrency(amountDue, invoice.currency)}
        </p>
      </div>
      <button
        onClick={onPay}
        disabled={isPaying}
        className="mt-6 w-full rounded-xl bg-red-600 px-4 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {isPaying ? (
          "Setting up payment…"
        ) : (
          <>
            Pay Now
            <ArrowRight size={16} weight="bold" />
          </>
        )}
      </button>
    </div>
  );
}

// ── Line items table ───────────────────────────────────────────────────────────

function LineItemsTable({ invoice }: { invoice: InvoiceCheckoutData }) {
  const subtotal = parseFloat(invoice.subtotal);
  const taxAmount = parseFloat(invoice.taxAmount ?? "0");
  const discount = parseFloat(invoice.discount ?? "0");
  const total = parseFloat(invoice.total);
  const amountPaid = parseFloat(invoice.amountPaid);
  const amountDue = total - amountPaid;

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-foreground flex items-center gap-2">
            <FileText size={16} className="text-muted-foreground" />
            {invoice.invoiceNumber
              ? `Invoice ${invoice.invoiceNumber}`
              : `Invoice #${invoice.id.slice(0, 8).toUpperCase()}`}
          </h2>
          {invoice.dueDate && (
            <span className="text-xs text-muted-foreground">
              Due {fmtDate(invoice.dueDate)}
            </span>
          )}
        </div>
        {invoice.customerName && (
          <p className="mt-0.5 text-sm text-muted-foreground">
            For {invoice.customerName}
          </p>
        )}
      </div>

      {/* Line items */}
      <div className="divide-y divide-border">
        {/* Column headers */}
        <div className="grid grid-cols-[1fr_40px_72px_72px] gap-2 px-5 py-2 bg-muted/30">
          <span className="text-xs text-muted-foreground">Item</span>
          <span className="text-xs text-muted-foreground text-center">Qty</span>
          <span className="text-xs text-muted-foreground text-right">Price</span>
          <span className="text-xs text-muted-foreground text-right">Total</span>
        </div>
        {invoice.lineItems.map((item, i) => (
          <div
            key={i}
            className="grid grid-cols-[1fr_40px_72px_72px] gap-2 px-5 py-3 text-sm"
          >
            <span className="text-foreground">{item.description}</span>
            <span className="text-muted-foreground text-center tabular-nums">{item.qty}</span>
            <span className="text-muted-foreground text-right tabular-nums">
              {formatCurrency(item.unitPrice, invoice.currency)}
            </span>
            <span className="text-foreground font-medium text-right tabular-nums">
              {formatCurrency(item.amount, invoice.currency)}
            </span>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="border-t border-border px-5 py-4 space-y-2 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>Subtotal</span>
          <span className="tabular-nums">{formatCurrency(subtotal, invoice.currency)}</span>
        </div>
        {taxAmount > 0 && (
          <div className="flex justify-between text-muted-foreground">
            <span>Tax</span>
            <span className="tabular-nums">{formatCurrency(taxAmount, invoice.currency)}</span>
          </div>
        )}
        {discount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Discount</span>
            <span className="tabular-nums">−{formatCurrency(discount, invoice.currency)}</span>
          </div>
        )}
        <div className="border-t border-border pt-2 flex justify-between font-semibold text-foreground text-base">
          <span>Total</span>
          <span className="font-mono tabular-nums">{formatCurrency(total, invoice.currency)}</span>
        </div>
        {amountPaid > 0 && invoice.status !== "PAID" && (
          <>
            <div className="flex justify-between text-green-600 text-xs">
              <span>Amount Paid</span>
              <span className="tabular-nums">{formatCurrency(amountPaid, invoice.currency)}</span>
            </div>
            <div className="flex justify-between font-semibold text-amber-700 border-t border-border pt-2">
              <span>Balance Due</span>
              <span className="font-mono tabular-nums">{formatCurrency(amountDue, invoice.currency)}</span>
            </div>
          </>
        )}
      </div>

      {/* Notes */}
      {invoice.notes && (
        <div className="border-t border-border px-5 py-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Notes
          </p>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {invoice.notes}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Pay Now button ─────────────────────────────────────────────────────────────

function PayNowButton({
  invoice,
  onPay,
  isPaying,
}: {
  invoice: InvoiceCheckoutData;
  onPay: () => void;
  isPaying: boolean;
}) {
  const amountDue =
    parseFloat(invoice.total) - parseFloat(invoice.amountPaid);
  const isPartial = invoice.status === "PARTIALLY_PAID";
  const brandColor = invoice.merchant.brandColor;

  return (
    <button
      onClick={onPay}
      disabled={isPaying}
      style={brandColor ? { backgroundColor: brandColor } : undefined}
      className={`w-full rounded-xl px-4 py-4 text-sm font-semibold text-white transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] ${
        !brandColor ? "bg-primary hover:brightness-110" : "hover:brightness-95"
      }`}
    >
      {isPaying ? (
        <span className="flex items-center gap-2">
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Setting up payment…
        </span>
      ) : (
        <>
          Pay {isPartial ? "Remaining " : ""}
          {formatCurrency(amountDue, invoice.currency)}
          <ArrowRight size={16} weight="bold" />
        </>
      )}
    </button>
  );
}

// ── Draft state ────────────────────────────────────────────────────────────────

function DraftState({ invoice }: TerminalStateProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-8 shadow-sm text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Clock size={36} weight="fill" className="text-muted-foreground" />
      </div>
      <h2 className="mt-4 font-display text-lg font-semibold text-foreground">
        Invoice Not Yet Sent
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        This invoice hasn&apos;t been sent yet. Please check back later or
        contact {invoice.merchant.name}.
      </p>
      {invoice.merchant.email && (
        <a
          href={`mailto:${invoice.merchant.email}`}
          className="mt-4 inline-block text-sm text-primary underline"
        >
          Contact {invoice.merchant.name}
        </a>
      )}
    </div>
  );
}

// ── Not found state ────────────────────────────────────────────────────────────

function NotFoundState() {
  return (
    <div className="rounded-xl border border-border bg-card p-8 shadow-sm text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <FileText size={36} className="text-muted-foreground" />
      </div>
      <h2 className="mt-4 font-display text-lg font-semibold text-foreground">
        Invoice Not Found
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        This invoice link may be invalid or has been removed.
      </p>
    </div>
  );
}

// ── Error handler ──────────────────────────────────────────────────────────────

function PayError({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
      {message}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface InvoiceCheckoutClientProps {
  invoiceId: string;
}

export function InvoiceCheckoutClient({ invoiceId }: InvoiceCheckoutClientProps) {
  const router = useRouter();
  const [payError, setPayError] = useState<string | null>(null);

  const { data: invoice, isLoading, isError } = useInvoiceCheckout(invoiceId);
  const initiatePayment = useInitiateInvoicePayment();

  const handlePay = async () => {
    setPayError(null);
    try {
      const { paymentId } = await initiatePayment.mutateAsync(invoiceId);
      router.push(`/${paymentId}`);
    } catch (err) {
      setPayError(
        err instanceof Error ? err.message : "Could not start payment. Please try again.",
      );
    }
  };

  // Loading
  if (isLoading) return <InvoiceSkeleton />;

  // Not found
  if (isError || !invoice) {
    return (
      <div className="flex min-h-screen justify-center bg-muted/30 px-4 py-8 sm:px-8">
        <div className="w-full max-w-[480px] space-y-6">
          <NotFoundState />
          <TrustBadges />
        </div>
      </div>
    );
  }

  const payableStatuses: InvoiceCheckoutStatus[] = [
    "SENT",
    "VIEWED",
    "PARTIALLY_PAID",
  ];
  const isPayable = payableStatuses.includes(invoice.status);
  const isOverdue = invoice.status === "OVERDUE";
  const isPaid = invoice.status === "PAID";
  const isCancelled = invoice.status === "CANCELLED";
  const isDraft = invoice.status === "DRAFT";

  return (
    <div className="flex min-h-screen justify-center bg-muted/30 px-4 py-8 sm:px-8">
      <div className="w-full max-w-[480px] space-y-5">
        {/* Merchant branding */}
        <MerchantBranding
          merchantName={invoice.merchant.name}
          merchantLogo={invoice.merchant.logo ?? undefined}
        />

        {/* Terminal states */}
        {isDraft && <DraftState invoice={invoice} />}
        {isPaid && <PaidState invoice={invoice} />}
        {isCancelled && <CancelledState invoice={invoice} />}

        {/* Overdue: show warning + still allow payment */}
        {isOverdue && (
          <OverdueState
            invoice={invoice}
            onPay={handlePay}
            isPaying={initiatePayment.isPending}
          />
        )}

        {/* Payable: show full invoice + pay button */}
        {(isPayable || isOverdue) && (
          <>
            <LineItemsTable invoice={invoice} />

            {payError && <PayError message={payError} />}

            {isPayable && (
              <PayNowButton
                invoice={invoice}
                onPay={handlePay}
                isPaying={initiatePayment.isPending}
              />
            )}

            <SecurityNote />
          </>
        )}

        {/* Paid / Cancelled: still show the invoice for reference */}
        {(isPaid || isCancelled) && <LineItemsTable invoice={invoice} />}

        <TrustBadges />
      </div>
    </div>
  );
}

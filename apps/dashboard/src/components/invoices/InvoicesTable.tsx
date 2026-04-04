"use client";

import { useState } from "react";
import {
  MoreHorizontal,
  Send,
  Eye,
  Pencil,
  Trash2,
  FileDown,
  FileText,
  Link2,
  XCircle,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from "lucide-react";
import { Button } from "@useroutr/ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Invoice, InvoiceStatus } from "@/hooks/useInvoices";

// ── Status badge ───────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-muted text-muted-foreground" },
  SENT: { label: "Sent", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  VIEWED: { label: "Viewed", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" },
  PARTIALLY_PAID: { label: "Partial", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  PAID: { label: "Paid", className: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  OVERDUE: { label: "Overdue", className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
  CANCELLED: { label: "Cancelled", className: "bg-muted text-muted-foreground line-through" },
};

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const { label, className } = STATUS_CONFIG[status] ?? STATUS_CONFIG.DRAFT;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

// ── Sort indicator ─────────────────────────────────────────────────────────────

function SortIcon({ col, sortBy, sortOrder }: { col: string; sortBy?: string; sortOrder?: "asc" | "desc" }) {
  if (sortBy !== col) return <ChevronsUpDown className="h-3 w-3 opacity-40" />;
  return sortOrder === "asc"
    ? <ChevronUp className="h-3 w-3" />
    : <ChevronDown className="h-3 w-3" />;
}

// ── Skeleton row ───────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="grid grid-cols-[1fr_1fr_110px_90px_100px_40px] gap-4 px-6 py-4 items-center">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-4 skeleton rounded" />
      ))}
      <div />
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────────

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <FileText className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h3 className="font-display text-base font-semibold text-foreground">No invoices yet</h3>
        <p className="text-sm text-muted-foreground max-w-[260px]">
          Create your first invoice to start billing clients and tracking payments.
        </p>
      </div>
      <Button onClick={onCreate} size="sm">
        Create invoice
      </Button>
    </div>
  );
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface InvoicesTableProps {
  invoices: Invoice[];
  isLoading: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (col: string) => void;
  onRowClick: (invoice: Invoice) => void;
  onEdit: (invoice: Invoice) => void;
  onSend: (invoice: Invoice) => void;
  onDelete: (invoice: Invoice) => void;
  onDownloadPdf: (invoice: Invoice) => void;
  onCopyLink: (invoice: Invoice) => void;
  onCancel: (invoice: Invoice) => void;
  onCreate: () => void;
}

// ── Sortable header cell ──────────────────────────────────────────────────────

function SortableHeader({
  label,
  col,
  sortBy,
  sortOrder,
  onSort,
  className = "",
}: {
  label: string;
  col: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (col: string) => void;
  className?: string;
}) {
  return (
    <button
      onClick={() => onSort?.(col)}
      className={`flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors ${className}`}
    >
      {label}
      <SortIcon col={col} sortBy={sortBy} sortOrder={sortOrder} />
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function InvoicesTable({
  invoices,
  isLoading,
  sortBy,
  sortOrder,
  onSort,
  onRowClick,
  onEdit,
  onSend,
  onDelete,
  onDownloadPdf,
  onCopyLink,
  onCancel,
  onCreate,
}: InvoicesTableProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const fmtCurrency = (amount: string, currency: string) => {
    const num = parseFloat(amount);
    return isNaN(num)
      ? `0.00 ${currency}`
      : new Intl.NumberFormat("en-US", { style: "currency", currency }).format(num);
  };

  const fmtDate = (iso?: string) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const isDraft = (inv: Invoice) => inv.status === "DRAFT";
  const isCancellable = (inv: Invoice) => !["PAID", "CANCELLED"].includes(inv.status);

  return (
    <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
      {/* Table header */}
      <div className="border-b border-border bg-muted/40 px-6 py-3">
        <div className="grid grid-cols-[1fr_1fr_110px_90px_100px_40px] gap-4 items-center">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Invoice #
          </span>
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Customer
          </span>
          <SortableHeader label="Amount" col="total" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
          <SortableHeader label="Status" col="status" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
          <SortableHeader label="Due Date" col="dueDate" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
          <span />
        </div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-border">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
        ) : invoices.length === 0 ? (
          <EmptyState onCreate={onCreate} />
        ) : (
          invoices.map((inv) => {
            const amountDue = parseFloat(inv.total) - parseFloat(inv.amountPaid ?? "0");

            return (
              <div
                key={inv.id}
                className={`grid grid-cols-[1fr_1fr_110px_90px_100px_40px] gap-4 px-6 py-4 items-center transition-colors cursor-pointer ${
                  hoveredId === inv.id ? "bg-muted/30" : ""
                }`}
                onMouseEnter={() => setHoveredId(inv.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={(e) => {
                  // Don't trigger when clicking the actions dropdown
                  const target = e.target as HTMLElement;
                  if (target.closest("[data-radix-popper-content-wrapper]")) return;
                  if (target.closest("[data-invoice-actions]")) return;
                  onRowClick(inv);
                }}
              >
                {/* Invoice # */}
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm font-medium text-foreground truncate">
                    {inv.invoiceNumber ?? `#${inv.id.slice(0, 8).toUpperCase()}`}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {fmtDate(inv.createdAt)}
                  </span>
                </div>

                {/* Customer */}
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm text-foreground truncate">
                    {inv.customerName ?? inv.customerEmail}
                  </span>
                  {inv.customerName && (
                    <span className="text-xs text-muted-foreground truncate">
                      {inv.customerEmail}
                    </span>
                  )}
                </div>

                {/* Amount */}
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-foreground tabular-nums">
                    {fmtCurrency(inv.total, inv.currency)}
                  </span>
                  {parseFloat(inv.amountPaid ?? "0") > 0 && inv.status !== "PAID" && (
                    <span className="text-xs text-green-600">
                      +{fmtCurrency(inv.amountPaid, inv.currency)} paid
                    </span>
                  )}
                  {inv.status === "PARTIALLY_PAID" && (
                    <span className="text-xs text-amber-600">
                      {fmtCurrency(String(amountDue), inv.currency)} due
                    </span>
                  )}
                </div>

                {/* Status */}
                <StatusBadge status={inv.status} />

                {/* Due date */}
                <span
                  className={`text-sm tabular-nums ${
                    inv.status === "OVERDUE" ? "text-red-600 font-medium" : "text-muted-foreground"
                  }`}
                >
                  {fmtDate(inv.dueDate)}
                </span>

                {/* Actions */}
                <div data-invoice-actions onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        aria-label="Invoice actions"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {isDraft(inv) && (
                        <DropdownMenuItem onClick={() => onEdit(inv)}>
                          <Pencil className="mr-2 h-3.5 w-3.5" />
                          Edit draft
                        </DropdownMenuItem>
                      )}
                      {!isDraft(inv) && (
                        <DropdownMenuItem onClick={() => onRowClick(inv)}>
                          <Eye className="mr-2 h-3.5 w-3.5" />
                          View invoice
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => onDownloadPdf(inv)}>
                        <FileDown className="mr-2 h-3.5 w-3.5" />
                        Download PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onCopyLink(inv)}>
                        <Link2 className="mr-2 h-3.5 w-3.5" />
                        Copy link
                      </DropdownMenuItem>
                      {isDraft(inv) && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => onSend(inv)}>
                            <Send className="mr-2 h-3.5 w-3.5" />
                            Send to client
                          </DropdownMenuItem>
                        </>
                      )}
                      {isCancellable(inv) && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => onCancel(inv)}
                            className="text-destructive focus:text-destructive"
                          >
                            <XCircle className="mr-2 h-3.5 w-3.5" />
                            Cancel invoice
                          </DropdownMenuItem>
                        </>
                      )}
                      {isDraft(inv) && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => onDelete(inv)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                            Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

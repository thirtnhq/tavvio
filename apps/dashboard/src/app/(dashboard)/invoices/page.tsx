"use client";

import { useState, useCallback } from "react";
import { Plus, Search, Download, X, ChevronDown } from "lucide-react";
import { Button, useToast } from "@useroutr/ui";
import { InvoiceDrawer } from "@/components/invoices/InvoiceDrawer";
import { InvoicesTable } from "@/components/invoices/InvoicesTable";
import { InvoiceDetailSheet } from "@/components/invoices/InvoiceDetailSheet";
import {
  useInvoices,
  useCreateInvoice,
  useUpdateInvoice,
  useDeleteInvoice,
  useSendInvoice,
  useCancelInvoice,
  useInvoicePdfUrl,
  type Invoice,
  type InvoiceStatus,
  type CreateInvoiceInput,
} from "@/hooks/useInvoices";

// ── Constants ──────────────────────────────────────────────────────────────────

const STATUS_FILTERS: Array<{ label: string; value: InvoiceStatus | "ALL" }> = [
  { label: "All", value: "ALL" },
  { label: "Draft", value: "DRAFT" },
  { label: "Sent", value: "SENT" },
  { label: "Viewed", value: "VIEWED" },
  { label: "Partial", value: "PARTIALLY_PAID" },
  { label: "Paid", value: "PAID" },
  { label: "Overdue", value: "OVERDUE" },
  { label: "Cancelled", value: "CANCELLED" },
];

const CURRENCIES = [
  "USD", "EUR", "GBP", "NGN", "KES", "GHS", "ZAR",
  "CAD", "AUD", "JPY", "CNY", "INR", "BRL", "MXN",
  "AED", "SGD", "CHF",
];

// ── CSV export helper ──────────────────────────────────────────────────────────

function exportToCsv(invoices: Invoice[]) {
  const headers = [
    "Invoice #",
    "Customer Name",
    "Customer Email",
    "Currency",
    "Subtotal",
    "Tax",
    "Discount",
    "Total",
    "Amount Paid",
    "Status",
    "Due Date",
    "Created At",
  ];

  const rows = invoices.map((inv) => [
    inv.invoiceNumber ?? inv.id,
    inv.customerName ?? "",
    inv.customerEmail,
    inv.currency,
    inv.subtotal,
    inv.taxAmount ?? "0",
    inv.discount ?? "0",
    inv.total,
    inv.amountPaid,
    inv.status,
    inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("en-US") : "",
    new Date(inv.createdAt).toLocaleDateString("en-US"),
  ]);

  const csv = [headers, ...rows]
    .map((row) =>
      row
        .map((cell) => {
          const str = String(cell ?? "");
          return str.includes(",") || str.includes('"') || str.includes("\n")
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        })
        .join(","),
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `invoices-${new Date().toISOString().split("T")[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function InvoicesPage() {
  const { toast } = useToast();

  // ── Filter state ──────────────────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [currency, setCurrency] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // ── Drawer / sheet state ──────────────────────────────────────────────────
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | undefined>();
  const [detailInvoice, setDetailInvoice] = useState<Invoice | null>(null);

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data, isLoading } = useInvoices({
    page,
    limit: 20,
    status: statusFilter === "ALL" ? undefined : statusFilter,
    search: search || undefined,
    currency: currency || undefined,
    from: dateFrom || undefined,
    to: dateTo || undefined,
    sortBy,
    sortOrder,
  });

  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
  const deleteInvoice = useDeleteInvoice();
  const sendInvoice = useSendInvoice();
  const cancelInvoice = useCancelInvoice();
  const getPdfUrl = useInvoicePdfUrl();

  const invoices = data?.data ?? [];
  const meta = data?.meta;

  // ── Sort handler ──────────────────────────────────────────────────────────
  const handleSort = useCallback(
    (col: string) => {
      if (sortBy === col) {
        setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortBy(col);
        setSortOrder("asc");
      }
      setPage(1);
    },
    [sortBy],
  );

  // ── Filter reset ──────────────────────────────────────────────────────────
  const hasActiveFilters = currency || dateFrom || dateTo;

  const clearFilters = () => {
    setCurrency("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  // ── Drawer handlers ───────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingInvoice(undefined);
    setDrawerOpen(true);
  };

  const openEdit = (invoice: Invoice) => {
    setDetailInvoice(null);
    setEditingInvoice(invoice);
    setDrawerOpen(true);
  };

  const handleSaveDraft = async (input: CreateInvoiceInput) => {
    try {
      if (editingInvoice) {
        await updateInvoice.mutateAsync({ id: editingInvoice.id, body: input });
        toast("Invoice updated — draft saved.", "success");
      } else {
        await createInvoice.mutateAsync(input);
        toast("Invoice created and saved as draft.", "success");
      }
      setDrawerOpen(false);
      setEditingInvoice(undefined);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Something went wrong", "error");
    }
  };

  const handleSend = async (input: CreateInvoiceInput) => {
    try {
      let invoice = editingInvoice;
      if (invoice) {
        invoice = await updateInvoice.mutateAsync({ id: invoice.id, body: input });
      } else {
        invoice = await createInvoice.mutateAsync(input);
      }
      await sendInvoice.mutateAsync({ id: invoice.id });
      toast(`Invoice sent to ${invoice.customerEmail}.`, "success");
      setDrawerOpen(false);
      setEditingInvoice(undefined);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Something went wrong", "error");
    }
  };

  const handleSendExisting = async (invoice: Invoice) => {
    try {
      await sendInvoice.mutateAsync({ id: invoice.id });
      toast(`Invoice sent to ${invoice.customerEmail}.`, "success");
      // Update the detail sheet if it's showing this invoice
      setDetailInvoice((prev) =>
        prev?.id === invoice.id ? { ...prev, status: "SENT" } : prev,
      );
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not send invoice", "error");
    }
  };

  const handleDelete = async (invoice: Invoice) => {
    if (
      !confirm(
        `Delete invoice ${invoice.invoiceNumber ?? invoice.id}? This cannot be undone.`,
      )
    )
      return;
    try {
      await deleteInvoice.mutateAsync(invoice.id);
      toast("Invoice deleted.", "success");
      if (detailInvoice?.id === invoice.id) setDetailInvoice(null);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not delete", "error");
    }
  };

  const handleCancel = async (invoice: Invoice) => {
    if (
      !confirm(
        `Cancel invoice ${invoice.invoiceNumber ?? invoice.id}? The client will no longer be able to pay it.`,
      )
    )
      return;
    try {
      await cancelInvoice.mutateAsync(invoice.id);
      toast("Invoice cancelled.", "success");
      setDetailInvoice((prev) =>
        prev?.id === invoice.id ? { ...prev, status: "CANCELLED" } : prev,
      );
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not cancel invoice", "error");
    }
  };

  const handleDownloadPdf = async (invoice: Invoice) => {
    try {
      const { url } = await getPdfUrl.mutateAsync(invoice.id);
      window.open(url, "_blank");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not generate PDF", "error");
    }
  };

  const handleCopyLink = (invoice: Invoice) => {
    const checkoutBase =
      process.env.NEXT_PUBLIC_CHECKOUT_URL ?? window.location.origin;
    const link = `${checkoutBase}/invoice/${invoice.id}`;
    navigator.clipboard
      .writeText(link)
      .then(() => toast("Invoice link copied to clipboard.", "success"))
      .catch(() => toast("Could not copy link.", "error"));
  };

  const handleExportCsv = () => {
    if (invoices.length === 0) {
      toast("No invoices to export.", "error");
      return;
    }
    exportToCsv(invoices);
    toast(`Exported ${invoices.length} invoice${invoices.length !== 1 ? "s" : ""} to CSV.`, "success");
  };

  const isMutating =
    createInvoice.isPending || updateInvoice.isPending || sendInvoice.isPending;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-foreground">Invoices</h2>
          {meta && (
            <p className="text-sm text-muted-foreground">
              {meta.total} invoice{meta.total !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={invoices.length === 0}>
            <Download className="mr-1.5 h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            Create invoice
          </Button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="space-y-3">
        {/* Status tabs */}
        <div className="flex flex-wrap gap-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => {
                setStatusFilter(f.value);
                setPage(1);
              }}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === f.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search + secondary filters row */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="search"
              placeholder="Search by customer, invoice #…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="h-9 w-full rounded-md border border-input bg-transparent pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Currency filter */}
          <div className="relative">
            <select
              value={currency}
              onChange={(e) => {
                setCurrency(e.target.value);
                setPage(1);
              }}
              className="h-9 appearance-none rounded-md border border-input bg-transparent pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring text-muted-foreground"
            >
              <option value="">All currencies</option>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          </div>

          {/* Date range */}
          <div className="flex items-center gap-1">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring text-muted-foreground"
              aria-label="From date"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring text-muted-foreground"
              aria-label="To date"
            />
          </div>

          {/* Clear filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3 w-3" />
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      <InvoicesTable
        invoices={invoices}
        isLoading={isLoading}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        onRowClick={setDetailInvoice}
        onEdit={openEdit}
        onSend={handleSendExisting}
        onDelete={handleDelete}
        onDownloadPdf={handleDownloadPdf}
        onCopyLink={handleCopyLink}
        onCancel={handleCancel}
        onCreate={openCreate}
      />

      {/* ── Pagination ── */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {meta.page} of {meta.totalPages} &middot; {meta.total} total
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              disabled={page >= meta.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* ── Create / Edit drawer ── */}
      <InvoiceDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        invoice={editingInvoice}
        onSaveDraft={handleSaveDraft}
        onSend={handleSend}
        isLoading={isMutating}
      />

      {/* ── Invoice detail sheet ── */}
      <InvoiceDetailSheet
        invoice={detailInvoice}
        open={!!detailInvoice}
        onOpenChange={(open) => { if (!open) setDetailInvoice(null); }}
        onEdit={openEdit}
        onSend={handleSendExisting}
        onDownloadPdf={handleDownloadPdf}
        onCopyLink={handleCopyLink}
        onCancel={handleCancel}
        isSendPending={sendInvoice.isPending}
      />
    </div>
  );
}

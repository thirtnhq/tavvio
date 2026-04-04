"use client";

import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { Button, Input, useToast } from "@useroutr/ui";
import { InvoiceDrawer } from "@/components/invoices/InvoiceDrawer";
import { InvoicesTable } from "@/components/invoices/InvoicesTable";
import {
  useInvoices,
  useCreateInvoice,
  useUpdateInvoice,
  useDeleteInvoice,
  useSendInvoice,
  useInvoicePdfUrl,
  type Invoice,
  type InvoiceStatus,
  type CreateInvoiceInput,
} from "@/hooks/useInvoices";

const STATUS_FILTERS: Array<{ label: string; value: InvoiceStatus | "ALL" }> = [
  { label: "All", value: "ALL" },
  { label: "Draft", value: "DRAFT" },
  { label: "Sent", value: "SENT" },
  { label: "Viewed", value: "VIEWED" },
  { label: "Partial", value: "PARTIALLY_PAID" },
  { label: "Paid", value: "PAID" },
  { label: "Overdue", value: "OVERDUE" },
];

export default function InvoicesPage() {
  const { toast } = useToast();

  // ── Filter state ──────────────────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // ── Drawer state ──────────────────────────────────────────────────────────
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | undefined>();

  // ── Send-confirm state ────────────────────────────────────────────────────
  const [sendTarget, setSendTarget] = useState<Invoice | undefined>();

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data, isLoading } = useInvoices({
    page,
    limit: 20,
    status: statusFilter === "ALL" ? undefined : statusFilter,
    search: search || undefined,
  });

  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
  const deleteInvoice = useDeleteInvoice();
  const sendInvoice = useSendInvoice();
  const getPdfUrl = useInvoicePdfUrl();

  const invoices = data?.data ?? [];
  const meta = data?.meta;

  // ── Handlers ──────────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingInvoice(undefined);
    setDrawerOpen(true);
  };

  const openEdit = (invoice: Invoice) => {
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
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not send invoice", "error");
    }
  };

  const handleDelete = async (invoice: Invoice) => {
    if (!confirm(`Delete invoice ${invoice.invoiceNumber ?? invoice.id}? This cannot be undone.`)) {
      return;
    }
    try {
      await deleteInvoice.mutateAsync(invoice.id);
      toast("Invoice deleted.", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not delete", "error");
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

  const isMutating =
    createInvoice.isPending ||
    updateInvoice.isPending ||
    sendInvoice.isPending;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-foreground">
            Invoices
          </h2>
          {meta && (
            <p className="text-sm text-muted-foreground">
              {meta.total} invoice{meta.total !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-1.5 h-4 w-4" />
          Create invoice
        </Button>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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

        {/* Search */}
        <div className="relative sm:ml-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            placeholder="Search by customer, invoice #…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="h-9 w-full sm:w-64 rounded-md border border-input bg-transparent pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* ── Table ── */}
      <InvoicesTable
        invoices={invoices}
        isLoading={isLoading}
        onEdit={openEdit}
        onSend={handleSendExisting}
        onDelete={handleDelete}
        onDownloadPdf={handleDownloadPdf}
        onCreate={openCreate}
      />

      {/* ── Pagination ── */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {meta.page} of {meta.totalPages}
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
    </div>
  );
}

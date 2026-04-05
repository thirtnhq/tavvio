"use client";

import { useState, useCallback } from "react";
import { z } from "zod";
import { Plus, Trash2, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Label,
  Separator,
  DatePicker,
} from "@useroutr/ui";
import type { CreateInvoiceInput, Invoice } from "@/hooks/useInvoices";

// â”€â”€ Validation schema â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const LineItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  qty: z.number({ invalid_type_error: "Must be a number" }).positive("Qty > 0"),
  unitPrice: z
    .number({ invalid_type_error: "Must be a number" })
    .nonnegative("Price â‰¥ 0"),
});

const InvoiceSchema = z.object({
  customerEmail: z.string().email("Valid email required"),
  customerName: z.string().optional(),
  currency: z.string().min(1),
  lineItems: z
    .array(LineItemSchema)
    .min(1, "At least one line item required"),
  taxRate: z.number().min(0).max(100).optional(),
  discount: z.number().nonnegative().optional(),
  dueDate: z.string().optional(),
  notes: z.string().max(2000).optional(),
  invoiceNumber: z.string().optional(),
});

type FormErrors = Partial<Record<string, string>>;

// â”€â”€ Line item helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface LineItemRow {
  id: string;
  description: string;
  qty: string;
  unitPrice: string;
}

function emptyRow(): LineItemRow {
  return { id: crypto.randomUUID(), description: "", qty: "1", unitPrice: "" };
}

function rowToItem(
  row: LineItemRow,
): { description: string; qty: number; unitPrice: number; amount: number } {
  const qty = parseFloat(row.qty) || 0;
  const unitPrice = parseFloat(row.unitPrice) || 0;
  return { description: row.description, qty, unitPrice, amount: qty * unitPrice };
}

function computeTotals(
  rows: LineItemRow[],
  taxRatePct: number,
  discountAmt: number,
) {
  const subtotal = rows.reduce((sum, r) => {
    const qty = parseFloat(r.qty) || 0;
    const price = parseFloat(r.unitPrice) || 0;
    return sum + qty * price;
  }, 0);
  const taxAmount = (subtotal * taxRatePct) / 100;
  const total = Math.max(0, subtotal + taxAmount - discountAmt);
  return { subtotal, taxAmount, total };
}

// â”€â”€ Props â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface InvoiceDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Populated when editing an existing draft */
  invoice?: Invoice;
  onSaveDraft: (data: CreateInvoiceInput) => void;
  onSend?: (data: CreateInvoiceInput) => void;
  isLoading?: boolean;
}

// â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function InvoiceDrawer({
  open,
  onOpenChange,
  invoice,
  onSaveDraft,
  onSend,
  isLoading,
}: InvoiceDrawerProps) {
  const isEditing = !!invoice;

  // â”€â”€ Customer fields â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [customerEmail, setCustomerEmail] = useState(invoice?.customerEmail ?? "");
  const [customerName, setCustomerName] = useState(invoice?.customerName ?? "");
  const [invoiceNumber, setInvoiceNumber] = useState(invoice?.invoiceNumber ?? "");

  // â”€â”€ Line items â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [rows, setRows] = useState<LineItemRow[]>(() => {
    if (invoice?.lineItems?.length) {
      return invoice.lineItems.map((li) => ({
        id: crypto.randomUUID(),
        description: li.description,
        qty: String(li.qty),
        unitPrice: String(li.unitPrice),
      }));
    }
    return [emptyRow()];
  });

  // â”€â”€ Pricing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [currency, setCurrency] = useState(invoice?.currency ?? "USD");
  const [taxRate, setTaxRate] = useState(
    invoice?.taxRate ? String(Number(invoice.taxRate) * 100) : "",
  );
  const [discount, setDiscount] = useState(
    invoice?.discount ? String(Number(invoice.discount)) : "",
  );

  // â”€â”€ Meta â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [dueDate, setDueDate] = useState(
    invoice?.dueDate ? invoice.dueDate.split("T")[0] : "",
  );
  const [notes, setNotes] = useState(invoice?.notes ?? "");

  // â”€â”€ Errors â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [errors, setErrors] = useState<FormErrors>({});

  // â”€â”€ Computed totals â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const taxRatePct = parseFloat(taxRate) || 0;
  const discountAmt = parseFloat(discount) || 0;
  const { subtotal, taxAmount, total } = computeTotals(rows, taxRatePct, discountAmt);

  // â”€â”€ Row handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const addRow = () => setRows((prev) => [...prev, emptyRow()]);

  const removeRow = useCallback((id: string) => {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  }, []);

  const updateRow = useCallback(
    (id: string, field: keyof Omit<LineItemRow, "id">, value: string) => {
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
      );
      setErrors((prev) => {
        const next = { ...prev };
        delete next[`row_${id}_${field}`];
        return next;
      });
    },
    [],
  );

  // â”€â”€ Validation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const validate = (): CreateInvoiceInput | null => {
    const lineItemsForValidation = rows.map(rowToItem);

    const result = InvoiceSchema.safeParse({
      customerEmail,
      customerName: customerName || undefined,
      currency,
      lineItems: lineItemsForValidation,
      taxRate: taxRatePct || undefined,
      discount: discountAmt || undefined,
      dueDate: dueDate || undefined,
      notes: notes || undefined,
      invoiceNumber: invoiceNumber || undefined,
    });

    if (!result.success) {
      const errs: FormErrors = {};
      result.error.issues.forEach((issue) => {
        const key = issue.path.join("_");
        errs[key] = issue.message;
      });
      // Also validate individual row fields
      rows.forEach((row) => {
        if (!row.description.trim()) errs[`row_${row.id}_description`] = "Required";
        if (!row.qty || parseFloat(row.qty) <= 0) errs[`row_${row.id}_qty`] = "Must be > 0";
        if (row.unitPrice === "" || parseFloat(row.unitPrice) < 0)
          errs[`row_${row.id}_unitPrice`] = "Required";
      });
      setErrors(errs);
      return null;
    }

    setErrors({});
    return {
      customerEmail,
      customerName: customerName || undefined,
      currency,
      lineItems: lineItemsForValidation,
      taxRate: taxRatePct ? taxRatePct / 100 : undefined,
      discount: discountAmt || undefined,
      dueDate: dueDate || undefined,
      notes: notes || undefined,
      invoiceNumber: invoiceNumber || undefined,
    };
  };

  const handleSaveDraft = () => {
    const data = validate();
    if (data) onSaveDraft(data);
  };

  const handleSend = () => {
    const data = validate();
    if (data && onSend) onSend(data);
  };

  const handleReset = () => {
    setCustomerEmail("");
    setCustomerName("");
    setInvoiceNumber("");
    setRows([emptyRow()]);
    setCurrency("USD");
    setTaxRate("");
    setDiscount("");
    setDueDate("");
    setNotes("");
    setErrors({});
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && !isEditing) handleReset();
    onOpenChange(next);
  };

  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <FileText className="h-4 w-4 text-muted-foreground" />
            {isEditing ? `Edit Invoice ${invoice.invoiceNumber ?? invoice.id.slice(0, 8)}` : "New Invoice"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update this draft invoice."
              : "Fill in the details below. You can save as draft and send later."}
          </DialogDescription>
        </DialogHeader>

        {/* â”€â”€ Scrollable body â”€â”€ */}
        <div className="flex-1 overflow-y-auto space-y-5 py-1 pr-1">

          {/* Client details */}
          <section className="space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Client
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Input
                  label="Email *"
                  type="email"
                  placeholder="client@example.com"
                  value={customerEmail}
                  onChange={(e) => {
                    setCustomerEmail(e.target.value);
                    setErrors((prev) => { const n = { ...prev }; delete n.customerEmail; return n; });
                  }}
                  error={errors.customerEmail}
                />
              </div>
              <Input
                label="Name"
                placeholder="Jane Smith"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
              <Input
                label="Invoice #"
                placeholder="INV-001"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
              />
            </div>
          </section>

          <Separator />

          {/* Line items */}
          <section className="space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Line Items
            </Label>

            {/* Header row */}
            <div className="grid grid-cols-[1fr_60px_90px_28px] gap-2 px-1">
              <span className="text-xs text-muted-foreground">Description</span>
              <span className="text-xs text-muted-foreground text-center">Qty</span>
              <span className="text-xs text-muted-foreground text-right">Unit Price</span>
              <span />
            </div>

            <div className="space-y-2">
              {rows.map((row) => {
                const lineTotal =
                  (parseFloat(row.qty) || 0) * (parseFloat(row.unitPrice) || 0);
                return (
                  <div key={row.id} className="space-y-1">
                    <div className="grid grid-cols-[1fr_60px_90px_28px] gap-2 items-start">
                      {/* Description */}
                      <div>
                        <input
                          type="text"
                          placeholder="e.g. Web design"
                          value={row.description}
                          onChange={(e) => updateRow(row.id, "description", e.target.value)}
                          className={`w-full h-9 rounded-md border bg-transparent px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring ${
                            errors[`row_${row.id}_description`]
                              ? "border-destructive"
                              : "border-input"
                          }`}
                        />
                      </div>

                      {/* Qty */}
                      <div>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          placeholder="1"
                          value={row.qty}
                          onChange={(e) => updateRow(row.id, "qty", e.target.value)}
                          className={`w-full h-9 rounded-md border bg-transparent px-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-ring ${
                            errors[`row_${row.id}_qty`]
                              ? "border-destructive"
                              : "border-input"
                          }`}
                        />
                      </div>

                      {/* Unit price */}
                      <div>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={row.unitPrice}
                          onChange={(e) => updateRow(row.id, "unitPrice", e.target.value)}
                          className={`w-full h-9 rounded-md border bg-transparent px-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-ring ${
                            errors[`row_${row.id}_unitPrice`]
                              ? "border-destructive"
                              : "border-input"
                          }`}
                        />
                      </div>

                      {/* Remove */}
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        disabled={rows.length === 1}
                        className="mt-1.5 flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-destructive disabled:pointer-events-none disabled:opacity-30 transition-colors"
                        aria-label="Remove line item"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Row amount */}
                    {lineTotal > 0 && (
                      <div className="text-right text-xs text-muted-foreground pr-8">
                        {fmtCurrency(lineTotal)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {errors.lineItems && (
              <p className="text-xs text-destructive">{errors.lineItems}</p>
            )}

            <button
              type="button"
              onClick={addRow}
              className="flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <Plus className="h-3.5 w-3.5" />
              Add line item
            </button>
          </section>

          <Separator />

          {/* Pricing & Currency */}
          <section className="space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Pricing
            </Label>

            <div className="grid grid-cols-2 gap-3">
              {/* Currency selector */}
              <div className="space-y-1.5">
                <Label className="text-sm" htmlFor="inv-currency">Currency</Label>
                <select
                  id="inv-currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {["USD","EUR","GBP","NGN","KES","GHS","ZAR","CAD","AUD","JPY","CNY","INR","BRL","MXN","AED","SGD","CHF"].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <Input
                label="Tax Rate (%)"
                type="number"
                min="0"
                max="100"
                step="0.1"
                placeholder="e.g. 7.5"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
              />

              <Input
                label={`Discount (${currency})`}
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
              />
            </div>

            {/* Running totals */}
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{fmtCurrency(subtotal)}</span>
              </div>
              {taxAmount > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax ({taxRatePct}%)</span>
                  <span>{fmtCurrency(taxAmount)}</span>
                </div>
              )}
              {discountAmt > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Discount</span>
                  <span className="text-status-success-text">âˆ’{fmtCurrency(discountAmt)}</span>
                </div>
              )}
              <Separator className="my-1" />
              <div className="flex justify-between font-semibold text-foreground">
                <span>Total</span>
                <span>{fmtCurrency(total)}</span>
              </div>
            </div>
          </section>

          <Separator />

          {/* Meta */}
          <section className="space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Details
            </Label>
            <DatePicker
              label="Due Date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
            />
            <div className="space-y-1.5">
              <Label className="text-sm" htmlFor="inv-notes">
                Notes / Memo
              </Label>
              <textarea
                id="inv-notes"
                placeholder="Payment terms, thank you note, instructionsâ€¦"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
          </section>
        </div>

        {/* â”€â”€ Footer â”€â”€ */}
        <DialogFooter className="mt-4 gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleSaveDraft}
            loading={isLoading}
            disabled={isLoading}
          >
            Save as Draft
          </Button>
          {onSend && (
            <Button
              type="button"
              onClick={handleSend}
              loading={isLoading}
              disabled={isLoading}
            >
              Save &amp; Send
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

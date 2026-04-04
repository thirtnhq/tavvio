"use client";

import { useRef, useCallback } from "react";
import { FileDown, Printer, ExternalLink, Loader2, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@useroutr/ui";
import { Button } from "@useroutr/ui";
import { useInvoicePdf } from "@/hooks/useInvoices";
import type { Invoice } from "@/hooks/useInvoices";

// ── Props ──────────────────────────────────────────────────────────────────────

interface InvoicePdfPreviewProps {
  invoice: Invoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDownload: (invoice: Invoice) => void;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function InvoicePdfPreview({
  invoice,
  open,
  onOpenChange,
  onDownload,
}: InvoicePdfPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Only fetch when the dialog is open and we have an invoice
  const { data, isLoading, isError } = useInvoicePdf(
    open && invoice ? invoice.id : undefined,
  );

  const pdfUrl = data?.url;

  const handlePrint = useCallback(() => {
    if (pdfUrl) {
      // Open in a new tab; the browser handles print natively for PDFs
      const win = window.open(pdfUrl, "_blank");
      win?.addEventListener("load", () => {
        win.print();
      });
    } else if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.print();
    }
  }, [pdfUrl]);

  const handleOpenInTab = () => {
    if (pdfUrl) window.open(pdfUrl, "_blank");
  };

  if (!invoice) return null;

  const invoiceLabel = invoice.invoiceNumber
    ? `Invoice ${invoice.invoiceNumber}`
    : `Invoice #${invoice.id.slice(0, 8).toUpperCase()}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Wide dialog for the preview — override max-w-lg from DialogContent */}
      <DialogContent className="!max-w-4xl w-[95vw] h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        {/* ── Header ── */}
        <DialogHeader className="flex-row items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <DialogTitle className="text-sm font-semibold">{invoiceLabel}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              PDF Preview
            </DialogDescription>
          </div>
          <div className="flex items-center gap-2 pr-8">
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenInTab}
              disabled={!pdfUrl}
            >
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              Open
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              disabled={!pdfUrl}
            >
              <Printer className="mr-1.5 h-3.5 w-3.5" />
              Print
            </Button>
            <Button
              size="sm"
              onClick={() => onDownload(invoice)}
              disabled={!pdfUrl}
            >
              <FileDown className="mr-1.5 h-3.5 w-3.5" />
              Download
            </Button>
          </div>
        </DialogHeader>

        {/* ── Preview body ── */}
        <div className="flex-1 overflow-hidden bg-muted/30">
          {isLoading && (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-sm">Generating PDF…</p>
            </div>
          )}

          {isError && (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
              <AlertCircle className="h-6 w-6 text-destructive" />
              <p className="text-sm">Could not load PDF. Try downloading instead.</p>
              <Button variant="outline" size="sm" onClick={() => onDownload(invoice)}>
                <FileDown className="mr-1.5 h-3.5 w-3.5" />
                Download PDF
              </Button>
            </div>
          )}

          {/* Desktop iframe — hidden on very small screens */}
          {pdfUrl && (
            <>
              {/* Mobile fallback — shown only below sm */}
              <div className="flex sm:hidden h-full flex-col items-center justify-center gap-4 p-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                  <FileDown className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">PDF ready</p>
                  <p className="text-xs text-muted-foreground">
                    PDF preview isn't available on small screens.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleOpenInTab}>
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                    Open in browser
                  </Button>
                  <Button size="sm" onClick={() => onDownload(invoice)}>
                    <FileDown className="mr-1.5 h-3.5 w-3.5" />
                    Download
                  </Button>
                </div>
              </div>

              {/* Desktop iframe */}
              <iframe
                ref={iframeRef}
                src={pdfUrl}
                className="hidden sm:block w-full h-full border-0"
                title={`PDF preview — ${invoiceLabel}`}
              />
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

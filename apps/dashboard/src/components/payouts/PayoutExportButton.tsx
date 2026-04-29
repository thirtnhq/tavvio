"use client";

import { useState } from "react";
import { DownloadSimple } from "@phosphor-icons/react";
import type { Payout, PayoutStatus } from "@/hooks/usePayouts";
import { formatCurrency } from "@/lib/utils";

interface PayoutExportButtonProps {
  payouts: Payout[];
  isLoading?: boolean;
  filters?: {
    status?: PayoutStatus;
    destinationType?: string;
    dateFrom?: string;
    dateTo?: string;
    batchId?: string;
    search?: string;
  };
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "";
  return new Date(dateString).toISOString();
}

function escapeCsvCell(cell: string): string {
  if (cell.includes(",") || cell.includes('"') || cell.includes("\n")) {
    return `"${cell.replace(/"/g, '""')}"`;
  }
  return cell;
}

export function PayoutExportButton({
  payouts,
  isLoading,
  filters,
}: PayoutExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const headers = [
        "Payout ID",
        "Recipient Name",
        "Destination Type",
        "Amount",
        "Currency",
        "Status",
        "Created At",
        "Completed At",
        "Batch ID",
        "Stellar TX Hash",
        "Failure Reason",
      ];

      const rows = payouts.map((payout) => [
        payout.id,
        payout.recipientName,
        payout.destinationType,
        payout.amount,
        payout.currency,
        payout.status,
        formatDate(payout.createdAt),
        formatDate(payout.completedAt),
        payout.batchId || "",
        payout.stellarTxHash || "",
        payout.failureReason || "",
      ]);

      // Create CSV content with proper escaping
      const csv = [headers, ...rows]
        .map((row) => row.map((cell) => escapeCsvCell(String(cell))).join(","))
        .join("\n");

      // Add UTF-8 BOM for Excel compatibility
      const blob = new Blob(["\ufeff" + csv], {
        type: "text/csv;charset=utf-8;",
      });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      // Build filename with filter info
      const dateStr = new Date().toISOString().split("T")[0];
      let filename = `payouts-${dateStr}`;
      if (filters?.status) filename += `-${filters.status.toLowerCase()}`;
      if (filters?.batchId) filename += `-batch-${filters.batchId.slice(0, 8)}`;
      filename += ".csv";

      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={isLoading || isExporting || payouts.length === 0}
      className="flex items-center gap-2 rounded-sm border border-border bg-transparent px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <DownloadSimple size={16} />
      Export CSV
    </button>
  );
}

"use client";

import { useState, useMemo } from "react";
import { useRefunds } from "@/hooks/useRefunds";
import { DataTable, Pagination, Badge, type Column } from "@useroutr/ui";
import { formatCurrency } from "@/lib/utils";
import { REFUND_REASONS, type Refund, type RefundStatus } from "@/lib/refund";

type RefundWithIndex = Refund & Record<string, unknown>;

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "PROCESSING", label: "Processing" },
  { value: "COMPLETED", label: "Completed" },
  { value: "FAILED", label: "Failed" },
];

const BADGE_VARIANT: Record<RefundStatus, "pending" | "processing" | "completed" | "failed"> = {
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
};

const BADGE_LABEL: Record<RefundStatus, string> = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  COMPLETED: "Completed",
  FAILED: "Failed",
};

export function RefundHistoryTable() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [sortColumn, setSortColumn] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const { data, isLoading } = useRefunds({
    page,
    limit,
    status: statusFilter || undefined,
    sortBy: sortColumn,
    sortOrder: sortDirection,
  });

  const refunds = data?.data ?? [];
  const totalRefunds = data?.total ?? 0;
  const totalPages = Math.ceil(totalRefunds / limit);

  const handleSort = (column: string, direction: "asc" | "desc") => {
    setSortColumn(column);
    setSortDirection(direction);
  };

  const columns: Column<RefundWithIndex>[] = useMemo(
    () => [
      {
        key: "paymentId",
        header: "Payment ID",
        sortable: false,
        render: (refund) => (
          <span className="font-mono text-xs">{refund.paymentId.slice(0, 8)}…</span>
        ),
      },
      {
        key: "amount",
        header: "Refund Amount",
        sortable: true,
        render: (refund) => (
          <span className="font-semibold">
            {formatCurrency(refund.amount, "USD")}
          </span>
        ),
      },
      {
        key: "reason",
        header: "Reason",
        sortable: false,
        render: (refund) =>
          REFUND_REASONS.find((r) => r.value === refund.reason)?.label ?? refund.reason,
      },
      {
        key: "status",
        header: "Status",
        sortable: true,
        render: (refund) => (
          <Badge variant={BADGE_VARIANT[refund.status]}>
            {BADGE_LABEL[refund.status]}
          </Badge>
        ),
      },
      {
        key: "createdAt",
        header: "Initiated",
        sortable: true,
        render: (refund) =>
          new Date(refund.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
      },
      {
        key: "completedAt",
        header: "Completed",
        sortable: true,
        render: (refund) =>
          refund.completedAt
            ? new Date(refund.completedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "—",
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center gap-2">
        {STATUS_FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => {
              setStatusFilter(opt.value);
              setPage(1);
            }}
            className={`rounded-sm px-3 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === opt.value
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <DataTable<RefundWithIndex>
        columns={columns}
        data={refunds as RefundWithIndex[]}
        isLoading={isLoading}
        loadingRows={limit}
        emptyMessage="No refunds found"
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onSort={handleSort}
      />

      {/* Pagination */}
      <Pagination
        page={page}
        totalPages={totalPages}
        totalItems={totalRefunds}
        pageSize={limit}
        onPageChange={setPage}
        onPageSizeChange={setLimit}
        pageSizeOptions={[10, 25, 50]}
      />
    </div>
  );
}

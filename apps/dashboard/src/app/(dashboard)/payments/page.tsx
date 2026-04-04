"use client";

import { useState, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { usePayments, type PaymentStatus, type Payment } from "@/hooks/usePayments";
import { DataTable, type Column } from "@useroutr/ui";

type PaymentWithIndex = Payment & Record<string, unknown>;
import { Pagination } from "@useroutr/ui";
import { StatusBadge } from "@/components/payments/StatusBadge";
import { SearchInput } from "@/components/payments/SearchInput";
import { FilterBar } from "@/components/payments/FilterBar";
import { PaymentDetailDrawer } from "@/components/payments/PaymentDetailDrawer";
import { ExportButton } from "@/components/payments/ExportButton";
import { formatCurrency } from "@/lib/utils";

export default function PaymentsPage() {
  const searchParams = useSearchParams();
  
  // State for filtering and pagination
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
  const [limit, setLimit] = useState(Number(searchParams.get("limit")) || 10);
  const [status, setStatus] = useState<PaymentStatus | string>(
    searchParams.get("status") || ""
  );
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [selectedChain, setSelectedChain] = useState(
    searchParams.get("chain") || ""
  );
  const [selectedCurrency, setSelectedCurrency] = useState(
    searchParams.get("currency") || ""
  );
  const [sortColumn, setSortColumn] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Detail drawer state
  const [selectedPayment, setSelectedPayment] = useState<Payment | undefined>();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Fetch payments with current filters
  const { data, isLoading } = usePayments({
    page,
    limit,
    status: status || undefined,
    search: search || undefined,
    sourceChain: selectedChain || undefined,
    currency: selectedCurrency || undefined,
    sortBy: sortColumn,
    sortOrder: sortDirection,
  });

  const payments = data?.data || [];
  const totalPayments = data?.total || 0;
  const totalPages = Math.ceil(totalPayments / limit);

  // Update URL when filters change
  const updateUrl = useCallback(
    (
      newPage: number = page,
      newStatus: string = status,
      newSearch: string = search,
      newChain: string = selectedChain,
      newCurrency: string = selectedCurrency
    ) => {
      const params = new URLSearchParams();
      if (newPage > 1) params.set("page", String(newPage));
      if (limit !== 10) params.set("limit", String(limit));
      if (newStatus) params.set("status", newStatus);
      if (newSearch) params.set("search", newSearch);
      if (newChain) params.set("chain", newChain);
      if (newCurrency) params.set("currency", newCurrency);

      const queryString = params.toString();
      const newUrl = queryString ? `?${queryString}` : "";
      window.history.replaceState(null, "", newUrl);
    },
    [page, limit, status, search, selectedChain, selectedCurrency]
  );

  // Handle filter changes
  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    setPage(1);
    updateUrl(1, newStatus, search, selectedChain, selectedCurrency);
  };

  const handleSearch = (query: string) => {
    setSearch(query);
    setPage(1);
    updateUrl(1, status, query, selectedChain, selectedCurrency);
  };

  const handleChainChange = (chain: string) => {
    setSelectedChain(chain);
    setPage(1);
    updateUrl(1, status, search, chain, selectedCurrency);
  };

  const handleCurrencyChange = (currency: string) => {
    setSelectedCurrency(currency);
    setPage(1);
    updateUrl(1, status, search, selectedChain, currency);
  };

  const handleSort = (column: string, direction: "asc" | "desc") => {
    setSortColumn(column);
    setSortDirection(direction);
  };

  const handleRowClick = (payment: Payment) => {
    setSelectedPayment(payment);
    setDrawerOpen(true);
  };

  // Define table columns
  const columns: Column<PaymentWithIndex>[] = useMemo(
    () => [
      {
        key: "id",
        header: "ID",
        sortable: true,
        render: (payment) => (
          <span className="font-mono text-xs">
            {payment.id.slice(0, 8)}...
          </span>
        ),
      },
      {
        key: "amount",
        header: "Amount",
        sortable: true,
        render: (payment) =>
          formatCurrency(Number(payment.amount), payment.currency),
      },
      {
        key: "status",
        header: "Status",
        sortable: true,
        render: (payment) => <StatusBadge status={payment.status} />,
      },
      {
        key: "sourceChain",
        header: "Source",
        sortable: false,
        render: (payment) =>
          `${payment.sourceAsset} on ${payment.sourceChain}`,
      },
      {
        key: "destChain",
        header: "Destination",
        sortable: false,
        render: (payment) =>
          `${payment.destAsset} on ${payment.destChain}`,
      },
      {
        key: "createdAt",
        header: "Date",
        sortable: true,
        render: (payment) =>
          new Date(payment.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-foreground">
            Payments
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {totalPayments} total transactions
          </p>
        </div>
        <ExportButton payments={payments} isLoading={isLoading} />
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4">
        <SearchInput value={search} onSearch={handleSearch} />
        <FilterBar
          onStatusChange={handleStatusChange}
          onChainChange={handleChainChange}
          onCurrencyChange={handleCurrencyChange}
          selectedStatus={status}
          selectedChain={selectedChain}
          selectedCurrency={selectedCurrency}
        />
      </div>

      {/* Table */}
      <DataTable<PaymentWithIndex>
        columns={columns}
        data={payments as PaymentWithIndex[]}
        isLoading={isLoading}
        loadingRows={limit}
        emptyMessage="No payments found"
        onRowClick={handleRowClick}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onSort={handleSort}
      />

      {/* Pagination */}
      <Pagination
        page={page}
        totalPages={totalPages}
        totalItems={totalPayments}
        pageSize={limit}
        onPageChange={setPage}
        onPageSizeChange={setLimit}
        pageSizeOptions={[10, 25, 50, 100]}
      />

      {/* Detail Drawer */}
      <PaymentDetailDrawer
        payment={selectedPayment}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}
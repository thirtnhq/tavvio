"use client";

import { Select, type SelectOption, DateRangePicker } from "@useroutr/ui";
import { type PayoutStatus, type DestType } from "@/hooks/usePayouts";
import { DateRange } from "react-day-picker";

interface PayoutFilterBarProps {
  onStatusChange?: (status: string) => void;
  onDestinationTypeChange?: (type: string) => void;
  onCurrencyChange?: (currency: string) => void;
  onDateRangeChange?: (range: DateRange | undefined) => void;
  onBatchIdChange?: (batchId: string) => void;
  selectedStatus?: string;
  selectedDestinationType?: string;
  selectedCurrency?: string;
  selectedDateRange?: DateRange;
  selectedBatchId?: string;
  currencies?: string[];
}

const STATUS_OPTIONS: SelectOption[] = [
  { value: "", label: "All Statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "PROCESSING", label: "Processing" },
  { value: "COMPLETED", label: "Completed" },
  { value: "FAILED", label: "Failed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const DESTINATION_TYPE_OPTIONS: SelectOption[] = [
  { value: "", label: "All Types" },
  { value: "BANK_ACCOUNT", label: "Bank Account" },
  { value: "MOBILE_MONEY", label: "Mobile Money" },
  { value: "CRYPTO_WALLET", label: "Crypto Wallet" },
  { value: "STELLAR", label: "Stellar" },
];

const DEFAULT_CURRENCY_OPTIONS: SelectOption[] = [
  { value: "", label: "All Currencies" },
  { value: "USD", label: "USD" },
  { value: "EUR", label: "EUR" },
  { value: "GBP", label: "GBP" },
];

export function PayoutFilterBar({
  onStatusChange,
  onDestinationTypeChange,
  onCurrencyChange,
  onDateRangeChange,
  onBatchIdChange,
  selectedStatus = "",
  selectedDestinationType = "",
  selectedCurrency = "",
  selectedDateRange,
  selectedBatchId = "",
  currencies,
}: PayoutFilterBarProps) {
  const currencyOptions: SelectOption[] = currencies?.length
    ? [{ value: "", label: "All Currencies" }, ...currencies.map((c) => ({ value: c, label: c }))]
    : DEFAULT_CURRENCY_OPTIONS;

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="w-40">
        <Select
          options={STATUS_OPTIONS}
          value={selectedStatus}
          onValueChange={onStatusChange}
          placeholder="Status"
        />
      </div>
      <div className="w-44">
        <Select
          options={DESTINATION_TYPE_OPTIONS}
          value={selectedDestinationType}
          onValueChange={onDestinationTypeChange}
          placeholder="Destination Type"
        />
      </div>
      <div className="w-32">
        <Select
          options={currencyOptions}
          value={selectedCurrency}
          onValueChange={onCurrencyChange}
          placeholder="Currency"
        />
      </div>
      <div className="w-64">
        <DateRangePicker
          value={selectedDateRange}
          onValueChange={onDateRangeChange}
          placeholder="Date range"
        />
      </div>
      {onBatchIdChange && (
        <div className="w-48">
          <input
            type="text"
            placeholder="Filter by Batch ID"
            value={selectedBatchId}
            onChange={(e) => onBatchIdChange(e.target.value)}
            className="h-10 w-full rounded-sm border border-input bg-transparent px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring"
          />
        </div>
      )}
    </div>
  );
}

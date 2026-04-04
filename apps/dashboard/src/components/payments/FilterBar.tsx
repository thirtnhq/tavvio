"use client";

import { useState } from "react";
import { Select, type SelectOption } from "@useroutr/ui";
import { CaretDown } from "@phosphor-icons/react";

interface FilterBarProps {
  onStatusChange?: (status: string) => void;
  onChainChange?: (chain: string) => void;
  onCurrencyChange?: (currency: string) => void;
  selectedStatus?: string;
  selectedChain?: string;
  selectedCurrency?: string;
}

const STATUS_OPTIONS: SelectOption[] = [
  { value: "", label: "All Statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "PROCESSING", label: "Processing" },
  { value: "COMPLETED", label: "Completed" },
  { value: "FAILED", label: "Failed" },
  { value: "REFUNDED", label: "Refunded" },
];

const CHAIN_OPTIONS: SelectOption[] = [
  { value: "", label: "All Chains" },
  { value: "ethereum", label: "Ethereum" },
  { value: "solana", label: "Solana" },
  { value: "stellar", label: "Stellar" },
  { value: "polygon", label: "Polygon" },
  { value: "arbitrum", label: "Arbitrum" },
];

const CURRENCY_OPTIONS: SelectOption[] = [
  { value: "", label: "All Currencies" },
  { value: "USD", label: "USD" },
  { value: "EUR", label: "EUR" },
  { value: "GBP", label: "GBP" },
  { value: "JPY", label: "JPY" },
];

export function FilterBar({
  onStatusChange,
  onChainChange,
  onCurrencyChange,
  selectedStatus = "",
  selectedChain = "",
  selectedCurrency = "",
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <div className="w-40">
        <Select
          options={STATUS_OPTIONS}
          value={selectedStatus}
          onValueChange={onStatusChange}
          placeholder="Status"
        />
      </div>
      <div className="w-40">
        <Select
          options={CHAIN_OPTIONS}
          value={selectedChain}
          onValueChange={onChainChange}
          placeholder="Source Chain"
        />
      </div>
      <div className="w-40">
        <Select
          options={CURRENCY_OPTIONS}
          value={selectedCurrency}
          onValueChange={onCurrencyChange}
          placeholder="Currency"
        />
      </div>
    </div>
  );
}
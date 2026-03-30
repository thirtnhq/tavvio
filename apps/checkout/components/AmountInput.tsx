"use client";

import { useState } from "react";

interface AmountInputProps {
  currency: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function AmountInput({ currency, value, onChange, error }: AmountInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    // Allow only numbers and decimal point
    if (/^\d*\.?\d{0,2}$/.test(inputValue) || inputValue === "") {
      onChange(inputValue);
    }
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-foreground">
        Amount
      </label>
      <div
        className={`flex items-center gap-2 rounded-lg border bg-background px-4 py-3 transition-colors ${
          isFocused ? "border-primary ring-2 ring-primary/20" : "border-input"
        } ${error ? "border-destructive" : ""}`}
      >
        <span className="text-lg font-medium text-muted-foreground">$</span>
        <input
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={value}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="flex-1 bg-transparent text-lg font-medium text-foreground outline-none placeholder:text-muted-foreground/50"
        />
        <span className="text-sm font-medium text-muted-foreground">
          {currency}
        </span>
      </div>
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}

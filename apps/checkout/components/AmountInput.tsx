import { useState } from "react";

interface AmountInputProps {
  currency: string;
  value?: number;
  onChange: (amount: number) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function AmountInput({
  currency,
  value,
  onChange,
  placeholder = "0.00",
  disabled = false,
}: AmountInputProps) {
  const [focused, setFocused] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Allow empty string or valid decimal numbers
    if (inputValue === "" || /^\d*\.?\d*$/.test(inputValue)) {
      const numericValue = parseFloat(inputValue) || 0;
      onChange(numericValue);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground">
        Enter amount
      </label>
      <div
        className={`relative rounded-lg border transition-colors ${
          focused
            ? "border-primary ring-1 ring-primary"
            : "border-border hover:border-border/80"
        } ${disabled ? "opacity-50" : ""}`}
      >
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-medium text-muted-foreground">
          $
        </span>
        <input
          type="text"
          inputMode="decimal"
          placeholder={placeholder}
          value={value || ""}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={disabled}
          className="w-full bg-transparent pl-8 pr-16 py-3 text-lg font-medium text-foreground placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
          {currency}
        </span>
      </div>
    </div>
  );
}
// Re-export cn from shared UI package
export { cn } from "@useroutr/ui";

// Stablecoins / crypto assets aren't in ISO 4217, so Intl.NumberFormat with
// `style: "currency"` throws. Format the number portion only and append the
// asset code as a suffix.
const NON_ISO_CURRENCIES = new Set([
  "USDC",
  "USDT",
  "DAI",
  "XLM",
  "BTC",
  "ETH",
]);

export function formatCurrency(amount: number, currency = "USD") {
  const upper = currency?.toUpperCase() ?? "USD";

  if (NON_ISO_CURRENCIES.has(upper)) {
    const formatted = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
    return `${formatted} ${upper}`;
  }

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: upper,
    }).format(amount);
  } catch {
    // Unknown ISO code — fall back to plain number + suffix.
    const formatted = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
    return `${formatted} ${upper}`;
  }
}

export function truncateAddress(address: string, chars = 6) {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

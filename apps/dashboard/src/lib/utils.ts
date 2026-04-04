// Re-export cn from shared UI package
export { cn } from "@useroutr/ui";

export function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

export function truncateAddress(address: string, chars = 6) {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

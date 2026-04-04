import { cn } from "@useroutr/ui";
import { formatCurrency } from "@/lib/utils";

interface OrderSummaryProps {
  compact?: boolean;
  amount?: number;
  currency?: string;
  description?: string;
  orderId?: string;
}

export function OrderSummary({
  compact,
  amount,
  currency = "USD",
  description,
  orderId,
}: OrderSummaryProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card shadow-sm",
        compact ? "p-4" : "p-6",
      )}
    >
      {!compact && (
        <h2 className="font-display text-base font-semibold text-foreground">
          Order summary
        </h2>
      )}

      <div className={cn("space-y-3", !compact && "mt-4")}>
        {description !== undefined ? (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Description</span>
            <span className="text-right font-medium text-foreground">
              {description || "—"}
            </span>
          </div>
        ) : (
          <div className="flex justify-between">
            <span className="skeleton h-4 w-32" />
            <span className="skeleton h-4 w-16" />
          </div>
        )}

        <div className="border-t border-border" />

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Amount</span>
          {amount !== undefined ? (
            <span className="font-mono text-lg font-semibold text-foreground">
              {formatCurrency(amount, currency)}
            </span>
          ) : (
            <span className="skeleton inline-block h-6 w-24" />
          )}
        </div>

        {orderId !== undefined && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Order ID</span>
            <span className="font-mono text-xs text-foreground">{orderId}</span>
          </div>
        )}
      </div>
    </div>
  );
}

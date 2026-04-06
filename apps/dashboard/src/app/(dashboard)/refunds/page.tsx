import { RefundHistoryTable } from "@/components/payments/RefundHistoryTable";

export default function RefundsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold text-foreground">
          Refunds
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          View and manage all refund transactions
        </p>
      </div>

      <RefundHistoryTable />
    </div>
  );
}

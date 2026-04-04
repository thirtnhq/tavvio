import { Button } from "@useroutr/ui";

export default function PayoutsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold text-foreground">
          Payouts
        </h2>
        <Button>New payout</Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {["Available balance", "Pending", "Total paid out"].map((label) => (
          <div
            key={label}
            className="rounded-lg border border-border bg-card p-5 shadow-sm"
          >
            <p className="text-sm text-muted-foreground">{label}</p>
            <div className="mt-2 h-8 w-28 skeleton" />
          </div>
        ))}
      </div>

      {/* Table placeholder */}
      <div className="rounded-lg border border-border bg-card shadow-sm">
        <div className="divide-y divide-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-6 py-4">
              <div className="h-5 skeleton" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

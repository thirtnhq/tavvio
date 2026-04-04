import { Button } from "@useroutr/ui";

export default function InvoicesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold text-foreground">
          Invoices
        </h2>
        <Button>Create invoice</Button>
      </div>

      {/* Table placeholder */}
      <div className="rounded-lg border border-border bg-card shadow-sm">
        <div className="border-b border-border px-6 py-3">
          <div className="grid grid-cols-5 gap-4">
            {["Invoice #", "Customer", "Amount", "Status", "Due date"].map((h) => (
              <span key={h} className="text-xs font-medium text-muted-foreground">
                {h}
              </span>
            ))}
          </div>
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="px-6 py-4">
              <div className="h-5 skeleton" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

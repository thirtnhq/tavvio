"use client";

import { LockKey } from "@phosphor-icons/react";

export function SecurityNote() {
  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-muted/40 px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-full bg-primary/10 p-2 text-primary">
          <LockKey size={16} weight="fill" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            Card info never touches our servers
          </p>
          <p className="text-sm leading-6 text-muted-foreground">
            Stripe Elements keeps card data PCI DSS Level 1 compliant while
            Tavvio handles payment confirmation and settlement.
          </p>
        </div>
      </div>
    </div>
  );
}

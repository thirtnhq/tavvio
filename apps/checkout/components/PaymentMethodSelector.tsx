"use client";

import Link from "next/link";
import { CreditCard, Bank, CurrencyBtc } from "@phosphor-icons/react";
import { cn } from "@tavvio/ui";
import type { PaymentMethod } from "@/hooks/usePayment";

const METHOD_CONFIG = {
  card: {
    label: "Card",
    description: "Visa, Mastercard, etc.",
    icon: CreditCard,
  },
  bank: {
    label: "Bank Transfer",
    description: "Direct bank payment",
    icon: Bank,
  },
  crypto: {
    label: "Crypto Wallet",
    description: "USDC, ETH, BTC",
    icon: CurrencyBtc,
  },
} as const;

interface PaymentMethodSelectorProps {
  paymentId: string;
  methods: PaymentMethod[];
}

export function PaymentMethodSelector({
  paymentId,
  methods,
}: PaymentMethodSelectorProps) {
  if (methods.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <p className="text-center text-sm text-muted-foreground">
          No payment methods available. Please contact the merchant.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h2 className="font-display text-base font-semibold text-foreground">
        Pay with
      </h2>

      <div className="mt-4 space-y-2">
        {methods.map((method) => {
          const config = METHOD_CONFIG[method];
          const Icon = config.icon;
          return (
            <Link
              key={method}
              href={`/${paymentId}/${method}`}
              className={cn(
                "flex w-full items-center gap-4 rounded-lg border border-border px-4 py-3.5 text-left transition-colors",
                "hover:border-primary/40 hover:bg-primary/5"
              )}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <Icon size={22} className="text-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {config.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {config.description}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

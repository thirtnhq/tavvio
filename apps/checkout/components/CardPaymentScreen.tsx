"use client";

import Link from "next/link";
import { Elements } from "@stripe/react-stripe-js";
import { ArrowLeft } from "@phosphor-icons/react";
import { TrustBadges } from "./TrustBadges";
import { CardForm } from "./CardForm";
import { CardErrors } from "./CardErrors";
import { usePayment } from "@/hooks/usePayment";
import { stripePromise, hasStripePublicKey } from "@/lib/stripe";
import { formatCurrency } from "@/lib/utils";

export function CardPaymentScreen({ paymentId }: { paymentId: string }) {
  const { data: payment, isLoading, error } = usePayment(paymentId);
  const amountLabel = payment
    ? formatCurrency(payment.amount, payment.currency)
    : "Loading...";

  return (
    <div className="flex min-h-screen justify-center bg-muted/30 px-4 py-8 sm:px-8">
      <div className="w-full max-w-[460px] space-y-6">
        <div className="text-center">
          <p className="font-display text-sm font-semibold text-muted-foreground">
            Useroutr Checkout
          </p>
          {payment?.merchantName ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Paying {payment.merchantName}
            </p>
          ) : null}
        </div>

        <div className="rounded-[var(--radius-xl)] border border-border bg-card p-6 shadow-[var(--shadow-md)]">
          <Link
            href={`/${paymentId}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft size={16} />
            Back
          </Link>

          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
              Card payment
            </p>
            <h1 className="font-display text-2xl font-semibold text-foreground">
              Pay {amountLabel}
              {payment?.currency ? ` ${payment.currency.toUpperCase()}` : ""}
            </h1>
            <p className="text-sm leading-6 text-muted-foreground">
              Enter your card details securely through Stripe Elements. Useroutr
              will confirm the payment and continue settlement automatically.
            </p>
          </div>
        </div>

        {isLoading || !payment ? (
          <div className="rounded-[var(--radius-xl)] border border-border bg-card p-6 shadow-[var(--shadow-md)]">
            <div className="skeleton h-5 w-28" />
            <div className="mt-4 space-y-3">
              <div className="skeleton h-12 w-full rounded-[var(--radius-md)]" />
              <div className="grid grid-cols-2 gap-3">
                <div className="skeleton h-12 rounded-[var(--radius-md)]" />
                <div className="skeleton h-12 rounded-[var(--radius-md)]" />
              </div>
              <div className="skeleton h-12 w-full rounded-[var(--radius-lg)]" />
            </div>
          </div>
        ) : error ? (
          <CardErrors
            message={
              error instanceof Error
                ? error.message
                : "We could not load this payment right now."
            }
          />
        ) : !hasStripePublicKey || !stripePromise ? (
          <CardErrors message="Card payments are temporarily unavailable." />
        ) : (
          <Elements stripe={stripePromise}>
            <CardForm
              paymentId={paymentId}
              payment={{
                id: payment.id,
                amount: payment.amount,
                currency: payment.currency,
                merchantName: payment.merchantName,
              }}
            />
          </Elements>
        )}

        <TrustBadges />
      </div>
    </div>
  );
}

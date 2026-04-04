"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TrustBadges } from "./TrustBadges";
import { StatusIndicator } from "./StatusIndicator";
import { usePayment } from "@/hooks/usePayment";

export function ConfirmStatusCard({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const { data: payment, error } = usePayment(paymentId);

  useEffect(() => {
    if (payment?.status === "COMPLETED") {
      router.replace(`/${paymentId}/success`);
    }
  }, [payment?.status, paymentId, router]);

  if (payment?.status === "FAILED") {
    return (
      <div className="flex min-h-screen justify-center bg-muted/30 px-4 py-8 sm:px-8">
      <div className="w-full max-w-[460px] space-y-6">
          <div className="text-center">
            <p className="font-display text-sm font-semibold text-muted-foreground">
              Useroutr Checkout
            </p>
          </div>

          <div className="rounded-xl border border-[#DC2626]/20 bg-card p-8 text-center shadow-sm">
            <StatusIndicator status="error" />
            <h2 className="mt-4 font-display text-lg font-semibold text-foreground">
              Payment failed
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Your card was not charged successfully. Try again or choose a
              different payment method.
            </p>

            <div className="mt-6 space-y-3">
              <Link
                href={`/${paymentId}/card`}
                className="flex h-12 w-full items-center justify-center rounded-lg bg-[#007BFF] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0069D9]"
              >
                Retry card payment
              </Link>
              <Link
                href={`/${paymentId}`}
                className="flex h-12 w-full items-center justify-center rounded-lg border border-border px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Choose another method
              </Link>
            </div>
          </div>

          <TrustBadges />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen justify-center bg-muted/30 px-4 py-8 sm:px-8">
      <div className="w-full max-w-[460px] space-y-6">
        <div className="text-center">
          <p className="font-display text-sm font-semibold text-muted-foreground">
            Useroutr Checkout
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
          <StatusIndicator status="processing" />
          <h2 className="mt-4 font-display text-lg font-semibold text-foreground">
            Transaction submitted...
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            We are confirming your card payment now. You will be redirected as
            soon as the payment is completed.
          </p>
          {error ? (
            <p className="mt-4 text-sm text-[#DC2626]">
              {error instanceof Error
                ? error.message
                : "We could not refresh your payment status."}
            </p>
          ) : null}
        </div>

        <TrustBadges />
      </div>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePayment } from "@/hooks/usePayment";
import { MerchantBranding } from "@/components/MerchantBranding";
import { OrderSummary } from "@/components/OrderSummary";
import { PaymentMethodSelector } from "@/components/PaymentMethodSelector";
import { TrustBadges } from "@/components/TrustBadges";

function PageSkeleton() {
  return (
    <div className="flex min-h-screen justify-center bg-muted/30 px-4 py-8 sm:px-8">
      <div className="w-full max-w-[460px] space-y-6">
        {/* Merchant branding skeleton */}
        <div className="text-center">
          <div className="mx-auto h-10 w-10 skeleton rounded-lg" />
          <div className="mx-auto mt-2 h-4 w-32 skeleton" />
        </div>

        {/* Order summary skeleton */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="h-5 w-28 skeleton" />
          <div className="mt-4 space-y-3">
            <div className="flex justify-between">
              <span className="skeleton h-4 w-32" />
              <span className="skeleton h-4 w-16" />
            </div>
            <div className="border-t border-border" />
            <div className="flex justify-between">
              <span className="skeleton h-4 w-16" />
              <span className="skeleton h-6 w-24" />
            </div>
          </div>
        </div>

        {/* Method selector skeleton */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="h-5 w-24 skeleton" />
          <div className="mt-4 space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center gap-4 rounded-lg border border-border px-4 py-3.5"
              >
                <div className="h-10 w-10 skeleton rounded-lg" />
                <div className="space-y-1.5">
                  <div className="h-4 w-20 skeleton" />
                  <div className="h-3 w-32 skeleton" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <TrustBadges />
      </div>
    </div>
  );
}

interface PaymentPageClientProps {
  paymentId: string;
}

export function PaymentPageClient({ paymentId }: PaymentPageClientProps) {
  const router = useRouter();
  const { data: payment, isLoading, isError } = usePayment(paymentId);

  // Auto-select if only one method available
  useEffect(() => {
    if (payment?.paymentMethods?.length === 1) {
      router.replace(`/${paymentId}/${payment.paymentMethods[0]}`);
    }
  }, [payment, paymentId, router]);

  // Redirect based on status
  useEffect(() => {
    if (!payment) return;
    if (payment.status === "COMPLETED") {
      router.replace(`/${paymentId}/success`);
    } else if (payment.status === "EXPIRED" || payment.status === "FAILED") {
      router.replace(`/${paymentId}/expired`);
    }
  }, [payment, paymentId, router]);

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (isError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
        <div className="w-full max-w-[460px] rounded-xl border border-border bg-card p-8 text-center shadow-sm">
          <p className="font-display text-lg font-semibold text-foreground">
            This payment doesn&apos;t exist
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            The payment link may be invalid or has been removed.
          </p>
        </div>
      </div>
    );
  }

  if (!payment) return null;

  // While redirecting for non-pending statuses, show skeleton
  if (payment.status !== "PENDING") {
    return <PageSkeleton />;
  }

  const methods = payment.paymentMethods ?? [];

  // While auto-redirecting for single method, show skeleton
  if (methods.length === 1) {
    return <PageSkeleton />;
  }

  return (
    <div className="flex min-h-screen justify-center bg-muted/30 px-4 py-8 sm:px-8">
      <div className="w-full max-w-[460px] space-y-6">
        <MerchantBranding
          name={payment.merchant.name}
          logo={payment.merchant.logo}
        />

        <OrderSummary
          amount={payment.amount}
          currency={payment.currency}
          description={payment.metadata?.description}
          orderId={payment.metadata?.orderId}
        />

        {methods.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <p className="text-center text-sm text-muted-foreground">
              No payment methods available. Please contact the merchant.
            </p>
          </div>
        ) : (
          <PaymentMethodSelector paymentId={paymentId} methods={methods} />
        )}

        <TrustBadges />
      </div>
    </div>
  );
}

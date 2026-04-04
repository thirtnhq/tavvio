"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePayment } from "@/hooks/usePayment";
import { usePaymentSocket } from "@/hooks/usePaymentSocket";
import { MerchantBranding } from "@/components/MerchantBranding";
import { TrustBadges } from "@/components/TrustBadges";
import { ProcessingAnimation } from "@/components/ProcessingAnimation";
import { ProcessingSteps } from "@/components/ProcessingSteps";
import { ErrorCard } from "@/components/ErrorCard";
import type { PaymentStatus } from "@useroutr/types";

interface ConfirmPageClientProps {
  params: Promise<{ paymentId: string }>;
}

export function ConfirmPageClient({ params }: ConfirmPageClientProps) {
  const [paymentId, setPaymentId] = useState<string>("");
  const router = useRouter();
  const { data: payment, isLoading } = usePayment(paymentId);
  const { status, connected } = usePaymentSocket(paymentId);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showTimeout, setShowTimeout] = useState(false);

  // Unwrap params
  useEffect(() => {
    params.then((p) => setPaymentId(p.paymentId));
  }, [params]);

  // Track elapsed time
  useEffect(() => {
    if (status === "COMPLETED" || !paymentId) return;

    const interval = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [paymentId, status]);

  // Show timeout message after 5 minutes
  useEffect(() => {
    if (elapsedTime >= 300) {
      setShowTimeout(true);
    }
  }, [elapsedTime]);

  // Navigate to success on payment completion
  useEffect(() => {
    if (status === "COMPLETED") {
      router.push(`/${paymentId}/success`);
    }
  }, [status, paymentId, router]);

  const isError =
    status === "FAILED" || status === "EXPIRED" || status === "HTLC_TIMEOUT";

  if (isLoading) {
    return (
      <div className="flex min-h-screen justify-center bg-muted/30 px-4 py-8 sm:px-8">
        <div className="w-full max-w-[460px] space-y-6">
          <MerchantBranding />
          <div className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
            <ProcessingAnimation message="Loading payment details..." />
          </div>
          <TrustBadges />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen justify-center bg-muted/30 px-4 py-8 sm:px-8">
      <div className="w-full max-w-[460px] space-y-6">
        <MerchantBranding
          merchantName={payment?.merchant?.name || "Merchant"}
          merchantLogo={payment?.merchant?.logo}
        />

        <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
          {isError ? (
            <>
              <ErrorCard
                errorType={
                  status as string
                }
                onRetry={() => router.back()}
                onSupportClick={() => {
                  window.open("https://support.example.com", "_blank");
                }}
              />
            </>
          ) : (
            <>
              <div className="text-center">
                <ProcessingAnimation message={connected ? "Processing..." : "Connecting..."} />
                <h2 className="mt-6 font-display text-lg font-semibold text-foreground">
                  Processing your payment
                </h2>
                {payment && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: payment.currency || "USD",
                    }).format(payment.amount)}
                  </p>
                )}
              </div>

              <div className="mt-8 pt-8">
                <ProcessingSteps
                  status={(status as PaymentStatus) || "PENDING"}
                  error={isError}
                />
              </div>

              {showTimeout && (
                <div className="mt-6 rounded-lg bg-amber/5 p-4">
                  <p className="text-sm text-muted-foreground">
                    This is taking longer than expected. Your payment is still
                    being processed. Please don&apos;t close this window.
                  </p>
                </div>
              )}

              <div className="mt-8 text-center text-xs text-muted-foreground">
                {!connected && (
                  <p className="text-amber">
                    Connection lost. Attempting to reconnect...
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        <TrustBadges />
      </div>
    </div>
  );
}
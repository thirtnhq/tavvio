"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { BankDetails } from "@/components/BankDetails";
import { TransferNote } from "@/components/TransferNote";

interface BankSession {
  bankName: string;
  accountNumber: string;
  routingNumber?: string | null;
  iban?: string | null;
  bic?: string | null;
  branchCode?: string | null;
  reference: string;
  amount: string;
  currency: string;
  instructions: string;
  type: "ACH" | "SEPA" | "LOCAL";
  expiresAt: string;
}

interface BankSessionResult {
  expired: boolean;
  session: BankSession;
}

const MOCK_BANK_SESSION: BankSession = {
  bankName: "First National",
  accountNumber: "****6789",
  routingNumber: "021000021",
  reference: "TVP-ABC123",
  amount: "50.00",
  currency: "USD",
  instructions:
    "Include the reference code exactly as shown. Payment will be confirmed within 1-3 business days.",
  type: "ACH",
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

export function BankInstructions() {
  const params = useParams<{ paymentId: string }>();
  const router = useRouter();
  const paymentId = params?.paymentId;

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<BankSession | null>(null);
  const [expired, setExpired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!paymentId) {
        setError("Missing payment ID");
        setLoading(false);
        return;
      }

      try {
        const result = await api.post<BankSessionResult>(
          `/v1/payments/${paymentId}/bank-session`,
        );
        if (cancelled) return;
        setSession(result.session);
        setExpired(Boolean(result.expired));
        setError(null);
      } catch {
        if (cancelled) return;
        setSession(MOCK_BANK_SESSION);
        setExpired(false);
        setUsingFallback(true);
        setError("Live bank session unavailable. Showing demo instructions.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [paymentId]);

  const regenerate = async () => {
    if (!paymentId) return;
    setLoading(true);
    setError(null);

    try {
      const result = await api.post<BankSessionResult>(
        `/v1/payments/${paymentId}/bank-session/regenerate`,
      );
      setSession(result.session);
      setExpired(Boolean(result.expired));
      setUsingFallback(false);
      setError(null);
    } catch {
      setSession(MOCK_BANK_SESSION);
      setExpired(false);
      setUsingFallback(true);
      setError(
        "Could not regenerate live instructions. Using demo instructions.",
      );
    } finally {
      setLoading(false);
    }
  };

  const markSent = async () => {
    if (!paymentId || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      await api.post(`/v1/payments/${paymentId}/bank-sent`);
      router.push(`/${paymentId}/confirm`);
    } catch {
      setError("Unable to mark transfer as sent. Please try again.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="font-display text-base font-semibold text-foreground">
          Bank transfer instructions
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Loading instructions...
        </p>
      </div>
    );
  }

  if (error) {
    if (!session) {
      return (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="font-display text-base font-semibold text-foreground">
            Bank transfer instructions
          </h2>
          <p className="mt-2 text-sm text-destructive">{error}</p>
          <button
            type="button"
            onClick={regenerate}
            className="mt-4 inline-flex h-11 items-center rounded-md border border-border px-4 text-sm"
          >
            Retry
          </button>
        </div>
      );
    }
  }

  if (!session) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h2 className="font-display text-base font-semibold text-foreground">
        Bank transfer instructions
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Transfer the exact amount to the account below.
      </p>

      <div className="mt-4">
        <BankDetails session={session} />
      </div>

      <div className="mt-4">
        <TransferNote instructions={session.instructions} />
      </div>

      {usingFallback && error && (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {error}
        </div>
      )}

      {expired && (
        <div className="mt-4 rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
          This instruction set has expired. Regenerate before making a transfer.
        </div>
      )}

      <button
        type="button"
        onClick={markSent}
        disabled={submitting || expired}
        className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Submitting..." : "I've Sent the Transfer"}
      </button>

      {expired && (
        <button
          type="button"
          onClick={regenerate}
          className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-md border border-border px-4 text-sm"
        >
          Regenerate instructions
        </button>
      )}
    </div>
  );
}

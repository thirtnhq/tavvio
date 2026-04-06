// ── Refund helpers ─────────────────────────────────────────────────────────────

export const REFUND_WINDOW_DAYS = 180;

export const REFUND_REASONS = [
  { value: "customer_request", label: "Customer Request" },
  { value: "duplicate", label: "Duplicate Payment" },
  { value: "fraudulent", label: "Fraudulent" },
  { value: "other", label: "Other" },
] as const;

export type RefundReason = (typeof REFUND_REASONS)[number]["value"];

export type RefundStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface Refund {
  id: string;
  paymentId: string;
  amount: number;
  reason: RefundReason;
  notes?: string;
  status: RefundStatus;
  createdAt: string;
  completedAt?: string | null;
}

export interface RefundPayload {
  paymentId: string;
  amount: number;
  reason: string;
  notes?: string;
}

export interface RefundsResponse {
  data: Refund[];
  total: number;
  page: number;
  limit: number;
}

export interface RefundsParams extends Record<string, unknown> {
  page?: number;
  limit?: number;
  status?: RefundStatus | string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/**
 * Check whether a completed payment is still within the refund window.
 */
export function isWithinRefundWindow(completedAt: string | null | undefined): boolean {
  if (!completedAt) return false;
  const completed = new Date(completedAt);
  const now = new Date();
  const diffMs = now.getTime() - completed.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays <= REFUND_WINDOW_DAYS;
}

/**
 * Returns days remaining in the refund window, or 0 if expired.
 */
export function refundWindowDaysRemaining(completedAt: string | null | undefined): number {
  if (!completedAt) return 0;
  const completed = new Date(completedAt);
  const now = new Date();
  const diffDays = (now.getTime() - completed.getTime()) / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.ceil(REFUND_WINDOW_DAYS - diffDays));
}

/**
 * Return an estimated delivery time string based on the payment method / chain.
 */
export function getRefundEta(paymentMethod: string): string {
  const method = paymentMethod.toLowerCase();

  if (method.includes("card") || method.includes("visa") || method.includes("mastercard")) {
    return "5–10 business days";
  }

  if (method.includes("bank") || method.includes("ach") || method.includes("wire")) {
    return "1–3 business days";
  }

  // Default to crypto for chain names (ethereum, stellar, starknet, etc.)
  return "A few minutes";
}

/**
 * Determine the payment method category from chain/asset info for ETA display.
 */
export function getPaymentMethodLabel(sourceChain: string): string {
  const chain = sourceChain.toLowerCase();
  if (chain.includes("card")) return "Card";
  if (chain.includes("bank") || chain.includes("ach")) return "Bank";
  return "Crypto";
}

/**
 * Whether a payment can be refunded (eligible status + within window + not fully refunded).
 */
export function canRefund(
  status: string,
  completedAt: string | null | undefined,
  refundedAt: string | null | undefined,
): boolean {
  if (status !== "COMPLETED") return false;
  if (refundedAt) return false; // already fully refunded
  return isWithinRefundWindow(completedAt);
}

/**
 * Get the refund-related display status for a payment.
 * Returns null if no refund state applies.
 */
export function getRefundDisplayStatus(
  status: string,
): { label: string; variant: "pending" | "completed" | "processing" } | null {
  switch (status) {
    case "REFUNDING":
      return { label: "Refund Pending", variant: "pending" };
    case "REFUNDED":
      return { label: "Refunded", variant: "completed" };
    default:
      return null;
  }
}

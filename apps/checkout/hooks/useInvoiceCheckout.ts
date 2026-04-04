import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────────

export type InvoiceCheckoutStatus =
  | "DRAFT"
  | "SENT"
  | "VIEWED"
  | "PARTIALLY_PAID"
  | "PAID"
  | "OVERDUE"
  | "CANCELLED";

export interface InvoiceCheckoutLineItem {
  description: string;
  qty: number;
  unitPrice: number;
  amount: number;
}

export interface InvoiceCheckoutData {
  id: string;
  invoiceNumber: string | null;
  status: InvoiceCheckoutStatus;
  currency: string;
  total: string;
  amountPaid: string;
  subtotal: string;
  taxAmount: string | null;
  discount: string | null;
  dueDate: string | null;
  paidAt: string | null;
  notes: string | null;
  customerName: string | null;
  lineItems: InvoiceCheckoutLineItem[];
  merchant: {
    name: string;
    logo: string | null;
    brandColor: string | null;
    email: string | null;
  };
}

// ── Hooks ──────────────────────────────────────────────────────────────────────

export function useInvoiceCheckout(invoiceId: string) {
  return useQuery<InvoiceCheckoutData>({
    queryKey: ["invoice-checkout", invoiceId],
    queryFn: () => api.get(`/v1/invoices/${invoiceId}/checkout`),
    enabled: !!invoiceId,
    retry: false,
    staleTime: 30_000,
  });
}

export function useInitiateInvoicePayment() {
  return useMutation<{ paymentId: string }, Error, string>({
    mutationFn: (invoiceId) =>
      api.post(`/v1/invoices/${invoiceId}/pay`),
  });
}

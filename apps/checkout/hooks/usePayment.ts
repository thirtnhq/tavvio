import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type PaymentMethod = "card" | "bank" | "crypto";

export interface PaymentData {
  id: string;
  amount: number;
  currency: string;
  status: string;
  merchant: {
    name: string;
    logo?: string;
  };
  metadata?: {
    description?: string;
    orderId?: string;
    [key: string]: unknown;
  };
  paymentMethods: PaymentMethod[];
}

export function usePayment(paymentId: string) {
  return useQuery<PaymentData>({
    queryKey: ["payment", paymentId],
    queryFn: () => api.get(`/v1/payments/${paymentId}`),
    enabled: !!paymentId,
    retry: 1,
  });
}

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface PaymentLink {
  merchantName: string;
  merchantLogo?: string;
  description?: string;
  amount?: number | null;
  currency: string;
  expiresAt?: string;
  active: boolean;
  redeemed?: boolean;
}

export function usePaymentLink(linkId: string) {
  return useQuery<PaymentLink>({
    queryKey: ["payment-link", linkId],
    queryFn: () => api.get(`/pay/${linkId}`),
    enabled: !!linkId,
    retry: false,
  });
}

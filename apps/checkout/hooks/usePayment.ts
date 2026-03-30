import { useQuery } from "@tanstack/react-query";
import { useRef } from "react";
import { api } from "@/lib/api";

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  merchantName: string;
  merchantLogo?: string;
  description?: string;
  lineItems?: { label: string; amount: number }[];
  expiresAt?: string;
}

export function usePayment(paymentId: string) {
  const startedAtRef = useRef<number>(Date.now());

  return useQuery<Payment>({
    queryKey: ["payment", paymentId],
    queryFn: () => api.get(`/checkout/${paymentId}`),
    enabled: !!paymentId,
    refetchInterval: (query) => {
      const status = query.state.data?.status?.toUpperCase();
      if (status !== "AWAITING_CONFIRMATION") {
        return false;
      }

      const elapsed = Date.now() - startedAtRef.current;
      return elapsed > 60_000 ? 12_000 : 5_000;
    },
  });
}

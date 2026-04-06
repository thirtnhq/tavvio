"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Refund, RefundPayload, RefundsResponse, RefundsParams } from "@/lib/refund";

export function useRefunds(params: RefundsParams = {}) {
  return useQuery<RefundsResponse>({
    queryKey: ["refunds", params],
    queryFn: () => api.get("/refunds", { params }),
  });
}

export function usePaymentRefunds(paymentId: string) {
  return useQuery<Refund[]>({
    queryKey: ["payment-refunds", paymentId],
    queryFn: () => api.get(`/payments/${paymentId}/refunds`),
    enabled: !!paymentId,
  });
}

export function useCreateRefund() {
  const queryClient = useQueryClient();

  return useMutation<Refund, Error, RefundPayload>({
    mutationFn: (payload) => api.post<Refund>("/refunds", payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["payment", data.paymentId] });
      queryClient.invalidateQueries({ queryKey: ["payment-refunds", data.paymentId] });
      queryClient.invalidateQueries({ queryKey: ["refunds"] });
    },
  });
}

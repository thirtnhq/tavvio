import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  PaymentLink,
  PaymentLinkStats,
  CreatePaymentLinkInput,
  PaymentLinksResponse,
} from "@tavvio/types";

interface PaymentLinksParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

export function usePaymentLinks(params: PaymentLinksParams = {}) {
  return useQuery<PaymentLinksResponse>({
    queryKey: ["payment-links", params],
    queryFn: () => api.get("/payment-links", { params: params as Record<string, unknown> }),
  });
}

export function useCreatePaymentLink() {
  const queryClient = useQueryClient();

  return useMutation<PaymentLink, Error, CreatePaymentLinkInput>({
    mutationFn: (body) => api.post<PaymentLink>("/payment-links", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-links"] });
    },
  });
}

export function useDeactivatePaymentLink() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (id) => api.delete(`/payment-links/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-links"] });
    },
  });
}

export function usePaymentLinkStats(id: string) {
  return useQuery<PaymentLinkStats>({
    queryKey: ["payment-link-stats", id],
    queryFn: () => api.get(`/payment-links/${id}/stats`),
    enabled: !!id,
  });
}

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  Payout,
  PayoutListResponse,
  PayoutFilters,
  PayoutStatus,
  DestType,
} from "@useroutr/types";

export type { Payout, PayoutStatus, DestType };

export interface PayoutsParams extends Record<string, unknown> {
  status?: PayoutStatus;
  destinationType?: DestType;
  currency?: string;
  dateFrom?: string;
  dateTo?: string;
  batchId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export function usePayouts(params: PayoutsParams = {}) {
  return useQuery<PayoutListResponse>({
    queryKey: ["payouts", params],
    queryFn: () => api.get("/v1/payouts", { params }),
  });
}

export function usePayout(id: string) {
  return useQuery<Payout>({
    queryKey: ["payout", id],
    queryFn: () => api.get(`/v1/payouts/${id}`),
    enabled: !!id,
  });
}

export function useRetryPayout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return api.post<Payout>(`/v1/payouts/${id}/retry`);
    },
    onSuccess: (_, id) => {
      // Invalidate the specific payout and the list
      queryClient.invalidateQueries({ queryKey: ["payout", id] });
      queryClient.invalidateQueries({ queryKey: ["payouts"] });
    },
  });
}

export function useCancelPayout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return api.post<Payout>(`/v1/payouts/${id}/cancel`);
    },
    onSuccess: (_, id) => {
      // Invalidate the specific payout and the list
      queryClient.invalidateQueries({ queryKey: ["payout", id] });
      queryClient.invalidateQueries({ queryKey: ["payouts"] });
    },
  });
}

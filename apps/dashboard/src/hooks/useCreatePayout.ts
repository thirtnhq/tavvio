"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Payout, DestType } from "@useroutr/types";

export interface CreatePayoutInput {
  recipientName: string;
  destinationType: DestType;
  destination: {
    type: string;
    accountNumber?: string;
    routingNumber?: string;
    bankName?: string;
    iban?: string;
    bic?: string;
    branchCode?: string;
    country?: string;
    phoneNumber?: string;
    provider?: string;
    address?: string;
    network?: string;
    asset?: string;
    memo?: string;
  };
  amount: string;
  currency: string;
  idempotencyKey?: string;
}

export function useCreatePayout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePayoutInput) => {
      // Generate idempotency key if not provided
      const idempotencyKey = input.idempotencyKey || crypto.randomUUID();
      
      return api.post<Payout>("/v1/payouts", input, {
        headers: {
          "idempotency-key": idempotencyKey,
        },
      });
    },
    onSuccess: () => {
      // Invalidate the payouts list to refresh
      queryClient.invalidateQueries({ queryKey: ["payouts"] });
    },
  });
}

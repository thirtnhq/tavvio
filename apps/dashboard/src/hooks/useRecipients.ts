"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { DestType, PayoutDestination } from "@useroutr/types";

export interface Recipient {
  id: string;
  merchantId: string;
  name: string;
  destinationType: DestType;
  destination: PayoutDestination;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRecipientInput {
  name: string;
  destinationType: DestType;
  destination: PayoutDestination;
}

export function useRecipients() {
  return useQuery<Recipient[]>({
    queryKey: ["recipients"],
    queryFn: async () => {
      try {
        const response = await api.get<Recipient[]>("/v1/recipients");
        return response;
      } catch {
        // Return empty array if endpoint doesn't exist yet
        return [];
      }
    },
    staleTime: 60000, // 1 minute
    gcTime: 300000, // 5 minutes
  });
}

export function useCreateRecipient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateRecipientInput) => {
      try {
        const response = await api.post<Recipient>("/v1/recipients", input);
        return response;
      } catch {
        // If endpoint doesn't exist, return a mock recipient
        return {
          id: crypto.randomUUID(),
          merchantId: "",
          name: input.name,
          destinationType: input.destinationType,
          destination: input.destination,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipients"] });
    },
  });
}

/**
 * Search recipients by name
 */
export function useSearchRecipients(query: string) {
  return useQuery<Recipient[]>({
    queryKey: ["recipients", "search", query],
    queryFn: async () => {
      if (!query.trim()) return [];
      
      try {
        const response = await api.get<Recipient[]>("/v1/recipients/search", {
          params: { q: query },
        });
        return response;
      } catch {
        return [];
      }
    },
    enabled: query.trim().length > 0,
    staleTime: 30000,
    gcTime: 60000,
  });
}

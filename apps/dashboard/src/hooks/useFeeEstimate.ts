"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { DestType } from "@useroutr/types";

export interface FeeEstimateParams {
  destinationType: DestType;
  amount: string;
  currency: string;
  targetCurrency?: string;
  enabled?: boolean;
}

export interface FeeEstimateResponse {
  fee: string;
  feeCurrency: string;
  total: string;
  exchangeRate?: string;
  estimatedTime?: string;
}

// Default fee rates by destination type (fallback when API fails)
const DEFAULT_FEE_RATES: Record<DestType, number> = {
  BANK_ACCOUNT: 0.005, // 0.5%
  MOBILE_MONEY: 0.01,  // 1%
  CRYPTO_WALLET: 0.002, // 0.2%
  STELLAR: 0.001,      // 0.1%
};

const MINIMUM_FEES: Record<DestType, number> = {
  BANK_ACCOUNT: 1,
  MOBILE_MONEY: 0.5,
  CRYPTO_WALLET: 0.1,
  STELLAR: 0.01,
};

/**
 * Calculate estimated fee based on amount and destination type
 * Uses a fallback calculation when API is unavailable
 */
function calculateEstimatedFee(
  amount: string,
  destinationType: DestType
): FeeEstimateResponse {
  const amountNum = parseFloat(amount) || 0;
  const rate = DEFAULT_FEE_RATES[destinationType];
  const minFee = MINIMUM_FEES[destinationType];
  
  const calculatedFee = Math.max(amountNum * rate, minFee);
  const total = amountNum + calculatedFee;

  return {
    fee: calculatedFee.toFixed(2),
    feeCurrency: "USD",
    total: total.toFixed(2),
  };
}

export function useFeeEstimate(params: FeeEstimateParams) {
  const { destinationType, amount, currency, enabled = true } = params;

  return useQuery<FeeEstimateResponse>({
    queryKey: ["fee-estimate", destinationType, amount, currency],
    queryFn: async () => {
      try {
        // Try to fetch from API first
        const response = await api.get<FeeEstimateResponse>("/v1/fees/estimate", {
          params: {
            destinationType,
            amount,
            currency,
          },
        });
        return response;
      } catch {
        // Fallback to client-side calculation
        return calculateEstimatedFee(amount, destinationType);
      }
    },
    enabled: enabled && !!amount && parseFloat(amount) > 0,
    staleTime: 30000, // 30 seconds
    gcTime: 60000, // 1 minute
    retry: 1,
  });
}

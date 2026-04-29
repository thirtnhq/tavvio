"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface CurrencyConversionParams {
  from: string;
  to: string;
  amount: string;
  enabled?: boolean;
}

export interface CurrencyConversionResponse {
  from: string;
  to: string;
  amount: string;
  converted: string;
  rate: string;
  timestamp: string;
}

// Fallback exchange rates (relative to USD)
const FALLBACK_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  NGN: 1550,
  KES: 132,
  GHS: 15.5,
  ZAR: 18.8,
  CAD: 1.36,
  AUD: 1.52,
  JPY: 151,
  CNY: 7.24,
  INR: 83.5,
  BRL: 5.05,
  MXN: 16.7,
  AED: 3.67,
  SGD: 1.35,
  CHF: 0.9,
  BTC: 0.000015,
  ETH: 0.00029,
  USDC: 1,
  USDT: 1,
  XLM: 10,
};

function convertCurrency(
  amount: string,
  from: string,
  to: string
): CurrencyConversionResponse {
  const amountNum = parseFloat(amount) || 0;
  const fromRate = FALLBACK_RATES[from.toUpperCase()] || 1;
  const toRate = FALLBACK_RATES[to.toUpperCase()] || 1;
  
  // Convert to USD first, then to target
  const inUsd = amountNum / fromRate;
  const converted = inUsd * toRate;
  const rate = toRate / fromRate;

  return {
    from: from.toUpperCase(),
    to: to.toUpperCase(),
    amount: amountNum.toFixed(2),
    converted: converted.toFixed(2),
    rate: rate.toFixed(6),
    timestamp: new Date().toISOString(),
  };
}

export function useCurrencyConversion(params: CurrencyConversionParams) {
  const { from, to, amount, enabled = true } = params;

  return useQuery<CurrencyConversionResponse>({
    queryKey: ["currency-conversion", from, to, amount],
    queryFn: async () => {
      try {
        // Try to fetch from API first
        const response = await api.get<CurrencyConversionResponse>("/v1/currency/convert", {
          params: {
            from,
            to,
            amount,
          },
        });
        return response;
      } catch {
        // Fallback to client-side calculation
        return convertCurrency(amount, from, to);
      }
    },
    enabled: enabled && !!amount && parseFloat(amount) > 0 && from !== to,
    staleTime: 60000, // 1 minute
    gcTime: 300000, // 5 minutes
    retry: 1,
  });
}

/**
 * Get supported currencies list
 */
export function useSupportedCurrencies() {
  return useQuery<string[]>({
    queryKey: ["supported-currencies"],
    queryFn: async () => {
      try {
        const response = await api.get<string[]>("/v1/currency/supported");
        return response;
      } catch {
        // Return default list of supported currencies
        return [
          "USD", "EUR", "GBP", "NGN", "KES", "GHS", "ZAR",
          "CAD", "AUD", "JPY", "CNY", "INR", "BRL", "MXN",
          "AED", "SGD", "CHF", "BTC", "ETH", "USDC", "USDT", "XLM",
        ];
      }
    },
    staleTime: 300000, // 5 minutes
    gcTime: 600000, // 10 minutes
  });
}

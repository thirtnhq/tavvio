"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useDashboardSocket } from "./useDashboardSocket";
import { useToast } from "@useroutr/ui";

interface RefundEventPayload {
  refundId: string;
  paymentId: string;
  status: string;
  amount: number;
}

/**
 * Subscribe to refund.created and refund.completed WebSocket events.
 * Automatically invalidates relevant queries and shows toast notifications.
 */
export function useRefundEvents() {
  const { subscribe, connected } = useDashboardSocket();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (!connected) return;

    const unsubCreated = subscribe("refund:created", (raw: unknown) => {
      const payload = raw as RefundEventPayload;

      // Invalidate caches
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["payment", payload.paymentId] });
      queryClient.invalidateQueries({ queryKey: ["payment-refunds", payload.paymentId] });
      queryClient.invalidateQueries({ queryKey: ["refunds"] });

      toast("Refund initiated", "info");
    });

    const unsubCompleted = subscribe("refund:completed", (raw: unknown) => {
      const payload = raw as RefundEventPayload;

      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["payment", payload.paymentId] });
      queryClient.invalidateQueries({ queryKey: ["payment-refunds", payload.paymentId] });
      queryClient.invalidateQueries({ queryKey: ["refunds"] });

      toast("Refund completed successfully", "success");
    });

    return () => {
      unsubCreated();
      unsubCompleted();
    };
  }, [connected, subscribe, queryClient, toast]);
}

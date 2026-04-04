"use client";

import { Drawer } from "@useroutr/ui";
import { type Payment } from "@/hooks/usePayments";
import { StatusBadge } from "./StatusBadge";
import { formatCurrency, truncateAddress } from "@/lib/utils";
import { PaymentTimeline } from "./PaymentTimeline";

interface PaymentDetailDrawerProps {
  payment?: Payment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PaymentDetailDrawer({
  payment,
  open,
  onOpenChange,
}: PaymentDetailDrawerProps) {
  if (!payment) return null;

  const amount = Number(payment.amount);

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title={`Payment ${payment.id.slice(0, 8)}...`}
      description="Transaction details and timeline"
    >
      <div className="space-y-6">
        {/* Summary */}
        <div className="space-y-4 border-b border-border pb-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Amount</span>
            <span className="font-semibold text-foreground">
              {formatCurrency(amount, payment.currency)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <StatusBadge status={payment.status} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Created</span>
            <span className="text-sm text-foreground">
              {new Date(payment.createdAt).toLocaleDateString()} at{" "}
              {new Date(payment.createdAt).toLocaleTimeString()}
            </span>
          </div>
          {payment.completedAt && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Completed</span>
              <span className="text-sm text-foreground">
                {new Date(payment.completedAt).toLocaleDateString()} at{" "}
                {new Date(payment.completedAt).toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>

        {/* Route */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Route</h3>
          <div className="space-y-3">
            <div className="rounded-lg border border-border bg-(--secondary)/20 p-3">
              <p className="text-xs font-medium text-muted-foreground">
                Source
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {payment.sourceAsset} on {payment.sourceChain}
              </p>
              {payment.sourceAddress && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {truncateAddress(payment.sourceAddress)}
                </p>
              )}
              <p className="mt-1 text-sm text-foreground">
                {Number(payment.sourceAmount).toFixed(6)}
              </p>
            </div>

            <div className="flex justify-center">
              <div className="rounded-full bg-(--primary)/20 p-2">
                <div className="text-xs font-semibold text-primary">
                  ↓
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-(--accent)/20 p-3">
              <p className="text-xs font-medium text-muted-foreground">
                Destination
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {payment.destAsset} on {payment.destChain}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {truncateAddress(payment.destAddress)}
              </p>
              <p className="mt-1 text-sm text-foreground">
                {Number(payment.destAmount).toFixed(6)}
              </p>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div>
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            Timeline
          </h3>
          <PaymentTimeline payment={payment} />
        </div>
      </div>
    </Drawer>
  );
}
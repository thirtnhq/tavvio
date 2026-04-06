"use client";

import { useState } from "react";
import { Drawer, Button } from "@useroutr/ui";
import { ArrowCounterClockwise } from "@phosphor-icons/react";
import { type Payment } from "@/hooks/usePayments";
import { usePaymentRefunds } from "@/hooks/useRefunds";
import { StatusBadge } from "./StatusBadge";
import { RefundStatusBadge, type RefundBadgeStatus } from "./RefundStatusBadge";
import { RefundModal } from "./RefundModal";
import { RefundTimeline } from "./RefundTimeline";
import { formatCurrency, truncateAddress } from "@/lib/utils";
import { PaymentTimeline } from "./PaymentTimeline";
import { canRefund, getRefundEta, getPaymentMethodLabel } from "@/lib/refund";

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
  const [refundModalOpen, setRefundModalOpen] = useState(false);

  // Fetch refunds for this payment when drawer is open
  const { data: refunds } = usePaymentRefunds(payment?.id ?? "");

  if (!payment) return null;

  const amount = Number(payment.amount);
  const showRefundButton = canRefund(payment.status, payment.completedAt, payment.refundedAt);

  // Determine refund badge status
  const refundBadgeStatus: RefundBadgeStatus | null =
    payment.status === "REFUNDING"
      ? "REFUNDING"
      : payment.status === "REFUNDED"
        ? "REFUNDED"
        : refunds && refunds.length > 0 && payment.status === "COMPLETED"
          ? "PARTIAL_REFUND"
          : null;

  return (
    <>
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
              <div className="flex items-center gap-2">
                <StatusBadge status={payment.status} />
                {refundBadgeStatus && (
                  <RefundStatusBadge status={refundBadgeStatus} />
                )}
              </div>
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
            {payment.refundedAt && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Refunded</span>
                <span className="text-sm text-foreground">
                  {new Date(payment.refundedAt).toLocaleDateString()} at{" "}
                  {new Date(payment.refundedAt).toLocaleTimeString()}
                </span>
              </div>
            )}
          </div>

          {/* Refund action */}
          {showRefundButton && (
            <div className="border-b border-border pb-6">
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => setRefundModalOpen(true)}
              >
                <ArrowCounterClockwise size={16} weight="bold" />
                Issue Refund
              </Button>
            </div>
          )}

          {/* Refund detail section (if refunds exist) */}
          {refunds && refunds.length > 0 && (
            <div className="space-y-3 border-b border-border pb-6">
              <h3 className="text-sm font-semibold text-foreground">
                Refund Details
              </h3>
              {refunds.map((refund) => (
                <div
                  key={refund.id}
                  className="rounded-lg border border-border bg-(--secondary)/20 p-3 space-y-2"
                >
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-semibold text-foreground">
                      {formatCurrency(refund.amount, payment.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <span className="text-foreground capitalize">
                      {refund.status.toLowerCase()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Est. Delivery</span>
                    <span className="text-foreground">
                      {getRefundEta(payment.sourceChain)} ({getPaymentMethodLabel(payment.sourceChain)})
                    </span>
                  </div>
                  {refund.notes && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Notes</span>
                      <span className="max-w-45 text-right text-foreground">
                        {refund.notes}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

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

            {/* Refund timeline events */}
            {refunds && refunds.length > 0 && (
              <div className="mt-4 border-t border-border pt-4">
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Refund Activity
                </h4>
                <RefundTimeline
                  refunds={refunds}
                  currency={payment.currency}
                  sourceChain={payment.sourceChain}
                />
              </div>
            )}
          </div>
        </div>
      </Drawer>

      {/* Refund Modal */}
      {showRefundButton && (
        <RefundModal
          payment={payment}
          open={refundModalOpen}
          onOpenChange={setRefundModalOpen}
        />
      )}
    </>
  );
}
"use client";

import { type Payment, type PaymentStatus } from "@/hooks/usePayments";
import {
  Clock,
  CheckCircle,
  ArrowsClockwise,
  XCircle,
  Lock,
} from "@phosphor-icons/react";

interface TimelineEvent {
  status: PaymentStatus;
  label: string;
  icon: React.ReactNode;
  timestamp?: string;
  completed: boolean;
}

const TIMELINE_STEPS: TimelineEvent[] = [
  {
    status: "PENDING",
    label: "Payment Initiated",
    icon: <Clock size={16} weight="bold" />,
    completed: true,
  },
  {
    status: "QUOTE_LOCKED",
    label: "Quote Locked",
    icon: <Lock size={16} weight="bold" />,
    completed: false,
  },
  {
    status: "SOURCE_LOCKED",
    label: "Source Locked",
    icon: <Lock size={16} weight="bold" />,
    completed: false,
  },
  {
    status: "STELLAR_LOCKED",
    label: "Stellar Locked",
    icon: <Lock size={16} weight="bold" />,
    completed: false,
  },
  {
    status: "PROCESSING",
    label: "Processing",
    icon: <ArrowsClockwise size={16} weight="bold" />,
    completed: false,
  },
  {
    status: "COMPLETED",
    label: "Completed",
    icon: <CheckCircle size={16} weight="bold" />,
    completed: false,
  },
];

interface PaymentTimelineProps {
  payment: Payment;
}

export function PaymentTimeline({ payment }: PaymentTimelineProps) {
  // Determine which steps are completed
  const getStepIndex = (status: PaymentStatus): number => {
    const steps = [
      "PENDING",
      "QUOTE_LOCKED",
      "SOURCE_LOCKED",
      "STELLAR_LOCKED",
      "PROCESSING",
      "COMPLETED",
    ];
    return Math.max(0, steps.indexOf(status));
  };

  const currentStepIndex = getStepIndex(payment.status);

  return (
    <div className="space-y-4">
      {TIMELINE_STEPS.map((step, index) => {
        const isCompleted =
          index < currentStepIndex ||
          (index === currentStepIndex && payment.status === "COMPLETED");
        const isCurrent = index === currentStepIndex;
        const isAfter = index > currentStepIndex;

        // Special case for failed/expired/refunded statuses
        if (
          payment.status === "FAILED" ||
          payment.status === "EXPIRED"
        ) {
          return (
            <div key={step.status} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="rounded-full bg-(--destructive)/10 p-2 text-destructive">
                  <XCircle size={16} weight="bold" />
                </div>
              </div>
              <div className="pt-1">
                <p className="text-sm font-medium text-foreground">
                  {step.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  Payment failed or expired
                </p>
              </div>
            </div>
          );
        }

        // Show completed flow for REFUNDED/REFUNDING (these went through COMPLETED first)
        if (
          payment.status === "REFUNDED" ||
          payment.status === "REFUNDING"
        ) {
          return (
            <div key={step.status} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="rounded-full p-2 bg-(--primary)/20 text-primary">
                  <CheckCircle size={16} weight="bold" />
                </div>
                {index < TIMELINE_STEPS.length - 1 && (
                  <div className="my-1 h-8 w-0.5 bg-primary" />
                )}
              </div>
              <div className="pt-1">
                <p className="text-sm font-medium text-foreground">
                  {step.label}
                </p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          );
        }

        return (
          <div key={step.status} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={`rounded-full p-2 transition-all ${
                  isCompleted
                    ? "bg-(--primary)/20 text-primary"
                    : isCurrent
                      ? "bg-(--accent)/20 text-accent"
                      : "bg-(--muted)/20 text-muted-foreground"
                }`}
              >
                {isCompleted ? (
                  <CheckCircle size={16} weight="bold" />
                ) : isCurrent ? (
                  <ArrowsClockwise size={16} weight="bold" />
                ) : (
                  step.icon
                )}
              </div>
              {index < TIMELINE_STEPS.length - 1 && (
                <div
                  className={`my-1 h-8 w-0.5 ${
                    isCompleted || isCurrent
                      ? "bg-primary"
                      : "bg-(--muted)/30"
                  }`}
                />
              )}
            </div>
            <div className="pt-1">
              <p
                className={`text-sm font-medium ${
                  isCompleted || isCurrent
                    ? "text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {step.label}
              </p>
              <p className="text-xs text-muted-foreground">
                {isCompleted
                  ? "Completed"
                  : isCurrent
                    ? "In progress"
                    : "Pending"}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
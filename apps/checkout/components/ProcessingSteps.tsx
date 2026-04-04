"use client";

import { CheckCircle, Circle, Clock } from "@phosphor-icons/react/dist/ssr";
import type { PaymentStatus } from "@useroutr/types";

const STEP_MAPPING: Record<PaymentStatus, number> = {
  PENDING: 0,
  QUOTE_LOCKED: 0,
  SOURCE_LOCKED: 1,
  STELLAR_LOCKED: 2,
  PROCESSING: 2,
  COMPLETED: 3,
  REFUNDING: 3,
  REFUNDED: 3,
  EXPIRED: 0,
  FAILED: 0,
};

const STEPS = [
  { label: "Payment received", description: "Verifying your transaction" },
  { label: "Converting assets", description: "Processing conversion" },
  { label: "Settling to merchant", description: "Finalizing transfer" },
];

interface ProcessingStepsProps {
  status?: PaymentStatus;
  error?: boolean;
}

export function ProcessingSteps({ status = "PENDING", error }: ProcessingStepsProps) {
  const currentStep = STEP_MAPPING[status] || 0;

  return (
    <div className="space-y-4">
      {STEPS.map((step, index) => {
        const isComplete = index < currentStep;
        const isActive = index === currentStep && !error;

        return (
          <div key={index} className="flex gap-3">
            {/* Step indicator */}
            <div className="flex flex-col items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  isComplete
                    ? "bg-green/10"
                    : isActive
                      ? "bg-primary/10"
                      : "bg-muted"
                }`}
              >
                {isComplete ? (
                  <CheckCircle
                    size={20}
                    weight="fill"
                    className="text-green"
                  />
                ) : isActive ? (
                  <Clock size={20} weight="fill" className="text-primary" />
                ) : (
                  <Circle size={20} className="text-muted-foreground" />
                )}
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`my-1 h-6 w-0.5 ${
                    isComplete ? "bg-green" : "bg-muted"
                  }`}
                />
              )}
            </div>

            {/* Step content */}
            <div className="flex-1 pt-1">
              <p
                className={`text-sm font-medium ${
                  isComplete || isActive
                    ? "text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {step.label}
              </p>
              {isActive && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {step.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
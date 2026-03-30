"use client";

import { useState, type ReactNode } from "react";
import {
  CardCvcElement,
  CardExpiryElement,
  CardNumberElement,
  useElements,
  useStripe,
  type StripeCardCvcElementChangeEvent,
  type StripeCardExpiryElementChangeEvent,
  type StripeCardNumberElementChangeEvent,
} from "@stripe/react-stripe-js";
import { CreditCard, ArrowClockwise } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { api } from "@/lib/api";
import { CardErrors } from "./CardErrors";
import { PayButton } from "./PayButton";
import { SecurityNote } from "./SecurityNote";

type StripeField = "number" | "expiry" | "cvc";

type PaymentDetails = {
  id: string;
  amount: number;
  currency: string;
  merchantName: string;
};

type CardSessionResponse = {
  clientSecret: string;
};

const stripeElementOptions = {
  style: {
    base: {
      color: "#0A0C10",
      fontFamily: "var(--font-body)",
      fontSize: "16px",
      iconColor: "#0A0C10",
      "::placeholder": {
        color: "#6C757D",
      },
    },
    invalid: {
      color: "#DC2626",
      iconColor: "#DC2626",
    },
  },
};

function mapCardErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("declined")) {
    return "Your card was declined. Please try another card.";
  }

  if (normalized.includes("insufficient")) {
    return "Insufficient funds. Please try another payment method.";
  }

  if (
    normalized.includes("network") ||
    normalized.includes("connection") ||
    normalized.includes("fetch")
  ) {
    return "Connection error. Please try again.";
  }

  return message;
}

function StripeFieldShell({
  label,
  field,
  focusedField,
  invalidFields,
  children,
}: {
  label: string;
  field: StripeField;
  focusedField: StripeField | null;
  invalidFields: Partial<Record<StripeField, boolean>>;
  children: ReactNode;
}) {
  const isFocused = focusedField === field;
  const isInvalid = invalidFields[field];

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-foreground">
        {label}
      </label>
      <div
        className={[
          "rounded-[var(--radius-md)] border bg-white px-3 py-3 transition-colors",
          isInvalid ? "border-[#DC2626]" : "border-[#DEE2E6]",
          isFocused ? "border-[#007BFF] ring-2 ring-[#007BFF]/10" : "",
        ].join(" ")}
      >
        {children}
      </div>
    </div>
  );
}

export function CardForm({
  paymentId,
  payment,
}: {
  paymentId: string;
  payment: PaymentDetails;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const amountLabel = formatCurrency(payment.amount, payment.currency);

  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<StripeField | null>(null);
  const [invalidFields, setInvalidFields] = useState<
    Partial<Record<StripeField, boolean>>
  >({});

  const updateFieldState = (
    field: StripeField,
    event:
      | StripeCardNumberElementChangeEvent
      | StripeCardExpiryElementChangeEvent
      | StripeCardCvcElementChangeEvent
  ) => {
    setInvalidFields((current) => ({
      ...current,
      [field]: Boolean(event.error),
    }));

    if (event.error?.message) {
      setErrorMessage(mapCardErrorMessage(event.error.message));
      return;
    }

    setErrorMessage(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!stripe || !elements) {
      setErrorMessage("Card payments are still loading. Please try again.");
      return;
    }

    const cardNumber = elements.getElement(CardNumberElement);
    if (!cardNumber) {
      setErrorMessage("Card form is not ready yet. Please reload and try again.");
      return;
    }

    setProcessing(true);
    setErrorMessage(null);

    try {
      const session = await api.post<CardSessionResponse>(
        `/v1/payments/${paymentId}/card-session`
      );

      const result = await stripe.confirmCardPayment(session.clientSecret, {
        payment_method: {
          card: cardNumber,
          billing_details: {
            name: payment.merchantName,
          },
        },
      });

      if (result.error?.message) {
        setErrorMessage(mapCardErrorMessage(result.error.message));
        return;
      }

      router.push(`/${paymentId}/confirm`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? mapCardErrorMessage(error.message)
          : "Connection error. Please try again."
      );
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4 rounded-[var(--radius-xl)] border border-border bg-card p-6 shadow-[var(--shadow-md)]">
      <div className="rounded-[var(--radius-lg)] border border-primary/10 bg-primary/5 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-foreground">
              Transaction preview
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Review the card charge before confirming it in Stripe.
            </p>
          </div>
          <div className="rounded-full bg-white p-2 text-primary shadow-[var(--shadow-sm)]">
            <CreditCard size={18} weight="fill" />
          </div>
        </div>

        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Charge amount</dt>
            <dd className="font-medium text-foreground">{amountLabel}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Network fee</dt>
            <dd className="font-medium text-foreground">$0.00</dd>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-primary/10 pt-3">
            <dt className="font-medium text-foreground">Total cost</dt>
            <dd className="font-semibold text-foreground">{amountLabel}</dd>
          </div>
        </dl>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <StripeFieldShell
          label="Card Number"
          field="number"
          focusedField={focusedField}
          invalidFields={invalidFields}
        >
          <CardNumberElement
            options={stripeElementOptions}
            onChange={(event) => updateFieldState("number", event)}
            onFocus={() => setFocusedField("number")}
            onBlur={() => setFocusedField((current) => (current === "number" ? null : current))}
          />
        </StripeFieldShell>

        <div className="grid grid-cols-2 gap-3">
          <StripeFieldShell
            label="MM/YY"
            field="expiry"
            focusedField={focusedField}
            invalidFields={invalidFields}
          >
            <CardExpiryElement
              options={stripeElementOptions}
              onChange={(event) => updateFieldState("expiry", event)}
              onFocus={() => setFocusedField("expiry")}
              onBlur={() =>
                setFocusedField((current) => (current === "expiry" ? null : current))
              }
            />
          </StripeFieldShell>

          <StripeFieldShell
            label="CVV"
            field="cvc"
            focusedField={focusedField}
            invalidFields={invalidFields}
          >
            <CardCvcElement
              options={stripeElementOptions}
              onChange={(event) => updateFieldState("cvc", event)}
              onFocus={() => setFocusedField("cvc")}
              onBlur={() => setFocusedField((current) => (current === "cvc" ? null : current))}
            />
          </StripeFieldShell>
        </div>

        <CardErrors message={errorMessage} />

        <PayButton
          amountLabel={amountLabel}
          loading={processing}
          disabled={!stripe || !elements}
        />

        {errorMessage ? (
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-lg)] border border-border px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <ArrowClockwise size={16} />
            Retry
          </button>
        ) : null}
      </form>

      <SecurityNote />
    </div>
  );
}

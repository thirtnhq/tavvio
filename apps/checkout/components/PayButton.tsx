"use client";

import { Lock } from "@phosphor-icons/react";
import { Button } from "@useroutr/ui";

export function PayButton({
  amountLabel,
  loading,
  disabled,
}: {
  amountLabel: string;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <Button
      type="submit"
      size="lg"
      loading={loading}
      disabled={disabled}
      className="h-12 w-full rounded-[var(--radius-lg)] bg-[#007BFF] text-base font-semibold text-white hover:bg-[#0069D9]"
    >
      {!loading && <Lock size={16} weight="fill" />}
      {loading ? "Processing payment..." : `Pay ${amountLabel}`}
    </Button>
  );
}

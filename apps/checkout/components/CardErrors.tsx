"use client";

import { WarningCircle } from "@phosphor-icons/react";

export function CardErrors({ message }: { message?: string | null }) {
  if (!message) {
    return null;
  }

  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-[var(--radius-md)] border border-[#DC2626]/20 bg-[#DC2626]/5 px-3 py-2 text-sm text-[#DC2626]"
    >
      <WarningCircle size={18} className="mt-0.5 shrink-0" weight="fill" />
      <span>{message}</span>
    </div>
  );
}

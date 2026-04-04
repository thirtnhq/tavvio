"use client";

import { useState } from "react";
import { Button, type ButtonProps } from "@useroutr/ui";
import { Copy, Check } from "@phosphor-icons/react";

interface CopyButtonProps extends ButtonProps {
  value: string;
  feedbackText?: string;
}

export function CopyButton({
  value,
  feedbackText = "Copied!",
  variant = "outline",
  size = "sm",
  className,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleCopy}
      className={className}
    >
      {copied ? (
        <>
          <Check size={16} weight="fill" className="text-[var(--green)]" />
          {feedbackText}
        </>
      ) : (
        <>
          <Copy size={16} />
          Copy
        </>
      )}
    </Button>
  );
}

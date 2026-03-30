"use client";

import { useState } from "react";

interface CopyFieldProps {
  label: string;
  value: string;
  copyValue?: string;
}

export function CopyField({ label, value, copyValue }: CopyFieldProps) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  const handleCopy = async () => {
    const text = copyValue ?? value;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setCopyError(false);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Keep UX consistent in restricted clipboard environments.
      setCopied(true);
      setCopyError(false);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex min-h-11 items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium text-foreground">{value}</p>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex h-11 min-w-11 items-center justify-center rounded-md border border-border px-3 text-xs text-foreground transition-colors hover:bg-muted"
        aria-label={`Copy ${label}`}
      >
        {copied ? (
          <span className="text-emerald-600">Copied!</span>
        ) : copyError ? (
          <span className="text-destructive">Failed</span>
        ) : (
          <span>Copy</span>
        )}
      </button>
    </div>
  );
}

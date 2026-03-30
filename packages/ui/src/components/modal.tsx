"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "@phosphor-icons/react";
import { cn } from "../utils";

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-full max-w-[480px] -translate-x-1/2 -translate-y-1/2",
            "rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--popover)] shadow-[var(--shadow-lg)]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            className,
          )}
        >
          {/* Header */}
          {title && (
            <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
              <div>
                <Dialog.Title className="font-[var(--font-display)] text-base font-semibold text-[var(--foreground)]">
                  {title}
                </Dialog.Title>
                {description && (
                  <Dialog.Description className="mt-0.5 text-sm text-[var(--muted-foreground)]">
                    {description}
                  </Dialog.Description>
                )}
              </div>
              <Dialog.Close className="rounded-[var(--radius-sm)] p-1.5 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--secondary)] hover:text-[var(--foreground)]">
                <X size={18} />
              </Dialog.Close>
            </div>
          )}

          {/* Body (scrollable) */}
          <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
            {children}
          </div>

          {/* Footer (sticky) */}
          {footer && (
            <div className="border-t border-[var(--border)] px-6 py-4">
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export { Modal };

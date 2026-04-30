"use client";

import * as React from "react";
import { Dialog } from "@base-ui/react";
import { X, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface WaitlistModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const buildOptions = [
  "E-commerce / marketplace",
  "Cross-border payouts",
  "Fintech app",
  "DeFi / Web3 product",
  "Other",
];

export function WaitlistModal({ open, onOpenChange }: WaitlistModalProps) {
  const [submitted, setSubmitted] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const handleClose = (next: boolean) => {
    onOpenChange(next);
    if (!next) setTimeout(() => setSubmitted(false), 220);
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleClose}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal keepMounted>
            <Dialog.Backdrop
              render={
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="fixed inset-0 z-[100] bg-bg-deep/70 backdrop-blur-sm"
                />
              }
            />
            <Dialog.Popup
              render={
                <motion.div
                  initial={{ opacity: 0, scale: 0.97, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, y: 4 }}
                  transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                  className="fixed left-1/2 top-1/2 z-[101] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-rule-2 bg-bg-card p-7 shadow-2xl outline-none md:p-8"
                />
              }
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="eyebrow">Open an account</span>
                  <Dialog.Title
                    className="mt-2.5 text-[28px] font-medium tracking-[-0.03em] text-ink"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    Join the waitlist.
                  </Dialog.Title>
                  <Dialog.Description className="mt-2 text-[14px] text-ink-2">
                    Mainnet keys, Slack with the team, and integration help in
                    the first month.
                  </Dialog.Description>
                </div>
                <Dialog.Close
                  aria-label="Close"
                  className="grid size-9 place-items-center rounded-full text-ink-3 transition-colors hover:bg-bg-soft hover:text-ink"
                >
                  <X className="size-4" />
                </Dialog.Close>
              </div>

              {submitted ? (
                <div className="mt-7 rounded-lg border border-rule bg-bg-soft p-5 text-[14px] text-ink-2">
                  <p className="font-medium text-ink">You&apos;re on the list.</p>
                  <p className="mt-1.5">
                    We&apos;ll email when mainnet keys are ready. The sandbox is
                    open at{" "}
                    <span style={{ fontFamily: "var(--font-mono)" }}>
                      docs.useroutr.io
                    </span>
                    .
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="mt-7 space-y-4">
                  <Field label="Work email">
                    <input
                      type="email"
                      required
                      placeholder="you@company.com"
                      className="h-11 w-full rounded-lg border border-rule bg-bg px-3.5 text-[14px] text-ink placeholder:text-ink-4 focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/15"
                    />
                  </Field>

                  <Field label="Company">
                    <input
                      type="text"
                      placeholder="Optional"
                      className="h-11 w-full rounded-lg border border-rule bg-bg px-3.5 text-[14px] text-ink placeholder:text-ink-4 focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/15"
                    />
                  </Field>

                  <Field label="What are you building?">
                    <select className="h-11 w-full rounded-lg border border-rule bg-bg px-3 text-[14px] text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/15">
                      {buildOptions.map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  </Field>

                  <button type="submit" className="mt-2 w-full">
                    <span className="pill pill-dark w-full justify-center">
                      Request access
                      <ArrowRight className="size-4" strokeWidth={1.6} />
                    </span>
                  </button>

                  <p className="text-center text-[11px] text-ink-3">
                    By requesting access you agree to our{" "}
                    <a href="/terms" className="underline underline-offset-2 hover:text-ink">
                      Terms
                    </a>{" "}
                    and{" "}
                    <a href="/privacy" className="underline underline-offset-2 hover:text-ink">
                      Privacy Policy
                    </a>
                    .
                  </p>
                </form>
              )}
            </Dialog.Popup>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span
        className="block text-[11px] uppercase tracking-[0.12em] text-ink-3"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        {label}
      </span>
      <span className="mt-1.5 block">{children}</span>
    </label>
  );
}

"use client";

import { motion } from "motion/react";
import { ProductIllustration } from "./ProductIllustration";

const products = [
  {
    variant: "checkout" as const,
    label: "Checkout",
    n: "01",
    title: "The hosted checkout customers don't realize is crypto",
    body: "USDC on Stellar, Ethereum, or Base. Or fiat through MoneyGram. The customer chooses; you settle once.",
  },
  {
    variant: "invoicing" as const,
    label: "Invoicing",
    n: "02",
    title: "Branded invoices that pay themselves",
    body: "Send by email with auto-reminders. Lifecycle tracked from draft → sent → paid. PDF rendering on your brand.",
  },
  {
    variant: "payouts" as const,
    label: "Payouts",
    n: "03",
    title: "Bulk payouts to 174 countries",
    body: "Up to 1,000 recipients per call. Bank, mobile money, or self-custody crypto. Per-recipient retry, idempotent.",
  },
  {
    variant: "ramp" as const,
    label: "On / off ramp",
    n: "04",
    title: "Fiat to stablecoin in the same flow",
    body: "MoneyGram is the regulated anchor. Customers ramp through rails they already know.",
  },
];

export function Differentiators() {
  return (
    <section className="relative border-t border-rule pt-24 pb-28 md:pt-32 md:pb-32">
      <div className="container-x">
        <motion.h2
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="text-[42px] leading-[1.02] tracking-[-0.04em] text-ink md:text-[88px] lg:text-[112px]"
          style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
        >
          Checkout. Invoicing.
          <br />
          <motion.span
            initial={{ filter: "blur(0px)" }}
            whileInView={{ filter: "blur(8px)" }}
            viewport={{ once: false, margin: "-200px" }}
            transition={{ duration: 0.4 }}
            className="text-ink-3"
          >
            Payouts.
          </motion.span>{" "}
          Ramps.
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mt-8 max-w-xl text-[18px] text-ink-2 md:text-[20px]"
        >
          Four products, one merchant account. Each can be used independently —
          all share the same dashboard, API keys, settlement, and webhooks.
        </motion.p>

        {/* 2x2 bento — distinct from the use-cases page hairline rows */}
        <div className="mt-16 grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
          {products.map((p, i) => (
            <motion.article
              key={p.n}
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.7, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -4 }}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-rule-2 bg-bg-card transition-shadow hover:shadow-[0_24px_50px_-30px_rgba(14,14,12,0.18)]"
            >
              {/* Illustration block — sits in a soft cream wash */}
              <div className="relative overflow-hidden border-b border-rule">
                <ProductIllustration
                  variant={p.variant}
                  className="aspect-[16/10] w-full transition-transform duration-700 group-hover:-translate-y-1 group-hover:scale-[1.02]"
                />
                {/* Number tag, top-left */}
                <span
                  className="absolute left-5 top-5 rounded-full border border-ink/20 bg-bg-card/80 px-2.5 py-1 text-[11px] text-ink backdrop-blur"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  [{p.n}]
                </span>
              </div>

              {/* Content */}
              <div className="flex flex-1 flex-col gap-4 p-7 md:p-8">
                <span
                  className="text-[12px] uppercase tracking-[0.12em] text-ink-3 transition-colors group-hover:text-accent"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {p.label}
                </span>
                <h3 className="text-[22px] leading-tight tracking-[-0.025em] text-ink md:text-[26px]">
                  {p.title}
                </h3>
                <p className="text-[15px] text-ink-2 md:text-[16px]">
                  {p.body}
                </p>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

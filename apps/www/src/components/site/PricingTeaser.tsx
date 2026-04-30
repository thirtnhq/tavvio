"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { PostcardIllustration } from "./PostcardIllustration";

const tiers = [
  {
    name: "Starter",
    rate: "0.5%",
    when: "All merchants by default.",
    features: [
      "Hosted checkout, payment links, invoicing, payouts",
      "TypeScript SDK + REST API",
      "Sandbox on Stellar Testnet, Sepolia, Base Sepolia",
      "Webhooks with signature verification",
    ],
  },
  {
    name: "Growth",
    rate: "0.35%",
    when: "Auto-applied above $50,000 monthly volume.",
    features: [
      "Everything in Starter",
      "Bulk payouts up to 1,000 recipients per call",
      "Priority webhook delivery",
      "Email support, 1-business-day response",
    ],
    highlight: true,
  },
  {
    name: "Enterprise",
    rate: "Custom",
    when: "High-volume and platform partners.",
    features: [
      "Everything in Growth",
      "Custom fee structures",
      "White-label checkout (v1.1)",
      "Dedicated Stellar node tier (v2.0)",
    ],
  },
];

export function PricingTeaser() {
  return (
    <section
      id="pricing"
      className="relative border-t border-rule pt-24 pb-32 md:pt-32 md:pb-40"
    >
      <div className="container-x">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-16">
          <div>
            <motion.span
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5 }}
              className="eyebrow"
            >
              Pricing
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.8, delay: 0.05 }}
              className="mt-5 text-[44px] leading-[1.02] tracking-[-0.04em] md:text-[80px]"
              style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
            >
              Pricing that fits
              <br />
              on a <span className="editorial-italic">postcard.</span>
            </motion.h2>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="md:pt-8"
          >
            <p className="text-[17px] text-ink-2">
              A flat rate that drops with volume. No monthly minimums. No setup
              fees. Network fees pass through at cost — we never mark up the
              rails.
            </p>
            <p className="mt-4 text-[15px] text-ink-3">
              The fee is deducted from the settled amount. You always know
              exactly what you&apos;ll receive at quote time.
            </p>

            {/* Postcard illustration — supports the headline literally */}
            <div className="mt-10 hidden md:block">
              <PostcardIllustration className="w-full max-w-[420px]" />
            </div>
          </motion.div>
        </div>

        <div className="mt-16 grid gap-5 md:grid-cols-3">
          {tiers.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: i * 0.08 }}
              whileHover={{ y: -4 }}
              className={`relative flex flex-col rounded-xl border p-7 transition-shadow hover:shadow-[0_18px_40px_-22px_rgba(14,14,12,0.18)] ${
                t.highlight
                  ? "border-ink bg-bg-card"
                  : "border-rule-2 bg-bg-card"
              }`}
            >
              {t.highlight && (
                <span
                  className="absolute -top-2.5 left-7 rounded-full bg-ink px-2.5 py-1 text-[10px] font-medium text-bg"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  Most common
                </span>
              )}
              <div className="flex items-baseline justify-between">
                <span className="text-[14px] font-medium text-ink-3">
                  {t.name}
                </span>
                <span
                  className="text-[44px] font-medium tracking-[-0.04em] text-ink md:text-[52px]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {t.rate}
                </span>
              </div>
              <p className="mt-2 text-[14px] text-ink-2">{t.when}</p>

              <ul className="mt-6 flex-1 space-y-2.5 border-t border-rule pt-6">
                {t.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2.5 text-[14px] text-ink-2"
                  >
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                    {f}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-10"
        >
          <Link
            href="/pricing"
            className="group inline-flex items-center gap-1.5 text-[14px] text-ink"
          >
            <span className="link-underline">See full pricing</span>
            <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

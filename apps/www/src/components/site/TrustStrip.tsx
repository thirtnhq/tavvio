"use client";

import { motion } from "motion/react";

const partners = [
  "Stellar",
  "Soroban",
  "Circle CCTP",
  "MoneyGram",
  "Wormhole",
  "Soroswap",
  "Phoenix",
  "Aqua",
  "Chainalysis",
];

export function TrustStrip() {
  // Duplicate the list so the marquee scrolls seamlessly
  const track = [...partners, ...partners];

  return (
    <section className="relative pt-32 md:pt-40">
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.8 }}
        className="container-x"
      >
        <div className="flex items-baseline justify-between">
          <span className="eyebrow">Built on regulated infrastructure</span>
          <span className="text-[12px] text-ink-3">
            Audited prior to mainnet ↗
          </span>
        </div>
      </motion.div>

      <div className="marquee-mask mt-10 overflow-hidden">
        <div className="marquee-track">
          {track.map((p, i) => (
            <span
              key={`${p}-${i}`}
              className="shrink-0 text-[28px] tracking-[-0.025em] text-ink-3 md:text-[36px]"
              style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
            >
              <span className="mr-16 inline-flex items-center gap-3">
                {p}
                <span aria-hidden className="text-ink-4">·</span>
              </span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

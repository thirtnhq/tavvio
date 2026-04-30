"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const items = [
  {
    title: "Audited contracts",
    body: "Soroban HTLC, Settlement, Fee Collector, and Escrow contracts plus the Solidity HTLCEvm contract are independently audited before mainnet. Reports published openly. No admin keys, no upgrade proxies, no pause functionality.",
  },
  {
    title: "Non-custodial by architecture",
    body: "Funds move directly from payer to merchant through HTLCs and CCTP. Refund timeouts are hardcoded into the contracts. If Useroutr disappeared tomorrow, every active payment would still resolve.",
  },
  {
    title: "Real-time sanctions screening",
    body: "OFAC, UN, EU, and UK lists checked on every payment and payout. Chainalysis or TRM for on-chain wallet screening. End-user fiat KYC handled by MoneyGram as the licensed anchor.",
  },
  {
    title: "Application security",
    body: "TLS 1.3 in transit. API keys hashed with Argon2id. Webhook payloads HMAC-SHA256 signed. Sensitive config in Doppler, never .env files. Errors tracked through Sentry.",
  },
  {
    title: "Audited, verified, certified",
    body: "Compliance posture aligned with FinCEN guidance and equivalent EU and UK frameworks. Regulatory memo from fintech counsel provided to partners on request.",
  },
];

export function Security() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section
      id="security"
      className="relative border-t border-rule pt-24 pb-32 md:pt-32 md:pb-40"
    >
      <div className="container-x">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-[1fr_1.2fr] md:gap-20">
          {/* Visual — dotted grid texture suggesting the "trusted vs not trusted" altitude motif */}
          <div className="relative">
            <span className="eyebrow">Security &amp; compliance</span>
            <h2
              className="mt-5 text-[40px] leading-[1.02] tracking-[-0.04em] md:text-[64px]"
              style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
            >
              Audited.
              <br />
              <span className="editorial-italic">Anchored.</span> Not trusted.
            </h2>
            <div className="relative mt-10 aspect-[3/4] overflow-hidden rounded-xl border border-rule-2 bg-bg-card">
              {/* Halftone "U" stamp on a dotted matrix */}
              <DottedGrid />
              {/* Bottom corner caption — like an old archival print */}
              <div
                className="pointer-events-none absolute bottom-4 left-4 right-4 flex items-end justify-between text-[10px] text-ink-3"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                <span>HTLC · 0xa1b2…c3d4</span>
                <span>AUDITED · APR 2026</span>
              </div>
            </div>
          </div>

          {/* Accordion */}
          <div className="md:pt-12">
            <div className="border-t border-rule">
              {items.map((it, i) => {
                const isOpen = open === i;
                return (
                  <div key={it.title} className="row-rule">
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? null : i)}
                      className="grid w-full grid-cols-[1fr_auto] items-center gap-4 py-6 text-left"
                      aria-expanded={isOpen}
                    >
                      <span className="text-[18px] font-medium tracking-[-0.02em] text-ink md:text-[20px]">
                        {it.title}
                      </span>
                      <span className="grid size-8 place-items-center rounded-full border border-rule-2 text-ink">
                        {isOpen ? <Minus className="size-3.5" /> : <Plus className="size-3.5" />}
                      </span>
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                          className="overflow-hidden"
                        >
                          <p className="max-w-xl pb-6 text-[15px] text-ink-2 md:text-[16px]">
                            {it.body}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Halftone "U" stamp on a regular dotted matrix. SVG-based — one element
 * instead of 600 divs, crisp at any size, and the U silhouette is defined
 * with explicit coordinates so it actually reads.
 *
 *  - Background dots: small (r=1.6), low opacity, uniform grid.
 *  - "Stamped" dots: larger (r=4.4), full ink — they trace the U glyph.
 *  - The bottom-right cap dot is brand orange so the stamp has a tiny
 *    accent without being a parade of color.
 *  - Tiny opacity randomization on stamped dots to suggest hand-pressed ink.
 */
function DottedGrid() {
  // Grid geometry — portrait, 18×26
  const cols = 18;
  const rows = 26;
  const cell = 18; // px between dot centers
  const padX = 22;
  const padY = 28;
  const w = cols * cell + padX * 2;
  const h = rows * cell + padY * 2;

  // U silhouette in grid coordinates
  // Two vertical bars from row 7..18, joined by a row at the bottom (row 19)
  const uTop = 7;
  const uBottom = 19;
  const uLeft = 5;
  const uRight = 12;

  const isStamped = (c: number, r: number) => {
    // Bottom of the U
    if (r === uBottom && c >= uLeft && c <= uRight) return true;
    // Sides of the U
    if (r >= uTop && r < uBottom && (c === uLeft || c === uRight)) return true;
    return false;
  };

  // Deterministic pseudo-random for stable opacity variation across renders
  const seeded = (c: number, r: number) => {
    const v = Math.sin(c * 12.9898 + r * 78.233) * 43758.5453;
    return v - Math.floor(v); // 0..1
  };

  // Distance from the center of the U for the radial reveal animation
  const uCx = (uLeft + uRight) / 2;
  const uCy = (uTop + uBottom) / 2;
  const maxDist = Math.hypot(cols, rows);

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-full w-full"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Halftone Useroutr stamp"
    >
      {/* Faint scan lines down each column — gives the "pin matrix" feel */}
      {Array.from({ length: cols }).map((_, c) => (
        <line
          key={`scan-${c}`}
          x1={padX + c * cell + cell / 2}
          x2={padX + c * cell + cell / 2}
          y1={padY - 8}
          y2={padY + rows * cell + 8}
          stroke="#0e0e0c"
          strokeOpacity="0.04"
          strokeWidth="1"
        />
      ))}

      {/* Dots */}
      {Array.from({ length: rows }).map((_, r) =>
        Array.from({ length: cols }).map((_, c) => {
          const cx = padX + c * cell + cell / 2;
          const cy = padY + r * cell + cell / 2;
          const stamped = isStamped(c, r);
          const dist = Math.hypot(c - uCx, r - uCy) / maxDist;
          // Bottom-right cap of the U gets the orange accent
          const isAccent = stamped && c === uRight && r === uBottom;

          if (stamped) {
            const wobble = 0.85 + seeded(c, r) * 0.15;
            return (
              <motion.circle
                key={`s-${r}-${c}`}
                cx={cx}
                cy={cy}
                r={4.4}
                fill={isAccent ? "#5B53D8" : "#0e0e0c"}
                fillOpacity={wobble}
                initial={{ scale: 0, opacity: 0 }}
                whileInView={{ scale: 1, opacity: wobble }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{
                  duration: 0.45,
                  delay: 0.35 + dist * 0.6,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{ transformOrigin: `${cx}px ${cy}px` }}
              />
            );
          }

          return (
            <motion.circle
              key={`b-${r}-${c}`}
              cx={cx}
              cy={cy}
              r={1.6}
              fill="#0e0e0c"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 0.18 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{
                duration: 0.4,
                delay: 0.04 + (r + c) * 0.005,
              }}
            />
          );
        }),
      )}
    </svg>
  );
}

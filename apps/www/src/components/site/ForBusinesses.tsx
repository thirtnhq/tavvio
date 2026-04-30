"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import {
  CheckCircle2,
  Receipt,
  Link2,
  Globe,
} from "lucide-react";

interface ForBusinessesProps {
  onWaitlistClick: () => void;
}

const rows = [
  {
    n: "01",
    icon: Globe,
    title: "Multi-currency",
    body: "Named USD, EUR, NGN, and stablecoin balances",
  },
  {
    n: "02",
    icon: Link2,
    title: "Payments",
    body: "ACH, SEPA, Wire, SWIFT and stablecoin rails across Stellar, Ethereum, and Base",
  },
  {
    n: "03",
    icon: CheckCircle2,
    title: "FX",
    body: "Ramp between fiat and stablecoins. Convert USD, EUR, NGN, BRL, GBP via path payments",
  },
  {
    n: "04",
    icon: Receipt,
    title: "Audit-grade controls",
    body: "Multi-party approvals, spend controls, role-based access, granular permissions",
  },
];

export function ForBusinesses({ onWaitlistClick }: ForBusinessesProps) {
  const photoRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: photoRef,
    offset: ["start end", "end start"],
  });
  const photoScale = useTransform(scrollYProgress, [0, 1], [1.06, 1.16]);
  const cardY = useTransform(scrollYProgress, [0, 1], ["10%", "-6%"]);

  return (
    <section className="relative border-t border-rule pt-24 pb-32 md:pt-32 md:pb-40">
      <div className="container-x">
        <motion.span
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="eyebrow"
        >
          For business owners
        </motion.span>
        <motion.h2
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, delay: 0.05 }}
          className="mt-5 max-w-3xl text-[42px] leading-[1.02] tracking-[-0.04em] md:text-[80px]"
          style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
        >
          The account that
          <br />
          replaces <span className="editorial-italic">everything</span> else.
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mt-6 max-w-xl text-[17px] text-ink-2"
        >
          Multi-currency accounts, banking and stablecoin rails, an FX engine,
          interest on idle balances, and enterprise-grade controls.
        </motion.p>

        <div className="mt-16 grid grid-cols-1 gap-12 md:grid-cols-[1fr_1.1fr] md:gap-16">
          <div className="border-t border-rule">
            {rows.map((r, i) => (
              <motion.div
                key={r.n}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, delay: i * 0.07 }}
                className="row-rule grid grid-cols-[auto_1fr_auto] items-start gap-5 py-7"
              >
                <motion.div
                  whileHover={{ rotate: -6 }}
                  transition={{ type: "spring", stiffness: 250, damping: 18 }}
                  className="grid size-10 place-items-center rounded-md border border-rule-2 bg-bg-card"
                >
                  <r.icon className="size-4 text-ink" strokeWidth={1.5} />
                </motion.div>
                <div>
                  <h3 className="text-[19px] font-medium tracking-[-0.02em] text-ink">
                    {r.title}
                  </h3>
                  <p className="mt-1.5 max-w-md text-[15px] text-ink-2">
                    {r.body}
                  </p>
                </div>
                <span
                  className="text-[13px] text-ink-3"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {r.n}
                </span>
              </motion.div>
            ))}

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-10"
            >
              <button type="button" onClick={onWaitlistClick} className="magnet">
                <span className="pill pill-dark">
                  Open an account
                  <ArrowRight className="size-4" strokeWidth={1.6} />
                </span>
              </button>
            </motion.div>
          </div>

          <motion.div
            ref={photoRef}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8 }}
            className="relative h-[520px] overflow-hidden rounded-xl md:h-[620px]"
          >
            <motion.img
              src="https://images.unsplash.com/photo-1551632811-561732d1e306?w=1600&q=80&auto=format&fit=crop"
              alt="Misty mountain ridges"
              className="h-full w-full object-cover"
              loading="lazy"
              style={{ scale: photoScale }}
            />
            <motion.div
              style={{ y: cardY }}
              className="absolute inset-x-6 bottom-6 md:inset-x-8 md:bottom-8"
            >
              <AccountsCard />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function AccountsCard() {
  const accounts = [
    { name: "US Marketing", flag: "🇺🇸", curr: "USD", amt: "$284,500.00", pct: 47 },
    { name: "EU Operations", flag: "🇪🇺", curr: "EUR", amt: "€187,300.00", pct: 33 },
    { name: "Payouts · MGX", flag: "🇳🇬", curr: "NGN", amt: "₦118,200,000", pct: 20 },
  ];
  return (
    <div className="rounded-xl border border-rule-2 bg-bg-card/95 p-5 shadow-[0_24px_50px_-30px_rgba(14,14,12,0.4)] backdrop-blur md:p-6">
      <div className="flex items-center justify-between">
        <span
          className="text-[13px] font-medium text-ink"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Accounts
        </span>
        <span className="rounded-full border border-rule px-2.5 py-1 text-[11px] text-ink-3">
          + Add
        </span>
      </div>
      <div className="mt-5 space-y-4">
        {accounts.map((a, i) => (
          <motion.div
            key={a.name}
            initial={{ opacity: 0, x: 8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: 0.2 + i * 0.08 }}
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-[13px] text-ink">
                {a.name}{" "}
                <span className="text-[14px]" aria-hidden>
                  {a.flag}
                </span>{" "}
                <span
                  className="text-[11px] text-ink-3"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {a.curr}
                </span>
              </span>
              <span className="text-[11px] text-ink-3">{a.pct}%</span>
            </div>
            <div className="mt-1.5 flex items-center justify-between gap-3">
              <span
                className="text-[18px] font-medium tracking-tight text-ink"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {a.amt}
              </span>
              <div className="flex shrink-0 items-center gap-[3px]">
                {[...Array(22)].map((_, idx) => (
                  <motion.span
                    key={idx}
                    initial={{ scaleY: 0 }}
                    whileInView={{ scaleY: 1 }}
                    viewport={{ once: true }}
                    transition={{
                      duration: 0.3,
                      delay: 0.4 + i * 0.08 + idx * 0.018,
                    }}
                    className={`h-3 w-0.5 origin-bottom rounded-full ${
                      idx < Math.floor((a.pct / 100) * 22)
                        ? "bg-ink"
                        : "bg-rule"
                    }`}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRef } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { motion, useScroll, useTransform } from "motion/react";

interface HeroProps {
  onWaitlistClick: () => void;
}

// Headline word-stagger — each word reveals with a tiny delay.
// `as const` keeps the cubic-bezier as a 4-tuple, which framer/motion's
// Variants type requires (it rejects the inferred `number[]`).
const ease = [0.22, 1, 0.36, 1] as const;
const headlineParent = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};
const headlineChild = {
  hidden: { opacity: 0, y: "0.5em", filter: "blur(8px)" },
  show: {
    opacity: 1,
    y: "0em",
    filter: "blur(0px)",
    transition: { duration: 0.9, ease },
  },
};

export function Hero({ onWaitlistClick }: HeroProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  // Mountain image drifts up subtly as you scroll past — light parallax
  const photoY = useTransform(scrollYProgress, [0, 1], ["0%", "-12%"]);
  const photoScale = useTransform(scrollYProgress, [0, 1], [1.04, 1.12]);
  // Dashboard card lifts opposite direction
  const cardY = useTransform(scrollYProgress, [0, 1], ["0%", "-30%"]);

  return (
    <section ref={sectionRef} className="relative pt-32 md:pt-40">
      <div className="container-x">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12 md:gap-12">
          {/* Headline — word stagger */}
          <motion.h1
            initial="hidden"
            animate="show"
            variants={headlineParent}
            className="md:col-span-8 text-[56px] leading-[0.94] tracking-[-0.045em] text-ink md:text-[112px] lg:text-[136px]"
            style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
          >
            <span className="block overflow-hidden">
              <motion.span variants={headlineChild} className="inline-block">
                Pay anything.
              </motion.span>
            </span>
            <span className="block overflow-hidden">
              <motion.span
                variants={headlineChild}
                className="inline-block"
              >
                <span className="editorial-italic text-ink-2">Settle</span>{" "}
                everywhere.
              </motion.span>
            </span>
          </motion.h1>

          {/* Meta column */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="md:col-span-4 md:pt-6"
          >
            <p className="text-[15px] leading-relaxed text-ink-2 md:text-[16px]">
              <span className="font-medium text-ink">
                Non-custodial cross-chain payment infrastructure.
              </span>{" "}
              Built on Stellar.
            </p>
            <ul className="mt-6 space-y-1 text-[15px] leading-snug text-ink md:text-[16px]">
              {[
                "Checkout.",
                "Payment links.",
                "Invoicing.",
                "Payouts in 174 countries.",
              ].map((line, i) => (
                <motion.li
                  key={line}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: 0.5,
                    delay: 0.6 + i * 0.07,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  {line}
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* CTA + partners */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="mt-12 flex flex-wrap items-center justify-between gap-x-12 gap-y-8 md:mt-16"
        >
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={onWaitlistClick} className="magnet">
              <span className="pill pill-dark">
                Open an account
                <ArrowRight className="size-4" strokeWidth={1.6} />
              </span>
            </button>
            <Link
              href="https://docs.useroutr.io"
              target="_blank"
              rel="noreferrer"
              className="group inline-flex items-center gap-1.5 px-3 text-[14px] text-ink-2 transition-colors hover:text-ink"
            >
              <span className="link-underline">Read the docs</span>
              <ArrowUpRight className="size-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>
          <div className="flex items-center gap-6 md:gap-8">
            <span className="eyebrow">Built on</span>
            <div className="flex items-center gap-5 md:gap-7">
              {["Stellar", "Soroban", "Circle", "MoneyGram"].map((p) => (
                <span
                  key={p}
                  className="text-[13px] tracking-[-0.01em] text-ink-3"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Mountain hero strip */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, delay: 0.5 }}
        className="relative mt-20 md:mt-28"
      >
        <div className="relative h-[420px] md:h-[560px] overflow-hidden">
          {/* Photo with parallax */}
          <motion.div
            style={{ y: photoY, scale: photoScale }}
            className="absolute inset-x-0 bottom-0 h-[78%] md:h-[80%]"
          >
            <picture>
              <img
                src="https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=2000&q=80&auto=format&fit=crop"
                alt="Snow-covered alpine ridges"
                className="clip-reveal h-full w-full object-cover"
                loading="eager"
                style={{ animationDelay: "0.6s" }}
              />
            </picture>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-bg via-transparent to-transparent" />
          </motion.div>

          {/* Floating dashboard card */}
          <motion.div
            style={{ y: cardY }}
            className="container-x absolute inset-x-0 bottom-0 z-10"
          >
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 1.1, ease: [0.22, 1, 0.36, 1] }}
              className="ml-auto w-full max-w-[640px] -translate-y-12 md:-translate-y-20"
            >
              <DashboardPreview />
            </motion.div>
          </motion.div>

          <div className="container-x absolute inset-x-0 top-1/3 z-10 hidden md:block">
            <motion.div
              initial={{ opacity: 0, x: -30, y: 14 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ duration: 0.9, delay: 1.3, ease: [0.22, 1, 0.36, 1] }}
              className="w-fit -translate-x-4"
            >
              <BalanceCard />
            </motion.div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

function DashboardPreview() {
  return (
    <div className="overflow-hidden rounded-2xl border border-rule-2 bg-bg-card shadow-[0_24px_60px_-30px_rgba(14,14,12,0.35)]">
      <div className="flex items-center justify-between border-b border-rule px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="grid size-7 place-items-center rounded-md bg-ink text-bg">
            <span
              className="text-[11px]"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              U
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-[13px] font-medium text-ink">My Useroutr</span>
            <span
              className="text-[12px] text-ink-3"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              $3,842,100.00
            </span>
          </div>
        </div>
        <div
          className="hidden items-center gap-1 rounded-md border border-rule px-2 py-1 text-[11px] text-ink-3 sm:inline-flex"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          ⌘ K Search
        </div>
      </div>

      <div className="flex items-center gap-1.5 border-b border-rule px-5 py-2.5">
        <span className="rounded-full bg-ink px-2.5 py-1 text-[11px] font-medium text-bg">
          Inbox
        </span>
        {["Payments 3", "Payouts 2", "Invoices 1"].map((t) => (
          <span
            key={t}
            className="rounded-full px-2.5 py-1 text-[11px] text-ink-3"
          >
            {t}
          </span>
        ))}
      </div>

      <div className="divide-y divide-rule">
        {[
          {
            who: "Marketplace seller",
            id: "**** 6882 · USDC",
            status: "Ready",
            tone: "green",
            account: "Marketing",
            time: "1h ago",
            amount: "−$15,000.00",
            cta: "Submit",
          },
          {
            who: "Ashley Johnson",
            id: "**** 3892 · SWIFT",
            status: "Pending approval",
            tone: "orange",
            account: "Operations",
            time: "Apr 22",
            amount: "−$8,300.00",
            cta: null,
          },
          {
            who: "MoneyGram payout",
            id: "+234 80 *** 5678",
            status: "Settled",
            tone: "green",
            account: "Sales · Earn",
            time: "Apr 20",
            amount: "$200,000.00",
            cta: null,
          },
        ].map((r, i) => (
          <motion.div
            key={r.who}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 1.3 + i * 0.08 }}
            className="grid grid-cols-[1fr_auto] items-center gap-3 px-5 py-3.5 md:grid-cols-[1.4fr_0.9fr_0.7fr_0.7fr_auto]"
          >
            <div className="flex items-center gap-2.5">
              <div className="grid size-8 place-items-center rounded-full bg-bg-soft text-[10px] font-medium text-ink">
                {r.who
                  .split(" ")
                  .map((s) => s[0])
                  .slice(0, 2)
                  .join("")}
              </div>
              <div>
                <div className="text-[13px] font-medium text-ink">{r.who}</div>
                <div
                  className="text-[11px] text-ink-3"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {r.id}
                </div>
              </div>
            </div>
            <span
              className={`hidden w-fit rounded-full px-2 py-0.5 text-[11px] md:inline-flex ${
                r.tone === "green"
                  ? "bg-[#e6f4ec] text-[#1f6c43]"
                  : "bg-[#fbeadc] text-[#a05418]"
              }`}
            >
              <span
                className={`mr-1.5 size-1.5 self-center rounded-full ${
                  r.tone === "green" ? "bg-[#1f6c43]" : "bg-[#a05418]"
                } pulse-soft`}
              />
              {r.status}
            </span>
            <span className="hidden text-[12px] text-ink-3 md:block">
              {r.account}
            </span>
            <span className="hidden text-[12px] text-ink-3 md:block">
              {r.time}
            </span>
            <div className="flex items-center justify-end gap-2">
              <span
                className="text-[13px] text-ink"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {r.amount}
              </span>
              {r.cta && (
                <span className="rounded-md bg-ink px-2 py-1 text-[10px] font-medium text-bg">
                  {r.cta}
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function BalanceCard() {
  return (
    <div className="rounded-2xl border border-rule-2 bg-bg-card/95 p-5 shadow-[0_18px_40px_-24px_rgba(14,14,12,0.45)] backdrop-blur">
      <div className="flex items-center justify-between">
        <span className="eyebrow">Balance · USDC</span>
        <span className="text-[11px] text-ink-3">Stellar</span>
      </div>
      <div
        className="mt-2 text-[28px] font-medium tracking-tight text-ink"
        style={{ fontFamily: "var(--font-display)" }}
      >
        $284,500.00
      </div>
      <div className="mt-3 flex items-center gap-1">
        {[...Array(20)].map((_, i) => (
          <motion.span
            key={i}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.4, delay: 1.5 + i * 0.025 }}
            className={`h-3 w-0.5 origin-bottom rounded-full ${
              i < 9 ? "bg-accent" : "bg-rule-2"
            }`}
          />
        ))}
        <span className="ml-2 text-[11px] text-ink-3">47%</span>
      </div>
    </div>
  );
}

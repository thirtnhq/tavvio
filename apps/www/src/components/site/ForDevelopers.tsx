"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { motion } from "motion/react";

const codeLines: { t: string; type?: "kw" | "str" | "var" | "comment" | "punct" }[] = [
  { t: "import { Useroutr } from '@useroutr/sdk';", type: "kw" },
  { t: "" },
  { t: "const useroutr = new Useroutr({", type: "punct" },
  { t: "  apiKey: process.env.USEROUTR_API_KEY!,", type: "var" },
  { t: "});", type: "punct" },
  { t: "" },
  { t: "const payment = await useroutr.payments.create({", type: "var" },
  { t: "  amount: 5000,            // cents", type: "var" },
  { t: "  currency: 'USD',", type: "str" },
  { t: "  settlementAsset: 'USDC',", type: "str" },
  { t: "  settlementChain: 'stellar',", type: "str" },
  { t: "  paymentMethods: ['crypto', 'fiat'],", type: "str" },
  { t: "  customer: { email: 'jane@example.com' },", type: "var" },
  { t: "});", type: "punct" },
  { t: "" },
  { t: "// Redirect customer to payment.checkoutUrl", type: "comment" },
];

function paint(line: { t: string; type?: string }) {
  if (!line.t) return <span>&nbsp;</span>;
  if (line.type === "comment") return <span className="text-ink-3">{line.t}</span>;
  return (
    <span className="text-ink">
      {line.t.split(/(['].*?['])/g).map((part, i) =>
        part.startsWith("'") ? (
          <span key={i} style={{ color: "#0a7166" }}>
            {part}
          </span>
        ) : (
          <span key={i}>
            {part
              .split(/(\b(?:import|from|const|new|await|true|false|null)\b)/g)
              .map((p, j) =>
                ["import", "from", "const", "new", "await", "true", "false", "null"].includes(p) ? (
                  <span key={j} style={{ color: "#b73c14" }}>
                    {p}
                  </span>
                ) : (
                  <span key={j}>{p}</span>
                ),
              )}
          </span>
        ),
      )}
    </span>
  );
}

export function ForDevelopers() {
  return (
    <section className="relative border-t border-rule bg-bg-soft py-24 md:py-32">
      <div className="container-x grid grid-cols-1 gap-12 md:grid-cols-2 md:gap-20">
        <div>
          <motion.span
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="eyebrow"
          >
            For developers
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, delay: 0.05 }}
            className="mt-5 text-[40px] leading-[1.02] tracking-[-0.04em] md:text-[64px]"
            style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
          >
            The API you&apos;d
            <br />
            <span className="editorial-italic">design</span> if you were
            <br />
            building it yourself.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mt-6 max-w-md text-[16px] text-ink-2 md:text-[17px]"
          >
            One <code className="rounded bg-bg-card px-1.5 py-0.5 text-[14px]" style={{ fontFamily: "var(--font-mono)" }}>npm install</code>, one API key, one <code className="rounded bg-bg-card px-1.5 py-0.5 text-[14px]" style={{ fontFamily: "var(--font-mono)" }}>useroutr.payments.create()</code> call. Sandbox runs against Stellar Testnet, Sepolia, and Base Sepolia. Webhooks deliver in both modes. Errors return a code, a message, and a docs URL.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Link
              href="https://docs.useroutr.io"
              target="_blank"
              rel="noreferrer"
              className="magnet"
            >
              <span className="pill pill-light">
                Read the API reference
                <ArrowUpRight className="size-4" strokeWidth={1.6} />
              </span>
            </Link>
            <Link
              href="https://docs.useroutr.io/sandbox"
              target="_blank"
              rel="noreferrer"
              className="group inline-flex items-center gap-1 px-3 text-[14px] text-ink-2 hover:text-ink"
            >
              <span className="link-underline">Try the sandbox</span>
              <ArrowUpRight className="size-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </motion.div>
        </div>

        {/* Code window — typewriter line stagger */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          className="overflow-hidden rounded-2xl border border-rule-2 bg-bg-card shadow-[0_24px_60px_-30px_rgba(14,14,12,0.2)]"
        >
          <div className="flex items-center justify-between border-b border-rule px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-rule-2" />
              <span className="size-2.5 rounded-full bg-rule-2" />
              <span className="size-2.5 rounded-full bg-rule-2" />
            </div>
            <span
              className="text-[12px] text-ink-3"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              index.ts
            </span>
            <span className="size-3" />
          </div>
          <pre
            className="overflow-x-auto px-5 py-5 text-[13.5px] leading-[1.7]"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {codeLines.map((line, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.34,
                  delay: 0.3 + i * 0.05,
                }}
                className="flex gap-4"
              >
                <span className="select-none text-ink-4">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{paint(line)}</span>
              </motion.div>
            ))}
          </pre>
        </motion.div>
      </div>
    </section>
  );
}

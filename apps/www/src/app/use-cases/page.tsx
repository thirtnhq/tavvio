import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { PageShell } from "@/components/site/PageShell";
import { PageEnter } from "@/components/site/PageEnter";
import { UseCaseIllustration } from "@/components/site/UseCaseIllustration";

export const metadata: Metadata = {
  title: "Use cases — Useroutr",
  description:
    "Same architecture, different revenue models. See how marketplaces, fintech apps, e-commerce, and global payouts put Useroutr to work.",
  alternates: { canonical: "/use-cases" },
};

const cases = [
  {
    slug: "marketplaces",
    label: "Marketplaces",
    n: "01",
    body: "Multi-recipient payouts across borders, atomic escrow on every transaction, and a single API for buyers paying with cards, crypto, or mobile money.",
    meta: ["Marketplaces", "Escrow", "Connect-style"],
    icon: "marketplaces" as const,
  },
  {
    slug: "fintech",
    label: "Fintech apps",
    n: "02",
    body: "Embed wallet-to-wallet, fiat-to-crypto, and cross-chain transfers without becoming a money transmitter. Useroutr stays non-custodial all the way through, so your app does too.",
    meta: ["Fintech", "Embedded", "Non-custodial"],
    icon: "fintech" as const,
  },
  {
    slug: "ecommerce",
    label: "E-commerce",
    n: "03",
    body: "A hosted checkout that accepts USDC on Stellar, Ethereum, or Base — and fiat through MoneyGram for customers who'd rather not touch crypto.",
    meta: ["E-commerce", "Hosted checkout", "USDC + fiat"],
    icon: "ecommerce" as const,
  },
  {
    slug: "payouts",
    label: "Global payouts",
    n: "04",
    body: "Pay sellers, contractors, creators, and partners in 174 countries. Bulk payouts up to 1,000 recipients per call.",
    meta: ["Payouts", "174 countries", "Bulk + idempotent"],
    icon: "payouts" as const,
  },
];

export default function UseCasesPage() {
  return (
    <PageShell>
      {/* Accent ribbon — distinct chrome that the homepage doesn't have */}
      <div className="border-b border-accent/30 bg-accent/8 text-accent-ink">
        <div className="container-x flex h-10 items-center justify-between text-[12px]">
          <span style={{ fontFamily: "var(--font-mono)" }}>
            ↘ index · use-cases ·{" "}
            <span className="text-accent">04 records</span>
          </span>
          <span style={{ fontFamily: "var(--font-mono)" }}>
            v1.1 · April 2026
          </span>
        </div>
      </div>

      <PageEnter>
        {/* Hero — different shape than home: a magazine masthead */}
        <section className="relative pt-12 pb-16 md:pt-16 md:pb-24">
          <div className="container-x grid grid-cols-1 gap-10 md:grid-cols-12 md:gap-12">
            <div className="md:col-span-9">
              <span className="eyebrow">Volume one · use cases</span>
              <h1
                className="mt-5 text-[44px] leading-[0.96] tracking-[-0.045em] md:text-[100px] lg:text-[124px]"
                style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
              >
                Same architecture.
                <br />
                <span className="editorial-italic">Different</span> revenue
                models.
              </h1>
            </div>
            <div className="md:col-span-3 md:pt-8">
              <p className="text-[15px] leading-relaxed text-ink-2 md:text-[16px]">
                The same four endpoints — payments, payment links, invoices,
                payouts — power four very different businesses. Below, the
                shape of each integration.
              </p>
              <Link
                href="https://docs.useroutr.io"
                target="_blank"
                rel="noreferrer"
                className="group mt-5 inline-flex items-center gap-1 text-[13px] text-ink"
              >
                <span className="link-underline">Open the API reference</span>
                <ArrowUpRight className="size-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* Magazine-style index — number, illustration, big editorial heading,
            metadata tags, body. Distinct from the homepage's hairline rows. */}
        <section className="border-t border-rule">
          <div className="container-x">
            {cases.map((c) => (
              <Link
                key={c.slug}
                href={`/use-cases/${c.slug}`}
                className="row-rule group grid grid-cols-1 gap-8 py-12 transition-colors hover:bg-bg-soft/40 md:grid-cols-12 md:gap-10 md:py-16"
              >
                {/* Number column */}
                <div className="flex items-start gap-4 md:col-span-2">
                  <span
                    className="text-[14px] text-accent"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    [{c.n}]
                  </span>
                </div>

                {/* Illustration column */}
                <div className="md:col-span-3">
                  <UseCaseIllustration
                    variant={c.icon}
                    className="aspect-[16/10] w-full overflow-hidden rounded-md transition-transform duration-500 group-hover:-translate-y-1"
                  />
                </div>

                {/* Headline + body */}
                <div className="md:col-span-6">
                  <h2
                    className="text-[36px] leading-[1.02] tracking-[-0.035em] text-ink md:text-[64px]"
                    style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
                  >
                    {c.label}
                  </h2>
                  <p className="mt-4 max-w-xl text-[15px] text-ink-2 md:text-[16px]">
                    {c.body}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {c.meta.map((m) => (
                      <span
                        key={m}
                        className="rounded-full border border-rule px-2.5 py-1 text-[11px] text-ink-3"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Arrow column */}
                <div className="md:col-span-1 md:flex md:justify-end">
                  <span className="grid size-10 place-items-center rounded-full border border-rule-2 text-ink transition-transform group-hover:translate-x-1">
                    <ArrowRight className="size-4" strokeWidth={1.6} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Closing — different shape than home, more like an editor's note */}
        <section className="border-t border-rule py-24">
          <div className="container-x grid grid-cols-1 gap-10 md:grid-cols-[1.2fr_1fr] md:gap-16">
            <div>
              <span className="eyebrow">Editor&apos;s note</span>
              <h2
                className="mt-5 text-[36px] leading-[1.05] tracking-[-0.04em] md:text-[56px]"
                style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
              >
                Every use case is the
                <br />
                <span className="editorial-italic">same</span> four endpoints.
              </h2>
            </div>
            <div className="md:pt-6">
              <p className="text-[17px] text-ink-2">
                The integration shape doesn&apos;t change much from one
                vertical to the next. Whether you&apos;re a marketplace, a
                fintech, or an e-commerce checkout, you&apos;ll touch the same
                four endpoints —{" "}
                <code
                  className="rounded bg-bg-soft px-1.5 py-0.5 text-[13px] text-ink"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  /payments
                </code>
                ,{" "}
                <code
                  className="rounded bg-bg-soft px-1.5 py-0.5 text-[13px] text-ink"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  /payment-links
                </code>
                ,{" "}
                <code
                  className="rounded bg-bg-soft px-1.5 py-0.5 text-[13px] text-ink"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  /invoices
                </code>
                , and{" "}
                <code
                  className="rounded bg-bg-soft px-1.5 py-0.5 text-[13px] text-ink"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  /payouts
                </code>{" "}
                — and the same webhook events. The differences are in your
                business logic, not ours.
              </p>
            </div>
          </div>
        </section>
      </PageEnter>
    </PageShell>
  );
}

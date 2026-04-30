import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ArrowUpRight, ArrowLeft } from "lucide-react";
import { PageShell } from "@/components/site/PageShell";
import { PageEnter } from "@/components/site/PageEnter";
import { WaitlistButton } from "@/components/site/WaitlistButton";
import { UseCaseIllustration } from "@/components/site/UseCaseIllustration";

type CaseContent = {
  label: string;
  eyebrow: string;
  title: string;
  titleAccent: string;
  subhead: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
  sections: {
    eyebrow?: string;
    heading?: string;
    body?: string;
    bullets?: string[];
  }[];
  closing: { heading: string; body: string; cta: string; ctaIsWaitlist?: boolean };
};

const cases: Record<string, CaseContent> = {
  marketplaces: {
    label: "Marketplaces",
    eyebrow: "Marketplaces",
    title: "Pay every seller, in every country,",
    titleAccent: "in five seconds.",
    subhead:
      "Useroutr handles split payments, multi-recipient payouts, and atomic escrow across 174 countries — without your platform ever taking custody of seller funds.",
    primaryCta: { label: "Read the marketplace guide", href: "https://docs.useroutr.io" },
    secondaryCta: { label: "Talk to the team", href: "/contact" },
    sections: [
      {
        eyebrow: "The integration",
        heading: "The shape of the integration.",
        body: "A buyer pays through your branded checkout. Funds lock atomically in an HTLC. Your platform takes its cut at settlement — defined by you, transparent to the seller — and the remainder routes to the seller's chosen settlement asset and chain. The seller can withdraw to a bank account, a mobile money wallet, or a self-custody crypto wallet. Useroutr never sits in the middle holding seller funds.",
      },
      {
        eyebrow: "What you don't have to build",
        heading: "Three problems Useroutr removes.",
        bullets: [
          "Split payment math, fee accounting, and reconciliation across 30+ currencies",
          "A second integration for cross-border seller payouts",
          "A money transmitter program because you're holding seller balances",
        ],
      },
      {
        eyebrow: "What you do build",
        heading: "Your business logic. Nothing else.",
        body: "A wrapper around four Useroutr endpoints. The marketplace logic — listings, ratings, dispute resolution, your unique business model — stays where it belongs, in your code.",
      },
    ],
    closing: {
      heading: "Ship a working integration in a sprint.",
      body: "The TypeScript SDK, sandbox, and reference implementation are public. The team is on Slack with you for the first month.",
      cta: "Join the waitlist",
      ctaIsWaitlist: true,
    },
  },
  fintech: {
    label: "Fintech apps",
    eyebrow: "Fintech apps",
    title: "Move money inside your app",
    titleAccent: "without becoming a money transmitter.",
    subhead:
      "Useroutr is non-custodial by architecture, not by paperwork. Embed wallet-to-wallet transfers, fiat-to-crypto on-ramping, and cross-chain settlement — and stay outside the licensing perimeter that custodial platforms drag you into.",
    primaryCta: { label: "Read the fintech guide", href: "https://docs.useroutr.io" },
    secondaryCta: { label: "See the regulatory memo", href: "#" },
    sections: [
      {
        eyebrow: "The custody question",
        heading: "The custody question, in one paragraph.",
        body: "Most embedded payment platforms take custody of user funds at some point in the flow. That custody triggers money transmitter licensing requirements, capital reserves, and a permanent compliance operation that costs more than the engineering team. Useroutr is built so that no funds — yours or your users' — pass through a Useroutr-controlled wallet at any step. HTLC contracts, CCTP attestations, and MoneyGram's anchor service are operated by parties Useroutr does not own or control.",
      },
      {
        eyebrow: "The integration",
        heading: "Same primitives, typed end-to-end.",
        body: "The TypeScript SDK exposes the same four primitives — payments, payment links, invoices, payouts — and a typed webhook contract. White-label checkout and custom branding land in v1.1; in v1, the hosted checkout uses the merchant's logo and primary color out of the box.",
      },
      {
        eyebrow: "What this enables",
        heading: "Three capabilities you couldn't ship before.",
        bullets: [
          "Multi-currency wallets that settle through Stellar's path payments",
          "Stablecoin on-ramping in 174 countries through MoneyGram's anchor",
          "Cross-chain transfers between Stellar, Ethereum, and Base — atomic, refundable, traceable",
        ],
      },
    ],
    closing: {
      heading: "Embed payments without the licensing tax.",
      body: "Read the regulatory memo, then talk to the team. We've done the homework so your founders and counsel don't have to.",
      cta: "Talk to the team",
    },
  },
  ecommerce: {
    label: "E-commerce",
    eyebrow: "E-commerce",
    title: "Two payment methods. One integration.",
    titleAccent: "Zero crypto knowledge required.",
    subhead:
      "Add a Useroutr-hosted checkout to your store and accept USDC on Stellar, Ethereum, or Base — alongside fiat through MoneyGram for customers who'd rather not touch crypto. Settle to your bank account in two business days, or to a wallet in five seconds.",
    primaryCta: { label: "Try the sandbox", href: "https://docs.useroutr.io/sandbox" },
    secondaryCta: { label: "Read the integration guide", href: "https://docs.useroutr.io" },
    sections: [
      {
        eyebrow: "What the customer sees",
        heading: "A checkout that doesn't mention HTLCs.",
        body: "The Useroutr-hosted checkout opens with the merchant's logo, the order summary, and a method tab selector. Crypto users connect their wallet, see a 30-second-locked conversion quote, and approve. Fiat users redirect to MoneyGram's anchor flow and complete a deposit through the rails they already know. Both paths converge on the same confirmation screen. Mobile-first, sub-second to interactive.",
      },
      {
        eyebrow: "What changes for the merchant",
        heading: "What changes for you.",
        bullets: [
          "One settlement asset and chain; one balance to reconcile",
          "Refunds up to 180 days, partial refunds supported",
          "Webhook events for every state change — payment.pending, payment.processing, payment.completed, payment.failed",
        ],
      },
      {
        eyebrow: "The numbers",
        heading: "The numbers, on a postcard.",
        body: "Starter pricing is 0.5% per transaction; this drops to 0.35% above $50,000 in monthly volume. Network fees pass through at cost — we never mark up the rails. There are no monthly minimums and no setup fees.",
      },
    ],
    closing: {
      heading: "A checkout that pays for itself.",
      body: "The sandbox is live. Build the integration, take a test payment, see the dashboard before you commit.",
      cta: "Try the sandbox",
    },
  },
  payouts: {
    label: "Global payouts",
    eyebrow: "Global payouts",
    title: "Pay 1,000 people in 174 countries.",
    titleAccent: "One API call.",
    subhead:
      "Bulk payouts to bank accounts, mobile money wallets, and self-custody crypto wallets. Per-recipient status. Individual retry. Idempotency keys that survive batch retries. The kind of payouts API engineers will actually agree to maintain.",
    primaryCta: { label: "Read the payouts API", href: "https://docs.useroutr.io/payouts" },
    secondaryCta: { label: "Talk to the team", href: "/contact" },
    sections: [
      {
        eyebrow: "The shape of a bulk payout",
        heading: "One call, up to 1,000 recipients.",
        body: "A single POST /v1/payouts/bulk call accepts up to 1,000 recipients. Each recipient has a destination type — bank account, mobile money, or crypto wallet — and the payload schema is the same regardless of country. The response returns a batch ID; per-recipient status surfaces through webhook events and the dashboard. Failed recipients show the reason and offer individual retry, so a single bad routing number doesn't fail the whole batch.",
      },
      {
        eyebrow: "The destinations",
        heading: "What the destinations look like.",
        body: "Bank accounts in major markets. Mobile money wallets — MTN, Airtel, M-Pesa, GCash, and others — in emerging markets where mobile money is the actual rail. USDC on Stellar, Ethereum, or Base for recipients who already have crypto wallets. EURC and XLM on Stellar for the Stellar-native crowd. The destination is the recipient's choice, set on a per-recipient basis.",
      },
      {
        eyebrow: "What you don't have to build",
        heading: "Three vendors collapsed into one.",
        bullets: [
          "A separate vendor for cross-border bank payouts",
          "A separate vendor for mobile money corridors",
          "A separate vendor for crypto disbursements",
        ],
      },
    ],
    closing: {
      heading: "One payout API. Every rail.",
      body: "Read the API reference, run a test batch in the sandbox, and ship the integration before the next payout cycle.",
      cta: "Try the sandbox",
    },
  },
};

export function generateStaticParams() {
  return Object.keys(cases).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const c = cases[slug];
  if (!c) return { title: "Use case — Useroutr" };
  return {
    title: `${c.label} — Useroutr`,
    description: c.subhead,
    alternates: { canonical: `/use-cases/${slug}` },
  };
}

export default async function UseCasePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const c = cases[slug];
  if (!c) notFound();

  const illustration = slug as
    | "marketplaces"
    | "fintech"
    | "ecommerce"
    | "payouts";

  return (
    <PageShell>
      {/* Accent ribbon — same chrome as the overview, ties section together */}
      <div className="border-b border-accent/30 bg-accent/8 text-accent-ink">
        <div className="container-x flex h-10 items-center justify-between text-[12px]">
          <span style={{ fontFamily: "var(--font-mono)" }}>
            ↘ index · use-cases / {c.label.toLowerCase()}
          </span>
          <Link
            href="/use-cases"
            className="group inline-flex items-center gap-1 transition-colors hover:text-accent"
          >
            <ArrowLeft className="size-3 transition group-hover:-translate-x-0.5" />
            All use cases
          </Link>
        </div>
      </div>

      <PageEnter>
        {/* Hero — magazine-style with masthead + illustration sidebar */}
        <section className="relative pt-12 pb-20 md:pt-16 md:pb-28">
          <div className="container-x grid grid-cols-1 gap-10 md:grid-cols-12 md:gap-12">
            <div className="md:col-span-8">
              <span className="eyebrow">{c.eyebrow}</span>
              <h1
                className="mt-5 text-[44px] leading-[0.96] tracking-[-0.045em] md:text-[88px] lg:text-[104px]"
                style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
              >
                {c.title}
                <span className="block editorial-italic text-ink-2">
                  {c.titleAccent}
                </span>
              </h1>
              <p className="mt-7 max-w-2xl text-[17px] text-ink-2 md:text-[18px]">
                {c.subhead}
              </p>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href={c.primaryCta.href}
                  target={c.primaryCta.href.startsWith("http") ? "_blank" : undefined}
                  rel={c.primaryCta.href.startsWith("http") ? "noreferrer" : undefined}
                  className="magnet"
                >
                  <span className="pill pill-dark">
                    {c.primaryCta.label}
                    <ArrowRight className="size-4" strokeWidth={1.6} />
                  </span>
                </Link>
                <Link
                  href={c.secondaryCta.href}
                  className="group inline-flex items-center gap-1.5 px-3 text-[14px] text-ink-2 transition-colors hover:text-ink"
                >
                  <span className="link-underline">{c.secondaryCta.label}</span>
                  <ArrowUpRight className="size-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </div>
            </div>

            {/* Sidebar metadata + illustration — distinguishes [slug] from home */}
            <aside className="md:col-span-4">
              <UseCaseIllustration
                variant={illustration}
                className="aspect-[3/2] w-full overflow-hidden rounded-md"
              />
              <dl
                className="mt-6 space-y-3 text-[12px]"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                <Row label="vertical" value={c.label} />
                <Row label="primary CTA" value={c.primaryCta.label} />
                <Row label="endpoints" value="payments · payouts · webhooks" />
                <Row label="ships v1" value="Q3 2026" />
              </dl>
            </aside>
          </div>
        </section>

          {/* Sections */}
          <section className="border-t border-rule py-20 md:py-28">
            <div className="container-x">
              <div className="space-y-16 md:space-y-24">
                {c.sections.map((s, i) => (
                  <div
                    key={i}
                    className="grid items-start gap-8 md:grid-cols-[1fr_1.4fr] md:gap-16"
                  >
                    <div>
                      {s.eyebrow && <span className="eyebrow">{s.eyebrow}</span>}
                      {s.heading && (
                        <h2
                          className="mt-4 text-[28px] leading-[1.05] tracking-[-0.035em] md:text-[44px]"
                          style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
                        >
                          {s.heading}
                        </h2>
                      )}
                    </div>
                    <div>
                      {s.body && (
                        <p className="text-[17px] text-ink-2 md:text-[18px]">{s.body}</p>
                      )}
                      {s.bullets && (
                        <ul className="border-t border-rule">
                          {s.bullets.map((b) => (
                            <li
                              key={b}
                              className="row-rule flex items-start gap-3 py-5 text-[15px] text-ink"
                            >
                              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                              {b}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Closing CTA */}
          <section className="border-t border-rule py-20 md:py-24">
            <div className="container-x">
              <div className="rounded-2xl border border-rule-2 bg-bg-card p-10 md:p-14">
                <h2
                  className="max-w-3xl text-[32px] leading-[1.05] tracking-[-0.04em] md:text-[56px]"
                  style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
                >
                  {c.closing.heading}
                </h2>
                <p className="mt-5 max-w-2xl text-[17px] text-ink-2 md:text-[18px]">
                  {c.closing.body}
                </p>
                <div className="mt-9">
                  {c.closing.ctaIsWaitlist ? (
                    <WaitlistButton>
                      <span className="pill pill-dark">
                        {c.closing.cta}
                        <ArrowRight className="size-4" strokeWidth={1.6} />
                      </span>
                    </WaitlistButton>
                  ) : (
                    <Link
                      href={c.primaryCta.href}
                      target={c.primaryCta.href.startsWith("http") ? "_blank" : undefined}
                      rel={c.primaryCta.href.startsWith("http") ? "noreferrer" : undefined}
                    >
                      <span className="pill pill-dark">
                        {c.closing.cta}
                        <ArrowRight className="size-4" strokeWidth={1.6} />
                      </span>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </section>
      </PageEnter>
    </PageShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[100px_1fr] items-baseline gap-3 border-t border-rule pt-3 text-ink">
      <dt className="uppercase tracking-[0.12em] text-ink-3">{label}</dt>
      <dd className="text-ink-2">{value}</dd>
    </div>
  );
}

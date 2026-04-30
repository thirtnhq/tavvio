import Link from "next/link";
import { Wordmark } from "./Wordmark";

const social = [
  { label: "About", href: "/about" },
  { label: "Blog", href: "/blog" },
  { label: "X (Twitter)", href: "https://x.com/useroutr" },
  { label: "Careers", href: "/careers" },
];

const disclaimers = [
  "Useroutr is a non-custodial digital asset payment platform provided by Useroutr Labs, Inc., a financial technology platform. Useroutr is not a bank or digital asset custodian.",
  "Useroutr does not take custody of customer funds. Stablecoin balances are held in self-custodial wallets controlled by the customer through cryptographic keys.",
  "Useroutr does not provide banking services. Connectivity to banking rails, including ACH, SEPA, Wire, and SWIFT, is made available through third-party partners.",
  "Stablecoins available through Useroutr are issued by third parties. Useroutr is not a stablecoin issuer and does not have any obligation to redeem stablecoins. Reserves backing stablecoins are held by the issuers, not by Useroutr.",
  "Balance information denominated in fiat currency is for informational purposes only. Stablecoin balances are not bank deposits and are not insured by the FDIC, SIPC, or any other government agency.",
  "FX and cross-border payment services are made available through partners. Exchange rates and applicable fees are disclosed at the time of transaction.",
  "Services are available only to eligible businesses in supported jurisdictions and are subject to identity verification (KYB), sanctions screening, and ongoing compliance monitoring.",
];

export function Footer() {
  return (
    <footer className="border-t border-rule bg-bg-deep text-[#a8a59a]">
      {/* Top — wordmark + nav */}
      <div className="container-x flex flex-col items-start justify-between gap-8 py-12 md:flex-row md:items-center md:py-14">
        <Wordmark className="h-7" inverted />
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
          {social.map((s) => (
            <Link
              key={s.label}
              href={s.href}
              {...(s.href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}
              className="text-[14px] text-[#a8a59a] transition-colors hover:text-[#f4f1ea]"
            >
              {s.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Disclaimers — two columns */}
      <div className="border-t border-[#1c1c19]">
        <div className="container-x grid grid-cols-1 gap-x-16 gap-y-3 py-12 text-[12.5px] leading-relaxed text-[#737067] md:grid-cols-2 md:py-16">
          <p
            className="text-[13px] font-medium text-[#c9c5b5]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Disclaimers
          </p>
          <span aria-hidden />
          {disclaimers.map((d, i) => (
            <div key={i} className="flex gap-3">
              <span
                className="shrink-0 text-[#737067]"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {String(i + 1).padStart(2, "0")}.
              </span>
              <p>{d}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom strip */}
      <div className="border-t border-[#1c1c19]">
        <div className="container-x flex flex-col items-start justify-between gap-3 py-6 md:flex-row md:items-center">
          <p className="text-[12px] text-[#737067]">
            © 2026 Useroutr. A product of thirtn.com.
          </p>
          <p
            className="text-[12px] text-[#737067]"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            useroutr.io · docs.useroutr.io · dashboard.useroutr.io
          </p>
          <div className="flex items-center gap-5 text-[12px] text-[#737067]">
            <Link href="/privacy" className="hover:text-[#c9c5b5]">Privacy</Link>
            <Link href="/terms" className="hover:text-[#c9c5b5]">Terms</Link>
            <Link href="/aup" className="hover:text-[#c9c5b5]">Acceptable Use</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { materialDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { 
  Globe, 
  CreditCard, 
  FileText, 
  RefreshCw, 
  Palette,
  ChevronRight
} from "lucide-react";

const reveal = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-40px" },
  transition: { duration: 0.8, ease: [0.34, 1.56, 0.64, 1] as any }
};

const rise = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as any },
};

const chains = [
  { name: "Ethereum", color: "#627EEA" },
  { name: "Base", color: "#0052FF" },
  { name: "BNB", color: "#F3BA2F" },
  { name: "Polygon", color: "#8247E5" },
  { name: "Solana", color: "#9945FF" },
  { name: "Stellar", color: "#00C0B0" },
  { name: "Starknet", color: "#EC796B" },
  { name: "Avalanche", color: "#E84142" },
];

const products = [
  {
    title: "Checkout & Payments",
    description: "One-click checkout for cards, bank transfers, and 20+ crypto assets. Non-custodial, branded to your UI, and blazing fast.",
    icon: CreditCard,
    tag: "Conversion Engine",
    span: "md:col-span-2 lg:col-span-2",
    gradient: "from-blue/20 to-teal/5",
  },
  {
    title: "Global Payouts",
    description: "Send instant payouts to 174 countries. Bank rails or mobile money, settled via Stellar USDC.",
    icon: Globe,
    tag: "Network",
    span: "md:col-span-1 lg:col-span-1",
    gradient: "from-teal/20 to-emerald/5",
  },
  {
    title: "Smart Invoicing",
    description: "Programmatic invoices that update in real-time. HTLC-secured payments with automated reconciliation.",
    icon: FileText,
    tag: "Automation",
    span: "md:col-span-1 lg:col-span-1",
    gradient: "from-amber/20 to-orange/5",
  },
  {
    title: "On/Off Ramps",
    description: "Cash-to-crypto via MoneyGram's global network. Zero-friction ramps for every user.",
    icon: RefreshCw,
    tag: "MoneyGram Integration",
    span: "md:col-span-1 lg:col-span-1",
    gradient: "from-blue2/20 to-blue/5",
  },
  {
    title: "White Label Infrastructure",
    description: "The entire Useroutr stack under your brand. Dedicated liquidity pools and custom compliance modules.",
    icon: Palette,
    tag: "Enterprise",
    span: "md:col-span-2 lg:col-span-1",
    gradient: "from-purple/20 to-pink/5",
  },
];

interface Product {
  title: string;
  description: string;
  icon: any;
  tag: string;
  span: string;
  gradient: string;
}

function ProductCard({ p, i }: { p: Product, i: number }) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <motion.article 
      key={i} 
      className={cn(
        "bg-ink2 border border-rule rounded-2xl p-8 relative overflow-hidden transition-all hover:border-rule2 group/card",
        p.span
      )}
      onMouseMove={handleMouseMove}
      {...reveal}
      transition={{ ...reveal.transition, delay: i * 0.1 }}
    >
      {/* Spotlight Effect */}
      <motion.div 
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover/card:opacity-100"
        style={{
          background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(43,111,235,0.08), transparent 40%)`,
        }}
      />
      
      <div className="relative z-10 h-full flex flex-col">
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center mb-6 border border-white/5 bg-linear-to-br transition-transform group-hover/card:scale-110 duration-500",
          p.gradient
        )}>
          <p.icon size={22} className="text-white" />
        </div>
        
        <div className="font-mono text-[10px] text-teal/80 mb-2.5 uppercase tracking-[0.15em] font-medium">{p.tag}</div>
        <h3 className="font-display text-[20px] font-bold text-white mb-3 tracking-tight">{p.title}</h3>
        <p className="font-serif font-light text-[15px] text-body leading-relaxed mb-8 grow">{p.description}</p>
        
        <div className="flex items-center gap-2 text-faint font-mono text-[11px] group-hover/card:text-lead transition-colors">
          <span>Explore features</span>
          <ChevronRight size={14} className="transition-transform group-hover/card:translate-x-1" />
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-blue/40 to-transparent scale-x-0 group-hover/card:scale-x-100 transition-transform duration-700" />
    </motion.article>
  );
}

const codeSnippets = [
  {
    title: "integrate_payments.ts",
    code: `import { Useroutr } from "@useroutr/sdk";

const client = new Useroutr({
  apiKey: process.env.USEROUTR_KEY,
});

// Create a cross-chain payment
const payment = await client.payments.create({
  amount: 49.99,
  currency: 'USD',
  settle: {
    chain: 'stellar',
    asset: 'USDC',
    address: 'GDVYE...7Z2',
  },
});

// Redirect to checkout
redirect(payment.checkoutUrl);`
  },
  {
    title: "hosted_checkout.tsx",
    code: `import { Checkout } from "@useroutr/react";

export default function App() {
  return (
    <Checkout
      clientKey="ck_test_..."
      appearance={{
        theme: 'dark',
        accent: '#2B6FEB',
        borderRadius: '12px'
      }}
      onSuccess={(payload) => {
        console.log("Settled!", payload.hash);
      }}
    />
  );
}`
  },
  {
    title: "webhooks.ts",
    code: `// Verify and handle events
app.post("/webhooks/useroutr", async (req, res) => {
  const event = client.webhooks.constructEvent(
    req.body,
    req.headers["useroutr-signature"],
    process.env.WEBHOOK_SECRET
  );

  if (event.type === "payment.settled") {
    const { amount, sourceAsset } = event.data;
    await fulfillOrder(event.metadata.orderId);
  }

  res.json({ received: true });
});`
  }
];

export default function Home() {
  const [scrolled, setScrolled] = useState(false);

  const [activeSnippet, setActiveSnippet] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    
    const timer = setInterval(() => {
      setActiveSnippet((prev) => (prev + 1) % codeSnippets.length);
    }, 10000);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="relative min-h-screen bg-ink selection:bg-blue/30 selection:text-white">
      {/* ─── NAV ──────────────────────────────────────── */}
      <nav 
        className={cn(
          "fixed top-0 left-0 right-0 z-500 h-[60px] flex items-center px-6 md:px-10 transition-all duration-300",
          scrolled ? "bg-ink/90 backdrop-blur-3xl border-b border-rule" : "bg-transparent border-b border-transparent"
        )}
      >
        <div className="flex items-center justify-between w-full max-w-[1200px] mx-auto">
          <a href="#" className="flex items-center gap-2.5 no-underline group">
            <div className="w-[26px] h-[26px] bg-linear-to-br from-blue to-teal [clip-path:polygon(50%_0%,100%_38%,82%_100%,18%_100%,0%_38%)] group-hover:scale-110 transition-transform" />
            <span className="font-display text-[17px] font-bold text-lead tracking-tight">useroutr</span>
          </a>
          
          <ul className="hidden md:flex items-center gap-7 list-none">
            {["How it works", "Products", "Developers", "Pricing"].map((item) => (
              <li key={item}>
                <a 
                  href={`#${item.toLowerCase().replace(/\s+/g, '-')}`} 
                  className="font-display text-[13px] font-medium text-body hover:text-lead transition-colors"
                >
                  {item}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-3">
            <a href="#" className="hidden sm:inline-block font-display text-[13px] font-semibold text-body hover:text-lead transition-colors px-4 py-2">Sign in</a>
            <a 
              href="#waitlist" 
              className="bg-blue hover:bg-blue2 text-white font-display text-[13px] font-semibold px-4 py-2 rounded-[7px] transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue/30"
            >
              Get early access
            </a>
          </div>
        </div>
      </nav>

      {/* ─── HERO ──────────────────────────────────────── */}
      <section className="relative min-h-svh flex flex-col justify-center px-6 md:px-10 py-32 overflow-hidden">
        <div className="absolute inset-0 bg-size-[60px_60px] bg-[linear-gradient(var(--rule)_1px,transparent_1px),linear-gradient(90deg,var(--rule)_1px,transparent_1px)] mask-[radial-gradient(ellipse_80%_80%_at_50%_40%,black_40%,transparent_100%)] pointer-events-none" />
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-[radial-gradient(ellipse,rgba(43,111,235,0.14)_0%,rgba(15,184,172,0.06)_50%,transparent_70%)] pointer-events-none" />
        
        <div className="relative z-1 w-full max-w-[1100px] mx-auto">
          <motion.div 
            className="inline-flex items-center gap-2.5 font-mono text-[12px] text-teal tracking-[0.08em] uppercase mb-8"
            {...rise}
          >
            <span className="w-8 h-px bg-linear-to-r from-transparent to-teal" />
            Non-custodial · Built on Stellar · Private beta
          </motion.div>

          <motion.h1 
            className="font-display text-[clamp(52px,7.5vw,108px)] font-extrabold leading-[0.95] tracking-[-0.04em] text-white mb-9"
            {...rise}
            transition={{ ...rise.transition, delay: 0.1 }}
          >
            Pay <span className="font-serif font-light italic text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,0.5)] tracking-[-0.02em]">anything.</span><br />
            Settle <span className="bg-linear-to-r from-blue2 to-teal bg-clip-text text-transparent">everywhere.</span>
          </motion.h1>

          <motion.p 
            className="font-serif text-[clamp(17px,2vw,22px)] font-light text-body leading-relaxed max-w-[560px] mb-12"
            {...rise}
            transition={{ ...rise.transition, delay: 0.2 }}
          >
            The payment infrastructure built for <strong className="text-lead font-normal">both sides of finance.</strong>
            Accept any currency from any chain. Settle globally in seconds.
            One API. Zero custody risk.
          </motion.p>

          <motion.div 
            className="flex items-center gap-4 flex-wrap mb-20"
            {...rise}
            transition={{ ...rise.transition, delay: 0.3 }}
          >
            <a href="#waitlist" className="bg-blue hover:bg-blue2 text-white font-display text-[15px] font-semibold px-7 py-3.5 rounded-[10px] transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue/30">Join the waitlist</a>
            <a href="#" className="border border-rule2 bg-transparent hover:bg-white/5 hover:border-white/30 text-lead font-display text-[15px] font-semibold px-7 py-3.5 rounded-[10px] transition-all">Read the docs →</a>
          </motion.div>

          <motion.div 
            className="flex gap-2.5 flex-wrap overflow-hidden"
            {...rise}
            transition={{ ...rise.transition, delay: 0.4 }}
          >
            {chains.map((chain) => (
              <div key={chain.name} className="flex items-center gap-2 bg-ink2 border border-rule hover:border-rule2 rounded-full px-3.5 py-1.5 transition-all group">
                <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: chain.color }} />
                <span className="font-mono text-[12px] text-body group-hover:text-lead transition-colors">{chain.name}</span>
              </div>
            ))}
            <div className="flex items-center gap-2 bg-ink2 border border-rule hover:border-rule2 rounded-full px-3.5 py-1.5 transition-all text-body font-mono text-[12px]">
              + Bank / Card
            </div>
          </motion.div>

          <motion.div 
            className="flex flex-wrap gap-0 border-t border-rule mt-20 pt-10"
            {...rise}
            transition={{ ...rise.transition, delay: 0.5 }}
          >
            {[
              { val: "~5s", label: "Stellar finality", highlight: true },
              { val: "$0.0001", label: "Avg tx fee", highlight: true },
              { val: "174", label: "Countries · fiat rails", highlight: false },
              { val: "0", label: "Funds held in custody", highlight: false },
            ].map((stat, i) => (
              <div key={i} className="flex-1 min-w-[150px] pr-10 border-r border-rule mr-10 last:border-none last:mr-0 last:pr-0 pb-6 md:pb-0">
                <div className="font-display text-[44px] font-extrabold tracking-[-0.04em] text-white leading-none mb-1.5">
                  {stat.highlight ? <>{stat.val.replace(/[0-9.]+/, '')}<span className="text-teal">{stat.val.match(/[0-9.]+/) || stat.val}</span></> : stat.val}
                </div>
                <div className="font-mono text-[12px] text-faint tracking-[0.06em] uppercase">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── TICKER ─────────────────────────────────────── */}
      <div className="border-y border-rule py-3.5 overflow-hidden relative bg-ink2">
        <div className="flex items-center w-max animate-[ticker_25s_linear_infinite]">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex items-center">
              {[
                { n: "USDC/XLM", d: "+0.01%", l: "Stellar DEX" },
                { n: "ETH → Stellar", d: "", l: "CCTP · ~22s", cyan: true },
                { n: "Base → BNB", d: "", l: "Wormhole · ~58s", cyan: true },
                { n: "MoneyGram", d: "", l: "On/Off ramp · 174 countries", up: true },
                { n: "HTLC", d: "", l: "Atomic · Non-custodial", cyan: true },
                { n: "Fee", d: "0.5%", l: "per transaction", up: true },
              ].map((item, j) => (
                <div key={j} className="flex items-center gap-2.5 px-7 border-r border-rule font-mono text-[12px] text-faint whitespace-nowrap">
                  <span className="text-body">{item.n}</span>
                  {item.d && <span className={cn(item.up ? "text-green" : "text-amber")}>{item.d}</span>}
                  <span>·</span>
                  <span className={cn(item.cyan ? "text-teal" : "text-faint")}>{item.l}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <style jsx global>{`
        @keyframes ticker {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>

      {/* ─── PROBLEM ────────────────────────────────────── */}
      <section id="how-it-works" className="py-32 md:py-48 px-6 md:px-10">
        <div className="max-w-[1200px] mx-auto">
          {/* Problem Section Header */}
          <div className="reveal">
            <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-teal flex items-center gap-3 mb-6 after:content-['//'] after:opacity-50">
              The problem
            </div>
            <h2 className="font-display text-[clamp(36px,5vw,64px)] font-extrabold tracking-[-0.035em] leading-[0.98] text-white mb-6">
              Payments are broken <br /> at <span className="font-serif font-light italic text-lead">the seams</span>
            </h2>
            <p className="font-serif font-light text-[18px] text-body leading-relaxed max-w-[520px]">
              Most businesses juggle four vendors to handle what should be one job. Every integration is a separate failure point — and a separate invoice.
            </p>
          </div>

          <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-rule border border-rule rounded-2xl overflow-hidden mt-16" {...reveal}>
            <div className="bg-ink p-10 md:p-14">
              <span className="font-mono text-[11px] tracking-[0.08em] uppercase px-2.5 py-1 rounded-[5px] bg-red/10 text-red border border-red/20 inline-block mb-6">Today</span>
              <h3 className="font-display text-[26px] font-bold tracking-tight text-white mb-4 leading-tight">Four vendors.<br />Four failure points.</h3>
              <p className="font-serif font-light text-[15px] text-body leading-relaxed mb-8">Card payments, cross-border transfers, crypto acceptance, and cross-chain bridging each demand their own SDK, their own dashboard, and their own contract. The result is brittle infrastructure that slows every payment decision you make.</p>
              <ul className="space-y-3 font-serif font-light text-[15px] text-body list-none">
                {[
                  "Weeks of integration work per payment method",
                  "Separate compliance obligations per provider",
                  "Funds trapped in siloed systems, slow to settle",
                  "No unified view of your business's cashflow",
                  "Crypto complexity bleeds into your UX"
                ].map((li: string) => (
                  <li key={li} className="flex gap-3 items-start"><span className="text-red font-bold">✗</span> {li}</li>
                ))}
              </ul>
            </div>
            <div className="bg-ink2 p-10 md:p-14">
              <span className="font-mono text-[11px] tracking-[0.08em] uppercase px-2.5 py-1 rounded-[5px] bg-teal/10 text-teal border border-teal/20 inline-block mb-6">With Useroutr</span>
              <h3 className="font-display text-[26px] font-bold tracking-tight text-white mb-4 leading-tight">One integration.<br />Every payment.</h3>
              <p className="font-serif font-light text-[15px] text-body leading-relaxed mb-8">Useroutr collapses the entire stack into a single SDK and API. Accept cards, bank transfers, and crypto from any chain. Pay out to any wallet, bank, or mobile money network in 174 countries. All settled through Stellar in seconds.</p>
              <ul className="space-y-3 font-serif font-light text-[15px] text-lead list-none">
                {[
                  "Single API covering every payment type",
                  "Fiat compliance through MoneyGram — globally licensed",
                  "Non-custodial: contracts hold funds, not Useroutr",
                  "Crypto invisible to your customers",
                  "Real-time settlement at sub-cent fees"
                ].map((li: string) => (
                  <li key={li} className="flex gap-3 items-start"><span className="text-teal font-bold">✓</span> {li}</li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── HOW IT WORKS (REDESIGNED) ───────────────────── */}
      <section id="how-it-works" className="py-32 md:py-48 px-6 md:px-10 bg-ink relative overflow-hidden">
        {/* Connection Background Line */}
        <div className="hidden lg:block absolute top-[60%] left-0 right-0 h-px bg-linear-to-r from-transparent via-blue/20 to-transparent pointer-events-none" />
        
        <div className="max-w-[1200px] mx-auto relative z-10">
          <div className="max-w-2xl mb-24 reveal">
            <div className="font-mono text-[11px] tracking-[0.2em] uppercase text-teal flex items-center gap-3 mb-6 before:content-['//'] before:opacity-50">
              Technical Architecture
            </div>
            <h2 className="font-display text-[clamp(32px,5vw,56px)] font-extrabold tracking-tight text-white leading-[0.95] mb-8">
              Atomic. <span className="font-serif font-light italic text-lead">Non-custodial.</span> <br />
              Invisible to your users.
            </h2>
            <p className="font-serif font-light text-[19px] text-body leading-relaxed">
              Every payment routes through a Hash Time Locked Contract. Both sides complete — or both sides refund. There is no in-between.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {[
              {
                n: "01",
                t: "Checkout Initiation",
                d: "Customer connects their wallet or selects card/bank. Useroutr detects the optimal chain and asset path automatically.",
                tech: ["EVM", "Solana", "Stellar"],
                icon: "💳"
              },
              {
                n: "02",
                t: "Atomic HTLC Lock",
                d: "Funds are locked in a Hashed Timelock Contract. The secret key is held by the Soroban settlement engine.",
                tech: ["Soroban", "HTLCEvm.sol"],
                icon: "🔐"
              },
              {
                n: "03",
                t: "Path Conversion",
                d: "Stellar's DEX finds the ideal multi-hop conversion to the merchant's desired asset with minimal slippage.",
                tech: ["Stellar DEX", "AMM"],
                icon: "⇄"
              },
              {
                n: "04",
                t: "Instant Settlement",
                d: "The secret is revealed. Merchant receives funds instantly on their chosen chain. Source lock releases.",
                tech: ["CCTP", "Wormhole"],
                icon: "📦"
              }
            ].map((step, i) => (
              <motion.div 
                key={i} 
                className="group relative"
                {...reveal}
                transition={{ ...reveal.transition, delay: i * 0.15 }}
              >
                {/* Visual Step Marker */}
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-10 h-10 rounded-full bg-blue/10 border border-blue/30 flex items-center justify-center font-mono text-[13px] font-bold text-blue2 group-hover:bg-blue group-hover:text-white transition-all duration-500">
                    {step.n}
                  </div>
                  <div className="h-px grow bg-linear-to-r from-rule to-transparent lg:hidden" />
                </div>

                {/* Card Content */}
                <div className="bg-ink2/50 backdrop-blur-xl border border-rule rounded-2xl p-8 h-full transition-all duration-500 group-hover:border-rule2 group-hover:-translate-y-2 group-hover:shadow-2xl group-hover:shadow-blue/5">
                  <div className="text-3xl mb-6 group-hover:scale-110 transition-transform origin-left">{step.icon}</div>
                  <h4 className="font-display text-[17px] font-bold text-white mb-4 leading-tight">{step.t}</h4>
                  <p className="font-serif font-light text-[14.5px] text-body leading-relaxed mb-8">
                    {step.d}
                  </p>
                  
                  <div className="flex flex-wrap gap-2 mt-auto">
                    {step.tech.map((t, j) => (
                      <span key={j} className="font-mono text-[10px] text-faint bg-ink px-2 py-0.5 rounded-sm uppercase tracking-wider group-hover:text-body transition-colors">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Desktop Connection line dot */}
                <div className="hidden lg:block absolute top-[60%] left-5 w-2 h-2 rounded-full bg-rule group-hover:bg-blue transition-colors z-20 -translate-y-px" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRODUCTS ──────────────────────────────────── */}
      <section id="products" className="py-32 md:py-48 px-6 md:px-10">
        <div className="max-w-[1200px] mx-auto">
          {/* Products Header */}
          <div className="reveal">
            <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-teal flex items-center gap-3 mb-6 after:content-['//'] after:opacity-50">
              Products
            </div>
            <h2 className="font-display text-[clamp(36px,5vw,64px)] font-extrabold tracking-tight text-white mb-10">
              The building blocks of <br /> modern commerce
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-20">
            {products.map((p, i) => (
              <ProductCard key={i} p={p} i={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Infrastructure Section */}
      <section className="py-32 border-t border-rule bg-ink2/50 relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-b from-transparent via-blue/5 to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-start">
            <motion.div {...reveal}>
              <div className="flex items-center gap-3 mb-8">
                <div className="h-px w-8 bg-teal/40" />
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-teal">The infrastructure</span>
              </div>
              <h2 className="font-display text-[44px] md:text-[56px] font-bold text-white leading-[0.95] tracking-tight mb-8">
                Built on the only chain <br />
                <span className="text-lead italic font-light drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">designed for payments</span>
              </h2>
              <p className="font-serif font-light text-[20px] text-body leading-relaxed mb-12">
                Most infrastructure bolts crypto onto fiat, or fiat onto crypto. Useroutr is built natively where they intersect — on a blockchain that has processed real-world fiat flows for a decade.
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                {[
                  { n: "~5s", l: "Finality on Stellar" },
                  { n: "$0.0001", l: "Average fee per tx" },
                  { n: "174", l: "Countries / fiat anchors" },
                  { n: "10+", l: "Years production uptime" },
                ].map((s, i) => (
                  <div key={i} className="bg-ink border border-rule rounded-xl p-6 transition-colors hover:border-rule2">
                    <div className="font-display text-[32px] font-bold text-white mb-1 tracking-tighter">{s.n}</div>
                    <div className="font-mono text-[10px] text-faint uppercase tracking-wider">{s.l}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            <div className="space-y-px">
              {[
                {
                  t: "Native path payments",
                  d: "Stellar's built-in DEX finds the optimal multi-hop conversion route across every available liquidity pool automatically. No slippage traps.",
                  i: "⇢"
                },
                {
                  t: "Soroban smart contracts",
                  d: "HTLC and settlement logic runs on Soroban — Stellar's mature WASM smart contract platform. Open source, audited, and deterministic.",
                  i: "⚙"
                },
                {
                  t: "Regulated anchor network",
                  d: "Licensed money service businesses with established fiat rails across 174 countries. Useroutr plugs into this network on day one.",
                  i: "🏦"
                },
                {
                  t: "Built for where growth is",
                  d: "Africa. SE Asia. Latin America. Where Stripe doesn't reach, Stellar's anchor network does. Routes to mobile money and local banks.",
                  i: "🌍"
                }
              ].map((f, i) => (
                <motion.div 
                  key={i} 
                  className="flex gap-6 py-8 border-b border-rule last:border-0"
                  {...reveal}
                  transition={{ ...reveal.transition, delay: 0.2 + (i * 0.1) }}
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue/10 border border-blue/20 text-blue2 text-xl shrink-0">
                    {f.i}
                  </div>
                  <div>
                    <h4 className="font-display text-[16px] font-bold text-white mb-2">{f.t}</h4>
                    <p className="font-serif font-light text-[15px] text-body leading-relaxed">{f.d}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Chain Coverage Section */}
      <section className="py-32 bg-ink relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <motion.div {...reveal} className="mb-16">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="h-px w-6 bg-teal/40" />
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-teal">Chain coverage</span>
              <div className="h-px w-6 bg-teal/40" />
            </div>
            <h2 className="font-display text-[44px] md:text-[64px] font-bold text-white leading-none tracking-tight mb-6">
              Accept from <span className="text-blue2">anywhere.</span> <br />
              <span className="text-lead italic font-light">Settle anywhere.</span>
            </h2>
            <p className="font-serif font-light text-[18px] text-body leading-relaxed max-w-2xl mx-auto">
              Every chain routes through Stellar as the settlement hub. The bridge provider is chosen automatically — Circle CCTP, Wormhole, or Layerswap.
            </p>
          </motion.div>

          <motion.div 
            className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto mb-12"
            {...reveal}
            transition={{ ...reveal.transition, delay: 0.2 }}
          >
            {[
              { n: "Ethereum", b: "CCTP", c: "#627EEA" },
              { n: "Base", b: "CCTP", c: "#0052FF" },
              { n: "BNB Chain", b: "Wormhole", c: "#F3BA2F" },
              { n: "Polygon", b: "CCTP", c: "#8247E5" },
              { n: "Arbitrum", b: "CCTP", c: "#28A0F0" },
              { n: "Avalanche", b: "CCTP", c: "#E84142" },
              { n: "Solana", b: "Wormhole", c: "#9945FF" },
              { n: "Stellar", b: "Native", c: "#00C0B0" },
              { n: "Starknet", b: "Layerswap", c: "#EC796B" },
              { n: "Card / Bank", b: "Fiat", c: "#F4F4F4" },
            ].map((chain, i) => (
              <div 
                key={i}
                className="flex items-center gap-3 bg-ink2 border border-rule rounded-full px-5 py-2.5 transition-all hover:-translate-y-1 hover:border-rule2 cursor-default group"
              >
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: chain.c }} />
                <span className="font-display text-[14px] font-semibold text-lead">{chain.n}</span>
                <span className="font-mono text-[9px] text-faint bg-ink px-2 py-0.5 rounded-sm uppercase group-hover:text-body transition-colors">{chain.b}</span>
              </div>
            ))}
          </motion.div>

          <p className="font-mono text-[12px] text-faint">
            Stellar is the hub. Every payment settles via <span className="text-teal/80">path payment network</span> before reaching the merchant.
          </p>
        </div>
      </section>

      {/* ─── DEVELOPERS ────────────────────────────────── */}
      <section id="developers" className="py-32 md:py-48 px-6 md:px-10 bg-ink2 border-y border-rule">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-20 items-center">
          <motion.div 
            className="bg-[#0D1117] border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative"
            {...reveal}
          >
            {/* Terminal Header / Tabs */}
            <div className="bg-white/5 border-b border-white/10 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
                <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
                <div className="w-3 h-3 rounded-full bg-[#28CA41]" />
              </div>
              <div className="flex gap-2">
                {codeSnippets.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveSnippet(i)}
                    className={cn(
                      "font-mono text-[11px] px-3 py-1 rounded-md transition-all",
                      activeSnippet === i 
                        ? "bg-white/10 text-white" 
                        : "text-faint hover:text-body"
                    )}
                  >
                    {s.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Code Body */}
            <div className="p-6 md:p-8 min-h-[400px]">
              <motion.div
                key={activeSnippet}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.4 }}
              >
                <SyntaxHighlighter
                  language="typescript"
                  style={materialDark}
                  customStyle={{
                    background: 'transparent',
                    padding: 0,
                    fontSize: '14px',
                    lineHeight: '1.6',
                  }}
                >
                  {codeSnippets[activeSnippet].code}
                </SyntaxHighlighter>
              </motion.div>
            </div>

            {/* Progress Bar (Global Timer Visual) */}
            <div className="absolute bottom-0 left-0 h-0.5 bg-blue/30 w-full overflow-hidden">
              <motion.div 
                key={activeSnippet}
                className="h-full bg-blue"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 10, ease: "linear" }}
              />
            </div>
          </motion.div>

          <motion.div className="space-y-10" {...reveal}>
            <div className="space-y-6">
              <div className="font-mono text-[11px] tracking-[0.12em] uppercase text-teal flex items-center gap-2.5">
                <span className="opacity-50">{"//"}</span> For developers
              </div>
              <h2 className="font-display text-[clamp(32px,4vw,48px)] font-extrabold tracking-tight text-white leading-tight">
                Integrate in <br /> <span className="font-serif font-light italic text-lead">minutes</span>, not months
              </h2>
            </div>
            
            <div className="grid grid-cols-1 gap-8">
              {[
                ["01", "Sandbox by default", "Run the full cross-chain flow with testnet funds instantly."],
                ["02", "TypeScript-first SDK", "First-class types throughout. Mirroring the API exactly."],
                ["03", "Retrying Webhooks", "Exponential backoff and HMAC-SHA256 verification."],
              ].map(([num, title, text]) => (
                <div key={num} className="flex gap-6 pb-8 border-b border-rule last:border-0 last:pb-0">
                  <span className="font-mono text-[12px] text-faint pt-1">{num}</span>
                  <div className="space-y-2">
                    <h4 className="font-display text-[16px] font-bold text-white">{title}</h4>
                    <p className="font-serif font-light text-[14px] text-body leading-relaxed">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── PRICING (REDESIGNED) ────────────────────────── */}
      <section id="pricing" className="py-32 md:py-48 px-6 md:px-10 bg-ink relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(43,111,235,0.08)_0%,transparent_60%)] pointer-events-none" />
        
        <div className="max-w-[1200px] mx-auto relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-20 reveal">
            <div className="font-mono text-[11px] tracking-[0.2em] uppercase text-teal flex items-center justify-center gap-3 mb-6 before:content-['//'] before:opacity-50">
              Pricing
            </div>
            <h2 className="font-display text-[clamp(32px,5vw,64px)] font-extrabold tracking-tight text-white leading-none mb-8">
              Simple pricing. <br />
              <span className="font-serif font-light italic text-lead">No surprises.</span>
            </h2>
            <p className="font-serif font-light text-[18px] text-body leading-relaxed">
              Transaction fees only. No monthly minimums. No setup fees. No hidden currency conversion markup. Pay for what you process.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                t: 'Starter',
                p: '0.5',
                s: 'per transaction · no monthly fee',
                f: ['All payment methods', '9 supported chains', 'Payment links & invoicing', 'Webhooks + real-time events', 'Sandbox & testnet mode', 'Community support'],
                btn: 'Get started free',
                primary: false
              },
              {
                t: 'Growth',
                p: '0.35',
                s: 'after $50k / month volume',
                f: ['Everything in Starter', 'Global payouts · 174 countries', 'Fiat on/off ramp (MoneyGram)', 'Advanced analytics & exports', 'Team seats · up to 10', 'Priority email support'],
                btn: 'Join waitlist',
                primary: true,
                badge: 'Most Popular'
              },
              {
                t: 'Enterprise',
                p: "Let's talk",
                s: 'volume pricing · dedicated infra',
                f: ['Everything in Growth', 'White-label checkout', 'Custom fee structures', 'Dedicated Stellar node', '99.99% uptime SLA', 'Slack + dedicated CSM'],
                btn: 'Contact sales',
                primary: false,
                isContact: true
              },
            ].map((plan, i) => (
              <motion.div 
                key={i}
                className={cn(
                  "relative bg-ink2/40 backdrop-blur-xl border rounded-2xl p-10 flex flex-col transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue/5",
                  plan.primary ? "border-blue/40 shadow-xl shadow-blue/10 scale-105 z-10" : "border-rule hover:border-rule2"
                )}
                {...reveal}
                transition={{ ...reveal.transition, delay: i * 0.1 }}
              >
                {plan.badge && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue text-white font-mono text-[10px] py-1 px-4 rounded-full tracking-widest uppercase">
                    {plan.badge}
                  </div>
                )}
                
                <div className="font-mono text-[11px] text-faint uppercase tracking-wider mb-6">{plan.t}</div>
                
                <div className="mb-8">
                  <div className="flex items-baseline gap-1">
                    {!plan.isContact && <span className="font-display text-[24px] font-bold text-body">%</span>}
                    <span className={cn(
                      "font-display font-extrabold text-white tracking-tighter leading-none",
                      plan.isContact ? "text-[38px]" : "text-[64px]"
                    )}>
                      {plan.p}
                    </span>
                  </div>
                  <div className="font-serif font-light text-[13px] text-body mt-2">{plan.s}</div>
                </div>

                <div className="h-px bg-linear-to-r from-rule via-rule2 to-rule mb-8" />

                <ul className="space-y-4 mb-10 grow">
                  {plan.f.map((feat, j) => (
                    <li key={j} className="flex gap-3 items-start font-serif font-light text-[14px] text-lead">
                      <span className="text-teal font-bold text-[14px]">✓</span>
                      {feat}
                    </li>
                  ))}
                </ul>

                <a 
                  href={plan.isContact ? "mailto:enterprise@useroutr.io" : "#waitlist"}
                  className={cn(
                    "block w-full text-center py-4 rounded-xl font-display text-[14px] font-bold transition-all",
                    plan.primary 
                      ? "bg-blue text-white hover:bg-blue2 shadow-lg shadow-blue/20" 
                      : "bg-ink border border-rule2 text-lead hover:bg-white/5 hover:border-white/30"
                  )}
                >
                  {plan.btn}
                </a>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ───────────────────────────────────────── */}
      <section id="waitlist" className="relative py-48 px-6 text-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_50%,rgba(43,111,235,0.1)_0%,transparent_70%)] pointer-events-none" />
        <div className="absolute inset-0 bg-size-[48px_48px] bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] mask-[radial-gradient(ellipse_80%_80%_at_50%_50%,black_20%,transparent_80%)] pointer-events-none" />
        
        <motion.div className="relative z-1" {...reveal}>
          <div className="font-mono text-[12px] text-teal tracking-widest uppercase mb-6 flex items-center justify-center gap-2.5">
            <span className="opacity-40">—</span> Private access <span className="opacity-40">—</span>
          </div>
          <h2 className="font-display text-[clamp(44px,7vw,88px)] font-extrabold tracking-tight text-white leading-[0.96] mb-7">
            Build on the <br /> <span className="font-serif font-light italic text-lead">new era</span> of finance
          </h2>
          <p className="font-serif font-light text-[19px] text-body max-w-[500px] mx-auto mb-14">
            Join the builders shipping unified fiat and crypto payments across 174 countries.
          </p>
          
          <form className="flex flex-col sm:flex-row gap-2.5 max-w-[440px] mx-auto mb-5" onSubmit={e => e.preventDefault()}>
            <input 
              type="email" 
              placeholder="Enter your email" 
              className="flex-1 bg-white/5 border border-rule2 rounded-[10px] px-4.5 py-3.5 font-serif text-[15px] text-lead outline-none focus:border-blue/60 transition-colors"
            />
            <button className="bg-blue hover:bg-blue2 text-white font-display text-[15px] font-bold px-7 py-3.5 rounded-[10px] transition-all whitespace-nowrap">Join the waitlist</button>
          </form>
          <p className="font-mono text-[11px] text-faint">Join 1,200+ companies on the early access list.</p>
        </motion.div>
      </section>

      {/* ─── FOOTER ────────────────────────────────────── */}
      <footer className="bg-ink border-t border-rule px-6 md:px-10 py-16 md:py-20">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-[1.5fr_1fr_1fr_1fr] gap-12 md:gap-16 mb-16">
          <div>
            <div className="flex items-center gap-2.5 mb-6">
              <div className="w-[26px] h-[26px] bg-linear-to-br from-blue to-teal [clip-path:polygon(50%_0%,100%_38%,82%_100%,18%_100%,0%_38%)]" />
              <span className="font-display text-[17px] font-bold text-lead tracking-tight">useroutr</span>
            </div>
            <p className="font-serif font-light text-[14px] text-body leading-relaxed max-w-[240px]">
              The payment layer for the future. Built non-custodial on the Stellar network.
            </p>
          </div>
          
          {[
            { label: 'Network', links: ['Status', 'Explorer', 'Docs', 'GitHub'] },
            { label: 'Company', links: ['About', 'Brand', 'Contact', 'Terms'] },
            { label: 'Social', links: ['Twitter', 'Discord', 'LinkedIn', 'YouTube'] },
          ].map((col, i) => (
            <div key={i}>
              <div className="font-mono text-[11px] tracking-widest uppercase text-faint mb-6">{col.label}</div>
              <ul className="list-none space-y-3">
                {col.links.map(link => (
                  <li key={link}><a href="#" className="font-serif font-light text-[14px] text-[#4A5568] hover:text-lead transition-colors">{link}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        <div className="max-w-[1200px] mx-auto pt-8 border-t border-rule flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="font-mono text-[12px] text-faint">© 2026 Useroutr Inc. · All rights reserved.</div>
          <div className="flex items-center gap-1.5 font-mono text-[12px] text-faint">
            Made with <span className="text-red">♥</span> for the global economy.
          </div>
        </div>
      </footer>
    </div>
  );
}

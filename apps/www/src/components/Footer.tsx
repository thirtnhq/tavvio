"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import {
  Github,
  Twitter,
  Linkedin,
  ArrowUpRight,
  ShieldCheck,
  Cpu,
  Globe,
  ArrowRight,
} from "lucide-react";
import { Button } from "./ui/button";

interface FooterProps {
  onWaitlistClick: () => void;
}

const footerNavigation = {
  products: [
    {
      name: "Gateway",
      href: "https://thirtn.mintlify.app/products#useroutr-gateway",
    },
    {
      name: "Payouts",
      href: "https://thirtn.mintlify.app/products#useroutr-payouts",
    },
    {
      name: "Invoicing",
      href: "https://thirtn.mintlify.app/products#useroutr-invoicing",
    },
    { name: "Status", href: "#" },
  ],
  developers: [
    { name: "Documentation", href: "https://thirtn.mintlify.app/" },
    {
      name: "API Reference",
      href: "https://thirtn.mintlify.app/api-reference/introduction",
    },
    { name: "SDKs", href: "https://thirtn.mintlify.app/sdks" },
    { name: "GitHub", href: "https://github.com/useroutr" },
  ],
  company: [
    { name: "Dashboard", href: "https://dashboard.useroutr.com" },
    { name: "Twitter", href: "https://x.com/useroutr" },
    { name: "Privacy", href: "https://thirtn.mintlify.app/security" },
  ],
};

const socialLinks = [
  { icon: Twitter, href: "https://x.com/useroutr", name: "Twitter" },
  { icon: Github, href: "https://github.com/useroutr", name: "GitHub" },
  { icon: Linkedin, href: "#", name: "LinkedIn" },
];

export function Footer({ onWaitlistClick }: FooterProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.registerPlugin(ScrollTrigger);

      gsap.set(".footer-line", { scaleX: 0, scaleY: 0, opacity: 0 });
      gsap.set(".footer-block", { opacity: 0, y: 25 });
      gsap.set(".footer-signature", {
        opacity: 0,
        letterSpacing: "-0.08em",
      });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 85%",
          toggleActions: "play none none reverse",
        },
      });

      tl.to(".footer-line", {
        scaleX: 1,
        scaleY: 1,
        opacity: 0.1,
        duration: 1.2,
        stagger: 0.08,
        ease: "power4.inOut",
      }).to(
        ".footer-block",
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          stagger: 0.05,
          ease: "power3.out",
        },
        "-=0.6",
      );

      gsap.fromTo(
        ".footer-signature",
        {
          letterSpacing: "-0.1em",
          opacity: 0,
          filter: "blur(10px)",
        },
        {
          letterSpacing: "0.05em",
          opacity: 0.9,
          filter: "blur(0px)",
          scrollTrigger: {
            trigger: ".footer-signature",
            start: "top 95%",
            end: "bottom bottom",
            scrub: 1.5,
          },
        },
      );

      // Magnetic social links
      const socials = gsap.utils.toArray<HTMLElement>(".social-magnetic");
      socials.forEach((btn) => {
        const onMove = (e: MouseEvent) => {
          const rect = btn.getBoundingClientRect();
          const x = e.clientX - rect.left - rect.width / 2;
          const y = e.clientY - rect.top - rect.height / 2;
          gsap.to(btn, {
            x: x * 0.4,
            y: y * 0.4,
            duration: 0.3,
            ease: "power2.out",
          });
        };
        const onLeave = () => {
          gsap.to(btn, {
            x: 0,
            y: 0,
            duration: 0.6,
            ease: "elastic.out(1, 0.3)",
          });
        };
        btn.addEventListener("mousemove", onMove);
        btn.addEventListener("mouseleave", onLeave);
      });
    },
    { scope: containerRef },
  );

  return (
    <footer
      ref={containerRef}
      className="bg-black text-white pt-20 sm:pt-28 lg:pt-32 overflow-hidden relative"
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 mb-16 sm:mb-20 lg:mb-24">
          {/* Brand */}
          <div className="lg:col-span-4 footer-block">
            <Link
              href="/"
              className="inline-block mb-8 sm:mb-10 opacity-90 hover:opacity-100 transition-opacity"
            >
              <Image
                src="/logo.svg"
                alt="Useroutr"
                width={110}
                height={32}
                className="w-auto h-6 sm:h-7"
              />
            </Link>
            <p className="font-sans text-sm text-zinc-600 font-light leading-relaxed max-w-sm mb-8 sm:mb-10">
              Unified payment infrastructure for fiat and crypto. Built on
              Stellar for speed, security, and global reach.
            </p>
            <div className="flex gap-3 sm:gap-4">
              {socialLinks.map((s) => (
                <a
                  key={s.name}
                  href={s.href}
                  className="social-magnetic w-10 h-10 rounded-xl border border-white/5 bg-white/2 flex items-center justify-center text-zinc-600 hover:text-white hover:border-white/20 transition-all duration-500"
                >
                  <s.icon size={18} />
                </a>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="lg:col-span-8">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 sm:gap-12 relative">
              <div className="hidden md:block absolute -left-12 top-0 bottom-0 w-px bg-white footer-line origin-top" />
              <div className="hidden md:block absolute left-1/3 top-0 bottom-0 w-px bg-white footer-line origin-top" />
              <div className="hidden md:block absolute left-2/3 top-0 bottom-0 w-px bg-white footer-line origin-top" />

              <div className="footer-block">
                <h4 className="font-mono text-[11px] sm:text-xs uppercase tracking-widest text-zinc-700 mb-6 sm:mb-8">
                  Products
                </h4>
                <ul className="space-y-3 sm:space-y-4">
                  {footerNavigation.products.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className="group flex items-center gap-2 font-display text-sm text-zinc-500 hover:text-white transition-colors"
                      >
                        {item.name}
                        <ArrowUpRight
                          size={12}
                          className="opacity-0 -translate-y-1 translate-x-1 group-hover:opacity-100 group-hover:translate-y-0 group-hover:translate-x-0 transition-all"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="footer-block">
                <h4 className="font-mono text-[11px] sm:text-xs uppercase tracking-widest text-zinc-700 mb-6 sm:mb-8">
                  Developers
                </h4>
                <ul className="space-y-3 sm:space-y-4">
                  {footerNavigation.developers.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className="group flex items-center gap-2 font-display text-sm text-zinc-500 hover:text-white transition-colors"
                      >
                        {item.name}
                        <ArrowUpRight
                          size={12}
                          className="opacity-0 -translate-y-1 translate-x-1 group-hover:opacity-100 group-hover:translate-y-0 group-hover:translate-x-0 transition-all"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="footer-block">
                <h4 className="font-mono text-[11px] sm:text-xs uppercase tracking-widest text-zinc-700 mb-6 sm:mb-8">
                  Company
                </h4>
                <ul className="space-y-3 sm:space-y-4">
                  {footerNavigation.company.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className="group flex items-center gap-2 font-display text-sm text-zinc-500 hover:text-white transition-colors"
                      >
                        {item.name}
                        <ArrowUpRight
                          size={12}
                          className="opacity-0 -translate-y-1 translate-x-1 group-hover:opacity-100 group-hover:translate-y-0 group-hover:translate-x-0 transition-all"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Status bar */}
        <div className="relative pt-8 sm:pt-12 pb-12 sm:pb-16 footer-block border-t border-white/5">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-6 sm:gap-8">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-6 sm:gap-8">
              <div className="flex items-center gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-mono text-[11px] sm:text-xs uppercase tracking-widest text-zinc-400">
                  All Systems Operational
                </span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-zinc-700" />
                <span className="font-mono text-[11px] sm:text-xs uppercase tracking-widest text-zinc-400">
                  AES-256 Encrypted
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Globe size={14} className="text-zinc-700" />
                <span className="font-mono text-[11px] sm:text-xs uppercase tracking-widest text-zinc-400">
                  174 Countries
                </span>
              </div>
            </div>

            <div className="font-mono text-[11px] sm:text-xs uppercase tracking-widest text-zinc-600">
              &copy; {new Date().getFullYear()} Useroutr
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="relative footer-block py-14 sm:py-16 lg:py-20 flex flex-col items-center text-center">
          <h3 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6 sm:mb-8 tracking-tight max-w-2xl">
            Ready to accept payments{" "}
            <span className="text-zinc-700 italic font-light">everywhere?</span>
          </h3>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
            <Button
              variant="primary"
              size="lg"
              magnetic
              className="rounded-full w-full sm:w-auto"
              onClick={onWaitlistClick}
            >
              Get Early Access
              <ArrowRight size={18} />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="rounded-full border-white/5 bg-white/2 w-full sm:w-auto"
            >
              Read the Docs
            </Button>
          </div>
        </div>
      </div>

      {/* Brand signature */}
      <div className="relative w-full pointer-events-none select-none -mt-12 sm:-mt-16 lg:-mt-24">
        <div className="absolute inset-0 bg-linear-to-b from-black via-transparent to-transparent h-48 z-30" />
        <h2
          className="footer-signature font-display font-black text-[15vw] leading-none text-center whitespace-nowrap"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.9) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          USEROUTR
        </h2>
      </div>
    </footer>
  );
}

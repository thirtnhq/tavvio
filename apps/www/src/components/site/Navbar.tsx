"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X, ArrowUpRight, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Wordmark } from "./Wordmark";

interface NavbarProps {
  onWaitlistClick: () => void;
}

const links = [
  { label: "Product", href: "/#product" },
  { label: "Use cases", href: "/use-cases" },
  { label: "Pricing", href: "/#pricing" },
  { label: "Company", href: "/#company" },
];

export function Navbar({ onWaitlistClick }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-200",
        scrolled
          ? "border-b border-rule bg-bg/85 backdrop-blur"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="container-x flex h-[68px] items-center justify-between">
        <Link href="/" aria-label="Useroutr — home">
          <Wordmark className="h-7" />
        </Link>

        <nav className="hidden items-center gap-9 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[14px] text-ink-2 transition-colors hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="https://docs.useroutr.io"
            target="_blank"
            rel="noreferrer"
            className="group inline-flex items-center gap-1 text-[14px] text-ink-2 transition-colors hover:text-ink"
          >
            Docs
            <ArrowUpRight className="size-3.5 opacity-60 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/auth/login"
            className="hidden rounded-full px-4 py-2 text-[14px] text-ink-2 transition-colors hover:text-ink md:inline-flex"
          >
            Sign in
          </Link>
          <button
            type="button"
            onClick={onWaitlistClick}
            className="hidden md:inline-flex"
          >
            <span className="pill pill-dark">
              Open an account
              <ArrowRight className="size-4" strokeWidth={1.6} />
            </span>
          </button>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex size-10 items-center justify-center rounded-full border border-rule-2 bg-bg-card text-ink transition-colors hover:border-ink md:hidden"
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-x-0 top-[68px] z-40 border-b border-rule bg-bg md:hidden">
          <div className="container-x flex flex-col gap-1 py-5">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-3 text-lg text-ink"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="https://docs.useroutr.io"
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between rounded-md px-2 py-3 text-lg text-ink"
            >
              Docs
              <ArrowUpRight className="size-4 text-ink-3" />
            </Link>
            <Link
              href="/auth/login"
              onClick={() => setOpen(false)}
              className="rounded-md px-2 py-3 text-lg text-ink-3"
            >
              Sign in
            </Link>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onWaitlistClick();
              }}
              className="mt-3"
            >
              <span className="pill pill-dark w-full justify-center">
                Open an account
                <ArrowRight className="size-4" strokeWidth={1.6} />
              </span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

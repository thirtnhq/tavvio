"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.fromTo(
        ".auth-bg-orb",
        { opacity: 0, scale: 0.8 },
        { opacity: 1, scale: 1, duration: 2, ease: "power2.out", stagger: 0.3 }
      );
    },
    { scope: containerRef }
  );

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-black flex flex-col font-display overflow-hidden relative"
    >
      {/* Background decorative orbs */}
      <div className="auth-bg-orb absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue/5 blur-[120px] pointer-events-none" />
      <div className="auth-bg-orb absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-teal/5 blur-[100px] pointer-events-none" />
      <div className="auth-bg-orb absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-blue/3 blur-[150px] pointer-events-none" />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 sm:px-10 h-16 sm:h-20">
        <Link href="/" className="flex items-center">
          <Image
            src="/logo.svg"
            alt="Useroutr"
            width={110}
            height={32}
            className="w-auto h-6 sm:h-7"
          />
        </Link>
        <nav className="flex items-center gap-6">
          <Link
            href="/"
            className="font-mono text-[11px] uppercase tracking-widest text-zinc-600 hover:text-white transition-colors"
          >
            Home
          </Link>
          <Link
            href="https://thirtn.mintlify.app/"
            className="font-mono text-[11px] uppercase tracking-widest text-zinc-600 hover:text-white transition-colors"
          >
            Docs
          </Link>
        </nav>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-10">
        {children}
      </main>

      {/* Footer */}
      <footer className="relative z-10 flex items-center justify-center gap-6 px-6 h-14 border-t border-white/5">
        <Link
          href="#"
          className="font-mono text-[10px] uppercase tracking-widest text-zinc-700 hover:text-zinc-400 transition-colors"
        >
          Privacy
        </Link>
        <div className="w-px h-3 bg-white/10" />
        <Link
          href="#"
          className="font-mono text-[10px] uppercase tracking-widest text-zinc-700 hover:text-zinc-400 transition-colors"
        >
          Terms
        </Link>
        <div className="w-px h-3 bg-white/10" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-800">
          © 2025 Useroutr Labs
        </span>
      </footer>
    </div>
  );
}

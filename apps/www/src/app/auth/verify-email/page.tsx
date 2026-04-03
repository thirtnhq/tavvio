"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Mail, ArrowRight, RefreshCw, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthCard } from "@/components/auth/AuthCard";

gsap.registerPlugin(useGSAP);

// Stub: replace with real auth logic
async function resendVerificationEmail(_email: string): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 1000));
}

const RESEND_COOLDOWN = 60;

export default function VerifyEmailPage() {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [isVerified, setIsVerified] = useState(false);

  // Stub: in production, get email from session/query params
  const email = "you@company.com";

  useGSAP(
    () => {
      const tl = gsap.timeline();
      tl.fromTo(
        cardRef.current,
        { opacity: 0, y: 32, scale: 0.97 },
        { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: "expo.out" }
      );
      tl.from(
        ".auth-item",
        {
          opacity: 0,
          y: 12,
          stagger: 0.07,
          duration: 0.5,
          ease: "power2.out",
        },
        "-=0.4"
      );

      // Animate the mail icon
      gsap.to(".mail-icon", {
        y: -6,
        duration: 2,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });
    },
    { scope: cardRef }
  );

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  async function handleResend() {
    if (cooldown > 0 || isResending) return;
    setIsResending(true);
    setResendSuccess(false);
    try {
      await resendVerificationEmail(email);
      setResendSuccess(true);
      setCooldown(RESEND_COOLDOWN);
      gsap.fromTo(
        ".resend-success",
        { opacity: 0, y: -6 },
        { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }
      );
    } finally {
      setIsResending(false);
    }
  }

  // Simulate verification success (stub)
  function handleVerifyDemo() {
    setIsVerified(true);
    gsap.fromTo(
      ".auth-success",
      { opacity: 0, scale: 0.9 },
      { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.7)" }
    );
  }

  return (
    <div ref={cardRef} className="w-full max-w-md">
      <AuthCard>
        {isVerified ? (
          <div className="auth-success text-center py-8">
            <div className="w-14 h-14 rounded-2xl bg-green/10 border border-green/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={28} className="text-green" />
            </div>
            <h2 className="font-display font-bold text-xl sm:text-2xl text-white mb-2">
              Email verified!
            </h2>
            <p className="font-mono text-xs text-zinc-500 mb-6">
              Your account is now active.
            </p>
            <Link href="/auth/login">
              <Button
                variant="primary"
                className="w-full h-12 rounded-xl font-display group"
              >
                Go to Sign In
                <ArrowRight
                  size={18}
                  className="transition-transform group-hover:translate-x-1"
                />
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Mail icon */}
            <div className="auth-item flex justify-center mb-8">
              <div className="mail-icon w-16 h-16 rounded-2xl bg-blue/10 border border-blue/20 flex items-center justify-center">
                <Mail size={32} className="text-blue" />
              </div>
            </div>

            {/* Header */}
            <div className="auth-item text-center mb-6">
              <h1 className="font-display font-bold text-xl sm:text-2xl text-white mb-2">
                Verify your email
              </h1>
              <p className="font-serif text-sm sm:text-base text-zinc-400 leading-relaxed">
                We&apos;ve sent a verification link to{" "}
                <span className="font-display text-white">{email}</span>.
                Click the link in the email to activate your account.
              </p>
            </div>

            {/* Resend success */}
            {resendSuccess && (
              <div className="resend-success auth-item mb-4 p-3 rounded-xl border border-green/20 bg-green/5 text-center">
                <p className="font-mono text-[11px] text-green">
                  Verification email sent!
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="auth-item space-y-3">
              <Button
                variant="outline"
                className="w-full h-12 sm:h-14 rounded-xl sm:rounded-2xl border-white/10 text-zinc-300 hover:text-white hover:bg-white/5 font-display text-sm group"
                onClick={handleResend}
                disabled={isResending || cooldown > 0}
              >
                {isResending ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending…
                  </span>
                ) : cooldown > 0 ? (
                  <span className="font-mono text-xs text-zinc-600">
                    Resend in {cooldown}s
                  </span>
                ) : (
                  <>
                    <RefreshCw size={16} className="transition-transform group-hover:rotate-180 duration-300" />
                    Resend verification email
                  </>
                )}
              </Button>

              {/* Demo button to simulate verification */}
              <Button
                variant="primary"
                className="w-full h-12 sm:h-14 rounded-xl sm:rounded-2xl text-sm sm:text-base group"
                onClick={handleVerifyDemo}
              >
                I&apos;ve verified my email
                <ArrowRight
                  size={18}
                  className="transition-transform group-hover:translate-x-1"
                />
              </Button>
            </div>

            {/* Help text */}
            <div className="auth-item mt-6 pt-6 border-t border-white/5">
              <p className="font-mono text-[10px] sm:text-[11px] text-zinc-700 text-center leading-relaxed">
                Can&apos;t find the email? Check your spam folder or{" "}
                <button
                  onClick={handleResend}
                  disabled={cooldown > 0 || isResending}
                  className="text-zinc-500 hover:text-white transition-colors underline underline-offset-2 disabled:opacity-40"
                >
                  try a different address
                </button>
                .
              </p>
              <p className="font-mono text-[10px] sm:text-[11px] text-zinc-700 text-center mt-2">
                Wrong email?{" "}
                <Link
                  href="/auth/signup"
                  className="text-zinc-500 hover:text-white transition-colors underline underline-offset-2"
                >
                  Go back to sign up
                </Link>
              </p>
            </div>
          </>
        )}
      </AuthCard>
    </div>
  );
}

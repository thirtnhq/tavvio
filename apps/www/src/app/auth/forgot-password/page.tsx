"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Mail, ArrowRight, ArrowLeft, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthInput } from "@/components/auth/AuthInput";

gsap.registerPlugin(useGSAP);

// Stub: replace with real auth logic
async function requestPasswordReset(_email: string): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 1200));
}

export default function ForgotPasswordPage() {
  const cardRef = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [serverError, setServerError] = useState("");

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
    },
    { scope: cardRef }
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError("");
    if (!email) {
      setEmailError("Email is required");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Enter a valid email address");
      gsap.fromTo(
        ".auth-field-error",
        { opacity: 0, x: -6 },
        { opacity: 1, x: 0, duration: 0.3, ease: "power2.out" }
      );
      return;
    }
    setEmailError("");
    setIsLoading(true);
    try {
      await requestPasswordReset(email);
      setIsSuccess(true);
      gsap.fromTo(
        ".auth-success",
        { opacity: 0, scale: 0.9 },
        { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.7)" }
      );
    } catch {
      setServerError("Something went wrong. Please try again.");
      gsap.fromTo(
        ".auth-server-error",
        { opacity: 0, y: -8 },
        { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div ref={cardRef} className="w-full max-w-md">
      <AuthCard>
        {/* Back link */}
        <Link
          href="/auth/login"
          className="auth-item inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-zinc-600 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft size={14} />
          Back to sign in
        </Link>

        {/* Header */}
        <div className="flex items-center gap-3 mb-8 auth-item">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 flex-shrink-0">
            <KeyRound size={20} className="text-zinc-400" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl sm:text-2xl text-white leading-tight">
              Forgot password?
            </h1>
            <p className="font-mono text-[10px] sm:text-[11px] uppercase tracking-widest text-zinc-600">
              We&apos;ll send a reset link
            </p>
          </div>
        </div>

        {serverError && (
          <div className="auth-server-error mb-5 p-3 sm:p-4 rounded-xl border border-red/20 bg-red/5">
            <p className="font-mono text-[11px] sm:text-xs text-red">{serverError}</p>
          </div>
        )}

        {isSuccess ? (
          <div className="auth-success text-center py-6">
            <div className="w-14 h-14 rounded-2xl bg-blue/10 border border-blue/20 flex items-center justify-center mx-auto mb-4">
              <Mail size={28} className="text-blue" />
            </div>
            <h2 className="font-display font-bold text-lg text-white mb-2">
              Check your inbox
            </h2>
            <p className="font-mono text-xs text-zinc-500 max-w-xs mx-auto mb-6">
              If an account exists for{" "}
              <span className="text-zinc-300">{email}</span>, you&apos;ll receive
              a password reset link shortly.
            </p>
            <div className="flex flex-col gap-3">
              <Button
                variant="outline"
                className="w-full h-11 rounded-xl border-white/10 text-zinc-300 hover:text-white hover:bg-white/5 font-mono text-xs uppercase tracking-widest"
                onClick={() => {
                  setIsSuccess(false);
                  setEmail("");
                }}
              >
                Try another email
              </Button>
              <Link
                href="/auth/login"
                className="text-center font-mono text-[11px] uppercase tracking-widest text-zinc-600 hover:text-white transition-colors"
              >
                Return to sign in
              </Link>
            </div>
          </div>
        ) : (
          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            <div className="auth-item">
              <p className="font-serif text-sm sm:text-base text-zinc-400 mb-5 leading-relaxed">
                Enter the email address associated with your account and
                we&apos;ll send you a link to reset your password.
              </p>
              <AuthInput
                label="Email address"
                type="email"
                placeholder="you@company.com"
                icon={<Mail size={18} />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={emailError}
                autoComplete="email"
                aria-label="Email address"
              />
            </div>

            <div className="auth-item pt-2">
              <Button
                type="submit"
                variant="primary"
                className="w-full h-12 sm:h-14 rounded-xl sm:rounded-2xl text-sm sm:text-base group"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending link…
                  </span>
                ) : (
                  <>
                    Send Reset Link
                    <ArrowRight
                      size={18}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </AuthCard>
    </div>
  );
}

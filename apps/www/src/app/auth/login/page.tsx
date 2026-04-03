"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Mail, Lock, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthInput } from "@/components/auth/AuthInput";

gsap.registerPlugin(useGSAP);

// Stub: replace with real auth logic
async function loginUser(_email: string, _password: string): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 1200));
}

export default function LoginPage() {
  const cardRef = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
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

  function validate() {
    const errs: typeof errors = {};
    if (!email) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errs.email = "Enter a valid email address";
    if (!password) errs.password = "Password is required";
    else if (password.length < 8) errs.password = "Password must be at least 8 characters";
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError("");
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      gsap.fromTo(
        ".auth-field-error",
        { opacity: 0, x: -6 },
        { opacity: 1, x: 0, duration: 0.3, stagger: 0.05, ease: "power2.out" }
      );
      return;
    }
    setErrors({});
    setIsLoading(true);
    try {
      await loginUser(email, password);
      setIsSuccess(true);
      gsap.fromTo(
        ".auth-success",
        { opacity: 0, scale: 0.9 },
        { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.7)" }
      );
    } catch {
      setServerError("Invalid email or password. Please try again.");
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
        {/* Header */}
        <div className="flex items-center gap-3 mb-8 auth-item">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 flex-shrink-0">
            <ShieldCheck size={20} className="text-zinc-400" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl sm:text-2xl text-white leading-tight">
              Welcome back
            </h1>
            <p className="font-mono text-[10px] sm:text-[11px] uppercase tracking-widest text-zinc-600">
              Sign in to your account
            </p>
          </div>
        </div>

        {/* Server error */}
        {serverError && (
          <div className="auth-server-error mb-5 p-3 sm:p-4 rounded-xl border border-red/20 bg-red/5">
            <p className="font-mono text-[11px] sm:text-xs text-red">{serverError}</p>
          </div>
        )}

        {/* Success state */}
        {isSuccess ? (
          <div className="auth-success text-center py-8">
            <div className="w-14 h-14 rounded-2xl bg-green/10 border border-green/20 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck size={28} className="text-green" />
            </div>
            <h2 className="font-display font-bold text-lg text-white mb-2">
              Signed in!
            </h2>
            <p className="font-mono text-xs text-zinc-500">
              Redirecting you to your dashboard…
            </p>
          </div>
        ) : (
          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            <div className="auth-item">
              <AuthInput
                label="Email"
                type="email"
                placeholder="you@company.com"
                icon={<Mail size={18} />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
                autoComplete="email"
                aria-label="Email address"
              />
            </div>
            <div className="auth-item">
              <AuthInput
                label="Password"
                type="password"
                placeholder="••••••••"
                icon={<Lock size={18} />}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
                autoComplete="current-password"
                aria-label="Password"
              />
              <div className="flex justify-end mt-2">
                <Link
                  href="/auth/forgot-password"
                  className="font-mono text-[10px] sm:text-[11px] uppercase tracking-widest text-zinc-600 hover:text-blue transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
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
                    Signing in…
                  </span>
                ) : (
                  <>
                    Sign In
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

        {/* Divider */}
        {!isSuccess && (
          <>
            <div className="auth-item flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-white/5" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-700">
                or
              </span>
              <div className="flex-1 h-px bg-white/5" />
            </div>

            <p className="auth-item text-center font-mono text-[11px] sm:text-xs text-zinc-600">
              Don&apos;t have an account?{" "}
              <Link
                href="/auth/signup"
                className="text-blue hover:text-blue2 transition-colors underline underline-offset-2"
              >
                Create one
              </Link>
            </p>
          </>
        )}
      </AuthCard>
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Lock, ArrowRight, ShieldCheck, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthInput } from "@/components/auth/AuthInput";

gsap.registerPlugin(useGSAP);

// Stub: replace with real auth logic (token would come from URL params)
async function resetPassword(_password: string, _token: string): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 1200));
}

const requirements = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One number", test: (p: string) => /[0-9]/.test(p) },
  { label: "One special character", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export default function ResetPasswordPage() {
  const cardRef = useRef<HTMLDivElement>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{
    password?: string;
    confirmPassword?: string;
  }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [serverError, setServerError] = useState("");

  // Stub: in production, extract token from URL search params
  const token = "stub-reset-token";

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
    if (!password) errs.password = "Password is required";
    else if (password.length < 8)
      errs.password = "Password must be at least 8 characters";
    if (!confirmPassword) errs.confirmPassword = "Please confirm your password";
    else if (confirmPassword !== password)
      errs.confirmPassword = "Passwords do not match";
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
      await resetPassword(password, token);
      setIsSuccess(true);
      gsap.fromTo(
        ".auth-success",
        { opacity: 0, scale: 0.9 },
        { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.7)" }
      );
    } catch {
      setServerError("Reset link is invalid or expired. Please request a new one.");
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
            <Lock size={20} className="text-zinc-400" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl sm:text-2xl text-white leading-tight">
              Reset password
            </h1>
            <p className="font-mono text-[10px] sm:text-[11px] uppercase tracking-widest text-zinc-600">
              Choose a new password
            </p>
          </div>
        </div>

        {serverError && (
          <div className="auth-server-error mb-5 p-3 sm:p-4 rounded-xl border border-red/20 bg-red/5">
            <p className="font-mono text-[11px] sm:text-xs text-red">{serverError}</p>
            <Link
              href="/auth/forgot-password"
              className="inline-block mt-2 font-mono text-[10px] uppercase tracking-widest text-blue hover:text-blue2 transition-colors"
            >
              Request new link →
            </Link>
          </div>
        )}

        {isSuccess ? (
          <div className="auth-success text-center py-6">
            <div className="w-14 h-14 rounded-2xl bg-green/10 border border-green/20 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck size={28} className="text-green" />
            </div>
            <h2 className="font-display font-bold text-lg text-white mb-2">
              Password updated!
            </h2>
            <p className="font-mono text-xs text-zinc-500 mb-6">
              Your password has been successfully reset.
            </p>
            <Link href="/auth/login">
              <Button
                variant="primary"
                className="w-full h-12 rounded-xl font-display group"
              >
                Sign in now
                <ArrowRight
                  size={18}
                  className="transition-transform group-hover:translate-x-1"
                />
              </Button>
            </Link>
          </div>
        ) : (
          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            <div className="auth-item">
              <AuthInput
                label="New Password"
                type="password"
                placeholder="••••••••"
                icon={<Lock size={18} />}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
                autoComplete="new-password"
                aria-label="New password"
              />
            </div>

            {/* Password requirements checklist */}
            {password && (
              <div className="auth-item px-1 space-y-1.5">
                {requirements.map((req) => {
                  const met = req.test(password);
                  return (
                    <div
                      key={req.label}
                      className="flex items-center gap-2 transition-opacity"
                    >
                      <CheckCircle
                        size={13}
                        className={`flex-shrink-0 transition-colors ${met ? "text-green" : "text-zinc-700"}`}
                      />
                      <span
                        className={`font-mono text-[10px] transition-colors ${met ? "text-zinc-400" : "text-zinc-700"}`}
                      >
                        {req.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="auth-item">
              <AuthInput
                label="Confirm New Password"
                type="password"
                placeholder="••••••••"
                icon={<Lock size={18} />}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={errors.confirmPassword}
                autoComplete="new-password"
                aria-label="Confirm new password"
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
                    Resetting…
                  </span>
                ) : (
                  <>
                    Reset Password
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

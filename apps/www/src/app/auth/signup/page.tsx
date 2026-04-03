"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Mail, Lock, User, ArrowRight, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthInput } from "@/components/auth/AuthInput";

gsap.registerPlugin(useGSAP);

// Stub: replace with real auth logic
async function registerUser(
  _name: string,
  _email: string,
  _password: string
): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 1400));
}

export default function SignupPage() {
  const cardRef = useRef<HTMLDivElement>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
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

  function getPasswordStrength(pw: string) {
    if (!pw) return null;
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return { label: "Weak", color: "bg-red", width: "w-1/4" };
    if (score === 2) return { label: "Fair", color: "bg-amber", width: "w-2/4" };
    if (score === 3) return { label: "Good", color: "bg-teal", width: "w-3/4" };
    return { label: "Strong", color: "bg-green", width: "w-full" };
  }

  function validate() {
    const errs: typeof errors = {};
    if (!name.trim()) errs.name = "Name is required";
    if (!email) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errs.email = "Enter a valid email address";
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
      await registerUser(name, email, password);
      setIsSuccess(true);
      gsap.fromTo(
        ".auth-success",
        { opacity: 0, scale: 0.9 },
        { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.7)" }
      );
    } catch {
      setServerError("Registration failed. Please try again.");
      gsap.fromTo(
        ".auth-server-error",
        { opacity: 0, y: -8 },
        { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }
      );
    } finally {
      setIsLoading(false);
    }
  }

  const strength = getPasswordStrength(password);

  return (
    <div ref={cardRef} className="w-full max-w-md">
      <AuthCard>
        {/* Header */}
        <div className="flex items-center gap-3 mb-8 auth-item">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 flex-shrink-0">
            <UserPlus size={20} className="text-zinc-400" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl sm:text-2xl text-white leading-tight">
              Create account
            </h1>
            <p className="font-mono text-[10px] sm:text-[11px] uppercase tracking-widest text-zinc-600">
              Get started for free
            </p>
          </div>
        </div>

        {serverError && (
          <div className="auth-server-error mb-5 p-3 sm:p-4 rounded-xl border border-red/20 bg-red/5">
            <p className="font-mono text-[11px] sm:text-xs text-red">{serverError}</p>
          </div>
        )}

        {isSuccess ? (
          <div className="auth-success text-center py-8">
            <div className="w-14 h-14 rounded-2xl bg-green/10 border border-green/20 flex items-center justify-center mx-auto mb-4">
              <Mail size={28} className="text-green" />
            </div>
            <h2 className="font-display font-bold text-lg text-white mb-2">
              Check your inbox
            </h2>
            <p className="font-mono text-xs text-zinc-500 max-w-xs mx-auto">
              We sent a verification link to{" "}
              <span className="text-zinc-300">{email}</span>. Click it to
              activate your account.
            </p>
            <Link
              href="/auth/verify-email"
              className="inline-block mt-6 font-mono text-[11px] uppercase tracking-widest text-blue hover:text-blue2 transition-colors"
            >
              Continue to verification →
            </Link>
          </div>
        ) : (
          <form className="space-y-4 sm:space-y-5" onSubmit={handleSubmit} noValidate>
            <div className="auth-item">
              <AuthInput
                label="Full Name"
                type="text"
                placeholder="Jane Smith"
                icon={<User size={18} />}
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={errors.name}
                autoComplete="name"
                aria-label="Full name"
              />
            </div>
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
            <div className="auth-item space-y-1.5">
              <AuthInput
                label="Password"
                type="password"
                placeholder="••••••••"
                icon={<Lock size={18} />}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
                autoComplete="new-password"
                aria-label="Password"
              />
              {strength && !errors.password && (
                <div className="px-1 space-y-1">
                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${strength.color} ${strength.width}`}
                    />
                  </div>
                  <p className="font-mono text-[10px] text-zinc-700">
                    Strength:{" "}
                    <span className="text-zinc-500">{strength.label}</span>
                  </p>
                </div>
              )}
            </div>
            <div className="auth-item">
              <AuthInput
                label="Confirm Password"
                type="password"
                placeholder="••••••••"
                icon={<Lock size={18} />}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={errors.confirmPassword}
                autoComplete="new-password"
                aria-label="Confirm password"
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
                    Creating account…
                  </span>
                ) : (
                  <>
                    Create Account
                    <ArrowRight
                      size={18}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </>
                )}
              </Button>
              <p className="text-center font-mono text-[10px] sm:text-[11px] text-zinc-700 mt-3 uppercase tracking-wider">
                By signing up, you agree to our{" "}
                <span className="text-zinc-500 underline cursor-pointer">
                  Terms of Service
                </span>
              </p>
            </div>
          </form>
        )}

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
              Already have an account?{" "}
              <Link
                href="/auth/login"
                className="text-blue hover:text-blue2 transition-colors underline underline-offset-2"
              >
                Sign in
              </Link>
            </p>
          </>
        )}
      </AuthCard>
    </div>
  );
}

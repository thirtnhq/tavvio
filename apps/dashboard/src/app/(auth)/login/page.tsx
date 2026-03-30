"use client";

import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { z } from "zod";
import { Button, Input } from "@tavvio/ui";
import { useAuth } from "@/providers/AuthProvider";
import Image from "next/image";
import Logo from "../../../../public/logo.svg"

// ── Zod schema ────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFields = z.infer<typeof loginSchema>;
type FormErrors = Partial<Record<keyof LoginFields, string>>;

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const { login } = useAuth();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const nextEmail = searchParams.get("email");
    if (nextEmail) {
      setEmail(nextEmail);
    }
  }, [searchParams]);

  const validate = (): boolean => {
    const result = loginSchema.safeParse({ email, password });
    if (result.success) {
      setErrors({});
      return true;
    }
    const fieldErrors: FormErrors = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0] as keyof LoginFields;
      if (!fieldErrors[field]) fieldErrors[field] = issue.message;
    }
    setErrors(fieldErrors);
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await login(email, password);
      // redirect handled by AuthProvider
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-[460px]">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex items-center justify-center  text-base font-bold text-primary-foreground shadow-[var(--shadow-md)]">
            <Image src={Logo} alt="logo" width={120} height={100}/>
          </div>
          <div className="space-y-2">
            <h1 className="font-display text-2xl text-zinc-600 font-bold text-foreground">
              Sign in to your account
            </h1>
          </div>
        </div>

        <div className="bg-[#080808] border border-white/5 rounded-2xl sm:rounded-3xl lg:rounded-[40px] p-6 sm:p-8 lg:p-12 shadow-2xl">
          {serverError && (
            <div
              className="mb-4 rounded-[var(--radius-md)] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              role="alert"
            >
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <Input
              id="email"
              type="email"
              label="Email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (errors.email) {
                  setErrors((prev) => ({ ...prev, email: undefined }));
                }
              }}
              placeholder="merchant@company.com"
              error={errors.email}
              autoComplete="email"
              required
            />

            <div className="space-y-2">
              <Input
                id="password"
                type="password"
                label="Password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (errors.password) {
                    setErrors((prev) => ({ ...prev, password: undefined }));
                  }
                }}
                placeholder="Enter your password"
                error={errors.password}
                autoComplete="current-password"
                required
              />
              <div className="flex justify-end">
                <Link
                  href="/forgot-password"
                  className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button type="submit" className="w-full bg-white text-black" size="lg" loading={isSubmitting}>
              {isSubmitting ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="inline-flex items-center gap-1 font-semibold text-primary transition-colors hover:text-primary/80"
          >
            Sign up
            <ArrowRight size={14} />
          </Link>
        </p>
      </div>
    </div>
  );
}

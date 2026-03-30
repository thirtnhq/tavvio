"use client";

import Link from "next/link";
import { ArrowRight, Check } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { z } from "zod";
import { Button, Input } from "@tavvio/ui";
import { useAuth } from "@/providers/AuthProvider";
import Image from "next/image";
import Logo from "../../../../public/logo.svg"


const registerSchema = z.object({
  companyName: z.string().min(2, "Business name must be at least 2 characters"),
  name: z.string().min(2, "Your name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Minimum 8 characters")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[0-9]/, "Must contain a number"),
});

type RegisterFields = z.infer<typeof registerSchema>;
type FormErrors = Partial<Record<keyof RegisterFields, string>>;

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const { register } = useAuth();
  const searchParams = useSearchParams();

  const [companyName, setCompanyName] = useState("");
  const [name, setName] = useState("");
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

  const clearFieldError = (field: keyof FormErrors) =>
    setErrors((prev) => ({ ...prev, [field]: undefined }));

  const validate = (): boolean => {
    const result = registerSchema.safeParse({ companyName, name, email, password });
    if (result.success) {
      setErrors({});
      return true;
    }
    const fieldErrors: FormErrors = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0] as keyof RegisterFields;
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
      await register({ companyName, name, email, password });
      // redirect to /verify handled by AuthProvider
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Password strength hints
  const passwordRules = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "Uppercase letter", met: /[A-Z]/.test(password) },
    { label: "One number", met: /[0-9]/.test(password) },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-[460px]">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
           <div className="flex items-center justify-center  text-base font-bold text-primary-foreground shadow-[var(--shadow-md)]">
              <Image src={Logo} alt="logo" width={120} height={100}/>
            </div>
          <div className="space-y-2">
            <h1 className="font-display text-zinc-600 text-2xl font-bold text-foreground">
              Create your account
            </h1>
          </div>
        </div>

        <div className="rbg-[#080808] border border-white/5 rounded-2xl sm:rounded-3xl lg:rounded-[40px] p-6 sm:p-8 lg:p-12 shadow-2xl">
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
              id="companyName"
              type="text"
              label="Business Name"
              value={companyName}
              onChange={(e) => {
                setCompanyName(e.target.value);
                clearFieldError("companyName");
              }}
              placeholder="Acme Corp"
              error={errors.companyName}
              autoComplete="organization"
              required
            />

            <Input
              id="name"
              type="text"
              label="Your Name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                clearFieldError("name");
              }}
              placeholder="Jane Doe"
              error={errors.name}
              autoComplete="name"
              required
            />

            <Input
              id="email"
              type="email"
              label="Email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearFieldError("email");
              }}
              placeholder="jane@acme.com"
              error={errors.email}
              autoComplete="email"
              required
            />

            <div className="space-y-3">
              <Input
                id="password"
                type="password"
                label="Password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearFieldError("password");
                }}
                placeholder="Create a strong password"
                error={errors.password}
                helperText="Min 8 chars, 1 uppercase, 1 number"
                autoComplete="new-password"
                required
              />

              <div className="rounded-[var(--radius-md)] bg-secondary/50 px-3 py-2">
                <ul className="space-y-1.5">
                  {passwordRules.map((rule) => (
                    <li
                      key={rule.label}
                      className={`flex items-center gap-2 text-xs ${
                        rule.met ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                          rule.met ? "border-primary/30 bg-primary/10" : "border-border"
                        }`}
                      >
                        <Check size={10} weight={rule.met ? "bold" : "regular"} />
                      </span>
                      {rule.label}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <Button type="submit" className="w-full bg-white text-black" size="lg" loading={isSubmitting}>
              {isSubmitting ? "Creating account..." : "Create Account"}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="inline-flex items-center gap-1 font-semibold text-primary transition-colors hover:text-primary/80"
          >
            Sign in
            <ArrowRight size={14} />
          </Link>
        </p>
      </div>
    </div>
  );
}

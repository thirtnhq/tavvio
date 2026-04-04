"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { z } from "zod";

import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@useroutr/ui";
import Logo from "../../../../public/logo.svg";

const schema = z
  .object({
    password: z
      .string()
      .min(8, "Minimum 8 characters")
      .regex(/[A-Z]/, "Must contain an uppercase letter")
      .regex(/[0-9]/, "Must contain a number"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormErrors = { password?: string; confirmPassword?: string };

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const resetToken = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const passwordRules = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "Uppercase letter", met: /[A-Z]/.test(password) },
    { label: "One number", met: /[0-9]/.test(password) },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");

    const result = schema.safeParse({ password, confirmPassword });
    if (!result.success) {
      const fieldErrors: FormErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof FormErrors;
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    try {
      await api.post("/auth/reset-password", { token: resetToken, password });
      setIsSuccess(true);
    } catch (err) {
      setServerError(
        err instanceof Error
          ? err.message
          : "Something went wrong. The link may have expired."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!resetToken) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
        <div className="w-full max-w-sm text-center">
          <FieldGroup>
            <div className="flex flex-col items-center gap-2">
              <Link href="/" className="flex flex-col items-center gap-2 font-medium">
                <Image src={Logo} alt="Useroutr" width={120} height={40} />
              </Link>
              <h1 className="text-xl font-bold">Invalid reset link</h1>
              <FieldDescription>
                This password reset link is invalid or has expired.
              </FieldDescription>
            </div>
            <Field>
              <Button className="w-full" asChild>
                <Link href="/forgot-password">Request a new link</Link>
              </Button>
            </Field>
          </FieldGroup>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
        <div className="w-full max-w-sm text-center">
          <FieldGroup>
            <div className="flex flex-col items-center gap-2">
              <Link href="/" className="flex flex-col items-center gap-2 font-medium">
                <Image src={Logo} alt="Useroutr" width={120} height={40} />
              </Link>
              <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                <Check className="size-6 text-primary" />
              </div>
              <h1 className="text-xl font-bold">Password reset</h1>
              <FieldDescription>
                Your password has been updated. You can now sign in with your new
                password.
              </FieldDescription>
            </div>
            <Field>
              <Button className="w-full" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
            </Field>
          </FieldGroup>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <form onSubmit={handleSubmit} noValidate>
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <Link href="/" className="flex flex-col items-center gap-2 font-medium">
                  <Image src={Logo} alt="Useroutr" width={120} height={40} />
                </Link>
                <h1 className="text-xl font-bold">Set a new password</h1>
                <FieldDescription>
                  Choose a strong password for your account.
                </FieldDescription>
              </div>

              {serverError && (
                <div
                  className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                  role="alert"
                >
                  {serverError}
                </div>
              )}

              <Field>
                <FieldLabel htmlFor="password">New Password</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password)
                      setErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  autoComplete="new-password"
                  required
                />
                {errors.password && <FieldError>{errors.password}</FieldError>}
                <div className="rounded-md bg-muted/50 px-3 py-2">
                  <ul className="space-y-1.5">
                    {passwordRules.map((rule) => (
                      <li
                        key={rule.label}
                        className={cn(
                          "flex items-center gap-2 text-xs",
                          rule.met ? "text-primary" : "text-muted-foreground"
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-4 items-center justify-center rounded-full border",
                            rule.met
                              ? "border-primary/30 bg-primary/10"
                              : "border-border"
                          )}
                        >
                          <Check className="size-2.5" />
                        </span>
                        {rule.label}
                      </li>
                    ))}
                  </ul>
                </div>
              </Field>

              <Field>
                <FieldLabel htmlFor="confirm-password">
                  Confirm Password
                </FieldLabel>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errors.confirmPassword)
                      setErrors((prev) => ({
                        ...prev,
                        confirmPassword: undefined,
                      }));
                  }}
                  autoComplete="new-password"
                  required
                />
                {errors.confirmPassword && (
                  <FieldError>{errors.confirmPassword}</FieldError>
                )}
              </Field>

              <Field>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Resetting..." : "Reset Password"}
                </Button>
              </Field>
            </FieldGroup>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            <Link
              href="/login"
              className="inline-flex items-center gap-1 font-semibold text-primary transition-colors hover:text-primary/80"
            >
              <ArrowLeft className="size-3.5" />
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { ArrowLeft, EnvelopeSimple } from "@phosphor-icons/react";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, buttonVariants, cn } from "@tavvio/ui";
import { useAuth } from "@/providers/AuthProvider";
import Logo from "../../../../public/logo.svg"
import Image from "next/image";

export default function VerifyPage() {
  const searchParams = useSearchParams();
  const { merchant, verificationEmail, resendVerificationEmail } = useAuth();
  const [status, setStatus] = useState<{ tone: "success" | "error"; message: string } | null>(
    null
  );
  const [isResending, setIsResending] = useState(false);

  const email = searchParams.get("email") ?? verificationEmail ?? merchant?.email ?? null;
  const registerHref = email ? `/register?email=${encodeURIComponent(email)}` : "/register";

  const handleResend = async () => {
    setStatus(null);
    setIsResending(true);

    try {
      await resendVerificationEmail();
      setStatus({
        tone: "success",
        message: "A fresh verification email is on its way.",
      });
    } catch (error) {
      setStatus({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "We could not resend the verification email. Please try again.",
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-[460px]">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
       
          <div className="space-y-2">
            <div className="flex items-center justify-center  text-base font-bold text-primary-foreground shadow-[var(--shadow-md)]">
            <Image src={Logo} alt="logo" width={120} height={100}/>
          </div>
            <div className="flex items-center justify-center gap-2 text-foreground">
              <EnvelopeSimple size={24} weight="duotone" className="text-primary" />
              <h1 className="font-display text-2xl font-bold text-zinc-600">Check your email</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              {email
                ? `We sent a verification link to ${email}.`
                : "We sent a verification link to your email address."}
            </p>
          </div>
        </div>

        <div className="g-[#080808] border border-white/5 rounded-2xl sm:rounded-3xl lg:rounded-[40px] p-6 sm:p-8 lg:p-12 shadow-2xl">
          <div className="space-y-4">
            <p className="text-sm leading-6 text-muted-foreground text-center">
              Click the link in the email to verify your account and get started.
            </p>

            {status && (
              <div
                className={`rounded-[var(--radius-md)] px-4 py-3 text-sm ${
                  status.tone === "success"
                    ? "border border-primary/20 bg-primary/10 text-primary"
                    : "border border-destructive/30 bg-destructive/10 text-destructive"
                }`}
                role="status"
              >
                {status.message}
              </div>
            )}

            <div className="space-y-3">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                size="lg"
                loading={isResending}
                onClick={handleResend}
                disabled={!email}
              >
                {isResending ? "Resending..." : "Resend Email"}
              </Button>

              <Link
                href={registerHref}
                className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full bg-white text-black")}
              >
                Change email address
              </Link>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link
            href="/login"
            className="inline-flex items-center gap-1 font-semibold text-primary transition-colors hover:text-primary/80"
          >
            <ArrowLeft size={14} />
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

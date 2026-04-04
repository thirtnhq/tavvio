"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Mail } from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp";
import { FieldDescription, FieldGroup } from "@useroutr/ui";
import Logo from "../../../../public/logo.svg";

export default function VerifyPage() {
  const searchParams = useSearchParams();
  const { merchant, verificationEmail, resendVerificationEmail, verifyOtp } =
    useAuth();

  const [otp, setOtp] = useState("");
  const [status, setStatus] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const email =
    searchParams.get("email") ?? verificationEmail ?? merchant?.email ?? null;
  const registerHref = email
    ? `/register?email=${encodeURIComponent(email)}`
    : "/register";

  const handleResend = async () => {
    setStatus(null);
    setIsResending(true);

    try {
      await resendVerificationEmail();
      setOtp("");
      setStatus({
        tone: "success",
        message: "A fresh verification code is on its way.",
      });
    } catch (error) {
      setStatus({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "We could not resend the code. Please try again.",
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleVerify = async (code: string) => {
    if (!email || code.length !== 6) return;

    setStatus(null);
    setIsVerifying(true);

    try {
      await verifyOtp(email, code);
      // Redirect handled by AuthProvider
    } catch (error) {
      setOtp("");
      setStatus({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Invalid or expired code. Please try again.",
      });
      setIsVerifying(false);
    }
  };

  const handleOtpChange = (value: string) => {
    setOtp(value);
    if (status?.tone === "error") setStatus(null);
  };

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <FieldGroup>
            <div className="flex flex-col items-center gap-2 text-center">
              <Link
                href="/"
                className="flex flex-col items-center gap-2 font-medium"
              >
                <Image src={Logo} alt="Useroutr" width={120} height={40} />
                <span className="sr-only">Useroutr</span>
              </Link>
              <div className="flex items-center gap-2">
                <Mail className="size-5 text-primary" />
                <h1 className="text-xl font-bold">Check your email</h1>
              </div>
              <FieldDescription>
                {email
                  ? <>We sent a 6-digit code to <strong>{email}</strong>.</>
                  : "We sent a verification code to your email address."}
              </FieldDescription>
            </div>

            {status && (
              <div
                className={cn(
                  "rounded-md px-4 py-3 text-sm",
                  status.tone === "success"
                    ? "border border-primary/20 bg-primary/10 text-primary"
                    : "border border-destructive/30 bg-destructive/10 text-destructive"
                )}
                role="status"
              >
                {status.message}
              </div>
            )}

            <div className="flex flex-col items-center gap-4">
              <FieldDescription>
                Enter the code below to verify your account
              </FieldDescription>
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={handleOtpChange}
                onComplete={handleVerify}
                disabled={isVerifying}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                </InputOTPGroup>
                <InputOTPSeparator />
                <InputOTPGroup>
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
              {isVerifying && (
                <p className="text-sm text-muted-foreground">Verifying...</p>
              )}
            </div>

            <div className="space-y-3">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={isResending || !email}
                onClick={handleResend}
              >
                {isResending ? "Resending..." : "Resend Code"}
              </Button>

              <Button variant="outline" className="w-full" asChild>
                <Link href={registerHref}>Change email address</Link>
              </Button>
            </div>
          </FieldGroup>

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

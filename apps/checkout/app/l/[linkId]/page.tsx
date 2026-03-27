"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LinkCard } from "@/components/LinkCard";
import { ExpiryBadge } from "@/components/ExpiryBadge";
import { LinkError } from "@/components/LinkError";
import { TrustBadges } from "@/components/TrustBadges";
import { LinkSkeleton } from "@/components/LinkSkeleton";
import { api } from "@/lib/api";
import type { PaymentLink, CreatePaymentRequest } from "@/lib/types";

interface PaymentLinkPageProps {
  params: Promise<{ linkId: string }>;
}

export default function PaymentLinkPage({ params }: PaymentLinkPageProps) {
  const router = useRouter();
  const [linkId, setLinkId] = useState<string>("");
  const [linkData, setLinkData] = useState<PaymentLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enteredAmount, setEnteredAmount] = useState<number>(0);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [amountError, setAmountError] = useState("");
  const [creating, setCreating] = useState(false);

  // Unwrap params
  useEffect(() => {
    params.then((p) => setLinkId(p.linkId));
  }, [params]);

  // Fetch link data
  useEffect(() => {
    if (!linkId) return;

    const fetchLinkData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const data = await api.get<PaymentLink>(`/pay/${linkId}`);
        
        // Check if link is valid
        if (!data.active) {
          setError("inactive");
          return;
        }
        
        if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
          setError("expired");
          return;
        }
        
        if (data.redeemed && data.singleUse) {
          setError("redeemed");
          return;
        }
        
        setLinkData(data);
      } catch (err) {
        console.error("Failed to fetch link data:", err);
        setError("not-found");
      } finally {
        setLoading(false);
      }
    };

    fetchLinkData();
  }, [linkId]);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (emailError && value.trim()) {
      setEmailError("");
    }
  };

  const handleAmountChange = (amount: number) => {
    setEnteredAmount(amount);
    if (amountError && amount > 0) {
      setAmountError("");
    }
  };

  const handleCreatePayment = async () => {
    if (!linkData) return;
    
    // Reset errors
    setEmailError("");
    setAmountError("");
    
    // Validate email
    if (!email.trim()) {
      setEmailError("Email is required");
      return;
    }
    
    if (!validateEmail(email.trim())) {
      setEmailError("Please enter a valid email address");
      return;
    }
    
    // Validate amount for open amount links
    if (!linkData.amount && (!enteredAmount || enteredAmount <= 0)) {
      setAmountError("Please enter a valid amount");
      return;
    }

    try {
      setCreating(true);
      
      const paymentData: CreatePaymentRequest = {
        linkId,
        email: email.trim(),
      };
      
      // Add amount for open amount links
      if (!linkData.amount) {
        paymentData.amount = enteredAmount;
      }
      
      const response = await api.post<{ id: string }>("/v1/payments", paymentData);
      
      // Redirect to checkout flow
      router.push(`/${response.id}`);
    } catch (err) {
      console.error("Failed to create payment:", err);
      // TODO: Show error toast or inline error message
      setEmailError("Failed to create payment. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  // Show error states
  if (error) {
    return (
      <LinkError 
        type={error as any} 
        expiryDate={linkData?.expiresAt} 
      />
    );
  }

  // Show loading state
  if (loading) {
    return <LinkSkeleton />;
  }

  if (!linkData) return null;

  const isOpenAmount = !linkData.amount;
  const isValidAmount = isOpenAmount ? enteredAmount > 0 : true;
  const isValidEmail = email.trim().length > 0;
  const canProceed = isValidAmount && isValidEmail && !creating;

  return (
    <div className="flex min-h-screen justify-center bg-muted/30 px-4 py-8 sm:px-8">
      <div className="w-full max-w-[460px] space-y-6">
        {/* Merchant branding */}
        <div className="text-center">
          {linkData.merchantLogo ? (
            <img
              src={linkData.merchantLogo}
              alt={`${linkData.merchantName} logo`}
              className="mx-auto h-12 w-12 rounded-lg object-cover"
            />
          ) : (
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
              <span className="text-lg font-semibold text-primary-foreground">
                {linkData.merchantName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <h2 className="mt-2 text-lg font-medium text-foreground">
            {linkData.merchantName}
          </h2>
        </div>

        {/* Link card */}
        <LinkCard
          merchantName={linkData.merchantName}
          merchantLogo={linkData.merchantLogo}
          description={linkData.description}
          amount={linkData.amount}
          currency={linkData.currency}
          isOpenAmount={isOpenAmount}
          onAmountChange={handleAmountChange}
          enteredAmount={enteredAmount}
          amountError={amountError}
        />

        {/* Email input */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Your email
              </label>
              <input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                className={`w-full rounded-lg border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 ${
                  emailError
                    ? "border-destructive focus:border-destructive focus:ring-destructive"
                    : "border-border bg-background focus:border-primary focus:ring-primary"
                }`}
                required
              />
              {emailError && (
                <p className="text-xs text-destructive">{emailError}</p>
              )}
            </div>

            <button
              onClick={handleCreatePayment}
              disabled={!canProceed}
              className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating
                ? "Creating payment..."
                : isOpenAmount
                ? "Continue to Payment"
                : "Pay Now"}
            </button>
          </div>
        </div>

        {/* Expiry badge */}
        {linkData.expiresAt && (
          <div className="flex justify-center">
            <ExpiryBadge expiresAt={linkData.expiresAt} />
          </div>
        )}

        <TrustBadges />
      </div>
    </div>
  );
}

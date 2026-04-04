"use client";

import { useEffect, useState } from "react";
import { Button, Input, Skeleton, useToast } from "@useroutr/ui";
import { useMerchantProfile, useUpdateBranding } from "@/hooks/useSettings";
import { motion } from "framer-motion";
import {
  ImageIcon,
  Trash2,
  Palette,
  Eye,
  CreditCard,
  Landmark,
  Bitcoin,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.35, ease: "easeOut" },
  }),
};

export default function BrandingPage() {
  const { toast } = useToast();
  const { data: merchant, isLoading: isLoadingProfile } =
    useMerchantProfile();
  const updateBranding = useUpdateBranding();

  const [logoUrl, setLogoUrl] = useState("");
  const [brandColor, setBrandColor] = useState("#007BFF");

  useEffect(() => {
    if (merchant) {
      setLogoUrl(merchant.logoUrl ?? "");
      setBrandColor(merchant.brandColor ?? "#007BFF");
    }
  }, [merchant]);

  const hasChanges =
    merchant &&
    (logoUrl !== (merchant.logoUrl ?? "") ||
      brandColor !== (merchant.brandColor ?? "#007BFF"));

  const handleSave = () => {
    updateBranding.mutate(
      { logoUrl: logoUrl || undefined, brandColor },
      {
        onSuccess: () => toast("Branding settings saved.", "success"),
        onError: (err) =>
          toast(
            err.message || "Failed to save branding settings.",
            "error",
          ),
      },
    );
  };

  if (isLoadingProfile) {
    return (
      <div className="space-y-6">
        <div className="surface p-6 space-y-4">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="surface p-6 space-y-4">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="surface p-6 space-y-4">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  const paymentMethods = [
    { label: "Card", icon: CreditCard },
    { label: "Bank Transfer", icon: Landmark },
    { label: "Crypto", icon: Bitcoin },
  ];

  return (
    <div className="space-y-6">
      {/* Logo */}
      <motion.div
        className="surface p-6"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={0}
      >
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple/10">
            <ImageIcon size={18} className="text-purple" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Logo</h3>
            <p className="text-xs text-muted-foreground">
              Shown on hosted checkout and payment links
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {logoUrl && (
            <div className="relative inline-block">
              <div className="overflow-hidden rounded-2xl border border-border/60 bg-secondary/30 p-4">
                <img
                  src={logoUrl}
                  alt="Brand logo"
                  className="h-24 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
              <button
                onClick={() => setLogoUrl("")}
                className="absolute -right-2 -top-2 rounded-full bg-destructive p-1.5 text-destructive-foreground shadow-md hover:scale-110 transition-transform"
              >
                <Trash2 size={12} />
              </button>
            </div>
          )}
          <Input
            label="Logo URL"
            placeholder="https://your-cdn.com/logo.png"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
          />
        </div>
      </motion.div>

      {/* Brand Color */}
      <motion.div
        className="surface p-6"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={1}
      >
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal/10">
            <Palette size={18} className="text-teal" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Brand Color</h3>
            <p className="text-xs text-muted-foreground">
              Used as accent color on checkout pages
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-4">
          <label className="relative cursor-pointer group">
            <input
              type="color"
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
            <div
              className="h-11 w-11 rounded-xl border-2 border-border/60 shadow-sm transition-all group-hover:scale-105 group-hover:shadow-md"
              style={{ backgroundColor: brandColor }}
            />
          </label>
          <Input
            value={brandColor}
            onChange={(e) => setBrandColor(e.target.value)}
            placeholder="#007BFF"
            className="w-36"
          />
          <div
            className="hidden sm:flex h-8 items-center rounded-lg px-3 text-xs font-medium text-white"
            style={{ backgroundColor: brandColor }}
          >
            Preview
          </div>
        </div>
      </motion.div>

      {/* Preview */}
      <motion.div
        className="surface p-6"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={2}
      >
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue/10">
            <Eye size={18} className="text-blue" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Preview</h3>
            <p className="text-xs text-muted-foreground">
              How your branding will appear on checkout
            </p>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-border/60 bg-background p-6">
          <div className="mx-auto max-w-sm space-y-5">
            {/* Header */}
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="h-8 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary">
                  <ImageIcon size={16} className="text-muted-foreground" />
                </div>
              )}
              <span className="font-display font-semibold text-foreground">
                {merchant?.companyName || merchant?.name || "Your Business"}
              </span>
            </div>

            {/* Amount */}
            <div className="rounded-2xl border border-border/60 bg-card p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Amount to pay
              </p>
              <p className="mt-1 text-3xl font-bold tracking-tight text-foreground">
                $100.00
              </p>
            </div>

            {/* Payment methods */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Payment Method
              </p>
              {paymentMethods.map((method, idx) => (
                <button
                  key={method.label}
                  className="flex w-full items-center gap-3 rounded-xl border bg-card p-3.5 text-left text-sm font-medium text-foreground transition-all duration-200 hover:shadow-sm"
                  style={{
                    borderColor: idx === 0 ? brandColor : "var(--border)",
                    backgroundColor:
                      idx === 0 ? `${brandColor}0d` : undefined,
                  }}
                >
                  <method.icon
                    size={16}
                    style={{ color: idx === 0 ? brandColor : undefined }}
                    className={idx !== 0 ? "text-muted-foreground" : ""}
                  />
                  {method.label}
                </button>
              ))}
            </div>

            {/* Pay button */}
            <button
              className="w-full rounded-xl py-3.5 text-sm font-semibold text-white transition-all hover:brightness-110 hover:shadow-lg"
              style={{ backgroundColor: brandColor }}
            >
              Pay Now
            </button>
          </div>
        </div>
      </motion.div>

      {/* Save */}
      <motion.div
        className="flex justify-end"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={3}
      >
        <Button
          onClick={handleSave}
          loading={updateBranding.isPending}
          disabled={!hasChanges}
        >
          Save Changes
        </Button>
      </motion.div>
    </div>
  );
}

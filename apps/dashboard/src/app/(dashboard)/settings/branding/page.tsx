"use client";

import { useState, useRef } from "react";
import { Button, Input, useToast } from "@tavvio/ui";
import { api } from "@/lib/api";
import { Upload, Image as ImageIcon, Trash } from "@phosphor-icons/react";

export default function BrandingPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logo, setLogo] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [brandColor, setBrandColor] = useState("#007BFF");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast("Please upload an image file.", "error");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast("Image must be less than 5MB.", "error");
      return;
    }

    setLogoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogo(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogo(null);
    setLogoFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      if (logoFile) {
        formData.append("logo", logoFile);
      }
      formData.append("brandColor", brandColor);

      await api.patch("/merchant/branding", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      toast("Branding settings saved.", "success");
    } catch {
      toast("Failed to save branding settings.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold text-foreground">
          Branding
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Customize the look of your payment pages and invoices
        </p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Logo */}
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <h3 className="font-medium text-foreground">Logo</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Shown on hosted checkout and payment links
          </p>
          <div className="mt-4">
            {logo ? (
              <div className="relative inline-block">
                <img
                  src={logo}
                  alt="Brand logo"
                  className="h-32 rounded-lg border border-border object-contain"
                />
                <button
                  onClick={handleRemoveLogo}
                  className="absolute -right-2 -top-2 rounded-full bg-destructive p-1.5 text-destructive-foreground shadow-sm hover:brightness-110 transition-colors"
                >
                  <Trash size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex h-32 w-64 flex-col items-center justify-center rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-secondary/50 transition-colors"
              >
                <Upload size={24} className="text-muted-foreground" />
                <span className="mt-2 text-sm text-muted-foreground">
                  Drop image or click to upload
                </span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* Brand Color */}
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <h3 className="font-medium text-foreground">Brand Color</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Used as accent color on checkout pages
          </p>
          <div className="mt-4 flex items-center gap-4">
            <div className="relative">
              <input
                type="color"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className="h-10 w-10 cursor-pointer rounded-lg border border-border"
              />
            </div>
            <Input
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
              placeholder="#007BFF"
              className="w-32"
            />
            <div
              className="h-10 w-10 rounded-lg border border-border"
              style={{ backgroundColor: brandColor }}
            />
          </div>
        </div>

        {/* Preview */}
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <h3 className="font-medium text-foreground">Preview</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            How your branding will appear on checkout pages
          </p>
          <div className="mt-4 rounded-lg border border-border bg-background p-6">
            {/* Mini checkout preview */}
            <div className="mx-auto max-w-sm space-y-4">
              {/* Header with logo */}
              <div className="flex items-center gap-3">
                {logo ? (
                  <img src={logo} alt="Logo" className="h-8 object-contain" />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                    <ImageIcon size={16} className="text-muted-foreground" />
                  </div>
                )}
                <span className="font-display font-semibold text-foreground">
                  Your Business
                </span>
              </div>

              {/* Payment amount */}
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-sm text-muted-foreground">Amount to pay</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">
                  $100.00
                </p>
              </div>

              {/* Payment methods */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">
                  Select payment method
                </p>
                {["Card", "Bank Transfer", "Crypto"].map((method) => (
                  <button
                    key={method}
                    className="w-full rounded-lg border border-border bg-card p-3 text-left text-sm text-foreground hover:bg-secondary/50 transition-colors"
                    style={{
                      borderColor: method === "Card" ? brandColor : undefined,
                      backgroundColor:
                        method === "Card" ? `${brandColor}10` : undefined,
                    }}
                  >
                    {method}
                  </button>
                ))}
              </div>

              {/* Pay button */}
              <button
                className="w-full rounded-lg py-3 font-medium text-white transition-all hover:brightness-110"
                style={{ backgroundColor: brandColor }}
              >
                Pay Now
              </button>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} loading={isLoading}>
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}

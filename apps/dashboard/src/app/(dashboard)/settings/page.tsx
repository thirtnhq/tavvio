"use client";

import { useState } from "react";
import { Button, Input, useToast } from "@tavvio/ui";
import { api } from "@/lib/api";

export default function SettingsPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await api.patch("/merchant/profile", {
        businessName,
        businessEmail,
        businessPhone,
        businessAddress,
      });
      toast("Your business information has been updated.", "success");
    } catch {
      toast("Failed to save settings. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h3 className="font-medium text-foreground">Business information</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Update your business details
        </p>
        <div className="mt-4 space-y-4">
          <Input
            label="Business name"
            placeholder="Your Business Name"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
          />
          <Input
            label="Business email"
            type="email"
            placeholder="business@example.com"
            value={businessEmail}
            onChange={(e) => setBusinessEmail(e.target.value)}
          />
          <Input
            label="Business phone"
            type="tel"
            placeholder="+1 (555) 000-0000"
            value={businessPhone}
            onChange={(e) => setBusinessPhone(e.target.value)}
          />
          <Input
            label="Business address"
            placeholder="123 Business St, City, Country"
            value={businessAddress}
            onChange={(e) => setBusinessAddress(e.target.value)}
          />
        </div>
        <div className="mt-6">
          <Button onClick={handleSave} loading={isLoading}>
            Save Changes
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h3 className="font-medium text-foreground">Notifications</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your notification preferences
        </p>
        <div className="mt-4 space-y-3">
          {[
            {
              label: "Email notifications",
              description: "Receive email alerts for payments and payouts",
            },
            {
              label: "Webhook notifications",
              description: "Send events to your webhook endpoint",
            },
            {
              label: "Security alerts",
              description: "Get notified about suspicious activity",
            },
          ].map((item) => (
            <label
              key={item.label}
              className="flex items-start gap-3 rounded-lg border border-border p-4 cursor-pointer hover:bg-secondary/50 transition-colors"
            >
              <input
                type="checkbox"
                defaultChecked
                className="mt-1 h-4 w-4 rounded border-input text-primary focus:ring-primary"
              />
              <div>
                <p className="font-medium text-foreground">{item.label}</p>
                <p className="text-sm text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

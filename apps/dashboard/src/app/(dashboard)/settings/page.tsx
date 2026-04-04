"use client";

import { useEffect, useState } from "react";
import { Button, Input, Switch, Skeleton, useToast } from "@useroutr/ui";
import {
  useMerchantProfile,
  useUpdateMerchantProfile,
} from "@/hooks/useSettings";
import { motion } from "framer-motion";
import { Building2, Mail, Bell, Webhook, ShieldAlert } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.35, ease: "easeOut" },
  }),
};

export default function SettingsPage() {
  const { toast } = useToast();
  const { data: merchant, isLoading: isLoadingProfile } =
    useMerchantProfile();
  const updateProfile = useUpdateMerchantProfile();

  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");

  useEffect(() => {
    if (merchant) {
      setName(merchant.name ?? "");
      setCompanyName(merchant.companyName ?? "");
    }
  }, [merchant]);

  const hasChanges =
    merchant &&
    (name !== (merchant.name ?? "") ||
      companyName !== (merchant.companyName ?? ""));

  const handleSave = () => {
    updateProfile.mutate(
      { name, companyName },
      {
        onSuccess: () =>
          toast("Your business information has been updated.", "success"),
        onError: (err) =>
          toast(err.message || "Failed to save settings.", "error"),
      },
    );
  };

  if (isLoadingProfile) {
    return (
      <div className="space-y-6">
        <div className="surface p-6 space-y-4">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64" />
          <div className="space-y-4 pt-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        <div className="surface p-6 space-y-4">
          <Skeleton className="h-5 w-32" />
          <div className="space-y-3 pt-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        className="surface p-6"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={0}
      >
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <Building2 size={18} className="text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">
              Business Information
            </h3>
            <p className="text-xs text-muted-foreground">
              Update your business details
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <Input
            label="Business name"
            placeholder="Your Business Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            label="Company name"
            placeholder="Your Company Ltd."
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
          <div className="flex items-center gap-2 rounded-xl bg-secondary/50 px-4 py-3 text-sm">
            <Mail size={15} className="text-muted-foreground" />
            <span className="text-muted-foreground">Email:</span>
            <span className="font-medium text-foreground">
              {merchant?.email}
            </span>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            onClick={handleSave}
            loading={updateProfile.isPending}
            disabled={!hasChanges}
          >
            Save Changes
          </Button>
        </div>
      </motion.div>

      <motion.div
        className="surface p-6"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={1}
      >
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal/10">
            <Bell size={18} className="text-teal" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Notifications</h3>
            <p className="text-xs text-muted-foreground">
              Manage your notification preferences
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          {[
            {
              label: "Email notifications",
              description: "Receive email alerts for payments and payouts",
              icon: Mail,
            },
            {
              label: "Webhook notifications",
              description: "Send events to your webhook endpoint",
              icon: Webhook,
            },
            {
              label: "Security alerts",
              description: "Get notified about suspicious activity",
              icon: ShieldAlert,
            },
          ].map((item) => (
            <label
              key={item.label}
              className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-secondary/30 p-4 cursor-pointer hover:bg-secondary/60 transition-all duration-200"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background">
                  <item.icon size={15} className="text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {item.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </div>
              <Switch defaultChecked />
            </label>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

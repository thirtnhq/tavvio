"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider, SidebarRail } from "@useroutr/ui";
import { useAuth } from "@/providers/AuthProvider";
import { useRefundEvents } from "@/hooks/useRefundEvents";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { merchant, isLoading } = useAuth();

  // Subscribe to real-time refund events across all dashboard pages
  useRefundEvents();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="w-full max-w-md rounded-[var(--radius-xl)] border border-border bg-card p-8 text-center shadow-[var(--shadow-md)]">
          <div className="mx-auto mb-4 h-11 w-11 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
          <h1 className="font-display text-xl font-semibold text-foreground">
            Loading your dashboard
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We&apos;re checking your session and fetching your merchant profile.
          </p>
        </div>
      </div>
    );
  }

  if (!merchant) {
    return null;
  }

  return (
    <div className="[--header-height:calc(--spacing(14))]">
      <SidebarProvider className="flex flex-col">
        <SiteHeader />
        <div className="flex flex-1">
          <AppSidebar variant="sidebar" collapsible="none" />
          <SidebarInset>
            <div className="flex-1 p-6">{children}</div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  );
}

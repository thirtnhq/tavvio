"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { MobileNav } from "@/components/layout/MobileNav";
import { useAuth } from "@/providers/AuthProvider";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { merchant, isLoading } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Main content */}
      <div
        className={cn(
          "transition-[margin-left] duration-200",
          sidebarCollapsed ? "lg:ml-[48px]" : "lg:ml-[260px]"
        )}
      >
        <div className="flex items-center lg:hidden">
          <MobileNav />
        </div>
        <Topbar />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}

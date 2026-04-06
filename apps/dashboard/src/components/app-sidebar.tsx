"use client";

import {
  Home,
  CreditCard,
  Link2,
  FileText,
  ArrowLeftRight,
  TrendingUp,
  Settings,
  LifeBuoy,
  Send,
  RotateCcw,
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@useroutr/ui";

const navMain = [
  { title: "Overview", url: "/", icon: Home },
  { title: "Payments", url: "/payments", icon: CreditCard },
  { title: "Refunds", url: "/refunds", icon: RotateCcw },
  { title: "Payment Links", url: "/links", icon: Link2 },
  { title: "Invoices", url: "/invoices", icon: FileText },
  { title: "Payouts", url: "/payouts", icon: ArrowLeftRight },
  { title: "Analytics", url: "/analytics", icon: TrendingUp },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
    items: [
      { title: "General", url: "/settings" },
      { title: "API Keys", url: "/settings/api-keys" },
      { title: "Webhooks", url: "/settings/webhooks" },
      { title: "Team", url: "/settings/team" },
      { title: "Branding", url: "/settings/branding" },
    ],
  },
];

const navSecondary = [
  { title: "Support", url: "#", icon: LifeBuoy },
  { title: "Feedback", url: "#", icon: Send },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar
      className="top-(--header-height) h-[calc(100svh-var(--header-height))]!"
      {...props}
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground font-display font-bold text-sm">
                  T
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-display font-semibold">
                    Useroutr
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    Merchant Dashboard
                  </span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}

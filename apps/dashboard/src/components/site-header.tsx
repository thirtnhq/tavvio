"use client";

import { usePathname } from "next/navigation";
import { Bell, Moon, SidebarIcon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useSidebar } from "@useroutr/ui";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useTheme } from "@/providers/ThemeProvider";

const routeLabels: Record<string, string> = {
  "/": "Overview",
  "/payments": "Payments",
  "/links": "Payment Links",
  "/invoices": "Invoices",
  "/payouts": "Payouts",
  "/analytics": "Analytics",
  "/settings": "Settings",
  "/settings/api-keys": "API Keys",
  "/settings/webhooks": "Webhooks",
  "/settings/team": "Team",
  "/settings/branding": "Branding",
};

export function SiteHeader() {
  const { toggleSidebar } = useSidebar();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();

  const segments = pathname.split("/").filter(Boolean);
  const currentLabel =
    routeLabels[pathname] ?? segments[segments.length - 1] ?? "Overview";
  const isNested = segments.length > 1;
  const parentPath = "/" + segments[0];
  const parentLabel = routeLabels[parentPath];

  return (
    <header className="sticky top-0 z-50 flex w-full items-center border-b bg-background">
      <div className="flex h-(--header-height) w-full items-center gap-2 px-4">
        <Button
          className="h-8 w-8"
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
        >
          <SidebarIcon />
        </Button>
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb className="hidden sm:block">
          <BreadcrumbList>
            {isNested && parentLabel ? (
              <>
                <BreadcrumbItem>
                  <BreadcrumbLink href={parentPath}>
                    {parentLabel}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{currentLabel}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            ) : (
              <BreadcrumbItem>
                <BreadcrumbPage>{currentLabel}</BreadcrumbPage>
              </BreadcrumbItem>
            )}
          </BreadcrumbList>
        </Breadcrumb>

        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Bell className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={toggleTheme}
          >
            {theme === "dark" ? (
              <Sun className="size-4" />
            ) : (
              <Moon className="size-4" />
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}

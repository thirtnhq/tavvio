"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { name: "General", href: "/settings" },
  { name: "API Keys", href: "/settings/api-keys" },
  { name: "Webhooks", href: "/settings/webhooks" },
  { name: "Team", href: "/settings/team" },
  { name: "Branding", href: "/settings/branding" },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold text-foreground">
          Settings
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Tab navigation */}
      <div className="border-b border-border">
        <nav className="-mb-px flex space-x-8" aria-label="Settings tabs">
          {tabs.map((tab) => {
            const isActive =
              tab.href === "/settings"
                ? pathname === "/settings"
                : pathname.startsWith(tab.href);

            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={cn(
                  "whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {tab.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Tab content */}
      <div>{children}</div>
    </div>
  );
}

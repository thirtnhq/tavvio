"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { List, X, House, CreditCard, Link as LinkIcon, FileText, ArrowsLeftRight, ChartLine, Gear } from "@phosphor-icons/react";
import { cn } from "@useroutr/ui";

const NAV_ITEMS = [
  { label: "Overview", href: "/", icon: House },
  { label: "Payments", href: "/payments", icon: CreditCard },
  { label: "Payment Links", href: "/links", icon: LinkIcon },
  { label: "Invoices", href: "/invoices", icon: FileText },
  { label: "Payouts", href: "/payouts", icon: ArrowsLeftRight },
  { label: "Analytics", href: "/analytics", icon: ChartLine },
  { label: "Settings", href: "/settings", icon: Gear },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <div className="lg:hidden">
      <button
        onClick={() => setOpen(true)}
        className="rounded-md p-2 text-muted-foreground"
      >
        <List size={24} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <nav className="relative z-10 flex h-full w-[280px] flex-col bg-card shadow-lg">
            <div className="flex h-16 items-center justify-between border-b border-border px-4">
              <span className="font-display text-lg font-bold text-foreground">
                Useroutr
              </span>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-muted-foreground"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 space-y-1 overflow-y-auto p-2">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                      active
                        ? "bg-primary/10 font-semibold text-primary"
                        : "text-muted-foreground hover:bg-secondary"
                    )}
                  >
                    <Icon size={20} weight={active ? "fill" : "regular"} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}

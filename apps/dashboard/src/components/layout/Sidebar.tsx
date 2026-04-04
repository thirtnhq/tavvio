"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  CreditCard,
  Link2,
  FileText,
  ArrowLeftRight,
  TrendingUp,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@useroutr/ui";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Overview", href: "/", icon: Home },
  { label: "Payments", href: "/payments", icon: CreditCard },
  { label: "Payment Links", href: "/links", icon: Link2 },
  { label: "Invoices", href: "/invoices", icon: FileText },
  { label: "Payouts", href: "/payouts", icon: ArrowLeftRight },
  { label: "Analytics", href: "/analytics", icon: TrendingUp },
];

const BOTTOM_ITEMS: NavItem[] = [
  { label: "Settings", href: "/settings", icon: Settings },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    const active = isActive(item.href);

    return (
      <Link
        key={item.href}
        href={item.href}
        title={collapsed ? item.label : undefined}
        className={cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
          active
            ? "bg-primary/10 font-semibold text-primary"
            : "text-muted-foreground hover:bg-secondary hover:text-foreground",
          collapsed && "justify-center px-2"
        )}
      >
        <Icon className={cn("size-5 shrink-0", active && "stroke-[2.5]")} />
        {!collapsed && <span>{item.label}</span>}
      </Link>
    );
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-30 flex h-screen flex-col border-r border-border bg-card transition-[width] duration-200",
        collapsed ? "w-[48px]" : "w-[260px]"
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex h-16 items-center border-b border-border px-4",
          collapsed && "justify-center px-2"
        )}
      >
        <button
          onClick={onToggle}
          className="font-display text-lg font-bold text-foreground"
        >
          {collapsed ? "T" : "Useroutr"}
        </button>
      </div>

      {/* Main nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {NAV_ITEMS.map(renderItem)}
      </nav>

      {/* Bottom nav */}
      <div className="border-t border-border p-2">
        {BOTTOM_ITEMS.map(renderItem)}
      </div>
    </aside>
  );
}

"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Link as LinkIcon,
  Send,
  Receipt,
  BookOpen,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Action {
  icon: React.ReactNode;
  label: string;
  description: string;
  href: string;
}

const ACTIONS: Action[] = [
  {
    icon: <LinkIcon className="h-4 w-4" />,
    label: "New Link",
    description: "Create a shareable payment link",
    href: "/links",
  },
  {
    icon: <Send className="h-4 w-4" />,
    label: "Send Payout",
    description: "Initiate a payout to a recipient",
    href: "/payouts",
  },
  {
    icon: <Receipt className="h-4 w-4" />,
    label: "New Invoice",
    description: "Draft and send a client invoice",
    href: "/invoices",
  },
  {
    icon: <BookOpen className="h-4 w-4" />,
    label: "View Docs",
    description: "Browse developer documentation",
    href: "https://docs.useroutr.io",
  },
];

export function QuickActions() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut", delay: 0.25 }}
    >
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          {ACTIONS.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="group flex items-center gap-3 rounded-lg p-3 transition-colors duration-150 hover:bg-accent"
            >
              {/* Icon bubble */}
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors duration-150 group-hover:bg-primary group-hover:text-primary-foreground">
                {action.icon}
              </div>

              {/* Text */}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                  {action.label}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {action.description}
                </p>
              </div>

              {/* Arrow */}
              <ArrowRight className="h-4 w-4 text-muted-foreground/40 transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-primary" />
            </Link>
          ))}
        </CardContent>
      </Card>
    </motion.div>
  );
}

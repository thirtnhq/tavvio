"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Activity } from "lucide-react";

interface GreetingHeaderProps {
  merchantName?: string;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function GreetingHeader({
  merchantName = "Merchant",
}: GreetingHeaderProps) {
  const greeting = useMemo(() => getGreeting(), []);

  return (
    <motion.div
      className="flex items-center justify-between"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {greeting}, {merchantName} ðŸ‘‹
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here&apos;s what&apos;s happening with your business today.
        </p>
      </div>
      <div className="hidden items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground sm:flex">
        <Activity className="h-3 w-3 text-status-success-text" />
        Live
      </div>
    </motion.div>
  );
}

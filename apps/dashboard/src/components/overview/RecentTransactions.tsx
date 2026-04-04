"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Inbox } from "lucide-react";
import { Badge } from "@useroutr/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { formatDistanceToNowStrict } from "date-fns";
import type { TransactionStatus } from "@/hooks/useAnalytics";

// ── Skeleton ──────────────────────────────────────────────────────────────────

export function RecentTransactionsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-4 w-16" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="divide-y divide-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="ml-auto h-4 w-16" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  TransactionStatus,
  {
    label: string;
    variant: "completed" | "pending" | "processing" | "failed" | "cancelled";
  }
> = {
  COMPLETED: { label: "Completed", variant: "completed" },
  PROCESSING: { label: "Processing", variant: "processing" },
  PENDING: { label: "Pending", variant: "pending" },
  FAILED: { label: "Failed", variant: "failed" },
  CANCELLED: { label: "Cancelled", variant: "cancelled" },
};

function TxStatusBadge({ status }: { status: TransactionStatus }) {
  const cfg = STATUS_CONFIG[status];
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RecentTransaction {
  id: string;
  customer: string;
  amount: number;
  currency: string;
  status: TransactionStatus;
  createdAt: string;
}

// ── RecentTransactions ────────────────────────────────────────────────────────

interface RecentTransactionsProps {
  transactions: RecentTransaction[];
  highlightIds?: Set<string>;
}

export function RecentTransactions({
  transactions,
  highlightIds = new Set(),
}: RecentTransactionsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut", delay: 0.3 }}
    >
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">
              Recent Transactions
            </CardTitle>
            <Link
              href="/payments"
              className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              View All <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {/* Empty state */}
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
                <Inbox className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                No transactions yet
              </p>
              <p className="mt-1 text-xs text-muted-foreground/60">
                Transactions will appear here once payments are made.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {["ID", "Customer", "Amount", "Status", "Date"].map((h) => (
                      <th
                        key={h}
                        className="px-6 pb-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <AnimatePresence initial={false}>
                    {transactions.map((tx) => (
                      <motion.tr
                        key={tx.id}
                        layout
                        initial={
                          highlightIds.has(tx.id)
                            ? {
                                backgroundColor:
                                  "color-mix(in oklch, var(--primary) 12%, transparent)",
                              }
                            : { opacity: 0 }
                        }
                        animate={{ opacity: 1, backgroundColor: "transparent" }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="transition-colors duration-150 hover:bg-muted/50"
                      >
                        <td className="px-6 py-3">
                          <span className="font-mono text-xs text-muted-foreground">
                            {tx.id.slice(0, 8)}...
                          </span>
                        </td>
                        <td className="px-6 py-3 font-medium text-foreground whitespace-nowrap">
                          {tx.customer}
                        </td>
                        <td className="px-6 py-3 font-semibold text-foreground whitespace-nowrap tabular-nums">
                          {formatCurrency(tx.amount, tx.currency)}
                        </td>
                        <td className="px-6 py-3">
                          <TxStatusBadge status={tx.status} />
                        </td>
                        <td className="px-6 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNowStrict(new Date(tx.createdAt), {
                            addSuffix: true,
                          })}
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCountUp } from "@/hooks/useCountUp";
import { ResponsiveContainer, LineChart, Line, Tooltip } from "recharts";

// ── Skeleton ──────────────────────────────────────────────────────────────────

export function MetricCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6 flex flex-col gap-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  );
}

// ── Sparkline tooltip ─────────────────────────────────────────────────────────

function SparkTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { value: number }[];
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-foreground px-2 py-1 text-[11px] font-medium text-background shadow">
      {payload[0].value.toLocaleString()}
    </div>
  );
}

// ── MetricCard ────────────────────────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: number;
  delta?: number;
  sparkline?: number[];
  prefix?: string;
  suffix?: string;
  /** Skip currency-style formatting (e.g. for raw counts) */
  plain?: boolean;
  index?: number; // stagger index
}

export function MetricCard({
  label,
  value,
  delta,
  sparkline,
  prefix = "$",
  suffix,
  plain = false,
  index = 0,
}: MetricCardProps) {
  const animated = useCountUp(value, 600);
  const isPositive = delta === undefined || delta >= 0;
  const sparkData = (sparkline ?? []).map((v, i) => ({ i, v }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut", delay: index * 0.07 }}
    >
      <Card className="h-full overflow-hidden transition-shadow hover:shadow-md">
        <CardContent className="p-6 flex flex-col gap-2">
          {/* Label */}
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {label}
          </p>

          {/* Value */}
          <p className="text-3xl font-bold leading-none tracking-tight text-foreground">
            {!plain && prefix}
            {animated.toLocaleString()}
            {suffix && (
              <span className="ml-1 text-base font-semibold text-muted-foreground">
                {suffix}
              </span>
            )}
          </p>

          {/* Delta */}
          {delta !== undefined && (
            <div
              className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                isPositive
                  ? "bg-status-success-bg text-status-success-text"
                  : "bg-status-error-bg text-status-error-text"
              }`}
            >
              {isPositive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {isPositive ? "+" : ""}
              {delta.toFixed(1)}% vs last period
            </div>
          )}

          {/* Sparkline */}
          {sparkData.length > 0 && (
            <div className="mt-1 h-10 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={sparkData}
                  margin={{ top: 2, right: 0, bottom: 2, left: 0 }}
                >
                  <Tooltip content={<SparkTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="v"
                    stroke={isPositive ? "var(--success)" : "var(--destructive)"}
                    strokeWidth={2}
                    dot={false}
                    animationDuration={400}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

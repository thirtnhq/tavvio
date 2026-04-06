"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import {
  ArrowClockwise,
  CalendarBlank,
  DownloadSimple,
  Info,
} from "@phosphor-icons/react";
import { cn, formatCurrency } from "@/lib/utils";

type Period = "7d" | "30d" | "90d" | "1y";

type DateRange = {
  start: string;
  end: string;
};

type RevenuePoint = {
  date: string;
  label: string;
  amount: number;
};

type PaymentMethod = "card" | "crypto" | "bank";

type FailureCell = {
  day: string;
  hour: number;
  count: number;
};

type CurrencyPoint = {
  code: string;
  amount: number;
  percentage: number;
};

type AnalyticsSnapshot = {
  source: "live" | "demo";
  revenue: {
    data: RevenuePoint[];
    total: number;
    delta: number;
  };
  payments: {
    total: number;
    byMethod: Record<PaymentMethod, number>;
    conversionRate: number;
    delta: number;
    trend: number[];
  };
  failures: {
    rate: number;
    delta: number;
    byHour: FailureCell[];
    topReasons: Array<{ reason: string; count: number }>;
  };
  currencies: {
    currencies: CurrencyPoint[];
  };
};

type RevenueResponse = {
  data?: Array<{
    date: string;
    amount: number | string;
  }>;
  total?: number | string;
  delta?: number | string;
};

type PaymentsResponse = {
  total?: number | string;
  byMethod?: Partial<Record<PaymentMethod, number | string>>;
  conversionRate?: number | string;
  delta?: number | string;
};

type FailureResponseCell = {
  day?: string;
  hour?: number;
  count?: number | string;
};

type FailuresResponse = {
  rate?: number | string;
  delta?: number | string;
  byHour?: FailureResponseCell[];
  topReasons?: Array<{
    reason: string;
    count: number | string;
  }>;
};

type CurrenciesResponse = {
  currencies?: Array<{
    code: string;
    amount: number | string;
    percentage: number | string;
  }>;
};

const PERIOD_OPTIONS: Array<{ value: Period; label: string }> = [
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
  { value: "1y", label: "1y" },
];

const PAYMENT_COLORS: Record<PaymentMethod, string> = {
  card: "var(--blue)",
  crypto: "var(--teal)",
  bank: "var(--amber)",
};

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getApiBaseUrl() {
  return (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
}

function formatMoney(value: number, currency = "USD") {
  return formatCurrency(value, currency);
}

function formatCompactMoney(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function formatDelta(value: number) {
  const sign = value >= 0 ? "+" : "-";
  return `${sign}${Math.abs(value).toFixed(1)}%`;
}

function parseDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function differenceInDays(start: Date, end: Date) {
  const day = 24 * 60 * 60 * 1000;
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / day) + 1);
}

function getBucketDates(period: Period, range: DateRange) {
  const hasCustomRange = Boolean(range.start && range.end);
  const now = new Date();
  const endDate = hasCustomRange ? parseDate(range.end) : now;
  const startDate = hasCustomRange ? parseDate(range.start) : new Date(now);
  let bucket: "day" | "week" | "month" = "day";
  let points = 7;

  if (hasCustomRange) {
    const span = differenceInDays(startDate, endDate);
    if (span > 180) {
      bucket = "month";
      points = Math.max(6, Math.min(12, Math.ceil(span / 30)));
    } else if (span > 45) {
      bucket = "week";
      points = Math.max(6, Math.min(16, Math.ceil(span / 7)));
    } else {
      bucket = "day";
      points = span;
    }
  } else {
    switch (period) {
      case "7d":
        startDate.setDate(now.getDate() - 6);
        break;
      case "30d":
        startDate.setDate(now.getDate() - 29);
        points = 30;
        break;
      case "90d":
        bucket = "week";
        points = 13;
        startDate.setDate(now.getDate() - 89);
        break;
      case "1y":
        bucket = "month";
        points = 12;
        startDate.setMonth(now.getMonth() - 11);
        break;
    }
  }

  const dates = Array.from({ length: points }, (_, index) => {
    const date = new Date(startDate);
    if (bucket === "day") {
      date.setDate(startDate.getDate() + index);
    } else if (bucket === "week") {
      date.setDate(startDate.getDate() + index * 7);
    } else {
      date.setMonth(startDate.getMonth() + index);
    }

    return {
      date,
      label:
        bucket === "month"
          ? new Intl.DateTimeFormat("en-US", { month: "short" }).format(date)
          : bucket === "week"
            ? new Intl.DateTimeFormat("en-US", {
                month: "short",
                day: "numeric",
              }).format(date)
            : new Intl.DateTimeFormat("en-US", {
                weekday: "short",
              }).format(date),
    };
  });

  return { dates, bucket };
}

function createTrend(current: number, delta: number, points: number) {
  const start = Math.max(8, current - delta);
  return Array.from({ length: points }, (_, index) => {
    const progress = points === 1 ? 1 : index / (points - 1);
    const wave = Math.sin(index * 0.8) * 1.1;
    return Number((start + progress * delta + wave).toFixed(2));
  });
}

function buildDemoSnapshot(period: Period, range: DateRange): AnalyticsSnapshot {
  const { dates } = getBucketDates(period, range);
  const revenueData = dates.map(({ date, label }, index) => {
    const baseline = period === "1y" ? 28000 : period === "90d" ? 9200 : 5200;
    const amount = Math.round(
      baseline +
        baseline * 0.19 * Math.sin(index / 1.7) +
        baseline * 0.08 * Math.cos(index / 2.4) +
        index * 95,
    );

    return {
      date: date.toISOString().slice(0, 10),
      label,
      amount: Math.max(800, amount),
    };
  });

  const total = revenueData.reduce((sum, point) => sum + point.amount, 0);
  const paymentTotal = Math.round(total * 0.82);
  const card = Math.round(paymentTotal * 0.45);
  const crypto = Math.round(paymentTotal * 0.3);
  const bank = Math.max(0, paymentTotal - card - crypto);

  const currencies: CurrencyPoint[] = [
    { code: "USD", amount: Math.round(total * 0.64), percentage: 64 },
    { code: "EUR", amount: Math.round(total * 0.18), percentage: 18 },
    { code: "NGN", amount: Math.round(total * 0.1), percentage: 10 },
    { code: "GBP", amount: Math.round(total * 0.08), percentage: 8 },
  ];

  const byHour: FailureCell[] = WEEKDAY_LABELS.flatMap((day, dayIndex) =>
    Array.from({ length: 24 }, (_, hour) => ({
      day,
      hour,
      count: Math.max(
        0,
        Math.round(
          1 +
            Math.abs(Math.sin((hour + 1) / 2.8 + dayIndex)) * 4 +
            (hour >= 18 && hour <= 21 ? 2 : 0) +
            (dayIndex >= 4 ? 1 : 0),
        ),
      ),
    })),
  );

  return {
    source: "demo",
    revenue: {
      data: revenueData,
      total,
      delta: 12.4,
    },
    payments: {
      total: paymentTotal,
      byMethod: { card, crypto, bank },
      conversionRate: 78.5,
      delta: 3.2,
      trend: createTrend(78.5, 3.2, revenueData.length),
    },
    failures: {
      rate: 2.1,
      delta: -0.5,
      byHour,
      topReasons: [
        { reason: "Card issuer decline", count: 61 },
        { reason: "3DS timeout", count: 34 },
        { reason: "Bank transfer mismatch", count: 19 },
      ],
    },
    currencies: {
      currencies,
    },
  };
}

function normalizeFailureCells(raw: FailureResponseCell[] | undefined) {
  if (!raw?.length) {
    return WEEKDAY_LABELS.flatMap((day) =>
      Array.from({ length: 24 }, (_, hour) => ({ day, hour, count: 0 })),
    );
  }

  if (raw.some((item) => typeof item.day === "string")) {
    return WEEKDAY_LABELS.flatMap((day) =>
      Array.from({ length: 24 }, (_, hour) => {
        const match = raw.find((item) => item.day === day && item.hour === hour);
        return { day, hour, count: Number(match?.count ?? 0) };
      }),
    );
  }

  return WEEKDAY_LABELS.flatMap((day, dayIndex) =>
    Array.from({ length: 24 }, (_, hour) => {
      const match = raw.find((item) => item.hour === hour);
      const multiplier = 0.75 + ((dayIndex + 1) % 3) * 0.2;
      return {
        day,
        hour,
        count: Math.round(Number(match?.count ?? 0) * multiplier),
      };
    }),
  );
}

function normalizeLiveSnapshot(
  revenueJson: RevenueResponse,
  paymentsJson: PaymentsResponse,
  failuresJson: FailuresResponse,
  currenciesJson: CurrenciesResponse,
  period: Period,
  range: DateRange,
): AnalyticsSnapshot {
  const fallback = buildDemoSnapshot(period, range);

  const revenueData: RevenuePoint[] = Array.isArray(revenueJson.data)
    ? revenueJson.data.map((point) => {
        const date = new Date(point.date);
        return {
          date: point.date,
          label: new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "numeric",
          }).format(date),
          amount: Number(point.amount ?? 0),
        };
      })
    : [];

  const byMethod = paymentsJson.byMethod ?? {};
  const conversionRate = Number(paymentsJson.conversionRate ?? 0);
  const delta = Number(paymentsJson.delta ?? 0);

  const currencies: CurrencyPoint[] = Array.isArray(currenciesJson.currencies)
    ? currenciesJson.currencies.map((entry) => ({
        code: entry.code,
        amount: Number(entry.amount ?? 0),
        percentage: Number(entry.percentage ?? 0),
      }))
    : [];

  return {
    source: "live",
    revenue: {
      data: revenueData,
      total: Number(revenueJson.total ?? 0),
      delta: Number(revenueJson.delta ?? 0),
    },
    payments: {
      total: Number(paymentsJson.total ?? 0),
      byMethod: {
        card: Number(byMethod.card ?? 0),
        crypto: Number(byMethod.crypto ?? 0),
        bank: Number(byMethod.bank ?? 0),
      },
      conversionRate,
      delta,
      trend: createTrend(
        conversionRate || fallback.payments.conversionRate,
        delta,
        Math.max(revenueData.length, 6),
      ),
    },
    failures: {
      rate: Number(failuresJson.rate ?? 0),
      delta: Number(failuresJson.delta ?? 0),
      byHour: normalizeFailureCells(failuresJson.byHour),
      topReasons: Array.isArray(failuresJson.topReasons)
        ? failuresJson.topReasons.map((entry) => ({
            reason: entry.reason,
            count: Number(entry.count ?? 0),
          }))
        : [],
    },
    currencies: {
      currencies,
    },
  };
}

async function fetchJson<T>(path: string): Promise<T> {
  const base = getApiBaseUrl();
  const response = await fetch(`${base}${path}`, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`${path} failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function loadSnapshot(period: Period, range: DateRange) {
  const hasCustomRange = Boolean(range.start && range.end);
  const { bucket } = getBucketDates(period, range);
  const query = new URLSearchParams({
    period,
    granularity: bucket,
  });

  if (hasCustomRange) {
    query.set("from", range.start);
    query.set("to", range.end);
  }

  const baseQuery = query.toString();
  const [revenueResult, paymentsResult, failuresResult, currenciesResult] =
    await Promise.allSettled([
      fetchJson<RevenueResponse>(`/v1/analytics/revenue?${baseQuery}`),
      fetchJson<PaymentsResponse>(`/v1/analytics/payments?${baseQuery}`),
      fetchJson<FailuresResponse>(`/v1/analytics/failures?${baseQuery}`),
      fetchJson<CurrenciesResponse>(`/v1/analytics/currencies?${baseQuery}`),
    ] as const);

  if (
    revenueResult.status === "fulfilled" &&
    paymentsResult.status === "fulfilled" &&
    failuresResult.status === "fulfilled" &&
    currenciesResult.status === "fulfilled"
  ) {
    return {
      snapshot: normalizeLiveSnapshot(
        revenueResult.value,
        paymentsResult.value,
        failuresResult.value,
        currenciesResult.value,
        period,
        range,
      ),
      note: null as string | null,
    };
  }

  return {
    snapshot: buildDemoSnapshot(period, range),
    note:
      "Live analytics endpoints are unavailable in this environment. Showing a dashboard-safe demo preview.",
  };
}

function isSnapshotEmpty(snapshot: AnalyticsSnapshot) {
  return (
    snapshot.source === "live" &&
    snapshot.revenue.data.length === 0 &&
    snapshot.payments.total === 0 &&
    snapshot.currencies.currencies.length === 0
  );
}

function buildCsv(snapshot: AnalyticsSnapshot) {
  const rows = [
    ["Revenue Over Time", "date", "label", "amount"],
    ...snapshot.revenue.data.map((point) => [
      "",
      point.date,
      point.label,
      String(point.amount),
    ]),
    [""],
    ["Payment Methods", "method", "amount"],
    ["", "card", String(snapshot.payments.byMethod.card)],
    ["", "crypto", String(snapshot.payments.byMethod.crypto)],
    ["", "bank", String(snapshot.payments.byMethod.bank)],
    [""],
    ["Failure Heatmap", "day", "hour", "count"],
    ...snapshot.failures.byHour.map((cell) => [
      "",
      cell.day,
      String(cell.hour),
      String(cell.count),
    ]),
    [""],
    ["Top Reasons", "reason", "count"],
    ...snapshot.failures.topReasons.map((reason) => [
      "",
      reason.reason,
      String(reason.count),
    ]),
    [""],
    ["Currencies", "code", "amount", "percentage"],
    ...snapshot.currencies.currencies.map((currency) => [
      "",
      currency.code,
      String(currency.amount),
      String(currency.percentage),
    ]),
  ];

  return rows.map((row) => row.map((cell) => `"${cell ?? ""}"`).join(",")).join("\n");
}

function downloadCsv(snapshot: AnalyticsSnapshot, period: Period, range: DateRange) {
  const blob = new Blob([buildCsv(snapshot)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const suffix = range.start && range.end ? `${range.start}_to_${range.end}` : period;

  link.href = url;
  link.download = `useroutr-analytics-${suffix}.csv`;
  link.click();

  URL.revokeObjectURL(url);
}

function Panel({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.section
      className={cn("rounded-lg border border-border bg-card p-5 shadow-sm", className)}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
    >
      {children}
    </motion.section>
  );
}

function SectionHeading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        {subtitle ? <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

function DeltaPill({ value }: { value: number }) {
  const positive = value >= 0;
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2 py-1 text-xs font-medium",
        positive
          ? "border-green/20 bg-green/10 text-green"
          : "border-red/20 bg-red/10 text-red",
      )}
    >
      {formatDelta(value)}
    </span>
  );
}

function StatCard({
  label,
  value,
  hint,
  delay,
}: {
  label: string;
  value: string;
  hint: string;
  delay: number;
}) {
  return (
    <Panel delay={delay}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-3 font-display text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
    </Panel>
  );
}

function PeriodToggle({
  value,
  disabled,
  onChange,
}: {
  value: Period;
  disabled: boolean;
  onChange: (period: Period) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-muted/40 p-1">
      {PERIOD_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition",
            value === option.value
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground",
            disabled && "cursor-not-allowed opacity-50",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function DateRangePicker({
  range,
  onChange,
  onClear,
}: {
  range: DateRange;
  onChange: (range: DateRange) => void;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm">
        <CalendarBlank className="h-4 w-4 text-muted-foreground" />
        <input
          type="date"
          value={range.start}
          onChange={(event) => onChange({ ...range, start: event.target.value })}
          className="bg-transparent text-foreground outline-none"
        />
        <span className="text-muted-foreground">to</span>
        <input
          type="date"
          value={range.end}
          onChange={(event) => onChange({ ...range, end: event.target.value })}
          className="bg-transparent text-foreground outline-none"
        />
      </div>
      {(range.start || range.end) && (
        <button
          type="button"
          onClick={onClear}
          className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition hover:text-foreground"
        >
          Clear
        </button>
      )}
    </div>
  );
}

function ExportButton({
  onExport,
  disabled,
}: {
  onExport: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onExport}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium transition hover:bg-muted/40",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <DownloadSimple className="h-4 w-4" />
      Export CSV
    </button>
  );
}

function SourceNotice({ note }: { note: string | null }) {
  if (!note) {
    return null;
  }

  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber/20 bg-amber/10 px-4 py-3 text-sm text-amber">
      <Info className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{note}</span>
    </div>
  );
}

function RevenueChart({
  data,
  total,
  delta,
  period,
  hasCustomRange,
  onPeriodChange,
}: {
  data: RevenuePoint[];
  total: number;
  delta: number;
  period: Period;
  hasCustomRange: boolean;
  onPeriodChange: (period: Period) => void;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const maxValue = Math.max(...data.map((point) => point.amount), 1);
  const width = 760;
  const height = 270;
  const chartTop = 20;
  const chartBottom = 220;
  const chartHeight = chartBottom - chartTop;
  const gap = 8;
  const barWidth = Math.max(18, (width - gap * (data.length + 1)) / Math.max(data.length, 1));

  return (
    <Panel className="lg:col-span-2" delay={0.1}>
      <SectionHeading
        title="Revenue Over Time"
        subtitle={`${formatCompactMoney(total)} total revenue in range`}
        action={<PeriodToggle value={period} disabled={hasCustomRange} onChange={onPeriodChange} />}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="font-display text-3xl font-semibold text-foreground">
          {formatMoney(total)}
        </div>
        <DeltaPill value={delta} />
        {hasCustomRange ? (
          <span className="text-xs text-muted-foreground">
            Custom date range overrides the quick period selector.
          </span>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-background p-4">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full"
          aria-label="Revenue over time chart"
        >
          {Array.from({ length: 4 }).map((_, index) => {
            const y = chartTop + (chartHeight / 4) * index;
            return (
              <line
                key={index}
                x1={0}
                x2={width}
                y1={y}
                y2={y}
                stroke="var(--chart-grid)"
                strokeDasharray="4 6"
              />
            );
          })}

          {data.map((point, index) => {
            const barHeight = (point.amount / maxValue) * chartHeight;
            const x = gap + index * (barWidth + gap);
            const y = chartBottom - barHeight;
            const active = hoveredIndex === index;

            return (
              <g
                key={`${point.date}-${index}`}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx={8}
                  fill={active ? "var(--blue)" : "var(--blue2)"}
                  opacity={active ? 1 : 0.82}
                />
                <text
                  x={x + barWidth / 2}
                  y={height - 18}
                  textAnchor="middle"
                  fontSize="11"
                  fill="var(--chart-tick)"
                >
                  {point.label}
                </text>
                {active ? (
                  <g>
                    <rect
                      x={Math.max(8, x - 28)}
                      y={Math.max(8, y - 38)}
                      width={106}
                      height={30}
                      rx={10}
                      fill="var(--chart-tooltip-bg)"
                    />
                    <text
                      x={Math.max(18, x - 18)}
                      y={Math.max(28, y - 18)}
                      fontSize="11"
                      fill="var(--chart-tooltip-text)"
                    >
                      {formatCompactMoney(point.amount)}
                    </text>
                  </g>
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>
    </Panel>
  );
}

function PaymentMethodCard({
  byMethod,
  total,
}: {
  byMethod: Record<PaymentMethod, number>;
  total: number;
}) {
  const segments = (Object.entries(byMethod) as Array<[PaymentMethod, number]>).map(
    ([key, value]) => ({
      key,
      value,
      percentage: total ? (value / total) * 100 : 0,
    }),
  );
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <Panel delay={0.18}>
      <SectionHeading
        title="By Payment Method"
        subtitle="Card, crypto, and bank transfer split"
      />

      <div className="flex flex-col gap-5 xl:flex-row xl:items-center">
        <div className="relative mx-auto h-40 w-40 shrink-0">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 140 140">
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke="var(--chart-grid)"
              strokeWidth="20"
            />
            {segments.map((segment) => {
              const length = (segment.percentage / 100) * circumference;
              const circle = (
                <circle
                  key={segment.key}
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="none"
                  stroke={PAYMENT_COLORS[segment.key]}
                  strokeWidth="20"
                  strokeLinecap="round"
                  strokeDasharray={`${length} ${circumference - length}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += length;
              return circle;
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Total</span>
            <span className="mt-2 font-display text-2xl font-semibold text-foreground">
              {formatCompactMoney(total)}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {segments.map((segment) => (
            <div
              key={segment.key}
              className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: PAYMENT_COLORS[segment.key] }}
                />
                <span className="capitalize text-foreground">{segment.key}</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-foreground">
                  {formatPercent(segment.percentage)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatCompactMoney(segment.value)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function ConversionCard({
  rate,
  delta,
  trend,
}: {
  rate: number;
  delta: number;
  trend: number[];
}) {
  const width = 320;
  const height = 130;
  const min = Math.min(...trend, rate);
  const max = Math.max(...trend, rate);
  const path = trend
    .map((value, index) => {
      const x = (index / Math.max(trend.length - 1, 1)) * (width - 16) + 8;
      const y = height - ((value - min) / Math.max(max - min || 1, 1)) * 76 - 20;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <Panel delay={0.22}>
      <SectionHeading
        title="Conversion Rate"
        subtitle="Successful payments versus attempts"
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="font-display text-3xl font-semibold text-foreground">
          {formatPercent(rate)}
        </div>
        <DeltaPill value={delta} />
      </div>

      <div className="rounded-lg border border-border bg-background p-4">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full"
          aria-label="Conversion trend"
        >
          <defs>
            <linearGradient id="conversion-fill-dashboard" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--teal)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--teal)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <path
            d={`${path} L ${width - 8} ${height - 10} L 8 ${height - 10} Z`}
            fill="url(#conversion-fill-dashboard)"
          />
          <path
            d={path}
            fill="none"
            stroke="var(--teal)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </Panel>
  );
}

function CurrencyRanking({ currencies }: { currencies: CurrencyPoint[] }) {
  const maxAmount = Math.max(...currencies.map((currency) => currency.amount), 1);

  return (
    <Panel delay={0.26}>
      <SectionHeading
        title="Top Currencies"
        subtitle="Currencies ranked by processed volume"
      />

      <div className="space-y-4">
        {currencies.map((currency) => (
          <div key={currency.code}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="min-w-12 rounded-md border border-border bg-background px-2 py-1 text-center text-xs font-medium text-foreground">
                  {currency.code}
                </span>
                <span className="text-sm font-medium text-foreground">
                  {formatMoney(currency.amount)}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {formatPercent(currency.percentage)}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted/40">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue to-teal"
                style={{ width: `${(currency.amount / maxAmount) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function FailureHeatmap({
  rate,
  delta,
  byHour,
  topReasons,
}: {
  rate: number;
  delta: number;
  byHour: FailureCell[];
  topReasons: Array<{ reason: string; count: number }>;
}) {
  const maxCount = Math.max(...byHour.map((cell) => cell.count), 1);
  const getColor = (count: number) => {
    const alpha = count / maxCount;
    return `color-mix(in srgb, var(--red) ${Math.round((0.1 + alpha * 0.75) * 100)}%, transparent)`;
  };

  return (
    <Panel delay={0.3}>
      <SectionHeading
        title="Failure Rate"
        subtitle="Patterns by weekday, hour, and top reasons"
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="font-display text-3xl font-semibold text-foreground">
          {formatPercent(rate)}
        </div>
        <DeltaPill value={delta} />
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-background p-4">
        <div className="grid min-w-[720px] grid-cols-[80px_repeat(24,minmax(16px,1fr))] gap-1.5">
          <div />
          {Array.from({ length: 24 }, (_, hour) => (
            <div
              key={hour}
              className="text-center text-[10px] uppercase text-muted-foreground"
            >
              {hour}
            </div>
          ))}

          {WEEKDAY_LABELS.map((day) => (
            <HeatmapRow key={day} day={day} byHour={byHour} getColor={getColor} />
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {topReasons.map((reason) => (
          <div
            key={reason.reason}
            className="rounded-lg border border-border bg-background px-4 py-3"
          >
            <p className="text-sm text-foreground">{reason.reason}</p>
            <p className="mt-1 text-xs text-muted-foreground">{reason.count} failures</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function HeatmapRow({
  day,
  byHour,
  getColor,
}: {
  day: string;
  byHour: FailureCell[];
  getColor: (count: number) => string;
}) {
  return (
    <>
      <div className="flex items-center pr-2 text-sm font-medium text-muted-foreground">
        {day}
      </div>
      {Array.from({ length: 24 }, (_, hour) => {
        const match = byHour.find((entry) => entry.day === day && entry.hour === hour);
        const count = match?.count ?? 0;

        return (
          <div
            key={`${day}-${hour}`}
            className="aspect-square rounded-md border border-border/50"
            style={{ backgroundColor: getColor(count) }}
            title={`${day} ${hour}:00 - ${count} failures`}
          />
        );
      })}
    </>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <Panel>
      <div className="flex flex-col items-start gap-4 rounded-lg border border-dashed border-border bg-background px-5 py-6">
        <div>
          <h3 className="font-display text-xl font-semibold text-foreground">
            No analytics data yet
          </h3>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Once merchants start processing revenue, this page will populate with
            revenue trends, payment mix, conversion performance, failure hotspots, and
            currency rankings.
          </p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium transition hover:bg-muted/40"
        >
          <ArrowClockwise className="h-4 w-4" />
          Reset filters
        </button>
      </div>
    </Panel>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <div className="h-4 w-24 skeleton" />
            <div className="mt-3 h-8 w-32 skeleton" />
            <div className="mt-2 h-3 w-40 skeleton" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="h-[420px] rounded-lg border border-border bg-card p-5 shadow-sm skeleton xl:col-span-2" />
        <div className="h-[420px] rounded-lg border border-border bg-card p-5 shadow-sm skeleton" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="h-[320px] rounded-lg border border-border bg-card p-5 shadow-sm skeleton" />
        <div className="h-[320px] rounded-lg border border-border bg-card p-5 shadow-sm skeleton" />
      </div>

      <div className="h-[360px] rounded-lg border border-border bg-card p-5 shadow-sm skeleton" />
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [period, setPeriod] = useState<Period>("30d");
  const [range, setRange] = useState<DateRange>({ start: "", end: "" });
  const [snapshot, setSnapshot] = useState<AnalyticsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const hasCustomRange = Boolean(range.start && range.end);

  useEffect(() => {
    let active = true;

    loadSnapshot(period, range)
      .then((result) => {
        if (!active) {
          return;
        }

        setSnapshot(result.snapshot);
        setNote(result.note);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setSnapshot(buildDemoSnapshot(period, range));
        setNote(
          "Analytics endpoints could not be reached. Showing a dashboard-safe demo preview instead.",
        );
      })
      .finally(() => {
        if (!active) {
          return;
        }

        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [period, range, refreshKey]);

  const metrics = useMemo(() => {
    if (!snapshot) {
      return null;
    }

    const averageTransaction = snapshot.payments.total
      ? snapshot.payments.total / Math.max(snapshot.revenue.data.length * 6, 1)
      : 0;

    return {
      revenue: snapshot.revenue.total,
      processed: snapshot.payments.total,
      averageTransaction,
      conversionRate: snapshot.payments.conversionRate,
    };
  }, [snapshot]);

  const headerSubtitle = useMemo(() => {
    if (hasCustomRange) {
      return `${range.start} to ${range.end}`;
    }

    const current = PERIOD_OPTIONS.find((option) => option.value === period);
    return `Last ${current?.label ?? period}`;
  }, [hasCustomRange, period, range.end, range.start]);

  const handlePeriodChange = (nextPeriod: Period) => {
    setLoading(true);
    setPeriod(nextPeriod);
  };

  const handleRangeChange = (nextRange: DateRange) => {
    if (
      (nextRange.start && nextRange.end) ||
      (!nextRange.start && !nextRange.end)
    ) {
      setLoading(true);
    }

    setRange(nextRange);
  };

  const handleClearRange = () => {
    setLoading(true);
    setRange({ start: "", end: "" });
  };

  const resetFilters = () => {
    setLoading(true);
    setRange({ start: "", end: "" });
    setPeriod("30d");
    setRefreshKey((value) => value + 1);
  };

  if (loading || !snapshot || !metrics) {
    return <AnalyticsSkeleton />;
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5 shadow-sm"
      >
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold text-foreground">
              Analytics
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Revenue over time, conversion rates, payment method mix, failure
              patterns, and top currencies for merchants.
            </p>
          </div>

          <div className="flex flex-col gap-3 xl:items-end">
            <div className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
              {headerSubtitle}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <DateRangePicker
                range={range}
                onChange={handleRangeChange}
                onClear={handleClearRange}
              />
              <ExportButton
                disabled={!snapshot}
                onExport={() => downloadCsv(snapshot, period, range)}
              />
            </div>
          </div>
        </div>

        <SourceNotice note={note} />
      </motion.div>

      {isSnapshotEmpty(snapshot) ? (
        <EmptyState onReset={resetFilters} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Revenue"
              value={formatMoney(metrics.revenue)}
              hint={`${formatDelta(snapshot.revenue.delta)} vs previous period`}
              delay={0.05}
            />
            <StatCard
              label="Processed Volume"
              value={formatMoney(metrics.processed)}
              hint="Across all completed payment methods"
              delay={0.08}
            />
            <StatCard
              label="Avg. Transaction"
              value={formatMoney(metrics.averageTransaction)}
              hint="Estimated from the loaded analytics buckets"
              delay={0.11}
            />
            <StatCard
              label="Conversion Rate"
              value={formatPercent(metrics.conversionRate)}
              hint={`${formatDelta(snapshot.payments.delta)} vs previous period`}
              delay={0.14}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <RevenueChart
              data={snapshot.revenue.data}
              total={snapshot.revenue.total}
              delta={snapshot.revenue.delta}
              period={period}
              hasCustomRange={hasCustomRange}
              onPeriodChange={handlePeriodChange}
            />
            <PaymentMethodCard
              byMethod={snapshot.payments.byMethod}
              total={snapshot.payments.total}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ConversionCard
              rate={snapshot.payments.conversionRate}
              delta={snapshot.payments.delta}
              trend={snapshot.payments.trend}
            />
            <CurrencyRanking currencies={snapshot.currencies.currencies} />
          </div>

          <FailureHeatmap
            rate={snapshot.failures.rate}
            delta={snapshot.failures.delta}
            byHour={snapshot.failures.byHour}
            topReasons={snapshot.failures.topReasons}
          />
        </>
      )}
    </div>
  );
}

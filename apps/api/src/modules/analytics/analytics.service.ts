import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';

// ----- Accepted values -----
const VALID_PERIODS = new Set(['7d', '30d', '90d', '1y']);
const VALID_GRANULARITIES = new Set(['day', 'week', 'month']);

type GranularityUnit = 'day' | 'week' | 'month';

// ----- Response types -----
export interface RecentPayment {
  id: string;
  merchantId: string;
  status: unknown;
  destAmount: unknown;
  destAsset: string;
  sourceChain: string;
  createdAt: Date;
  [key: string]: unknown;
}

export interface OverviewData {
  revenue: { total: number; delta: number };
  payments: { count: number; delta: number };
  payouts: { total: number };
  /** Lifetime balance (total lifetime revenue minus total lifetime payouts), not period-scoped. */
  balance: number;
  sparklines: { date: string; value: number }[];
  recentTxns: RecentPayment[];
}

export interface TimeSeriesData {
  data: { date: string; value: number }[];
}

export interface PaymentAnalytics {
  total: number;
  delta: number;
  conversionRate: number;
  /**
   * Breakdown by source chain (e.g. ethereum, base, polygon).
   * Renamed from byMethod — the Payment schema does not carry a discrete
   * payment-method field (card / crypto / bank); sourceChain is the closest
   * available dimension. Track adding a paymentMethod column as a follow-up.
   */
  byChain: { chain: string; count: number; percentage: number }[];
}

export interface FailureAnalytics {
  failureRate: number;
  byHourHeatmap: { hour: number; count: number }[];
  /**
   * Note: the Payment schema does not expose a failure-reason field, so
   * topReasons is currently a single aggregated bucket. Add a `failureReason`
   * column to Payment to enable granular breakdown (tracked as follow-up).
   */
  topReasons: { reason: string; count: number }[];
}

export interface CurrencyData {
  currency: string;
  amount: number;
  percentage: number;
}

export interface PayoutAnalytics {
  totalVolume: number;
  delta: number;
  byStatus: { status: string; count: number }[];
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly prisma: PrismaService,
  ) {}

  /** Validate period and return 400 for unrecognised values. */
  private validatePeriod(period: string): void {
    if (!VALID_PERIODS.has(period)) {
      throw new BadRequestException(
        `Invalid period "${period}". Accepted values: ${[...VALID_PERIODS].join(', ')}.`,
      );
    }
  }

  /** Validate granularity and return 400 for unrecognised values. */
  private validateGranularity(granularity: string): GranularityUnit {
    if (!VALID_GRANULARITIES.has(granularity)) {
      throw new BadRequestException(
        `Invalid granularity "${granularity}". Accepted values: ${[...VALID_GRANULARITIES].join(', ')}.`,
      );
    }
    return granularity as GranularityUnit;
  }

  private getPeriodDates(period: string) {
    const currentEnd = new Date();
    let days = 30;
    if (period === '7d') days = 7;
    else if (period === '30d') days = 30;
    else if (period === '90d') days = 90;
    else if (period === '1y') days = 365;

    const currentStart = new Date(
      currentEnd.getTime() - days * 24 * 60 * 60 * 1000,
    );
    const previousEnd = currentStart;
    const previousStart = new Date(
      previousEnd.getTime() - days * 24 * 60 * 60 * 1000,
    );

    return { currentStart, currentEnd, previousStart, previousEnd };
  }

  private calculateDelta(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Number((((current - previous) / previous) * 100).toFixed(2));
  }

  private async getCached<T>(
    key: string,
    fetcher: () => Promise<T>,
  ): Promise<T> {
    const cached = await this.redis.get(key);
    if (cached) return JSON.parse(cached) as T;
    const data = await fetcher();
    await this.redis.setex(key, 120, JSON.stringify(data));
    return data;
  }

  async getOverview(merchantId: string, period: string): Promise<OverviewData> {
    this.validatePeriod(period);
    return this.getCached(
      `analytics:${merchantId}:overview:${period}`,
      async () => {
        const { currentStart, currentEnd, previousStart, previousEnd } =
          this.getPeriodDates(period);

        // --- Revenue (period-scoped) ---
        const currRevenueAggr = await this.prisma.payment.aggregate({
          where: {
            merchantId,
            status: 'COMPLETED',
            createdAt: { gte: currentStart, lte: currentEnd },
          },
          _sum: { destAmount: true },
        });
        const prevRevenueAggr = await this.prisma.payment.aggregate({
          where: {
            merchantId,
            status: 'COMPLETED',
            createdAt: { gte: previousStart, lte: previousEnd },
          },
          _sum: { destAmount: true },
        });

        const currRevenue = Number(currRevenueAggr._sum.destAmount || 0);
        const prevRevenue = Number(prevRevenueAggr._sum.destAmount || 0);
        const revenueDelta = this.calculateDelta(currRevenue, prevRevenue);

        // --- Payments (period-scoped) ---
        const currPaymentsCount = await this.prisma.payment.count({
          where: {
            merchantId,
            createdAt: { gte: currentStart, lte: currentEnd },
          },
        });
        const prevPaymentsCount = await this.prisma.payment.count({
          where: {
            merchantId,
            createdAt: { gte: previousStart, lte: previousEnd },
          },
        });
        const paymentDelta = this.calculateDelta(
          currPaymentsCount,
          prevPaymentsCount,
        );

        // --- Payouts (period-scoped, for display) ---
        const currPayoutsAggr = await this.prisma.payout.aggregate({
          where: {
            merchantId,
            status: 'COMPLETED',
            createdAt: { gte: currentStart, lte: currentEnd },
          },
          _sum: { amount: true },
        });
        const currPayouts = Number(currPayoutsAggr._sum.amount || 0);

        // --- Lifetime balance (total revenue minus total payouts, not period-scoped) ---
        const lifetimeRevenueAggr = await this.prisma.payment.aggregate({
          where: { merchantId, status: 'COMPLETED' },
          _sum: { destAmount: true },
        });
        const lifetimePayoutsAggr = await this.prisma.payout.aggregate({
          where: { merchantId, status: 'COMPLETED' },
          _sum: { amount: true },
        });
        const lifetimeRevenue = Number(
          lifetimeRevenueAggr._sum.destAmount || 0,
        );
        const lifetimePayouts = Number(lifetimePayoutsAggr._sum.amount || 0);
        const balance = lifetimeRevenue - lifetimePayouts;

        // --- Sparklines (daily revenue for the selected period) ---
        const dailyRevenue = await this.prisma.$queryRaw<
          { date: string; value: number }[]
        >`
        SELECT DATE_TRUNC('day', "createdAt") as date, SUM("destAmount") as value
        FROM "Payment"
        WHERE "merchantId" = ${merchantId} AND status = 'COMPLETED' AND "createdAt" >= ${currentStart} AND "createdAt" <= ${currentEnd}
        GROUP BY 1
        ORDER BY date ASC;
      `;

        // --- Recent transactions (typed via Prisma) ---
        const recentTxns = await this.prisma.payment.findMany({
          where: { merchantId },
          orderBy: { createdAt: 'desc' },
          take: 5,
        });

        return {
          revenue: { total: currRevenue, delta: revenueDelta },
          payments: { count: currPaymentsCount, delta: paymentDelta },
          payouts: { total: currPayouts },
          balance,
          sparklines: dailyRevenue.map((r) => ({
            date: String(r.date),
            value: Number(r.value),
          })),
          recentTxns,
        };
      },
    );
  }

  async getRevenue(
    merchantId: string,
    period: string,
    granularity: string,
  ): Promise<TimeSeriesData> {
    this.validatePeriod(period);
    // Validate granularity against allowlist before interpolating into SQL.
    const safeGranularity = this.validateGranularity(granularity);

    return this.getCached(
      `analytics:${merchantId}:revenue:${period}:${safeGranularity}`,
      async () => {
        const { currentStart, currentEnd } = this.getPeriodDates(period);

        // Select the truncated date based on granularity.
        // We use explicit literals in the SQL to avoid parameter issues with GROUP BY.
        let timeSeries: { date: string; value: number }[];

        if (safeGranularity === 'day') {
          timeSeries = await this.prisma.$queryRaw`
            SELECT DATE_TRUNC('day', "createdAt") as date, SUM("destAmount") as value
            FROM "Payment"
            WHERE "merchantId" = ${merchantId} AND status = 'COMPLETED' AND "createdAt" >= ${currentStart} AND "createdAt" <= ${currentEnd}
            GROUP BY 1
            ORDER BY date ASC;
          `;
        } else if (safeGranularity === 'week') {
          timeSeries = await this.prisma.$queryRaw`
            SELECT DATE_TRUNC('week', "createdAt") as date, SUM("destAmount") as value
            FROM "Payment"
            WHERE "merchantId" = ${merchantId} AND status = 'COMPLETED' AND "createdAt" >= ${currentStart} AND "createdAt" <= ${currentEnd}
            GROUP BY 1
            ORDER BY date ASC;
          `;
        } else {
          timeSeries = await this.prisma.$queryRaw`
            SELECT DATE_TRUNC('month', "createdAt") as date, SUM("destAmount") as value
            FROM "Payment"
            WHERE "merchantId" = ${merchantId} AND status = 'COMPLETED' AND "createdAt" >= ${currentStart} AND "createdAt" <= ${currentEnd}
            GROUP BY 1
            ORDER BY date ASC;
          `;
        }
        return {
          data: timeSeries.map((r) => ({
            date: String(r.date),
            value: Number(r.value),
          })),
        };
      },
    );
  }

  async getPaymentAnalytics(
    merchantId: string,
    period: string,
  ): Promise<PaymentAnalytics> {
    this.validatePeriod(period);
    return this.getCached(
      `analytics:${merchantId}:payments:${period}`,
      async () => {
        const { currentStart, currentEnd, previousStart, previousEnd } =
          this.getPeriodDates(period);

        const currTotal = await this.prisma.payment.count({
          where: {
            merchantId,
            createdAt: { gte: currentStart, lte: currentEnd },
          },
        });
        const prevTotal = await this.prisma.payment.count({
          where: {
            merchantId,
            createdAt: { gte: previousStart, lte: previousEnd },
          },
        });
        const delta = this.calculateDelta(currTotal, prevTotal);

        const currCompleted = await this.prisma.payment.count({
          where: {
            merchantId,
            status: 'COMPLETED',
            createdAt: { gte: currentStart, lte: currentEnd },
          },
        });
        const conversionRate =
          currTotal > 0
            ? Number(((currCompleted / currTotal) * 100).toFixed(2))
            : 0;

        // Groups by sourceChain (the nearest available breakdown dimension).
        // The Payment schema does not have a paymentMethod field (card/crypto/bank).
        // Renamed from byMethod → byChain to accurately reflect the data returned.
        const chainCounts = await this.prisma.payment.groupBy({
          by: ['sourceChain'],
          where: {
            merchantId,
            createdAt: { gte: currentStart, lte: currentEnd },
          },
          _count: { sourceChain: true },
        });

        const byChain = chainCounts.map((m) => ({
          chain: m.sourceChain || 'unknown',
          count: m._count.sourceChain,
          percentage:
            currTotal > 0
              ? Number(((m._count.sourceChain / currTotal) * 100).toFixed(2))
              : 0,
        }));

        return { total: currTotal, delta, conversionRate, byChain };
      },
    );
  }

  async getFailureAnalytics(
    merchantId: string,
    period: string,
  ): Promise<FailureAnalytics> {
    this.validatePeriod(period);
    return this.getCached(
      `analytics:${merchantId}:failures:${period}`,
      async () => {
        const { currentStart, currentEnd } = this.getPeriodDates(period);

        const total = await this.prisma.payment.count({
          where: {
            merchantId,
            createdAt: { gte: currentStart, lte: currentEnd },
          },
        });
        const failed = await this.prisma.payment.count({
          where: {
            merchantId,
            status: 'FAILED',
            createdAt: { gte: currentStart, lte: currentEnd },
          },
        });
        const failureRate =
          total > 0 ? Number(((failed / total) * 100).toFixed(2)) : 0;

        const heatmap = await this.prisma.$queryRaw<
          { hour: number; count: number | bigint }[]
        >`
        SELECT EXTRACT(HOUR FROM "createdAt") as hour, COUNT(*) as count
        FROM "Payment"
        WHERE "merchantId" = ${merchantId} AND status = 'FAILED' AND "createdAt" >= ${currentStart} AND "createdAt" <= ${currentEnd}
        GROUP BY 1
        ORDER BY hour ASC;
      `;

        return {
          failureRate,
          byHourHeatmap: heatmap.map((h) => ({
            hour: Number(h.hour),
            count: Number(h.count),
          })),
          // NOTE: The Payment schema does not expose a failure-reason field so
          // topReasons is a single aggregated bucket for now. A follow-up task
          // should add a `failureReason` column to the Payment table to enable
          // granular breakdown.
          topReasons: [{ reason: 'Generic Failure', count: failed }],
        };
      },
    );
  }

  async getCurrencyBreakdown(
    merchantId: string,
    period: string,
  ): Promise<CurrencyData[]> {
    this.validatePeriod(period);
    return this.getCached(
      `analytics:${merchantId}:currencies:${period}`,
      async () => {
        const { currentStart, currentEnd } = this.getPeriodDates(period);

        const totalAggr = await this.prisma.payment.aggregate({
          where: {
            merchantId,
            status: 'COMPLETED',
            createdAt: { gte: currentStart, lte: currentEnd },
          },
          _sum: { destAmount: true },
        });
        const totalVolume = Number(totalAggr._sum.destAmount || 0);

        const breakdown = await this.prisma.payment.groupBy({
          by: ['destAsset'],
          where: {
            merchantId,
            status: 'COMPLETED',
            createdAt: { gte: currentStart, lte: currentEnd },
          },
          _sum: { destAmount: true },
          orderBy: { _sum: { destAmount: 'desc' } },
        });

        return breakdown.map((b) => {
          const amount = Number(b._sum.destAmount || 0);
          return {
            currency: b.destAsset,
            amount,
            percentage:
              totalVolume > 0
                ? Number(((amount / totalVolume) * 100).toFixed(2))
                : 0,
          };
        });
      },
    );
  }

  async getPayoutAnalytics(
    merchantId: string,
    period: string,
  ): Promise<PayoutAnalytics> {
    this.validatePeriod(period);
    return this.getCached(
      `analytics:${merchantId}:payouts:${period}`,
      async () => {
        const { currentStart, currentEnd, previousStart, previousEnd } =
          this.getPeriodDates(period);

        const currAggr = await this.prisma.payout.aggregate({
          where: {
            merchantId,
            createdAt: { gte: currentStart, lte: currentEnd },
          },
          _sum: { amount: true },
        });
        const prevAggr = await this.prisma.payout.aggregate({
          where: {
            merchantId,
            createdAt: { gte: previousStart, lte: previousEnd },
          },
          _sum: { amount: true },
        });

        const currTotal = Number(currAggr._sum.amount || 0);
        const prevTotal = Number(prevAggr._sum.amount || 0);
        const delta = this.calculateDelta(currTotal, prevTotal);

        const statusGroup = await this.prisma.payout.groupBy({
          by: ['status'],
          where: {
            merchantId,
            createdAt: { gte: currentStart, lte: currentEnd },
          },
          _count: { status: true },
        });

        return {
          totalVolume: currTotal,
          delta,
          byStatus: statusGroup.map((s) => ({
            status: s.status,
            count: s._count.status,
          })),
        };
      },
    );
  }
}

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';

// Mock PrismaService to avoid loading the generated Prisma client
const mockPrismaService = {
  payment: {
    aggregate: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
    findMany: jest.fn(),
  },
  payout: {
    aggregate: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
  $queryRaw: jest.fn(),
};

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: jest.fn().mockImplementation(() => mockPrismaService),
}));

import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../prisma/prisma.service';

const mockRedis = {
  get: jest.fn(),
  setex: jest.fn(),
};

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: mockPrismaService },
        {
          provide: 'default_IORedisModuleConnectionToken',
          useValue: mockRedis,
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // Period validation
  // ---------------------------------------------------------------------------
  describe('period validation', () => {
    it('throws BadRequestException for invalid period', async () => {
      await expect(service.getOverview('m1', 'bad')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.getRevenue('m1', 'bad', 'day')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.getPaymentAnalytics('m1', 'bad')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.getFailureAnalytics('m1', 'bad')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.getCurrencyBreakdown('m1', 'bad')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.getPayoutAnalytics('m1', 'bad')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('accepts all valid period values', async () => {
      for (const p of ['7d', '30d', '90d', '1y']) {
        mockRedis.get.mockResolvedValueOnce(JSON.stringify({ cached: true }));
        await expect(service.getOverview('m1', p)).resolves.toEqual({
          cached: true,
        });
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Granularity validation
  // ---------------------------------------------------------------------------
  describe('granularity validation in getRevenue', () => {
    it('throws BadRequestException for invalid granularity', async () => {
      await expect(service.getRevenue('m1', '30d', 'hour')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.getRevenue('m1', '30d', 'year')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('accepts day, week, month', async () => {
      for (const g of ['day', 'week', 'month']) {
        mockRedis.get.mockResolvedValueOnce(JSON.stringify({ data: [] }));
        await expect(service.getRevenue('m1', '30d', g)).resolves.toEqual({
          data: [],
        });
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Delta calculation
  // ---------------------------------------------------------------------------
  describe('delta calculation', () => {
    it('returns 100 when previous is 0 and current > 0', async () => {
      mockRedis.get.mockResolvedValue(null);
      // override mocks so overview runs
      mockPrismaService.payment.aggregate
        .mockResolvedValueOnce({ _sum: { destAmount: 500 } }) // currRevenue
        .mockResolvedValueOnce({ _sum: { destAmount: 0 } }) // prevRevenue
        .mockResolvedValueOnce({ _sum: { destAmount: 0 } }); // lifetimeRevenue
      mockPrismaService.payout.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 0 } }) // currPayouts
        .mockResolvedValueOnce({ _sum: { amount: 0 } }); // lifetimePayouts
      mockPrismaService.payment.count
        .mockResolvedValueOnce(5) // currPaymentsCount
        .mockResolvedValueOnce(0); // prevPaymentsCount
      mockPrismaService.$queryRaw.mockResolvedValue([]);
      mockPrismaService.payment.findMany.mockResolvedValue([]);

      const result = await service.getOverview('m1', '30d');
      expect(result.revenue.delta).toBe(100);
      expect(result.payments.delta).toBe(100);
    });

    it('returns 0 delta when both current and previous are 0', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrismaService.payment.aggregate
        .mockResolvedValueOnce({ _sum: { destAmount: 0 } })
        .mockResolvedValueOnce({ _sum: { destAmount: 0 } })
        .mockResolvedValueOnce({ _sum: { destAmount: 0 } });
      mockPrismaService.payout.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 0 } })
        .mockResolvedValueOnce({ _sum: { amount: 0 } });
      mockPrismaService.payment.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      mockPrismaService.$queryRaw.mockResolvedValue([]);
      mockPrismaService.payment.findMany.mockResolvedValue([]);

      const result = await service.getOverview('m1', '30d');
      expect(result.revenue.delta).toBe(0);
      expect(result.payments.delta).toBe(0);
    });

    it('calculates negative delta correctly', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrismaService.payment.aggregate
        .mockResolvedValueOnce({ _sum: { destAmount: 50 } }) // curr (halved)
        .mockResolvedValueOnce({ _sum: { destAmount: 100 } }) // prev
        .mockResolvedValueOnce({ _sum: { destAmount: 50 } }); // lifetime
      mockPrismaService.payout.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 0 } })
        .mockResolvedValueOnce({ _sum: { amount: 0 } });
      mockPrismaService.payment.count
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(10);
      mockPrismaService.$queryRaw.mockResolvedValue([]);
      mockPrismaService.payment.findMany.mockResolvedValue([]);

      const result = await service.getOverview('m1', '30d');
      expect(result.revenue.delta).toBe(-50);
    });
  });

  // ---------------------------------------------------------------------------
  // getOverview
  // ---------------------------------------------------------------------------
  describe('getOverview', () => {
    it('returns cached data without hitting the database', async () => {
      const cachedResult = {
        balance: 1000,
        revenue: { total: 1000, delta: 0 },
      };
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(cachedResult));
      const result = await service.getOverview('merchant-1', '30d');
      expect(result).toEqual(cachedResult);
      expect(mockPrismaService.payment.aggregate).not.toHaveBeenCalled();
    });

    it('computes lifetime balance (not period balance)', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrismaService.payment.aggregate
        .mockResolvedValueOnce({ _sum: { destAmount: 500 } }) // currRevenue
        .mockResolvedValueOnce({ _sum: { destAmount: 0 } }) // prevRevenue
        .mockResolvedValueOnce({ _sum: { destAmount: 1200 } }); // lifetimeRevenue
      mockPrismaService.payout.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 200 } }) // currPayouts (period)
        .mockResolvedValueOnce({ _sum: { amount: 300 } }); // lifetimePayouts
      mockPrismaService.payment.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(5);
      mockPrismaService.$queryRaw.mockResolvedValue([]);
      mockPrismaService.payment.findMany.mockResolvedValue([]);

      const result = await service.getOverview('merchant-1', '30d');
      // balance = lifetimeRevenue (1200) - lifetimePayouts (300) = 900
      expect(result.balance).toBe(900);
      expect(mockRedis.setex).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // getPaymentAnalytics
  // ---------------------------------------------------------------------------
  describe('getPaymentAnalytics', () => {
    it('uses byChain (not byMethod) in the response shape', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrismaService.payment.count
        .mockResolvedValueOnce(10) // currTotal
        .mockResolvedValueOnce(5) // prevTotal
        .mockResolvedValueOnce(8); // currCompleted
      mockPrismaService.payment.groupBy.mockResolvedValueOnce([
        { sourceChain: 'ethereum', _count: { sourceChain: 6 } },
        { sourceChain: 'base', _count: { sourceChain: 4 } },
      ]);

      const result = await service.getPaymentAnalytics('merchant-1', '30d');
      expect(result).toHaveProperty('byChain');
      expect(result).not.toHaveProperty('byMethod');
      expect(result.byChain).toHaveLength(2);
      expect(result.byChain[0]).toMatchObject({ chain: 'ethereum', count: 6 });
    });

    it('returns conversionRate of 0 when total is 0', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrismaService.payment.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      mockPrismaService.payment.groupBy.mockResolvedValueOnce([]);

      const result = await service.getPaymentAnalytics('merchant-1', '30d');
      expect(result.conversionRate).toBe(0);
      expect(result.byChain).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // getFailureAnalytics
  // ---------------------------------------------------------------------------
  describe('getFailureAnalytics', () => {
    it('returns failureRate of 0 when there are no payments', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrismaService.payment.count
        .mockResolvedValueOnce(0) // total
        .mockResolvedValueOnce(0); // failed
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      const result = await service.getFailureAnalytics('merchant-1', '30d');
      expect(result.failureRate).toBe(0);
    });

    it('calculates failureRate correctly', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrismaService.payment.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(25); // failed
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      const result = await service.getFailureAnalytics('merchant-1', '30d');
      expect(result.failureRate).toBe(25);
    });
  });

  // ---------------------------------------------------------------------------
  // getCurrencyBreakdown
  // ---------------------------------------------------------------------------
  describe('getCurrencyBreakdown', () => {
    it('returns correct percentages per currency', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrismaService.payment.aggregate.mockResolvedValueOnce({
        _sum: { destAmount: 200 },
      });
      mockPrismaService.payment.groupBy.mockResolvedValueOnce([
        { destAsset: 'USDC', _sum: { destAmount: 150 } },
        { destAsset: 'EURC', _sum: { destAmount: 50 } },
      ]);

      const result = await service.getCurrencyBreakdown('merchant-1', '30d');
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        currency: 'USDC',
        amount: 150,
        percentage: 75,
      });
      expect(result[1]).toMatchObject({
        currency: 'EURC',
        amount: 50,
        percentage: 25,
      });
    });
  });

  // ---------------------------------------------------------------------------
  // getPayoutAnalytics
  // ---------------------------------------------------------------------------
  describe('getPayoutAnalytics', () => {
    it('groups payouts by status', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrismaService.payout.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 500 } })
        .mockResolvedValueOnce({ _sum: { amount: 400 } });
      mockPrismaService.payout.groupBy.mockResolvedValueOnce([
        { status: 'COMPLETED', _count: { status: 3 } },
        { status: 'PENDING', _count: { status: 1 } },
      ]);

      const result = await service.getPayoutAnalytics('merchant-1', '30d');
      expect(result.totalVolume).toBe(500);
      expect(result.byStatus).toHaveLength(2);
      expect(result.byStatus[0]).toMatchObject({
        status: 'COMPLETED',
        count: 3,
      });
    });
  });
});

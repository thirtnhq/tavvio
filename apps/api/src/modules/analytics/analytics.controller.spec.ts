import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';

// Mock PrismaService to avoid loading the generated Prisma client
jest.mock('../prisma/prisma.service', () => ({
  PrismaService: jest.fn(),
}));

import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

const mockAnalyticsService = {
  getOverview: jest
    .fn()
    .mockResolvedValue({ revenue: { total: 500, delta: 10 } }),
  getRevenue: jest
    .fn()
    .mockResolvedValue({ data: [{ date: '2026-01-01', value: 200 }] }),
  getPaymentAnalytics: jest.fn().mockResolvedValue({
    total: 10,
    delta: 5,
    conversionRate: 80,
    byChain: [],
  }),
  getFailureAnalytics: jest
    .fn()
    .mockResolvedValue({ failureRate: 5, byHourHeatmap: [], topReasons: [] }),
  getCurrencyBreakdown: jest
    .fn()
    .mockResolvedValue([{ currency: 'USDC', amount: 100, percentage: 100 }]),
  getPayoutAnalytics: jest
    .fn()
    .mockResolvedValue({ totalVolume: 50, delta: 0, byStatus: [] }),
};

describe('AnalyticsController', () => {
  let controller: AnalyticsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        {
          provide: AnalyticsService,
          useValue: mockAnalyticsService,
        },
      ],
    }).compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getOverview', () => {
    it('should pass a valid period to the service', async () => {
      mockAnalyticsService.getOverview.mockResolvedValueOnce({
        revenue: { total: 0, delta: 0 },
      });
      const result = await controller.getOverview('merchant-1', '30d');
      expect(result).toEqual({ revenue: { total: 0, delta: 0 } });
      expect(mockAnalyticsService.getOverview).toHaveBeenCalledWith(
        'merchant-1',
        '30d',
      );
    });

    it('should default to 30d when period is omitted', async () => {
      mockAnalyticsService.getOverview.mockResolvedValueOnce({
        revenue: { total: 0, delta: 0 },
      });
      await controller.getOverview('merchant-1');
      expect(mockAnalyticsService.getOverview).toHaveBeenCalledWith(
        'merchant-1',
        '30d',
      );
    });

    it('should throw BadRequestException for an invalid period', async () => {
      await expect(async () =>
        controller.getOverview('merchant-1', 'bad'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getRevenue', () => {
    it('should pass valid period and granularity to the service', async () => {
      mockAnalyticsService.getRevenue.mockResolvedValueOnce({ data: [] });
      const result = await controller.getRevenue('merchant-1', '7d', 'week');
      expect(result).toEqual({ data: [] });
      expect(mockAnalyticsService.getRevenue).toHaveBeenCalledWith(
        'merchant-1',
        '7d',
        'week',
      );
    });

    it('should default granularity to "day" when omitted', async () => {
      mockAnalyticsService.getRevenue.mockResolvedValueOnce({ data: [] });
      await controller.getRevenue('merchant-1', '30d');
      expect(mockAnalyticsService.getRevenue).toHaveBeenCalledWith(
        'merchant-1',
        '30d',
        'day',
      );
    });

    it('should throw BadRequestException for an invalid granularity', async () => {
      await expect(async () =>
        controller.getRevenue('merchant-1', '30d', 'hour'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getPaymentAnalytics', () => {
    it('should throw BadRequestException for an invalid period', async () => {
      await expect(async () =>
        controller.getPaymentAnalytics('merchant-1', 'invalid'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should call service with valid period', async () => {
      mockAnalyticsService.getPaymentAnalytics.mockResolvedValueOnce({
        total: 5,
        delta: 0,
        conversionRate: 100,
        byChain: [],
      });
      await controller.getPaymentAnalytics('merchant-1', '90d');
      expect(mockAnalyticsService.getPaymentAnalytics).toHaveBeenCalledWith(
        'merchant-1',
        '90d',
      );
    });
  });

  describe('getFailureAnalytics', () => {
    it('should call service with valid period', async () => {
      mockAnalyticsService.getFailureAnalytics.mockResolvedValueOnce({
        failureRate: 0,
        byHourHeatmap: [],
        topReasons: [],
      });
      await controller.getFailureAnalytics('merchant-1', '1y');
      expect(mockAnalyticsService.getFailureAnalytics).toHaveBeenCalledWith(
        'merchant-1',
        '1y',
      );
    });
  });

  describe('getCurrencyBreakdown', () => {
    it('should call service with valid period', async () => {
      mockAnalyticsService.getCurrencyBreakdown.mockResolvedValueOnce([]);
      await controller.getCurrencyBreakdown('merchant-1', '7d');
      expect(mockAnalyticsService.getCurrencyBreakdown).toHaveBeenCalledWith(
        'merchant-1',
        '7d',
      );
    });
  });

  describe('getPayoutAnalytics', () => {
    it('should call service with valid period', async () => {
      mockAnalyticsService.getPayoutAnalytics.mockResolvedValueOnce({
        totalVolume: 0,
        delta: 0,
        byStatus: [],
      });
      await controller.getPayoutAnalytics('merchant-1', '30d');
      expect(mockAnalyticsService.getPayoutAnalytics).toHaveBeenCalledWith(
        'merchant-1',
        '30d',
      );
    });
  });
});

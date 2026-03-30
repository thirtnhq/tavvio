import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentMerchant } from '../../common/decorators/current-merchant.decorator';
import { AnalyticsService } from './analytics.service';

const VALID_PERIODS = ['7d', '30d', '90d', '1y'] as const;
const VALID_GRANULARITIES = ['day', 'week', 'month'] as const;

type Period = (typeof VALID_PERIODS)[number];
type Granularity = (typeof VALID_GRANULARITIES)[number];

function parsePeriod(raw?: string): Period {
  const value = raw ?? '30d';
  if (!(VALID_PERIODS as readonly string[]).includes(value)) {
    throw new BadRequestException(
      `Invalid period "${value}". Accepted values: ${VALID_PERIODS.join(', ')}.`,
    );
  }
  return value as Period;
}

function parseGranularity(raw?: string): Granularity {
  const value = raw ?? 'day';
  if (!(VALID_GRANULARITIES as readonly string[]).includes(value)) {
    throw new BadRequestException(
      `Invalid granularity "${value}". Accepted values: ${VALID_GRANULARITIES.join(', ')}.`,
    );
  }
  return value as Granularity;
}

@UseGuards(JwtAuthGuard)
@Controller('v1/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  async getOverview(
    @CurrentMerchant('id') merchantId: string,
    @Query('period') period?: string,
  ) {
    return this.analyticsService.getOverview(merchantId, parsePeriod(period));
  }

  @Get('revenue')
  async getRevenue(
    @CurrentMerchant('id') merchantId: string,
    @Query('period') period?: string,
    @Query('granularity') granularity?: string,
  ) {
    return this.analyticsService.getRevenue(
      merchantId,
      parsePeriod(period),
      parseGranularity(granularity),
    );
  }

  @Get('payments')
  async getPaymentAnalytics(
    @CurrentMerchant('id') merchantId: string,
    @Query('period') period?: string,
  ) {
    return this.analyticsService.getPaymentAnalytics(
      merchantId,
      parsePeriod(period),
    );
  }

  @Get('failures')
  async getFailureAnalytics(
    @CurrentMerchant('id') merchantId: string,
    @Query('period') period?: string,
  ) {
    return this.analyticsService.getFailureAnalytics(
      merchantId,
      parsePeriod(period),
    );
  }

  @Get('currencies')
  async getCurrencyBreakdown(
    @CurrentMerchant('id') merchantId: string,
    @Query('period') period?: string,
  ) {
    return this.analyticsService.getCurrencyBreakdown(
      merchantId,
      parsePeriod(period),
    );
  }

  @Get('payouts')
  async getPayoutAnalytics(
    @CurrentMerchant('id') merchantId: string,
    @Query('period') period?: string,
  ) {
    return this.analyticsService.getPayoutAnalytics(
      merchantId,
      parsePeriod(period),
    );
  }
}

import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { BridgeRouterService } from '../../modules/bridge/bridge-router.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { QuoteResponseDto } from './dto/quote-response.dto';
import { CombinedAuthGuard } from '../../common/guards/combined-auth.guard';
import { CurrentMerchant } from '../../common/decorators/current-merchant.decorator';

@Controller('v1/quotes')
@UseGuards(CombinedAuthGuard)
export class QuotesController {
  constructor(
    private readonly quotesService: QuotesService,
    private readonly bridgeRouter: BridgeRouterService,
  ) {}

  /**
   * Create a new quote with rate locking and TTL
   * POST /v1/quotes
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async createQuote(
    @Body() dto: CreateQuoteDto,
    @CurrentMerchant('id') merchantId: string,
  ): Promise<QuoteResponseDto> {
    return this.quotesService.createQuote(dto, merchantId);
  }

  /**
   * Get quote details (for display in checkout)
   * GET /v1/quotes/:id
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getQuote(@Param('id') quoteId: string): Promise<QuoteResponseDto | null> {
    const quote = await this.quotesService.getQuote(quoteId);
    if (!quote) {
      return null;
    }

    // Determine estimated time from bridge route
    const routeDecision = this.bridgeRouter.findRoute(
      quote.fromChain,
      quote.toChain,
      quote.fromAsset,
    );

    // Convert to response DTO
    return {
      id: quote.id,
      fromChain: quote.fromChain,
      fromAsset: quote.fromAsset,
      fromAmount: quote.fromAmount.toString(),
      toChain: quote.toChain,
      toAsset: quote.toAsset,
      toAmount: quote.toAmount.toString(),
      rate: quote.rate.toString(),
      fee: quote.feeAmount.toString(),
      feeBps: quote.feeBps,
      bridgeProvider: quote.bridgeRoute,
      estimatedTimeMs: routeDecision.estimatedTimeMs,
      expiresAt: quote.expiresAt.toISOString(),
      expiresInSeconds: Math.max(
        0,
        Math.floor((quote.expiresAt.getTime() - Date.now()) / 1000),
      ),
    };
  }
}

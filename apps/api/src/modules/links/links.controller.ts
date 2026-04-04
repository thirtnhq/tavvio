import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UsePipes,
  HttpCode,
  HttpStatus,
  Redirect,
} from '@nestjs/common';
import { LinksService } from './links.service.js';
import { CreateLinkSchema } from './dto/create-link.dto.js';
import type { CreateLinkDto } from './dto/create-link.dto.js';
import { CombinedAuthGuard } from '../../common/guards/combined-auth.guard.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PublicRoute } from '../../common/decorators/public-route.decorator.js';
import { CurrentMerchant } from '../../common/decorators/current-merchant.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';

const CHECKOUT_BASE = process.env.CHECKOUT_URL ?? 'https://pay.useroutr.io';

@Controller()
export class LinksController {
  constructor(private readonly linksService: LinksService) {}

  @UseGuards(CombinedAuthGuard)
  @Post('v1/payment-links')
  @UsePipes(new ZodValidationPipe(CreateLinkSchema))
  async create(
    @CurrentMerchant('id') merchantId: string,
    @Body() dto: CreateLinkDto,
  ) {
    return this.linksService.create(merchantId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('v1/payment-links')
  async list(
    @CurrentMerchant('id') merchantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.linksService.getByMerchant(merchantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @UseGuards(CombinedAuthGuard)
  @Get('v1/payment-links/:id')
  async getOne(@Param('id') id: string) {
    // Strip lnk_ prefix if present
    const linkId = id.startsWith('lnk_') ? id.slice(4) : id;
    return this.linksService.getById(linkId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('v1/payment-links/:id')
  @HttpCode(HttpStatus.OK)
  async deactivate(
    @CurrentMerchant('id') merchantId: string,
    @Param('id') id: string,
  ) {
    const linkId = id.startsWith('lnk_') ? id.slice(4) : id;
    return this.linksService.deactivate(merchantId, linkId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('v1/payment-links/:id/stats')
  async stats(
    @CurrentMerchant('id') merchantId: string,
    @Param('id') id: string,
  ) {
    const linkId = id.startsWith('lnk_') ? id.slice(4) : id;
    return this.linksService.getStats(merchantId, linkId);
  }

  @PublicRoute()
  @Get('pay/:shortCode')
  @Redirect()
  async resolve(@Param('shortCode') shortCode: string) {
    const link = await this.linksService.resolve(shortCode);

    if (link.amount !== null) {
      // Fixed amount: redirect to checkout
      return {
        url: `${CHECKOUT_BASE}/checkout?link=${shortCode}`,
        statusCode: HttpStatus.FOUND,
      };
    }

    // Open amount: redirect to landing page for amount input
    return {
      url: `${CHECKOUT_BASE}/pay/${shortCode}`,
      statusCode: HttpStatus.FOUND,
    };
  }
}

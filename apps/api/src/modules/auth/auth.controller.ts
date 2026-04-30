import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Query,
  Param,
  UseGuards,
  UsePipes,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { RegisterSchema } from './dto/register.dto.js';
import type { RegisterDto } from './dto/register.dto.js';
import { LoginSchema } from './dto/login.dto.js';
import type { LoginDto } from './dto/login.dto.js';
import { RefreshSchema } from './dto/refresh.dto.js';
import type { RefreshDto } from './dto/refresh.dto.js';
import { ForgotPasswordSchema } from './dto/forgot-password.dto.js';
import type { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordSchema } from './dto/reset-password.dto.js';
import type { ResetPasswordDto } from './dto/reset-password.dto.js';
import { VerifyEmailSchema } from './dto/verify-email.dto.js';
import type { VerifyEmailDto } from './dto/verify-email.dto.js';
import { ResendVerificationSchema } from './dto/resend-verification.dto.js';
import type { ResendVerificationDto } from './dto/resend-verification.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PublicRoute } from '../../common/decorators/public-route.decorator.js';
import { CurrentMerchant } from '../../common/decorators/current-merchant.decorator.js';
import { ZodValidationPipe } from './pipes/zod-validation.pipe.js';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @PublicRoute()
  @Post('auth/register')
  @UsePipes(new ZodValidationPipe(RegisterSchema))
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @PublicRoute()
  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(LoginSchema))
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @PublicRoute()
  @Post('auth/refresh')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(RefreshSchema))
  async refresh(@Body() dto: RefreshDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @PublicRoute()
  @Post('auth/forgot-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UsePipes(new ZodValidationPipe(ForgotPasswordSchema))
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<void> {
    await this.authService.forgotPassword(dto.email);
  }

  @PublicRoute()
  @Post('auth/reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UsePipes(new ZodValidationPipe(ResetPasswordSchema))
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<void> {
    await this.authService.resetPassword(dto.token, dto.password);
  }

  @PublicRoute()
  @Post('auth/verify')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(VerifyEmailSchema))
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.email, dto.code);
  }

  @PublicRoute()
  @Post('auth/resend-verification')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UsePipes(new ZodValidationPipe(ResendVerificationSchema))
  async resendVerification(
    @Body() dto: ResendVerificationDto,
  ): Promise<void> {
    await this.authService.resendVerification(dto.email);
  }

  @UseGuards(JwtAuthGuard)
  @Post('auth/logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @CurrentMerchant('id') merchantId: string,
  ): Promise<void> {
    await this.authService.logout(merchantId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('auth/me')
  async getProfile(@CurrentMerchant('id') merchantId: string) {
    return this.authService.getProfile(merchantId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('merchants/api-keys')
  async listApiKeys(@CurrentMerchant('id') merchantId: string) {
    return this.authService.listApiKeys(merchantId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('merchants/api-keys')
  async generateApiKey(
    @CurrentMerchant('id') merchantId: string,
    @Query('mode') mode?: 'live' | 'test',
    @Body('name') name?: string,
  ) {
    return this.authService.generateApiKey(
      merchantId,
      mode ?? 'live',
      name ?? 'Untitled Key',
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete('merchants/api-keys/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeApiKey(
    @CurrentMerchant('id') merchantId: string,
    @Param('id') keyId: string,
  ): Promise<void> {
    await this.authService.revokeApiKey(merchantId, keyId);
  }
}

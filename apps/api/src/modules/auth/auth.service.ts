import {
  Injectable,
  Logger,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import type { Merchant } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import type { RegisterDto } from './dto/register.dto.js';
import type { LoginDto } from './dto/login.dto.js';
import type { JwtPayload } from './strategies/jwt.strategy.js';

const BCRYPT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const VERIFICATION_CODE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export type SafeMerchant = Omit<Merchant, 'passwordHash' | 'apiKeyHash'>;

export interface AuthResponse extends AuthTokens {
  merchant: SafeMerchant;
}

export interface ApiKeyResponse {
  apiKey: string;
  id: string;
  name: string;
  maskedKey: string;
  mode: string;
  message: string;
}

export interface ApiKeyListItem {
  id: string;
  name: string;
  maskedKey: string;
  mode: string;
  lastUsedAt: string | null;
  createdAt: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly notifications: NotificationsService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existing = await this.prisma.merchant.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const { code, hash, expiresAt } = await this.createVerificationCode();

    const merchant = await this.prisma.merchant.create({
      data: {
        name: dto.companyName || dto.name,
        email: dto.email,
        passwordHash,
        verificationCodeHash: hash,
        verificationCodeExpiresAt: expiresAt,
      },
    });

    await this.dispatchVerificationEmail(merchant.email, code);

    const tokens = await this.generateTokens(merchant.id, merchant.email);

    return {
      merchant: this.sanitizeMerchant(merchant),
      ...tokens,
    };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const merchant = await this.prisma.merchant.findUnique({
      where: { email: dto.email },
    });

    if (!merchant) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(
      dto.password,
      merchant.passwordHash,
    );

    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(merchant.id, merchant.email);

    return {
      merchant: this.sanitizeMerchant(merchant),
      ...tokens,
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    let payload: JwtPayload;

    try {
      payload = this.jwtService.verify<JwtPayload>(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    const merchant = await this.prisma.merchant.findUnique({
      where: { id: payload.sub },
    });

    if (!merchant) {
      throw new UnauthorizedException('Merchant not found');
    }

    return this.generateTokens(merchant.id, merchant.email);
  }

  // ── API Key Management ──────────────────────────────────────────

  async listApiKeys(merchantId: string): Promise<ApiKeyListItem[]> {
    const keys = await this.prisma.apiKey.findMany({
      where: { merchantId },
      orderBy: { createdAt: 'desc' },
    });

    return keys.map((k) => ({
      id: k.id,
      name: k.name,
      maskedKey: k.maskedKey,
      mode: k.mode,
      lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
      createdAt: k.createdAt.toISOString(),
    }));
  }

  async generateApiKey(
    merchantId: string,
    mode: 'live' | 'test' = 'live',
    name: string = 'Untitled Key',
  ): Promise<ApiKeyResponse> {
    const prefix = mode === 'live' ? 'ur_live_' : 'ur_test_';
    const randomPart = crypto.randomBytes(32).toString('hex').slice(0, 32);
    const plainTextKey = `${prefix}${randomPart}`;

    const maskedKey = `${plainTextKey.slice(0, prefix.length + 4)}...${plainTextKey.slice(-4)}`;
    const keyHash = await bcrypt.hash(plainTextKey, BCRYPT_ROUNDS);

    const apiKey = await this.prisma.apiKey.create({
      data: {
        merchantId,
        name,
        keyHash,
        maskedKey,
        mode: mode === 'live' ? 'LIVE' : 'TEST',
      },
    });

    return {
      apiKey: plainTextKey,
      id: apiKey.id,
      name: apiKey.name,
      maskedKey: apiKey.maskedKey,
      mode: apiKey.mode,
      message: 'Store this key securely. It will not be shown again.',
    };
  }

  async revokeApiKey(merchantId: string, keyId: string): Promise<void> {
    const key = await this.prisma.apiKey.findFirst({
      where: { id: keyId, merchantId },
    });

    if (!key) {
      throw new NotFoundException('API key not found');
    }

    await this.prisma.apiKey.delete({ where: { id: keyId } });
  }

  async validateApiKey(apiKey: string): Promise<Merchant> {
    if (!apiKey.startsWith('ur_live_') && !apiKey.startsWith('ur_test_')) {
      throw new BadRequestException('Invalid API key format');
    }

    // Check new ApiKey table first
    const apiKeys = await this.prisma.apiKey.findMany({
      select: { id: true, keyHash: true, merchantId: true },
    });

    for (const key of apiKeys) {
      if (await bcrypt.compare(apiKey, key.keyHash)) {
        // Update lastUsedAt
        await this.prisma.apiKey.update({
          where: { id: key.id },
          data: { lastUsedAt: new Date() },
        });

        const merchant = await this.prisma.merchant.findUnique({
          where: { id: key.merchantId },
        });

        if (!merchant) {
          throw new UnauthorizedException('Merchant not found');
        }

        return merchant;
      }
    }

    // Fallback: check legacy apiKeyHash on Merchant (backward compat)
    const merchants = await this.prisma.merchant.findMany({
      where: { apiKeyHash: { not: null } },
      select: { id: true, apiKeyHash: true },
    });

    for (const merchant of merchants) {
      if (
        merchant.apiKeyHash &&
        (await bcrypt.compare(apiKey, merchant.apiKeyHash))
      ) {
        const fullMerchant = await this.prisma.merchant.findUnique({
          where: { id: merchant.id },
        });

        if (!fullMerchant) {
          throw new UnauthorizedException('Merchant not found');
        }

        return fullMerchant;
      }
    }

    throw new UnauthorizedException('Invalid API key');
  }

  // ── Email verification ──────────────────────────────────────────

  async resendVerification(email: string): Promise<void> {
    const merchant = await this.prisma.merchant.findUnique({
      where: { email },
    });

    // Silently succeed for unknown / already-verified accounts to prevent enumeration
    if (!merchant || merchant.emailVerifiedAt) {
      return;
    }

    const { code, hash, expiresAt } = await this.createVerificationCode();

    await this.prisma.merchant.update({
      where: { id: merchant.id },
      data: {
        verificationCodeHash: hash,
        verificationCodeExpiresAt: expiresAt,
      },
    });

    await this.dispatchVerificationEmail(merchant.email, code);
  }

  async verifyEmail(email: string, code: string): Promise<SafeMerchant> {
    const merchant = await this.prisma.merchant.findUnique({
      where: { email },
    });

    if (!merchant) {
      throw new BadRequestException('Invalid or expired code');
    }

    if (merchant.emailVerifiedAt) {
      return this.sanitizeMerchant(merchant);
    }

    if (
      !merchant.verificationCodeHash ||
      !merchant.verificationCodeExpiresAt ||
      merchant.verificationCodeExpiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException('Invalid or expired code');
    }

    const ok = await bcrypt.compare(code, merchant.verificationCodeHash);
    if (!ok) {
      throw new BadRequestException('Invalid or expired code');
    }

    const updated = await this.prisma.merchant.update({
      where: { id: merchant.id },
      data: {
        emailVerifiedAt: new Date(),
        verificationCodeHash: null,
        verificationCodeExpiresAt: null,
      },
    });

    return this.sanitizeMerchant(updated);
  }

  // ── Password reset ──────────────────────────────────────────────

  async forgotPassword(email: string): Promise<void> {
    const merchant = await this.prisma.merchant.findUnique({
      where: { email },
    });

    // Always return success to avoid email enumeration
    if (!merchant) {
      return;
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(rawToken, BCRYPT_ROUNDS);
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

    await this.prisma.merchant.update({
      where: { id: merchant.id },
      data: {
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: expiresAt,
      },
    });

    // Embed merchant id in the token so we can locate the row by primary key
    // without scanning every merchant on reset.
    const externalToken = `${merchant.id}.${rawToken}`;

    try {
      await this.notifications.sendPasswordResetEmail(
        merchant.email,
        externalToken,
      );
    } catch (err) {
      this.logger.warn(
        `Failed to enqueue password reset email for ${merchant.email}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const [merchantId, rawToken] = token.split('.');
    if (!merchantId || !rawToken) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
    });

    if (
      !merchant ||
      !merchant.passwordResetTokenHash ||
      !merchant.passwordResetExpiresAt ||
      merchant.passwordResetExpiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const ok = await bcrypt.compare(rawToken, merchant.passwordResetTokenHash);
    if (!ok) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await this.prisma.merchant.update({
      where: { id: merchant.id },
      data: {
        passwordHash,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
      },
    });
  }

  // ── Logout ──────────────────────────────────────────────────────

  // With stateless JWTs the server has nothing to invalidate. The endpoint
  // exists so clients can hook in observability and (future) refresh-token
  // revocation without an API change.
  async logout(_merchantId: string): Promise<void> {
    return;
  }

  // ── Profile ─────────────────────────────────────────────────────

  async getProfile(merchantId: string): Promise<SafeMerchant> {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
    });

    if (!merchant) {
      throw new UnauthorizedException('Merchant not found');
    }

    return this.sanitizeMerchant(merchant);
  }

  private async generateTokens(
    merchantId: string,
    email: string,
  ): Promise<AuthTokens> {
    const accessPayload: JwtPayload = {
      sub: merchantId,
      email,
      type: 'access',
    };

    const refreshPayload: JwtPayload = {
      sub: merchantId,
      email,
      type: 'refresh',
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        expiresIn: ACCESS_TOKEN_EXPIRY,
      }),
      this.jwtService.signAsync(refreshPayload, {
        expiresIn: REFRESH_TOKEN_EXPIRY,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private sanitizeMerchant(merchant: Merchant): SafeMerchant {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, apiKeyHash, ...safe } = merchant;
    return safe;
  }

  private async createVerificationCode(): Promise<{
    code: string;
    hash: string;
    expiresAt: Date;
  }> {
    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
    const hash = await bcrypt.hash(code, BCRYPT_ROUNDS);
    const expiresAt = new Date(Date.now() + VERIFICATION_CODE_TTL_MS);
    return { code, hash, expiresAt };
  }

  private async dispatchVerificationEmail(
    email: string,
    code: string,
  ): Promise<void> {
    try {
      await this.notifications.sendVerificationCodeEmail(email, code);
    } catch (err) {
      // Don't fail registration / resend just because the queue is unavailable.
      this.logger.warn(
        `Failed to enqueue verification email for ${email}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
}

import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import type { Merchant } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import type { RegisterDto } from './dto/register.dto.js';
import type { LoginDto } from './dto/login.dto.js';
import type { JwtPayload } from './strategies/jwt.strategy.js';

const BCRYPT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

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
  message: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existing = await this.prisma.merchant.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const merchant = await this.prisma.merchant.create({
      data: {
        name: dto.companyName || dto.name,
        email: dto.email,
        passwordHash,
      },
    });

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

  async generateApiKey(
    merchantId: string,
    mode: 'live' | 'test' = 'live',
  ): Promise<ApiKeyResponse> {
    const prefix = mode === 'live' ? 'ur_live_' : 'ur_test_';
    const randomPart = crypto.randomBytes(32).toString('hex').slice(0, 32);
    const plainTextKey = `${prefix}${randomPart}`;

    const apiKeyHash = await bcrypt.hash(plainTextKey, BCRYPT_ROUNDS);

    await this.prisma.merchant.update({
      where: { id: merchantId },
      data: { apiKeyHash },
    });

    return {
      apiKey: plainTextKey,
      message: 'Store this key securely. It will not be shown again.',
    };
  }

  async revokeApiKey(merchantId: string): Promise<void> {
    await this.prisma.merchant.update({
      where: { id: merchantId },
      data: { apiKeyHash: null },
    });
  }

  async validateApiKey(apiKey: string): Promise<Merchant> {
    if (!apiKey.startsWith('ur_live_') && !apiKey.startsWith('ur_test_')) {
      throw new BadRequestException('Invalid API key format');
    }

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
}

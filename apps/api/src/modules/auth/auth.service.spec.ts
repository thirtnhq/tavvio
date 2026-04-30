import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { JwtPayload } from './strategies/jwt.strategy';

// Mock PrismaService to avoid loading the generated Prisma client
const mockPrismaService = {
  merchant: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  apiKey: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: jest.fn().mockImplementation(() => mockPrismaService),
}));

import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

interface MockMerchant {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  emailVerifiedAt: Date | null;
  verificationCodeHash: string | null;
  verificationCodeExpiresAt: Date | null;
  passwordResetTokenHash: string | null;
  passwordResetExpiresAt: Date | null;
  apiKeyHash: string | null;
  webhookUrl: string | null;
  webhookSecret: string | null;
  settlementAsset: string;
  settlementAddress: string | null;
  settlementChain: string;
  kybStatus: string;
  feeBps: number;
  createdAt: Date;
  updatedAt: Date;
}

const mockMerchant: MockMerchant = {
  id: 'cuid_merchant_1',
  name: 'Test Corp',
  email: 'test@example.com',
  passwordHash: '$2b$12$hashedpassword',
  emailVerifiedAt: null,
  verificationCodeHash: null,
  verificationCodeExpiresAt: null,
  passwordResetTokenHash: null,
  passwordResetExpiresAt: null,
  apiKeyHash: null,
  webhookUrl: null,
  webhookSecret: null,
  settlementAsset: 'USDC',
  settlementAddress: null,
  settlementChain: 'stellar',
  kybStatus: 'PENDING',
  feeBps: 50,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const mockJwtService = {
  signAsync: jest.fn(),
  verify: jest.fn(),
};

const mockNotificationsService = {
  sendVerificationCodeEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const registerDto = {
      name: 'Test Corp',
      email: 'test@example.com',
      password: 'securepassword123',
    };

    it('should create a merchant and return tokens', async () => {
      mockPrismaService.merchant.findUnique.mockResolvedValue(null);
      mockPrismaService.merchant.create.mockResolvedValue(mockMerchant);
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await service.register(registerDto);

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(result.merchant.email).toBe('test@example.com');
      expect(result.merchant).not.toHaveProperty('passwordHash');
      expect(result.merchant).not.toHaveProperty('apiKeyHash');
      expect(mockPrismaService.merchant.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Test Corp',
          email: 'test@example.com',
          passwordHash: expect.any(String) as string,
          verificationCodeHash: expect.any(String) as string,
          verificationCodeExpiresAt: expect.any(Date) as Date,
        }) as object,
      });
    });

    it('should use companyName over name when provided', async () => {
      mockPrismaService.merchant.findUnique.mockResolvedValue(null);
      mockPrismaService.merchant.create.mockResolvedValue(mockMerchant);
      mockJwtService.signAsync.mockResolvedValue('token');

      await service.register({
        ...registerDto,
        companyName: 'My Company',
      });

      expect(mockPrismaService.merchant.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ name: 'My Company' }) as object,
      });
    });

    it('should throw ConflictException if email exists', async () => {
      mockPrismaService.merchant.findUnique.mockResolvedValue(mockMerchant);

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should hash password with bcrypt', async () => {
      mockPrismaService.merchant.findUnique.mockResolvedValue(null);
      mockPrismaService.merchant.create.mockResolvedValue(mockMerchant);
      mockJwtService.signAsync.mockResolvedValue('token');

      await service.register(registerDto);

      const calls = mockPrismaService.merchant.create.mock.calls as [
        [{ data: { passwordHash: string } }],
      ];
      const isHashed = await bcrypt.compare(
        'securepassword123',
        calls[0][0].data.passwordHash,
      );
      expect(isHashed).toBe(true);
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'securepassword123',
    };

    it('should return tokens on valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('securepassword123', 12);
      mockPrismaService.merchant.findUnique.mockResolvedValue({
        ...mockMerchant,
        passwordHash: hashedPassword,
      });
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await service.login(loginDto);

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(result.merchant.email).toBe('test@example.com');
      expect(result.merchant).not.toHaveProperty('passwordHash');
    });

    it('should throw UnauthorizedException if merchant not found', async () => {
      mockPrismaService.merchant.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException on wrong password', async () => {
      const hashedPassword = await bcrypt.hash('differentpassword', 12);
      mockPrismaService.merchant.findUnique.mockResolvedValue({
        ...mockMerchant,
        passwordHash: hashedPassword,
      });

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('refreshToken', () => {
    it('should return new tokens for valid refresh token', async () => {
      const payload: JwtPayload = {
        sub: 'cuid_merchant_1',
        email: 'test@example.com',
        type: 'refresh',
      };
      mockJwtService.verify.mockReturnValue(payload);
      mockPrismaService.merchant.findUnique.mockResolvedValue(mockMerchant);
      mockJwtService.signAsync
        .mockResolvedValueOnce('new-access')
        .mockResolvedValueOnce('new-refresh');

      const result = await service.refreshToken('valid-refresh-token');

      expect(result.accessToken).toBe('new-access');
      expect(result.refreshToken).toBe('new-refresh');
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('invalid');
      });

      await expect(service.refreshToken('bad-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if token type is not refresh', async () => {
      const payload: JwtPayload = {
        sub: 'cuid_merchant_1',
        email: 'test@example.com',
        type: 'access',
      };
      mockJwtService.verify.mockReturnValue(payload);

      await expect(service.refreshToken('access-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if merchant not found', async () => {
      const payload: JwtPayload = {
        sub: 'nonexistent',
        email: 'test@example.com',
        type: 'refresh',
      };
      mockJwtService.verify.mockReturnValue(payload);
      mockPrismaService.merchant.findUnique.mockResolvedValue(null);

      await expect(service.refreshToken('valid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('generateApiKey', () => {
    const mockCreatedKey = {
      id: 'key_1',
      merchantId: 'cuid_merchant_1',
      name: 'Production',
      keyHash: '$2b$12$hashed',
      maskedKey: 'ur_live_abcd...ef01',
      mode: 'LIVE',
      lastUsedAt: null,
      createdAt: new Date('2026-01-01'),
    };

    it('should generate a live API key with ur_live_ prefix', async () => {
      mockPrismaService.apiKey.create.mockResolvedValue(mockCreatedKey);

      const result = await service.generateApiKey(
        'cuid_merchant_1',
        'live',
        'Production',
      );

      expect(result.apiKey).toMatch(/^ur_live_[a-f0-9]{32}$/);
      expect(result.name).toBe('Production');
      expect(result.maskedKey).toBeDefined();
      expect(result.message).toContain('Store this key securely');
    });

    it('should generate a test API key with ur_test_ prefix', async () => {
      mockPrismaService.apiKey.create.mockResolvedValue({
        ...mockCreatedKey,
        mode: 'TEST',
      });

      const result = await service.generateApiKey(
        'cuid_merchant_1',
        'test',
        'Staging',
      );

      expect(result.apiKey).toMatch(/^ur_test_[a-f0-9]{32}$/);
    });

    it('should store bcrypt hash of the key, not plaintext', async () => {
      mockPrismaService.apiKey.create.mockResolvedValue(mockCreatedKey);

      const result = await service.generateApiKey(
        'cuid_merchant_1',
        'live',
        'Production',
      );

      const calls = mockPrismaService.apiKey.create.mock.calls as [
        [{ data: { keyHash: string } }],
      ];
      const storedHash: string = calls[0][0].data.keyHash;

      expect(storedHash).not.toBe(result.apiKey);
      const isValid = await bcrypt.compare(result.apiKey, storedHash);
      expect(isValid).toBe(true);
    });
  });

  describe('revokeApiKey', () => {
    it('should delete the API key by id', async () => {
      mockPrismaService.apiKey.findFirst.mockResolvedValue({
        id: 'key_1',
        merchantId: 'cuid_merchant_1',
      });
      mockPrismaService.apiKey.delete.mockResolvedValue({});

      await service.revokeApiKey('cuid_merchant_1', 'key_1');

      expect(mockPrismaService.apiKey.delete).toHaveBeenCalledWith({
        where: { id: 'key_1' },
      });
    });
  });

  describe('validateApiKey', () => {
    it('should return merchant for valid API key from ApiKey table', async () => {
      const plainKey = 'ur_live_abcdef1234567890abcdef1234567890';
      const hash = await bcrypt.hash(plainKey, 12);
      mockPrismaService.apiKey.findMany.mockResolvedValue([
        { id: 'key_1', keyHash: hash, merchantId: 'cuid_merchant_1' },
      ]);
      mockPrismaService.apiKey.update.mockResolvedValue({});
      mockPrismaService.merchant.findUnique.mockResolvedValue(mockMerchant);

      const result = await service.validateApiKey(plainKey);

      expect(result.id).toBe('cuid_merchant_1');
    });

    it('should fall back to legacy apiKeyHash on Merchant', async () => {
      const plainKey = 'ur_live_abcdef1234567890abcdef1234567890';
      const hash = await bcrypt.hash(plainKey, 12);
      mockPrismaService.apiKey.findMany.mockResolvedValue([]);
      mockPrismaService.merchant.findMany.mockResolvedValue([
        { id: 'cuid_merchant_1', apiKeyHash: hash },
      ]);
      mockPrismaService.merchant.findUnique.mockResolvedValue(mockMerchant);

      const result = await service.validateApiKey(plainKey);

      expect(result.id).toBe('cuid_merchant_1');
    });

    it('should throw BadRequestException for invalid key format', async () => {
      await expect(service.validateApiKey('invalid_key')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw UnauthorizedException if no key matches', async () => {
      mockPrismaService.apiKey.findMany.mockResolvedValue([]);
      mockPrismaService.merchant.findMany.mockResolvedValue([
        { id: 'cuid_merchant_1', apiKeyHash: '$2b$12$nonmatchinghash' },
      ]);

      await expect(
        service.validateApiKey('ur_live_abcdef1234567890abcdef1234567890'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when no keys exist', async () => {
      mockPrismaService.apiKey.findMany.mockResolvedValue([]);
      mockPrismaService.merchant.findMany.mockResolvedValue([]);

      await expect(
        service.validateApiKey('ur_live_abcdef1234567890abcdef1234567890'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getProfile', () => {
    it('should return sanitized merchant data', async () => {
      mockPrismaService.merchant.findUnique.mockResolvedValue(mockMerchant);

      const result = await service.getProfile('cuid_merchant_1');

      expect(result.email).toBe('test@example.com');
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('apiKeyHash');
    });

    it('should throw UnauthorizedException if merchant not found', async () => {
      mockPrismaService.merchant.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('nonexistent')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});

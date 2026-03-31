import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';

// Mock PrismaService to avoid loading the generated Prisma client
jest.mock('../prisma/prisma.service', () => ({
  PrismaService: jest.fn(),
}));

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import type {
  AuthResponse,
  AuthTokens,
  SafeMerchant,
  ApiKeyResponse,
} from './auth.service';

const mockSafeMerchant: SafeMerchant = {
  id: 'cuid_merchant_1',
  name: 'Test Corp',
  email: 'test@example.com',
  webhookUrl: null,
  webhookSecret: null,
  settlementAsset: 'USDC',
  settlementAddress: null,
  settlementChain: 'stellar',
  kybStatus: 'PENDING',
  kybData: null,
  feeBps: 50,
  logoUrl: null,
  brandColor: null,
  customDomain: null,
  companyName: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const mockAuthResponse: AuthResponse = {
  merchant: mockSafeMerchant,
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
};

const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
  refreshToken: jest.fn(),
  getProfile: jest.fn(),
  listApiKeys: jest.fn(),
  generateApiKey: jest.fn(),
  revokeApiKey: jest.fn(),
};

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /auth/register', () => {
    const registerDto = {
      name: 'Test Corp',
      email: 'test@example.com',
      password: 'securepassword123',
    };

    it('should return merchant and tokens on success', async () => {
      mockAuthService.register.mockResolvedValue(mockAuthResponse);

      const result = await controller.register(registerDto);

      expect(result).toEqual(mockAuthResponse);
      expect(mockAuthService.register).toHaveBeenCalledWith(registerDto);
    });

    it('should propagate ConflictException for duplicate email', async () => {
      mockAuthService.register.mockRejectedValue(
        new ConflictException('Email already registered'),
      );

      await expect(controller.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('POST /auth/login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'securepassword123',
    };

    it('should return merchant and tokens on valid credentials', async () => {
      mockAuthService.login.mockResolvedValue(mockAuthResponse);

      const result = await controller.login(loginDto);

      expect(result).toEqual(mockAuthResponse);
      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto);
    });

    it('should propagate UnauthorizedException on invalid credentials', async () => {
      mockAuthService.login.mockRejectedValue(
        new UnauthorizedException('Invalid credentials'),
      );

      await expect(controller.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('POST /auth/refresh', () => {
    const refreshDto = { refreshToken: 'valid-refresh-token' };

    it('should return new tokens', async () => {
      const tokens: AuthTokens = {
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      };
      mockAuthService.refreshToken.mockResolvedValue(tokens);

      const result = await controller.refresh(refreshDto);

      expect(result).toEqual(tokens);
      expect(mockAuthService.refreshToken).toHaveBeenCalledWith(
        'valid-refresh-token',
      );
    });

    it('should propagate UnauthorizedException for invalid token', async () => {
      mockAuthService.refreshToken.mockRejectedValue(
        new UnauthorizedException('Invalid refresh token'),
      );

      await expect(controller.refresh(refreshDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('GET /auth/me', () => {
    it('should return merchant profile', async () => {
      mockAuthService.getProfile.mockResolvedValue(mockSafeMerchant);

      const result = await controller.getProfile('cuid_merchant_1');

      expect(result).toEqual(mockSafeMerchant);
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('apiKeyHash');
      expect(mockAuthService.getProfile).toHaveBeenCalledWith(
        'cuid_merchant_1',
      );
    });

    it('should propagate UnauthorizedException if not found', async () => {
      mockAuthService.getProfile.mockRejectedValue(
        new UnauthorizedException('Merchant not found'),
      );

      await expect(controller.getProfile('nonexistent')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('GET /merchants/api-keys', () => {
    it('should return list of API keys', async () => {
      const keys = [
        {
          id: 'key_1',
          name: 'Production',
          maskedKey: 'ur_live_abcd...ef01',
          mode: 'LIVE',
          lastUsedAt: null,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ];
      mockAuthService.listApiKeys.mockResolvedValue(keys);

      const result = await controller.listApiKeys('cuid_merchant_1');

      expect(result).toEqual(keys);
      expect(mockAuthService.listApiKeys).toHaveBeenCalledWith(
        'cuid_merchant_1',
      );
    });
  });

  describe('POST /merchants/api-keys', () => {
    it('should generate a live API key by default', async () => {
      const apiKeyResponse: ApiKeyResponse = {
        apiKey: 'ur_live_abc123',
        id: 'key_1',
        name: 'Production',
        maskedKey: 'ur_live_abc1...c123',
        mode: 'LIVE',
        message: 'Store this key securely. It will not be shown again.',
      };
      mockAuthService.generateApiKey.mockResolvedValue(apiKeyResponse);

      const result = await controller.generateApiKey(
        'cuid_merchant_1',
        undefined,
        'Production',
      );

      expect(result).toEqual(apiKeyResponse);
      expect(mockAuthService.generateApiKey).toHaveBeenCalledWith(
        'cuid_merchant_1',
        'live',
        'Production',
      );
    });

    it('should pass mode parameter when provided', async () => {
      const apiKeyResponse: ApiKeyResponse = {
        apiKey: 'ur_test_abc123',
        id: 'key_2',
        name: 'Staging',
        maskedKey: 'ur_test_abc1...c123',
        mode: 'TEST',
        message: 'Store this key securely. It will not be shown again.',
      };
      mockAuthService.generateApiKey.mockResolvedValue(apiKeyResponse);

      const result = await controller.generateApiKey(
        'cuid_merchant_1',
        'test',
        'Staging',
      );

      expect(result.apiKey).toMatch(/^ur_test_/);
      expect(mockAuthService.generateApiKey).toHaveBeenCalledWith(
        'cuid_merchant_1',
        'test',
        'Staging',
      );
    });
  });

  describe('DELETE /merchants/api-keys/:id', () => {
    it('should revoke the API key by id', async () => {
      mockAuthService.revokeApiKey.mockResolvedValue(undefined);

      await controller.revokeApiKey('cuid_merchant_1', 'key_1');

      expect(mockAuthService.revokeApiKey).toHaveBeenCalledWith(
        'cuid_merchant_1',
        'key_1',
      );
    });
  });
});

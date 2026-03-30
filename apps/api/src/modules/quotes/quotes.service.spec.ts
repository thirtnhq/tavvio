import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';

// Mock the modules before importing service
jest.mock('../prisma/prisma.service');
jest.mock('../stellar/stellar.service');
jest.mock('../bridge/bridge-router.service');

import { QuotesService } from './quotes.service';
import { PrismaService } from '../prisma/prisma.service';
import { StellarService } from '../stellar/stellar.service';
import { BridgeRouterService } from '../bridge/bridge-router.service';

describe('QuotesService', () => {
  let service: QuotesService;
  let prismaMock: jest.Mocked<PrismaService>;
  let stellarMock: jest.Mocked<StellarService>;
  let bridgeRouterMock: jest.Mocked<BridgeRouterService>;
  let redisMock: any;

  const mockMerchant = {
    id: 'merchant-1',
    feeBps: 50, // 0.5%
    settlementChain: 'stellar',
    settlementAsset: 'USDC',
  };

  const mockQuoteData = {
    id: 'quote-1',
    fromChain: 'ethereum',
    fromAsset: 'USDC',
    fromAmount: new Decimal('100'),
    toChain: 'stellar',
    toAsset: 'USDC',
    toAmount: new Decimal('99.5'), // After 0.5% fee
    rate: new Decimal('1'),
    feeAmount: new Decimal('0.5'),
    feeBps: 50,
    stellarPath: null,
    bridgeRoute: 'cctp',
    lockedAt: new Date(),
    expiresAt: new Date(Date.now() + 30000),
    used: false,
    payment: null,
  };

  beforeEach(async () => {
    redisMock = {
      setex: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuotesService,
        { provide: PrismaService, useValue: {} },
        { provide: StellarService, useValue: {} },
        { provide: BridgeRouterService, useValue: {} },
        { provide: 'default_IORedisModuleConnectionToken', useValue: redisMock },
      ],
    }).compile();

    service = module.get<QuotesService>(QuotesService);
    prismaMock = module.get(PrismaService) as jest.Mocked<PrismaService>;
    stellarMock = module.get(StellarService) as jest.Mocked<StellarService>;
    bridgeRouterMock = module.get(BridgeRouterService) as jest.Mocked<BridgeRouterService>;
  });

  describe('createQuote', () => {
    it('should create a quote successfully for cross-chain conversion', async () => {
      prismaMock.merchant = {
        findUnique: jest.fn().mockResolvedValue(mockMerchant),
      } as any;

      bridgeRouterMock.findRoute = jest.fn().mockReturnValue({
        provider: 'cctp',
        estimatedTimeMs: 30000,
        estimatedFeeBps: 0,
      });

      prismaMock.quote = {
        create: jest.fn().mockResolvedValue(mockQuoteData),
      } as any;

      const dto = {
        fromChain: 'ethereum',
        fromAsset: 'USDC',
        fromAmount: '100',
      };

      const result = await service.createQuote(dto, 'merchant-1');

      expect(result.id).toBe('quote-1');
      expect(result.toAmount).toBe('99.5');
      expect(result.fee).toBe('0.5');
      expect(result.feeBps).toBe(50);
      expect(result.expiresInSeconds).toBeGreaterThan(0);
      expect(redisMock.setex).toHaveBeenCalledWith(
        'quote:quote-1',
        30,
        expect.any(String),
      );
    });

    it('should apply default toChain and toAsset from merchant', async () => {
      prismaMock.merchant = {
        findUnique: jest.fn().mockResolvedValue(mockMerchant),
      } as any;

      bridgeRouterMock.findRoute = jest.fn().mockReturnValue({
        provider: 'stellar_native',
        estimatedTimeMs: 5000,
        estimatedFeeBps: 0,
      });

      prismaMock.quote = {
        create: jest.fn().mockResolvedValue(mockQuoteData),
      } as any;

      const dto = {
        fromChain: 'stellar',
        fromAsset: 'native',
        fromAmount: '100',
        // toChain and toAsset omitted - should use merchant defaults
      };

      await service.createQuote(dto, 'merchant-1');

      const createCall = (prismaMock.quote.create as jest.Mock).mock.calls[0];
      expect(createCall[0].data.toChain).toBe('stellar');
      expect(createCall[0].data.toAsset).toBe('USDC');
    });

    it('should reject invalid amount', async () => {
      prismaMock.merchant = {
        findUnique: jest.fn().mockResolvedValue(mockMerchant),
      } as any;

      const dto = {
        fromChain: 'ethereum',
        fromAsset: 'USDC',
        fromAmount: '-100', // Negative amount
      };

      await expect(service.createQuote(dto, 'merchant-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if merchant not found', async () => {
      prismaMock.merchant = {
        findUnique: jest.fn().mockResolvedValue(null),
      } as any;

      const dto = {
        fromChain: 'ethereum',
        fromAsset: 'USDC',
        fromAmount: '100',
      };

      await expect(service.createQuote(dto, 'unknown-merchant')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('validateAndConsume', () => {
    it('should validate and consume an active quote', async () => {
      const activeQuote = {
        ...mockQuoteData,
        expiresAt: new Date(Date.now() + 30000),
        used: false,
      };

      prismaMock.quote = {
        findUnique: jest.fn().mockResolvedValue(activeQuote),
        update: jest.fn().mockResolvedValue({ ...activeQuote, used: true }),
      } as any;

      const result = await service.validateAndConsume('quote-1');

      expect(result.used).toBe(true);
      expect(redisMock.del).toHaveBeenCalledWith('quote:quote-1');
    });

    it('should reject expired quote', async () => {
      const expiredQuote = {
        ...mockQuoteData,
        expiresAt: new Date(Date.now() - 1000), // Expired
        used: false,
      };

      prismaMock.quote = {
        findUnique: jest.fn().mockResolvedValue(expiredQuote),
      } as any;

      await expect(
        service.validateAndConsume('quote-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject already consumed quote', async () => {
      const consumedQuote = {
        ...mockQuoteData,
        used: true,
      };

      prismaMock.quote = {
        findUnique: jest.fn().mockResolvedValue(consumedQuote),
      } as any;

      await expect(
        service.validateAndConsume('quote-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject non-existent quote', async () => {
      prismaMock.quote = {
        findUnique: jest.fn().mockResolvedValue(null),
      } as any;

      await expect(
        service.validateAndConsume('unknown-quote'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getQuote', () => {
    it('should return quote details if found', async () => {
      prismaMock.quote = {
        findUnique: jest.fn().mockResolvedValue(mockQuoteData),
      } as any;

      const result = await service.getQuote('quote-1');

      expect(result).toBeDefined();
      expect(result?.id).toBe('quote-1');
    });

    it('should return null if quote not found', async () => {
      prismaMock.quote = {
        findUnique: jest.fn().mockResolvedValue(null),
      } as any;

      const result = await service.getQuote('unknown-quote');

      expect(result).toBeNull();
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

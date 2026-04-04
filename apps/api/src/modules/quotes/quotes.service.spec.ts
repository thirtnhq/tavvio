import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { QuotesService } from './quotes.service';
import { PrismaService } from '../prisma/prisma.service';
import { StellarService } from '../stellar/stellar.service';
import { BridgeRouterService } from '../bridge/bridge-router.service';
import { Chain } from '@useroutr/types';
import { CreateQuoteDto } from './dto/create-quote.dto';

const Decimal = Prisma.Decimal;

interface MockPrismaDelegate {
  findUnique: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
}

interface MockPrisma {
  merchant: MockPrismaDelegate;
  quote: MockPrismaDelegate;
}

interface MockBridgeRouter {
  findRoute: jest.Mock;
}

interface MockRedis {
  setex: jest.Mock;
  del: jest.Mock;
}

describe('QuotesService', () => {
  let service: QuotesService;
  let prisma: MockPrisma;
  let bridgeRouterMock: MockBridgeRouter;
  let redisMock: MockRedis;

  const mockMerchant = {
    id: 'merchant-1',
    feeBps: 50,
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
    toAmount: new Decimal('99.5'),
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

    prisma = {
      merchant: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      quote: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    bridgeRouterMock = { findRoute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuotesService,
        { provide: PrismaService, useValue: prisma },
        { provide: StellarService, useValue: {} },
        { provide: BridgeRouterService, useValue: bridgeRouterMock },
        {
          provide: 'default_IORedisModuleConnectionToken',
          useValue: redisMock,
        },
      ],
    }).compile();

    service = module.get<QuotesService>(QuotesService);
  });

  describe('createQuote', () => {
    it('should create a quote successfully for cross-chain conversion', async () => {
      prisma.merchant.findUnique.mockResolvedValue(mockMerchant);

      bridgeRouterMock.findRoute.mockReturnValue({
        provider: 'cctp',
        estimatedTimeMs: 30000,
        estimatedFeeBps: 0,
      });

      prisma.quote.create.mockResolvedValue(mockQuoteData);

      const dto: CreateQuoteDto = {
        fromChain: 'ethereum' as Chain,
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
      prisma.merchant.findUnique.mockResolvedValue(mockMerchant);

      bridgeRouterMock.findRoute.mockReturnValue({
        provider: 'stellar_native',
        estimatedTimeMs: 5000,
        estimatedFeeBps: 0,
      });

      prisma.quote.create.mockResolvedValue(mockQuoteData);

      const dto: CreateQuoteDto = {
        fromChain: 'stellar' as Chain,
        fromAsset: 'native',
        fromAmount: '100',
      };

      await service.createQuote(dto, 'merchant-1');

      const createCall = prisma.quote.create.mock.calls[0] as [
        { data: { toChain: string; toAsset: string } },
      ];
      expect(createCall[0].data.toChain).toBe('stellar');
      expect(createCall[0].data.toAsset).toBe('USDC');
    });

    it('should reject invalid amount', async () => {
      prisma.merchant.findUnique.mockResolvedValue(mockMerchant);

      const dto: CreateQuoteDto = {
        fromChain: 'ethereum' as Chain,
        fromAsset: 'USDC',
        fromAmount: '-100',
      };

      await expect(service.createQuote(dto, 'merchant-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if merchant not found', async () => {
      prisma.merchant.findUnique.mockResolvedValue(null);

      const dto: CreateQuoteDto = {
        fromChain: 'ethereum' as Chain,
        fromAsset: 'USDC',
        fromAmount: '100',
      };

      await expect(
        service.createQuote(dto, 'unknown-merchant'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('validateAndConsume', () => {
    it('should validate and consume an active quote', async () => {
      const activeQuote = {
        ...mockQuoteData,
        expiresAt: new Date(Date.now() + 30000),
        used: false,
      };

      prisma.quote.findUnique.mockResolvedValue(activeQuote);
      prisma.quote.update.mockResolvedValue({ ...activeQuote, used: true });

      const result = await service.validateAndConsume('quote-1');

      expect(result.used).toBe(true);
      expect(redisMock.del).toHaveBeenCalledWith('quote:quote-1');
    });

    it('should reject expired quote', async () => {
      const expiredQuote = {
        ...mockQuoteData,
        expiresAt: new Date(Date.now() - 1000),
        used: false,
      };

      prisma.quote.findUnique.mockResolvedValue(expiredQuote);

      await expect(service.validateAndConsume('quote-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should reject already consumed quote', async () => {
      prisma.quote.findUnique.mockResolvedValue({
        ...mockQuoteData,
        used: true,
      });

      await expect(service.validateAndConsume('quote-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should reject non-existent quote', async () => {
      prisma.quote.findUnique.mockResolvedValue(null);

      await expect(service.validateAndConsume('unknown-quote')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getQuote', () => {
    it('should return quote details if found', async () => {
      prisma.quote.findUnique.mockResolvedValue(mockQuoteData);

      const result = await service.getQuote('quote-1');

      expect(result).toBeDefined();
      expect(result?.id).toBe('quote-1');
    });

    it('should return null if quote not found', async () => {
      prisma.quote.findUnique.mockResolvedValue(null);

      const result = await service.getQuote('unknown-quote');

      expect(result).toBeNull();
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

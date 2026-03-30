import { Test, TestingModule } from '@nestjs/testing';

// Mock PrismaService to avoid loading the generated Prisma client
jest.mock('../prisma/prisma.service', () => ({
  PrismaService: jest.fn(),
}));

import { QuotesService } from './quotes.service';

import { StellarService } from '../stellar/stellar.service';

describe('QuotesService', () => {
  let service: QuotesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuotesService,
        { provide: StellarService, useValue: {} },
        { provide: 'default_IORedisModuleConnectionToken', useValue: {} },
      ],
    }).compile();

    service = module.get<QuotesService>(QuotesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

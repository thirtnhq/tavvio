import { Test, TestingModule } from '@nestjs/testing';

// Mock PrismaService to avoid loading the generated Prisma client
jest.mock('../prisma/prisma.service', () => ({
  PrismaService: jest.fn(),
}));

import { BridgeRouterService } from './bridge-router.service';

import { WormholeService } from './providers/wormhole.service';
import { LayerswapService } from './providers/layerswap.service';
import { CctpService } from './providers/cctp.service';

describe('BridgeService', () => {
  let service: BridgeRouterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BridgeRouterService,
        { provide: CctpService, useValue: {} },
        { provide: WormholeService, useValue: {} },
        { provide: LayerswapService, useValue: {} },
      ],
    }).compile();

    service = module.get<BridgeRouterService>(BridgeRouterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

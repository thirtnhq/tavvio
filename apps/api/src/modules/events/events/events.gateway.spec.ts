import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { EventsGateway } from './events.gateway';
import { PrismaService } from '../../prisma/prisma.service';

describe('EventsGateway', () => {
  let gateway: EventsGateway;
  let jwtService: JwtService;
  let prismaService: PrismaService;

  const mockJwtService = {
    verifyAsync: jest.fn(),
  };

  const mockPrismaService = {
    merchant: {
      findUnique: jest.fn(),
    },
    payment: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsGateway,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    gateway = module.get<EventsGateway>(EventsGateway);
    jwtService = module.get<JwtService>(JwtService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleConnection - Dashboard Auth', () => {
    it('should connect dashboard client with valid JWT', async () => {
      const clientMock = {
        id: 'socket-123',
        handshake: {
          query: {
            token: 'Bearer eyJhbGc...',
            type: 'merchant',
          },
        },
        join: jest.fn(),
        disconnect: jest.fn(),
      };

      mockJwtService.verifyAsync.mockResolvedValue({
        sub: 'merchant-123',
        email: 'test@example.com',
        type: 'access',
      });

      mockPrismaService.merchant.findUnique.mockResolvedValue({
        id: 'merchant-123',
        email: 'test@example.com',
      });

      await gateway.handleConnection(clientMock as any);

      expect(clientMock.join).toHaveBeenCalledWith('merchant:merchant-123');
      expect(clientMock.disconnect).not.toHaveBeenCalled();
    });

    it('should reject dashboard client with invalid JWT', async () => {
      const clientMock = {
        id: 'socket-123',
        handshake: {
          query: {
            token: 'invalid-token',
            type: 'merchant',
          },
        },
        join: jest.fn(),
        disconnect: jest.fn(),
      };

      mockJwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      await gateway.handleConnection(clientMock as any);

      expect(clientMock.disconnect).toHaveBeenCalledWith(true);
    });

    it('should reject if merchant not found', async () => {
      const clientMock = {
        id: 'socket-123',
        handshake: {
          query: {
            token: 'Bearer eyJhbGc...',
            type: 'merchant',
          },
        },
        join: jest.fn(),
        disconnect: jest.fn(),
      };

      mockJwtService.verifyAsync.mockResolvedValue({
        sub: 'merchant-123',
        type: 'access',
      });

      mockPrismaService.merchant.findUnique.mockResolvedValue(null);

      await gateway.handleConnection(clientMock as any);

      expect(clientMock.disconnect).toHaveBeenCalledWith(true);
    });
  });

  describe('handleConnection - Checkout Auth', () => {
    it('should connect checkout client with valid paymentId', async () => {
      const clientMock = {
        id: 'socket-123',
        handshake: {
          query: {
            paymentId: 'pay-123',
            type: 'payment',
          },
        },
        join: jest.fn(),
        disconnect: jest.fn(),
      };

      mockPrismaService.payment.findUnique.mockResolvedValue({
        id: 'pay-123',
        merchantId: 'merchant-123',
      });

      await gateway.handleConnection(clientMock as any);

      expect(clientMock.join).toHaveBeenCalledWith('payment:pay-123');
      expect(clientMock.disconnect).not.toHaveBeenCalled();
    });

    it('should reject checkout client with invalid paymentId', async () => {
      const clientMock = {
        id: 'socket-123',
        handshake: {
          query: {
            paymentId: 'invalid',
            type: 'payment',
          },
        },
        join: jest.fn(),
        disconnect: jest.fn(),
      };

      mockPrismaService.payment.findUnique.mockResolvedValue(null);

      await gateway.handleConnection(clientMock as any);

      expect(clientMock.disconnect).toHaveBeenCalledWith(true);
    });
  });

  describe('handleDisconnect', () => {
    it('should cleanup socket context on disconnect', () => {
      const clientMock = {
        id: 'socket-123',
        handshake: {
          query: {
            token: 'Bearer eyJhbGc...',
            type: 'merchant',
          },
        },
        join: jest.fn(),
        disconnect: jest.fn(),
      };

      // Simulate connection first
      gateway['socketContextMap'].set('socket-123', {
        merchantId: 'merchant-123',
        type: 'merchant',
        connectedAt: new Date(),
      });

      gateway.handleDisconnect(clientMock as any);

      // Context should be removed
      expect(gateway['socketContextMap'].has('socket-123')).toBe(false);
    });
  });

  describe('handleMerchantSubscribe', () => {
    it('should allow merchant to subscribe to own merchant events', () => {
      const clientMock = {
        id: 'socket-123',
        join: jest.fn(),
      };

      gateway['socketContextMap'].set('socket-123', {
        merchantId: 'merchant-123',
        type: 'merchant',
        connectedAt: new Date(),
      });

      const result = gateway.handleMerchantSubscribe(
        clientMock as any,
        'merchant-123',
      );

      expect(result).toEqual({
        subscribed: true,
        merchant: 'merchant-123',
      });
      expect(clientMock.join).toHaveBeenCalledWith('merchant:merchant-123');
    });

    it('should reject merchant subscribing to other merchant', () => {
      const clientMock = {
        id: 'socket-123',
        join: jest.fn(),
      };

      gateway['socketContextMap'].set('socket-123', {
        merchantId: 'merchant-123',
        type: 'merchant',
        connectedAt: new Date(),
      });

      expect(() => {
        gateway.handleMerchantSubscribe(clientMock as any, 'other-merchant');
      }).toThrow();
    });
  });

  describe('handlePaymentSubscribe', () => {
    it('should allow payment subscriber to subscribe', () => {
      const clientMock = {
        id: 'socket-123',
        join: jest.fn(),
      };

      gateway['socketContextMap'].set('socket-123', {
        paymentId: 'pay-123',
        type: 'payment',
        connectedAt: new Date(),
      });

      const result = gateway.handlePaymentSubscribe(
        clientMock as any,
        'pay-123',
      );

      expect(result).toEqual({
        subscribed: true,
        payment: 'pay-123',
      });
      expect(clientMock.join).toHaveBeenCalledWith('payment:pay-123');
    });

    it('should reject if subscribing to wrong payment', () => {
      const clientMock = {
        id: 'socket-123',
        join: jest.fn(),
      };

      gateway['socketContextMap'].set('socket-123', {
        paymentId: 'pay-123',
        type: 'payment',
        connectedAt: new Date(),
      });

      expect(() => {
        gateway.handlePaymentSubscribe(clientMock as any, 'other-payment');
      }).toThrow();
    });
  });
});

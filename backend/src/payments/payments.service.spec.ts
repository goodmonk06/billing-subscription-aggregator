import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma.service';
import { PaymentProviderFactory } from './providers/provider.factory';
import { PaymentProvider, SubscriptionStatus } from '@prisma/client';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prismaService: PrismaService;
  let providerFactory: PaymentProviderFactory;

  const mockPrismaService = {
    customer: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    plan: {
      findUnique: jest.fn(),
    },
    subscription: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockPaymentProvider = {
    createCustomer: jest.fn(),
    createSubscription: jest.fn(),
    cancelSubscription: jest.fn(),
  };

  const mockProviderFactory = {
    getProvider: jest.fn().mockReturnValue(mockPaymentProvider),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: PaymentProviderFactory,
          useValue: mockProviderFactory,
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    prismaService = module.get<PrismaService>(PrismaService);
    providerFactory = module.get<PaymentProviderFactory>(PaymentProviderFactory);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createCustomer', () => {
    it('should create a customer in both provider and database', async () => {
      const tenantId = 'tenant-123';
      const provider = PaymentProvider.STRIPE;
      const customerDto = {
        email: 'test@example.com',
        name: 'Test User',
      };

      const providerResult = {
        externalCustomerId: 'cus_stripe_123',
        email: 'test@example.com',
        provider: PaymentProvider.STRIPE,
        metadata: { name: 'Test User' },
      };

      const dbCustomer = {
        id: 'customer-123',
        tenantId,
        externalCustomerId: 'cus_stripe_123',
        provider: PaymentProvider.STRIPE,
        email: 'test@example.com',
        metadataJson: { name: 'Test User' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPaymentProvider.createCustomer.mockResolvedValue(providerResult);
      mockPrismaService.customer.create.mockResolvedValue(dbCustomer);

      const result = await service.createCustomer(tenantId, provider, customerDto);

      expect(mockPaymentProvider.createCustomer).toHaveBeenCalledWith(customerDto);
      expect(mockPrismaService.customer.create).toHaveBeenCalledWith({
        data: {
          tenantId,
          externalCustomerId: 'cus_stripe_123',
          provider: PaymentProvider.STRIPE,
          email: 'test@example.com',
          metadataJson: { name: 'Test User' },
        },
      });
      expect(result).toEqual(dbCustomer);
    });
  });

  describe('getSubscriptions', () => {
    it('should return subscriptions for a tenant with optional filters', async () => {
      const tenantId = 'tenant-123';
      const mockSubscriptions = [
        {
          id: 'sub-1',
          tenantId,
          status: SubscriptionStatus.ACTIVE,
          customer: { email: 'test1@example.com' },
          plan: { name: 'Pro Plan' },
        },
        {
          id: 'sub-2',
          tenantId,
          status: SubscriptionStatus.ACTIVE,
          customer: { email: 'test2@example.com' },
          plan: { name: 'Basic Plan' },
        },
      ];

      mockPrismaService.subscription.findMany.mockResolvedValue(mockSubscriptions);

      const result = await service.getSubscriptions(tenantId, {
        status: SubscriptionStatus.ACTIVE,
      });

      expect(result).toEqual(mockSubscriptions);
      expect(mockPrismaService.subscription.findMany).toHaveBeenCalledWith({
        where: {
          tenantId,
          customerId: undefined,
          planId: undefined,
          status: SubscriptionStatus.ACTIVE,
        },
        include: {
          customer: true,
          plan: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });
  });
});

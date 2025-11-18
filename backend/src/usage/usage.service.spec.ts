import { Test, TestingModule } from '@nestjs/testing';
import { UsageService } from './usage.service';
import { PrismaService } from '../prisma.service';
import { DomainEventEmitter } from '../lib/events/event-emitter';
import { NotFoundException } from '@nestjs/common';

describe('UsageService', () => {
  let service: UsageService;
  let prisma: PrismaService;
  let eventEmitter: DomainEventEmitter;

  const mockPrismaService = {
    subscription: {
      findUnique: jest.fn(),
    },
    usageRecord: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsageService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: DomainEventEmitter,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<UsageService>(UsageService);
    prisma = module.get<PrismaService>(PrismaService);
    eventEmitter = module.get<DomainEventEmitter>(DomainEventEmitter);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('recordUsage', () => {
    it('should record usage for a subscription', async () => {
      const mockSubscription = {
        id: 'sub_1',
        customerId: 'cus_1',
        tenantId: 'tenant_1',
        provider: 'STRIPE',
        customer: {
          id: 'cus_1',
          email: 'test@example.com',
        },
        plan: {
          name: 'Pro Plan',
        },
      };

      const mockUsageRecord = {
        id: 'usage_1',
        tenantId: 'tenant_1',
        customerId: 'cus_1',
        subscriptionId: 'sub_1',
        provider: 'STRIPE',
        quantity: 100,
        unit: 'requests',
        timestamp: new Date(),
        customer: mockSubscription.customer,
        subscription: {
          id: 'sub_1',
          plan: mockSubscription.plan,
        },
      };

      mockPrismaService.subscription.findUnique.mockResolvedValue(mockSubscription);
      mockPrismaService.usageRecord.findFirst.mockResolvedValue(null);
      mockPrismaService.usageRecord.create.mockResolvedValue(mockUsageRecord);

      const dto = {
        subscriptionId: 'sub_1',
        quantity: 100,
        unit: 'requests',
      };

      const result = await service.recordUsage('tenant_1', dto);

      expect(result).toEqual(mockUsageRecord);
      expect(mockPrismaService.subscription.findUnique).toHaveBeenCalledWith({
        where: { id: 'sub_1' },
        include: expect.any(Object),
      });
      expect(mockPrismaService.usageRecord.create).toHaveBeenCalled();
      expect(mockEventEmitter.emit).toHaveBeenCalled();
    });

    it('should handle duplicate idempotency keys', async () => {
      const mockSubscription = {
        id: 'sub_1',
        customerId: 'cus_1',
        provider: 'STRIPE',
        customer: {},
        plan: {},
      };

      const existingUsageRecord = {
        id: 'usage_1',
        subscriptionId: 'sub_1',
        idempotencyKey: 'key_123',
        quantity: 100,
      };

      mockPrismaService.subscription.findUnique.mockResolvedValue(mockSubscription);
      mockPrismaService.usageRecord.findFirst.mockResolvedValue(existingUsageRecord);

      const dto = {
        subscriptionId: 'sub_1',
        quantity: 100,
        unit: 'requests',
        idempotencyKey: 'key_123',
      };

      const result = await service.recordUsage('tenant_1', dto);

      expect(result).toEqual(existingUsageRecord);
      expect(mockPrismaService.usageRecord.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if subscription not found', async () => {
      mockPrismaService.subscription.findUnique.mockResolvedValue(null);

      const dto = {
        subscriptionId: 'sub_invalid',
        quantity: 100,
        unit: 'requests',
      };

      await expect(service.recordUsage('tenant_1', dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findBySubscription', () => {
    it('should return usage records for a subscription', async () => {
      const mockUsageRecords = [
        {
          id: 'usage_1',
          subscriptionId: 'sub_1',
          quantity: 100,
          unit: 'requests',
          timestamp: new Date(),
        },
        {
          id: 'usage_2',
          subscriptionId: 'sub_1',
          quantity: 50,
          unit: 'requests',
          timestamp: new Date(),
        },
      ];

      mockPrismaService.usageRecord.findMany.mockResolvedValue(mockUsageRecords);

      const result = await service.findBySubscription('sub_1');

      expect(result).toEqual(mockUsageRecords);
      expect(mockPrismaService.usageRecord.findMany).toHaveBeenCalledWith({
        where: {
          subscriptionId: 'sub_1',
        },
        orderBy: {
          timestamp: 'desc',
        },
      });
    });

    it('should filter by date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      mockPrismaService.usageRecord.findMany.mockResolvedValue([]);

      await service.findBySubscription('sub_1', startDate, endDate);

      expect(mockPrismaService.usageRecord.findMany).toHaveBeenCalledWith({
        where: {
          subscriptionId: 'sub_1',
          timestamp: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: {
          timestamp: 'desc',
        },
      });
    });
  });

  describe('getAggregatedUsage', () => {
    it('should aggregate usage for a subscription', async () => {
      const mockSubscription = {
        id: 'sub_1',
        customerId: 'cus_1',
      };

      const mockUsageRecords = [
        {
          id: 'usage_1',
          quantity: 100,
          unit: 'requests',
        },
        {
          id: 'usage_2',
          quantity: 50,
          unit: 'requests',
        },
      ];

      mockPrismaService.subscription.findUnique.mockResolvedValue(mockSubscription);
      mockPrismaService.usageRecord.findMany.mockResolvedValue(mockUsageRecords);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = await service.getAggregatedUsage('sub_1', startDate, endDate);

      expect(result).toEqual({
        subscriptionId: 'sub_1',
        customerId: 'cus_1',
        unit: 'requests',
        totalQuantity: 150,
        recordCount: 2,
        period: {
          start: startDate,
          end: endDate,
        },
      });
    });

    it('should throw NotFoundException if subscription not found', async () => {
      mockPrismaService.subscription.findUnique.mockResolvedValue(null);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      await expect(
        service.getAggregatedUsage('sub_invalid', startDate, endDate),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('checkThresholds', () => {
    it('should emit event when threshold is reached', async () => {
      const mockSubscription = {
        id: 'sub_1',
        customerId: 'cus_1',
        tenantId: 'tenant_1',
      };

      const mockUsageRecords = [
        { quantity: 600, unit: 'requests' },
        { quantity: 500, unit: 'requests' },
      ];

      mockPrismaService.subscription.findUnique.mockResolvedValue(mockSubscription);
      mockPrismaService.usageRecord.findMany.mockResolvedValue(mockUsageRecords);

      const thresholds = [{ quantity: 1000, unit: 'requests' }];

      await service.checkThresholds('sub_1', thresholds);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.stringContaining('threshold'),
          data: expect.objectContaining({
            subscriptionId: 'sub_1',
            current: 1100,
            threshold: 1000,
          }),
        }),
      );
    });
  });

  describe('deleteOldRecords', () => {
    it('should delete old usage records', async () => {
      const beforeDate = new Date('2024-01-01');

      mockPrismaService.usageRecord.deleteMany.mockResolvedValue({ count: 5 });

      const result = await service.deleteOldRecords(beforeDate);

      expect(result.count).toBe(5);
      expect(mockPrismaService.usageRecord.deleteMany).toHaveBeenCalledWith({
        where: {
          timestamp: {
            lt: beforeDate,
          },
        },
      });
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { PaymentMethodsService } from './payment-methods.service';
import { PrismaService } from '../prisma.service';
import { DomainEventEmitter } from '../lib/events/event-emitter';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PaymentMethodType } from '@prisma/client';

describe('PaymentMethodsService', () => {
  let service: PaymentMethodsService;
  let prisma: PrismaService;
  let eventEmitter: DomainEventEmitter;

  const mockPrismaService = {
    customer: {
      findUnique: jest.fn(),
    },
    paymentMethod: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentMethodsService,
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

    service = module.get<PaymentMethodsService>(PaymentMethodsService);
    prisma = module.get<PrismaService>(PrismaService);
    eventEmitter = module.get<DomainEventEmitter>(DomainEventEmitter);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a payment method', async () => {
      const mockCustomer = {
        id: 'cus_1',
        provider: 'STRIPE',
        email: 'test@example.com',
      };

      const mockPaymentMethod = {
        id: 'pm_1',
        tenantId: 'tenant_1',
        customerId: 'cus_1',
        provider: 'STRIPE',
        type: PaymentMethodType.CARD,
        cardLast4: '4242',
        cardBrand: 'visa',
        isDefault: false,
        customer: mockCustomer,
      };

      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrismaService.paymentMethod.create.mockResolvedValue(mockPaymentMethod);

      const dto = {
        customerId: 'cus_1',
        type: PaymentMethodType.CARD,
        cardLast4: '4242',
        cardBrand: 'visa',
      };

      const result = await service.create('tenant_1', dto);

      expect(result).toEqual(mockPaymentMethod);
      expect(mockPrismaService.customer.findUnique).toHaveBeenCalledWith({
        where: { id: 'cus_1' },
      });
      expect(mockPrismaService.paymentMethod.create).toHaveBeenCalled();
      expect(mockEventEmitter.emit).toHaveBeenCalled();
    });

    it('should unset other default payment methods when isDefault is true', async () => {
      const mockCustomer = {
        id: 'cus_1',
        provider: 'STRIPE',
      };

      const mockPaymentMethod = {
        id: 'pm_1',
        customerId: 'cus_1',
        isDefault: true,
      };

      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrismaService.paymentMethod.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.paymentMethod.create.mockResolvedValue(mockPaymentMethod);

      const dto = {
        customerId: 'cus_1',
        type: PaymentMethodType.CARD,
        isDefault: true,
      };

      await service.create('tenant_1', dto);

      expect(mockPrismaService.paymentMethod.updateMany).toHaveBeenCalledWith({
        where: {
          customerId: 'cus_1',
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    });

    it('should throw NotFoundException if customer not found', async () => {
      mockPrismaService.customer.findUnique.mockResolvedValue(null);

      const dto = {
        customerId: 'cus_invalid',
        type: PaymentMethodType.CARD,
      };

      await expect(service.create('tenant_1', dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('setDefault', () => {
    it('should set payment method as default', async () => {
      const mockPaymentMethod = {
        id: 'pm_1',
        customerId: 'cus_1',
        isDefault: false,
      };

      const mockUpdatedPaymentMethod = {
        ...mockPaymentMethod,
        isDefault: true,
      };

      mockPrismaService.paymentMethod.findUnique.mockResolvedValue(mockPaymentMethod);
      mockPrismaService.paymentMethod.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.paymentMethod.update.mockResolvedValue(mockUpdatedPaymentMethod);

      const result = await service.setDefault('pm_1');

      expect(result.isDefault).toBe(true);
      expect(mockPrismaService.paymentMethod.updateMany).toHaveBeenCalled();
      expect(mockPrismaService.paymentMethod.update).toHaveBeenCalledWith({
        where: { id: 'pm_1' },
        data: {
          isDefault: true,
        },
      });
    });
  });

  describe('remove', () => {
    it('should remove a non-default payment method', async () => {
      const mockPaymentMethod = {
        id: 'pm_1',
        customerId: 'cus_1',
        tenantId: 'tenant_1',
        isDefault: false,
      };

      mockPrismaService.paymentMethod.findUnique.mockResolvedValue(mockPaymentMethod);
      mockPrismaService.paymentMethod.delete.mockResolvedValue(mockPaymentMethod);

      const result = await service.remove('pm_1');

      expect(result).toEqual(mockPaymentMethod);
      expect(mockPrismaService.paymentMethod.delete).toHaveBeenCalledWith({
        where: { id: 'pm_1' },
      });
      expect(mockEventEmitter.emit).toHaveBeenCalled();
    });

    it('should throw BadRequestException when removing default payment method', async () => {
      const mockPaymentMethod = {
        id: 'pm_1',
        customerId: 'cus_1',
        isDefault: true,
      };

      mockPrismaService.paymentMethod.findUnique.mockResolvedValue(mockPaymentMethod);

      await expect(service.remove('pm_1')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrismaService.paymentMethod.delete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if payment method not found', async () => {
      mockPrismaService.paymentMethod.findUnique.mockResolvedValue(null);

      await expect(service.remove('pm_invalid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByCustomer', () => {
    it('should return payment methods for a customer', async () => {
      const mockPaymentMethods = [
        {
          id: 'pm_1',
          customerId: 'cus_1',
          isDefault: true,
        },
        {
          id: 'pm_2',
          customerId: 'cus_1',
          isDefault: false,
        },
      ];

      mockPrismaService.paymentMethod.findMany.mockResolvedValue(mockPaymentMethods);

      const result = await service.findByCustomer('cus_1');

      expect(result).toEqual(mockPaymentMethods);
      expect(mockPrismaService.paymentMethod.findMany).toHaveBeenCalledWith({
        where: {
          customerId: 'cus_1',
        },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      });
    });
  });
});

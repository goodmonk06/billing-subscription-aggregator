import { Test, TestingModule } from '@nestjs/testing';
import { InvoicesService } from './invoices.service';
import { PrismaService } from '../prisma.service';
import { DomainEventEmitter } from '../lib/events/event-emitter';
import { NotFoundException } from '@nestjs/common';
import { InvoiceStatus } from '@prisma/client';

describe('InvoicesService', () => {
  let service: InvoicesService;
  let prisma: PrismaService;
  let eventEmitter: DomainEventEmitter;

  const mockPrismaService = {
    customer: {
      findUnique: jest.fn(),
    },
    invoice: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
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

    service = module.get<InvoicesService>(InvoicesService);
    prisma = module.get<PrismaService>(PrismaService);
    eventEmitter = module.get<DomainEventEmitter>(DomainEventEmitter);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an invoice with line items', async () => {
      const mockCustomer = {
        id: 'cus_1',
        provider: 'STRIPE',
        email: 'test@example.com',
      };

      const mockInvoice = {
        id: 'inv_1',
        tenantId: 'tenant_1',
        customerId: 'cus_1',
        provider: 'STRIPE',
        status: InvoiceStatus.DRAFT,
        subtotal: 1000,
        tax: 100,
        total: 1100,
        amountDue: 1100,
        amountRemaining: 1100,
        currency: 'usd',
        lineItems: [
          {
            description: 'Test Item',
            quantity: 1,
            unitAmount: 1000,
            amount: 1000,
          },
        ],
        customer: mockCustomer,
      };

      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrismaService.invoice.create.mockResolvedValue(mockInvoice);

      const dto = {
        customerId: 'cus_1',
        lineItems: [
          {
            description: 'Test Item',
            quantity: 1,
            unitAmount: 1000,
          },
        ],
        tax: 100,
      };

      const result = await service.create('tenant_1', dto);

      expect(result).toEqual(mockInvoice);
      expect(mockPrismaService.customer.findUnique).toHaveBeenCalledWith({
        where: { id: 'cus_1' },
      });
      expect(mockPrismaService.invoice.create).toHaveBeenCalled();
      expect(mockEventEmitter.emit).toHaveBeenCalled();
    });

    it('should throw NotFoundException if customer not found', async () => {
      mockPrismaService.customer.findUnique.mockResolvedValue(null);

      const dto = {
        customerId: 'cus_invalid',
        lineItems: [
          {
            description: 'Test Item',
            quantity: 1,
            unitAmount: 1000,
          },
        ],
      };

      await expect(service.create('tenant_1', dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('markAsPaid', () => {
    it('should mark invoice as paid', async () => {
      const mockInvoice = {
        id: 'inv_1',
        tenantId: 'tenant_1',
        customerId: 'cus_1',
        total: 1100,
        status: InvoiceStatus.DRAFT,
      };

      const mockUpdatedInvoice = {
        ...mockInvoice,
        status: InvoiceStatus.PAID,
        amountPaid: 1100,
        amountRemaining: 0,
        paidAt: new Date(),
      };

      mockPrismaService.invoice.findUnique.mockResolvedValue(mockInvoice);
      mockPrismaService.invoice.update.mockResolvedValue(mockUpdatedInvoice);

      const result = await service.markAsPaid('inv_1');

      expect(result.status).toBe(InvoiceStatus.PAID);
      expect(mockPrismaService.invoice.update).toHaveBeenCalledWith({
        where: { id: 'inv_1' },
        data: expect.objectContaining({
          status: InvoiceStatus.PAID,
          amountPaid: 1100,
          amountRemaining: 0,
        }),
        include: expect.any(Object),
      });
      expect(mockEventEmitter.emit).toHaveBeenCalled();
    });

    it('should throw NotFoundException if invoice not found', async () => {
      mockPrismaService.invoice.findUnique.mockResolvedValue(null);

      await expect(service.markAsPaid('inv_invalid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return all invoices for a tenant', async () => {
      const mockInvoices = [
        {
          id: 'inv_1',
          tenantId: 'tenant_1',
          status: InvoiceStatus.PAID,
        },
        {
          id: 'inv_2',
          tenantId: 'tenant_1',
          status: InvoiceStatus.DRAFT,
        },
      ];

      mockPrismaService.invoice.findMany.mockResolvedValue(mockInvoices);

      const result = await service.findAll('tenant_1');

      expect(result).toEqual(mockInvoices);
      expect(mockPrismaService.invoice.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant_1',
          customerId: undefined,
          status: undefined,
        },
        include: expect.any(Object),
        orderBy: {
          createdAt: 'desc',
        },
      });
    });

    it('should filter invoices by status', async () => {
      const mockInvoices = [
        {
          id: 'inv_1',
          tenantId: 'tenant_1',
          status: InvoiceStatus.PAID,
        },
      ];

      mockPrismaService.invoice.findMany.mockResolvedValue(mockInvoices);

      const result = await service.findAll('tenant_1', {
        status: InvoiceStatus.PAID,
      });

      expect(result).toEqual(mockInvoices);
      expect(mockPrismaService.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: InvoiceStatus.PAID,
          }),
        }),
      );
    });
  });

  describe('void', () => {
    it('should void an invoice', async () => {
      const mockInvoice = {
        id: 'inv_1',
        tenantId: 'tenant_1',
        status: InvoiceStatus.DRAFT,
      };

      const mockVoidedInvoice = {
        ...mockInvoice,
        status: InvoiceStatus.VOID,
        voidedAt: new Date(),
      };

      mockPrismaService.invoice.findUnique.mockResolvedValue(mockInvoice);
      mockPrismaService.invoice.update.mockResolvedValue(mockVoidedInvoice);

      const result = await service.void('inv_1');

      expect(result.status).toBe(InvoiceStatus.VOID);
      expect(mockPrismaService.invoice.update).toHaveBeenCalledWith({
        where: { id: 'inv_1' },
        data: expect.objectContaining({
          status: InvoiceStatus.VOID,
        }),
      });
    });
  });
});

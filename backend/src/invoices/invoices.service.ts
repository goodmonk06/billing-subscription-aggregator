import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { InvoiceStatus } from '@prisma/client';
import { DomainEventEmitter } from '../lib/events/event-emitter';
import { DomainEventType } from '../lib/events/domain-events';

export interface CreateInvoiceDto {
  customerId: string;
  subscriptionId?: string;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitAmount: number;
  }>;
  tax?: number;
  dueDate?: Date;
  description?: string;
}

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: DomainEventEmitter,
  ) {}

  /**
   * Create a new invoice
   */
  async create(tenantId: string, dto: CreateInvoiceDto) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Calculate totals
    const subtotal = dto.lineItems.reduce((sum, item) => sum + item.quantity * item.unitAmount, 0);
    const tax = dto.tax || 0;
    const total = subtotal + tax;

    // Create invoice with line items
    const invoice = await this.prisma.invoice.create({
      data: {
        tenantId,
        customerId: dto.customerId,
        subscriptionId: dto.subscriptionId,
        provider: customer.provider,
        status: InvoiceStatus.DRAFT,
        subtotal,
        tax,
        total,
        amountDue: total,
        amountRemaining: total,
        currency: 'usd',
        description: dto.description,
        dueDate: dto.dueDate,
        lineItems: {
          create: dto.lineItems.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitAmount: item.unitAmount,
            amount: item.quantity * item.unitAmount,
            currency: 'usd',
          })),
        },
      },
      include: {
        lineItems: true,
        customer: true,
        subscription: true,
      },
    });

    // Emit event
    await this.eventEmitter.emit({
      type: DomainEventType.INVOICE_CREATED,
      tenantId,
      timestamp: new Date(),
      data: {
        invoiceId: invoice.id,
        customerId: dto.customerId,
        amount: total,
      },
    });

    this.logger.log(`Invoice created: ${invoice.id}`);
    return invoice;
  }

  /**
   * Mark invoice as paid
   */
  async markAsPaid(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.PAID,
        amountPaid: invoice.total,
        amountRemaining: 0,
        paidAt: new Date(),
      },
      include: {
        lineItems: true,
        customer: true,
      },
    });

    // Emit event
    await this.eventEmitter.emit({
      type: DomainEventType.INVOICE_PAID,
      tenantId: invoice.tenantId,
      timestamp: new Date(),
      data: {
        invoiceId: invoice.id,
        customerId: invoice.customerId,
        amount: invoice.total,
        currency: invoice.currency,
      },
    });

    this.logger.log(`Invoice marked as paid: ${id}`);
    return updated;
  }

  /**
   * Get all invoices for a tenant
   */
  async findAll(tenantId: string, filters?: { customerId?: string; status?: InvoiceStatus }) {
    return await this.prisma.invoice.findMany({
      where: {
        tenantId,
        customerId: filters?.customerId,
        status: filters?.status,
      },
      include: {
        lineItems: true,
        customer: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        subscription: {
          select: {
            id: true,
            plan: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get invoice by ID
   */
  async findOne(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        lineItems: true,
        customer: true,
        subscription: {
          include: {
            plan: true,
          },
        },
        transactions: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  /**
   * Void an invoice
   */
  async void(id: string) {
    const invoice = await this.findOne(id);

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.VOID,
        voidedAt: new Date(),
      },
    });

    this.logger.log(`Invoice voided: ${id}`);
    return updated;
  }
}

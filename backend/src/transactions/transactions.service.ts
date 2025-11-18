import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { TransactionType, TransactionStatus } from '@prisma/client';
import { DomainEventEmitter } from '../lib/events/event-emitter';
import { DomainEventType } from '../lib/events/domain-events';

export interface CreateTransactionDto {
  customerId: string;
  invoiceId?: string;
  subscriptionId?: string;
  paymentMethodId?: string;
  type: TransactionType;
  amount: number;
  currency?: string;
  description?: string;
  metadata?: any;
}

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: DomainEventEmitter,
  ) {}

  /**
   * Create a new transaction
   */
  async create(tenantId: string, dto: CreateTransactionDto) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const transaction = await this.prisma.transaction.create({
      data: {
        tenantId,
        customerId: dto.customerId,
        invoiceId: dto.invoiceId,
        subscriptionId: dto.subscriptionId,
        paymentMethodId: dto.paymentMethodId,
        provider: customer.provider,
        type: dto.type,
        amount: dto.amount,
        currency: dto.currency || 'usd',
        status: TransactionStatus.PENDING,
        description: dto.description,
        metadata: dto.metadata || {},
      },
      include: {
        customer: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        invoice: {
          select: {
            id: true,
            total: true,
          },
        },
      },
    });

    this.logger.log(`Transaction created: ${transaction.id} (${dto.type})`);
    return transaction;
  }

  /**
   * Mark transaction as succeeded
   */
  async markAsSucceeded(id: string, providerTransactionId?: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    const updated = await this.prisma.transaction.update({
      where: { id },
      data: {
        status: TransactionStatus.SUCCEEDED,
        providerTransactionId,
        processedAt: new Date(),
      },
      include: {
        customer: true,
        invoice: true,
      },
    });

    // Emit event based on transaction type
    if (transaction.type === TransactionType.CHARGE) {
      await this.eventEmitter.emit({
        type: DomainEventType.PAYMENT_SUCCEEDED,
        tenantId: transaction.tenantId,
        timestamp: new Date(),
        data: {
          transactionId: id,
          customerId: transaction.customerId,
          amount: transaction.amount,
          currency: transaction.currency,
        },
      });
    } else if (transaction.type === TransactionType.REFUND) {
      await this.eventEmitter.emit({
        type: DomainEventType.REFUND_PROCESSED,
        tenantId: transaction.tenantId,
        timestamp: new Date(),
        data: {
          transactionId: id,
          customerId: transaction.customerId,
          amount: transaction.amount,
        },
      });
    }

    this.logger.log(`Transaction succeeded: ${id}`);
    return updated;
  }

  /**
   * Mark transaction as failed
   */
  async markAsFailed(id: string, failureMessage?: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    const updated = await this.prisma.transaction.update({
      where: { id },
      data: {
        status: TransactionStatus.FAILED,
        failureMessage,
        processedAt: new Date(),
      },
    });

    // Emit payment failed event
    await this.eventEmitter.emit({
      type: DomainEventType.PAYMENT_FAILED,
      tenantId: transaction.tenantId,
      timestamp: new Date(),
      data: {
        customerId: transaction.customerId,
        subscriptionId: transaction.subscriptionId,
        amount: transaction.amount,
        reason: failureMessage || 'Unknown error',
      },
    });

    this.logger.log(`Transaction failed: ${id}`);
    return updated;
  }

  /**
   * Get all transactions for a tenant
   */
  async findAll(
    tenantId: string,
    filters?: {
      customerId?: string;
      type?: TransactionType;
      status?: TransactionStatus;
    },
  ) {
    return await this.prisma.transaction.findMany({
      where: {
        tenantId,
        customerId: filters?.customerId,
        type: filters?.type,
        status: filters?.status,
      },
      include: {
        customer: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        invoice: {
          select: {
            id: true,
            total: true,
            status: true,
          },
        },
        paymentMethod: {
          select: {
            id: true,
            type: true,
            cardLast4: true,
            cardBrand: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get transaction by ID
   */
  async findOne(id: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        customer: true,
        invoice: true,
        subscription: true,
        paymentMethod: true,
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }

  /**
   * Get transactions for a customer
   */
  async findByCustomer(customerId: string) {
    return await this.prisma.transaction.findMany({
      where: {
        customerId,
      },
      include: {
        invoice: {
          select: {
            id: true,
            total: true,
          },
        },
        paymentMethod: {
          select: {
            id: true,
            type: true,
            cardLast4: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Calculate revenue for a tenant
   */
  async getRevenue(tenantId: string, startDate?: Date, endDate?: Date) {
    const where: any = {
      tenantId,
      type: TransactionType.CHARGE,
      status: TransactionStatus.SUCCEEDED,
    };

    if (startDate || endDate) {
      where.processedAt = {};
      if (startDate) where.processedAt.gte = startDate;
      if (endDate) where.processedAt.lte = endDate;
    }

    const transactions = await this.prisma.transaction.findMany({
      where,
      select: {
        amount: true,
        currency: true,
      },
    });

    const revenue = transactions.reduce((sum, t) => sum + t.amount, 0);

    return {
      revenue,
      currency: 'usd',
      transactionCount: transactions.length,
      period: {
        start: startDate,
        end: endDate,
      },
    };
  }
}

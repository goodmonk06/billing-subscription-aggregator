import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PaymentMethodType } from '@prisma/client';
import { DomainEventEmitter } from '../lib/events/event-emitter';
import { DomainEventType } from '../lib/events/domain-events';

export interface CreatePaymentMethodDto {
  customerId: string;
  type: PaymentMethodType;
  cardLast4?: string;
  cardBrand?: string;
  cardExpMonth?: number;
  cardExpYear?: number;
  bankName?: string;
  bankLast4?: string;
  billingDetails?: any;
  isDefault?: boolean;
}

@Injectable()
export class PaymentMethodsService {
  private readonly logger = new Logger(PaymentMethodsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: DomainEventEmitter,
  ) {}

  /**
   * Add a payment method to a customer
   */
  async create(tenantId: string, dto: CreatePaymentMethodDto) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // If this is set as default, unset other default payment methods
    if (dto.isDefault) {
      await this.prisma.paymentMethod.updateMany({
        where: {
          customerId: dto.customerId,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }

    const paymentMethod = await this.prisma.paymentMethod.create({
      data: {
        tenantId,
        customerId: dto.customerId,
        provider: customer.provider,
        type: dto.type,
        cardLast4: dto.cardLast4,
        cardBrand: dto.cardBrand,
        cardExpMonth: dto.cardExpMonth,
        cardExpYear: dto.cardExpYear,
        bankName: dto.bankName,
        bankLast4: dto.bankLast4,
        billingDetails: dto.billingDetails || {},
        isDefault: dto.isDefault || false,
      },
      include: {
        customer: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    // Emit event
    await this.eventEmitter.emit({
      type: DomainEventType.PAYMENT_METHOD_ADDED,
      tenantId,
      timestamp: new Date(),
      data: {
        paymentMethodId: paymentMethod.id,
        customerId: dto.customerId,
        type: dto.type,
      },
    });

    this.logger.log(`Payment method added: ${paymentMethod.id}`);
    return paymentMethod;
  }

  /**
   * Get all payment methods for a customer
   */
  async findByCustomer(customerId: string) {
    return await this.prisma.paymentMethod.findMany({
      where: {
        customerId,
      },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  /**
   * Get payment method by ID
   */
  async findOne(id: string) {
    const paymentMethod = await this.prisma.paymentMethod.findUnique({
      where: { id },
      include: {
        customer: true,
      },
    });

    if (!paymentMethod) {
      throw new NotFoundException('Payment method not found');
    }

    return paymentMethod;
  }

  /**
   * Set a payment method as default
   */
  async setDefault(id: string) {
    const paymentMethod = await this.findOne(id);

    // Unset other default payment methods for this customer
    await this.prisma.paymentMethod.updateMany({
      where: {
        customerId: paymentMethod.customerId,
        isDefault: true,
      },
      data: {
        isDefault: false,
      },
    });

    // Set this one as default
    const updated = await this.prisma.paymentMethod.update({
      where: { id },
      data: {
        isDefault: true,
      },
    });

    this.logger.log(`Payment method set as default: ${id}`);
    return updated;
  }

  /**
   * Remove a payment method
   */
  async remove(id: string) {
    const paymentMethod = await this.findOne(id);

    if (paymentMethod.isDefault) {
      throw new BadRequestException('Cannot remove default payment method. Set another as default first.');
    }

    const deleted = await this.prisma.paymentMethod.delete({
      where: { id },
    });

    // Emit event
    await this.eventEmitter.emit({
      type: DomainEventType.PAYMENT_METHOD_REMOVED,
      tenantId: paymentMethod.tenantId,
      timestamp: new Date(),
      data: {
        paymentMethodId: id,
        customerId: paymentMethod.customerId,
      },
    });

    this.logger.log(`Payment method removed: ${id}`);
    return deleted;
  }

  /**
   * Check for expiring payment methods
   * Returns payment methods expiring in the next 30 days
   */
  async findExpiring() {
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // getMonth() is 0-indexed
    const currentYear = now.getFullYear();
    const nextMonth = new Date(now.setMonth(now.getMonth() + 1));
    const expiryMonth = nextMonth.getMonth() + 1;
    const expiryYear = nextMonth.getFullYear();

    return await this.prisma.paymentMethod.findMany({
      where: {
        type: PaymentMethodType.CARD,
        OR: [
          {
            cardExpYear: currentYear,
            cardExpMonth: {
              lte: currentMonth,
            },
          },
          {
            cardExpYear: expiryYear,
            cardExpMonth: {
              lte: expiryMonth,
            },
          },
        ],
      },
      include: {
        customer: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  }
}

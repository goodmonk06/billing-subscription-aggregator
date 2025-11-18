import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { DomainEventEmitter } from '../lib/events/event-emitter';
import { DomainEventType } from '../lib/events/domain-events';

export interface RecordUsageDto {
  subscriptionId: string;
  quantity: number;
  unit: string;
  timestamp?: Date;
  idempotencyKey?: string;
  metadata?: any;
}

export interface UsageAggregation {
  subscriptionId: string;
  customerId: string;
  unit: string;
  totalQuantity: number;
  recordCount: number;
  period: {
    start: Date;
    end: Date;
  };
}

@Injectable()
export class UsageService {
  private readonly logger = new Logger(UsageService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: DomainEventEmitter,
  ) {}

  /**
   * Record usage for a subscription
   */
  async recordUsage(tenantId: string, dto: RecordUsageDto) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: dto.subscriptionId },
      include: {
        customer: true,
        plan: true,
      },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    // Check if idempotency key already exists
    if (dto.idempotencyKey) {
      const existing = await this.prisma.usageRecord.findFirst({
        where: {
          subscriptionId: dto.subscriptionId,
          idempotencyKey: dto.idempotencyKey,
        },
      });

      if (existing) {
        this.logger.warn(`Duplicate usage record detected: ${dto.idempotencyKey}`);
        return existing;
      }
    }

    const usageRecord = await this.prisma.usageRecord.create({
      data: {
        tenantId,
        customerId: subscription.customerId,
        subscriptionId: dto.subscriptionId,
        provider: subscription.provider,
        quantity: dto.quantity,
        unit: dto.unit,
        timestamp: dto.timestamp || new Date(),
        idempotencyKey: dto.idempotencyKey,
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
    });

    // Emit event
    await this.eventEmitter.emit({
      type: DomainEventType.USAGE_RECORDED,
      tenantId,
      timestamp: new Date(),
      data: {
        customerId: subscription.customerId,
        subscriptionId: dto.subscriptionId,
        quantity: dto.quantity,
        unit: dto.unit,
      },
    });

    this.logger.log(`Usage recorded: ${usageRecord.id} (${dto.quantity} ${dto.unit})`);
    return usageRecord;
  }

  /**
   * Get usage records for a subscription
   */
  async findBySubscription(
    subscriptionId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    const where: any = {
      subscriptionId,
    };

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    return await this.prisma.usageRecord.findMany({
      where,
      orderBy: {
        timestamp: 'desc',
      },
    });
  }

  /**
   * Get usage records for a customer
   */
  async findByCustomer(
    customerId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    const where: any = {
      customerId,
    };

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    return await this.prisma.usageRecord.findMany({
      where,
      include: {
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
        timestamp: 'desc',
      },
    });
  }

  /**
   * Get aggregated usage for a subscription
   */
  async getAggregatedUsage(
    subscriptionId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<UsageAggregation> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    const records = await this.findBySubscription(subscriptionId, startDate, endDate);

    // Group by unit
    const aggregated = records.reduce((acc, record) => {
      if (!acc[record.unit]) {
        acc[record.unit] = {
          quantity: 0,
          count: 0,
        };
      }
      acc[record.unit].quantity += record.quantity;
      acc[record.unit].count += 1;
      return acc;
    }, {} as Record<string, { quantity: number; count: number }>);

    // For simplicity, return the first unit's aggregation
    // In a real system, you might want to handle multiple units differently
    const unit = Object.keys(aggregated)[0] || 'requests';
    const data = aggregated[unit] || { quantity: 0, count: 0 };

    return {
      subscriptionId,
      customerId: subscription.customerId,
      unit,
      totalQuantity: data.quantity,
      recordCount: data.count,
      period: {
        start: startDate,
        end: endDate,
      },
    };
  }

  /**
   * Check usage thresholds and emit events if exceeded
   */
  async checkThresholds(
    subscriptionId: string,
    thresholds: { quantity: number; unit: string }[],
  ) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    for (const threshold of thresholds) {
      const records = await this.prisma.usageRecord.findMany({
        where: {
          subscriptionId,
          unit: threshold.unit,
          timestamp: {
            gte: startOfMonth,
          },
        },
      });

      const totalQuantity = records.reduce((sum, r) => sum + r.quantity, 0);

      if (totalQuantity >= threshold.quantity) {
        await this.eventEmitter.emit({
          type: DomainEventType.USAGE_THRESHOLD_REACHED,
          tenantId: subscription.tenantId,
          timestamp: new Date(),
          data: {
            subscriptionId,
            customerId: subscription.customerId,
            unit: threshold.unit,
            threshold: threshold.quantity,
            current: totalQuantity,
          },
        });

        this.logger.warn(
          `Usage threshold reached for subscription ${subscriptionId}: ${totalQuantity}/${threshold.quantity} ${threshold.unit}`,
        );
      }
    }
  }

  /**
   * Delete old usage records (for cleanup/archival)
   */
  async deleteOldRecords(beforeDate: Date) {
    const deleted = await this.prisma.usageRecord.deleteMany({
      where: {
        timestamp: {
          lt: beforeDate,
        },
      },
    });

    this.logger.log(`Deleted ${deleted.count} old usage records`);
    return deleted;
  }
}

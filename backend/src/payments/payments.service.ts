import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PaymentProvider, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { PaymentProviderFactory } from './providers/provider.factory';
import {
  CreateCustomerDto,
  CreateSubscriptionDto,
  CancelSubscriptionDto,
} from './interfaces/payment-provider.interface';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly providerFactory: PaymentProviderFactory,
  ) {}

  /**
   * Create a customer in the payment provider and store in database
   */
  async createCustomer(
    tenantId: string,
    provider: PaymentProvider,
    dto: CreateCustomerDto,
  ) {
    const paymentProvider = this.providerFactory.getProvider(provider);
    const result = await paymentProvider.createCustomer(dto);

    const customer = await this.prisma.customer.create({
      data: {
        tenantId,
        externalCustomerId: result.externalCustomerId,
        provider: result.provider,
        email: result.email,
        metadataJson: result.metadata || {},
      },
    });

    this.logger.log(`Customer created: ${customer.id}`);
    return customer;
  }

  /**
   * Create a subscription in the payment provider and store in database
   */
  async createSubscription(
    tenantId: string,
    customerId: string,
    planId: string,
    dto: Omit<CreateSubscriptionDto, 'customerId' | 'priceId'>,
  ) {
    // Get customer and plan
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    // Get the provider plan ID from the plan's providerPlanIdsJson
    const providerPlanIds = plan.providerPlanIdsJson as Record<string, string>;
    const priceId = providerPlanIds[customer.provider.toLowerCase()];

    if (!priceId) {
      throw new Error(`Plan ${planId} does not have a price ID for provider ${customer.provider}`);
    }

    // Create subscription in payment provider
    const paymentProvider = this.providerFactory.getProvider(customer.provider);
    const result = await paymentProvider.createSubscription({
      customerId: customer.externalCustomerId,
      priceId,
      metadata: dto.metadata,
      trialPeriodDays: dto.trialPeriodDays,
    });

    // Map provider status to our internal status
    const status = this.mapProviderStatus(result.status);

    // Store subscription in database
    const subscription = await this.prisma.subscription.create({
      data: {
        tenantId,
        customerId,
        planId,
        status,
        currentPeriodStart: result.currentPeriodStart,
        currentPeriodEnd: result.currentPeriodEnd,
        providerSubscriptionId: result.providerSubscriptionId,
        provider: customer.provider,
        metadataJson: result.metadata || {},
      },
      include: {
        customer: true,
        plan: true,
      },
    });

    this.logger.log(`Subscription created: ${subscription.id}`);
    return subscription;
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(subscriptionId: string, cancelImmediately = false) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { customer: true },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    // Cancel in payment provider
    const paymentProvider = this.providerFactory.getProvider(subscription.provider);
    const result = await paymentProvider.cancelSubscription({
      subscriptionId: subscription.providerSubscriptionId,
      cancelImmediately,
    });

    // Update subscription in database
    const status = this.mapProviderStatus(result.status);
    const updated = await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status,
        cancelAt: result.cancelAt,
        canceledAt: result.canceledAt,
      },
      include: {
        customer: true,
        plan: true,
      },
    });

    this.logger.log(`Subscription canceled: ${subscription.id}`);
    return updated;
  }

  /**
   * Get subscriptions for a tenant
   */
  async getSubscriptions(tenantId: string, filters?: {
    customerId?: string;
    planId?: string;
    status?: SubscriptionStatus;
  }) {
    return await this.prisma.subscription.findMany({
      where: {
        tenantId,
        customerId: filters?.customerId,
        planId: filters?.planId,
        status: filters?.status,
      },
      include: {
        customer: true,
        plan: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get a single subscription
   */
  async getSubscription(id: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
      include: {
        customer: true,
        plan: true,
      },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return subscription;
  }

  /**
   * Map provider-specific status to our internal status enum
   */
  private mapProviderStatus(providerStatus: string): SubscriptionStatus {
    const statusMap: Record<string, SubscriptionStatus> = {
      active: SubscriptionStatus.ACTIVE,
      canceled: SubscriptionStatus.CANCELED,
      past_due: SubscriptionStatus.PAST_DUE,
      unpaid: SubscriptionStatus.UNPAID,
      trialing: SubscriptionStatus.TRIALING,
      incomplete: SubscriptionStatus.INCOMPLETE,
      incomplete_expired: SubscriptionStatus.INCOMPLETE_EXPIRED,
    };

    return statusMap[providerStatus.toLowerCase()] || SubscriptionStatus.ACTIVE;
  }
}

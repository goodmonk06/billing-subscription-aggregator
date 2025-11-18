import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { PaymentProvider } from '@prisma/client';
import {
  IPaymentProvider,
  CreateCustomerDto,
  CreateCustomerResult,
  CreateSubscriptionDto,
  CreateSubscriptionResult,
  CancelSubscriptionDto,
  CancelSubscriptionResult,
  WebhookEvent,
  SyncSubscriptionResult,
} from '../interfaces/payment-provider.interface';

@Injectable()
export class StripeProvider implements IPaymentProvider {
  private readonly logger = new Logger(StripeProvider.name);
  private readonly stripe: Stripe;
  private readonly webhookSecret: string;

  constructor(apiKey: string, webhookSecret: string) {
    this.stripe = new Stripe(apiKey, {
      apiVersion: '2024-11-20.acacia',
    });
    this.webhookSecret = webhookSecret;
    this.logger.log('Stripe provider initialized');
  }

  getProvider(): PaymentProvider {
    return PaymentProvider.STRIPE;
  }

  async createCustomer(dto: CreateCustomerDto): Promise<CreateCustomerResult> {
    this.logger.log(`Creating customer with email: ${dto.email}`);

    try {
      const customer = await this.stripe.customers.create({
        email: dto.email,
        name: dto.name,
        metadata: dto.metadata || {},
      });

      return {
        externalCustomerId: customer.id,
        email: customer.email!,
        provider: PaymentProvider.STRIPE,
        metadata: customer.metadata,
      };
    } catch (error) {
      this.logger.error(`Failed to create customer: ${error.message}`, error.stack);
      throw error;
    }
  }

  async createSubscription(dto: CreateSubscriptionDto): Promise<CreateSubscriptionResult> {
    this.logger.log(`Creating subscription for customer: ${dto.customerId}`);

    try {
      const subscription = await this.stripe.subscriptions.create({
        customer: dto.customerId,
        items: [{ price: dto.priceId }],
        metadata: dto.metadata || {},
        trial_period_days: dto.trialPeriodDays,
      });

      return {
        providerSubscriptionId: subscription.id,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        customerId: dto.customerId,
        priceId: dto.priceId,
        metadata: subscription.metadata,
      };
    } catch (error) {
      this.logger.error(`Failed to create subscription: ${error.message}`, error.stack);
      throw error;
    }
  }

  async cancelSubscription(dto: CancelSubscriptionDto): Promise<CancelSubscriptionResult> {
    this.logger.log(`Canceling subscription: ${dto.subscriptionId}`);

    try {
      const subscription = await this.stripe.subscriptions.update(dto.subscriptionId, {
        cancel_at_period_end: !dto.cancelImmediately,
      });

      if (dto.cancelImmediately) {
        await this.stripe.subscriptions.cancel(dto.subscriptionId);
      }

      return {
        providerSubscriptionId: subscription.id,
        status: subscription.status,
        cancelAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : undefined,
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to cancel subscription: ${error.message}`, error.stack);
      throw error;
    }
  }

  async syncSubscriptionFromWebhook(event: WebhookEvent): Promise<SyncSubscriptionResult | null> {
    this.logger.log(`Syncing subscription from webhook event: ${event.type}`);

    const subscription = event.data as Stripe.Subscription;

    if (!subscription || !subscription.id) {
      this.logger.warn('No subscription data in webhook event');
      return null;
    }

    return {
      providerSubscriptionId: subscription.id,
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : undefined,
      canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : undefined,
      metadata: subscription.metadata,
    };
  }

  verifyWebhookSignature(payload: string | Buffer, signature: string): boolean {
    try {
      this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);
      return true;
    } catch (error) {
      this.logger.error(`Webhook signature verification failed: ${error.message}`);
      return false;
    }
  }

  parseWebhookEvent(payload: string | Buffer): WebhookEvent {
    const event = JSON.parse(payload.toString());

    return {
      type: event.type,
      data: event.data.object,
      rawPayload: event,
    };
  }

  /**
   * Get subscription by ID (helper method)
   */
  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return await this.stripe.subscriptions.retrieve(subscriptionId);
  }

  /**
   * Get customer by ID (helper method)
   */
  async getCustomer(customerId: string): Promise<Stripe.Customer> {
    return await this.stripe.customers.retrieve(customerId) as Stripe.Customer;
  }

  /**
   * Create a price/plan (helper method)
   */
  async createPrice(params: {
    productId: string;
    unitAmount: number;
    currency: string;
    interval: 'month' | 'year';
  }): Promise<Stripe.Price> {
    return await this.stripe.prices.create({
      product: params.productId,
      unit_amount: params.unitAmount,
      currency: params.currency,
      recurring: {
        interval: params.interval,
      },
    });
  }

  /**
   * Create a product (helper method)
   */
  async createProduct(params: {
    name: string;
    description?: string;
  }): Promise<Stripe.Product> {
    return await this.stripe.products.create({
      name: params.name,
      description: params.description,
    });
  }
}

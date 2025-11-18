import { Injectable, Logger } from '@nestjs/common';
import { PaymentProvider, PaymentEventType, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { PaymentProviderFactory } from '../payments/providers/provider.factory';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly providerFactory: PaymentProviderFactory,
  ) {}

  /**
   * Process Stripe webhook event
   */
  async processStripeWebhook(payload: Buffer, signature: string) {
    const provider = this.providerFactory.getProvider(PaymentProvider.STRIPE);

    // Verify webhook signature
    const isValid = provider.verifyWebhookSignature(payload, signature);
    if (!isValid) {
      throw new Error('Invalid webhook signature');
    }

    // Parse webhook event
    const webhookEvent = provider.parseWebhookEvent(payload);
    this.logger.log(`Processing Stripe webhook: ${webhookEvent.type}`);

    // Determine tenant from the event metadata or customer
    // For now, we'll try to find the tenant from the subscription or customer
    const tenantId = await this.findTenantFromEvent(webhookEvent, PaymentProvider.STRIPE);

    if (!tenantId) {
      this.logger.warn(`Could not determine tenant for event ${webhookEvent.type}`);
      return;
    }

    // Store the payment event
    await this.storePaymentEvent(
      tenantId,
      PaymentProvider.STRIPE,
      this.mapEventType(webhookEvent.type),
      webhookEvent.rawPayload,
    );

    // Process the event based on type
    await this.handleWebhookEvent(webhookEvent, PaymentProvider.STRIPE);
  }

  /**
   * Process PayPal webhook event
   */
  async processPayPalWebhook(payload: Buffer, signature: string) {
    const provider = this.providerFactory.getProvider(PaymentProvider.PAYPAL);

    // Verify webhook signature
    const isValid = provider.verifyWebhookSignature(payload, signature);
    if (!isValid) {
      throw new Error('Invalid webhook signature');
    }

    // Parse webhook event
    const webhookEvent = provider.parseWebhookEvent(payload);
    this.logger.log(`Processing PayPal webhook: ${webhookEvent.type}`);

    // Determine tenant from the event
    const tenantId = await this.findTenantFromEvent(webhookEvent, PaymentProvider.PAYPAL);

    if (!tenantId) {
      this.logger.warn(`Could not determine tenant for event ${webhookEvent.type}`);
      return;
    }

    // Store the payment event
    await this.storePaymentEvent(
      tenantId,
      PaymentProvider.PAYPAL,
      this.mapEventType(webhookEvent.type),
      webhookEvent.rawPayload,
    );

    // Process the event
    await this.handleWebhookEvent(webhookEvent, PaymentProvider.PAYPAL);
  }

  /**
   * Handle webhook event based on type
   */
  private async handleWebhookEvent(event: any, provider: PaymentProvider) {
    const eventType = event.type.toLowerCase();

    // Handle subscription lifecycle events
    if (
      eventType.includes('subscription.created') ||
      eventType.includes('subscription.updated') ||
      eventType.includes('subscription.deleted') ||
      eventType.includes('customer.subscription')
    ) {
      await this.syncSubscription(event, provider);
    }

    // Handle invoice/payment events
    if (eventType.includes('invoice.paid') || eventType.includes('payment.sale.completed')) {
      this.logger.log(`Invoice paid for subscription`);
      // Additional payment processing logic can go here
    }

    if (eventType.includes('invoice.payment_failed')) {
      this.logger.warn(`Payment failed for subscription`);
      // Handle failed payment
    }
  }

  /**
   * Sync subscription from webhook event
   */
  private async syncSubscription(event: any, provider: PaymentProvider) {
    const paymentProvider = this.providerFactory.getProvider(provider);
    const syncResult = await paymentProvider.syncSubscriptionFromWebhook(event);

    if (!syncResult) {
      this.logger.warn('No subscription data to sync');
      return;
    }

    // Find the subscription in our database
    const subscription = await this.prisma.subscription.findUnique({
      where: {
        providerSubscriptionId_provider: {
          providerSubscriptionId: syncResult.providerSubscriptionId,
          provider,
        },
      },
    });

    if (!subscription) {
      this.logger.warn(
        `Subscription ${syncResult.providerSubscriptionId} not found in database`,
      );
      return;
    }

    // Update subscription
    const status = this.mapProviderStatus(syncResult.status);
    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status,
        currentPeriodStart: syncResult.currentPeriodStart,
        currentPeriodEnd: syncResult.currentPeriodEnd,
        cancelAt: syncResult.cancelAt,
        canceledAt: syncResult.canceledAt,
        metadataJson: syncResult.metadata || subscription.metadataJson,
      },
    });

    this.logger.log(`Subscription ${subscription.id} synced from webhook`);
  }

  /**
   * Store payment event in database
   */
  private async storePaymentEvent(
    tenantId: string,
    provider: PaymentProvider,
    type: PaymentEventType,
    payload: any,
  ) {
    await this.prisma.paymentEvent.create({
      data: {
        tenantId,
        provider,
        type,
        payloadJson: payload,
        processedAt: new Date(),
      },
    });
  }

  /**
   * Find tenant ID from webhook event
   */
  private async findTenantFromEvent(event: any, provider: PaymentProvider): Promise<string | null> {
    // Try to find subscription first
    if (event.data?.id && event.type.includes('subscription')) {
      const subscription = await this.prisma.subscription.findFirst({
        where: {
          providerSubscriptionId: event.data.id,
          provider,
        },
      });

      if (subscription) {
        return subscription.tenantId;
      }
    }

    // Try to find customer
    if (event.data?.customer) {
      const customer = await this.prisma.customer.findFirst({
        where: {
          externalCustomerId: event.data.customer,
          provider,
        },
      });

      if (customer) {
        return customer.tenantId;
      }
    }

    return null;
  }

  /**
   * Map webhook event type to PaymentEventType
   */
  private mapEventType(eventType: string): PaymentEventType {
    const type = eventType.toLowerCase();

    if (type.includes('customer.created')) return PaymentEventType.CUSTOMER_CREATED;
    if (type.includes('customer.updated')) return PaymentEventType.CUSTOMER_UPDATED;
    if (type.includes('subscription.created')) return PaymentEventType.SUBSCRIPTION_CREATED;
    if (type.includes('subscription.updated')) return PaymentEventType.SUBSCRIPTION_UPDATED;
    if (type.includes('subscription.deleted')) return PaymentEventType.SUBSCRIPTION_DELETED;
    if (type.includes('invoice.paid') || type.includes('payment.sale.completed'))
      return PaymentEventType.INVOICE_PAID;
    if (type.includes('invoice.payment_failed'))
      return PaymentEventType.INVOICE_PAYMENT_FAILED;
    if (type.includes('payment_method.attached'))
      return PaymentEventType.PAYMENT_METHOD_ATTACHED;
    if (type.includes('payment_method.detached'))
      return PaymentEventType.PAYMENT_METHOD_DETACHED;

    return PaymentEventType.SUBSCRIPTION_UPDATED; // Default
  }

  /**
   * Map provider status to internal status
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

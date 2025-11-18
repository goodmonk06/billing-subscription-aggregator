import { PaymentProvider as ProviderEnum } from '@prisma/client';

export interface CreateCustomerDto {
  email: string;
  name?: string;
  metadata?: Record<string, any>;
}

export interface CreateCustomerResult {
  externalCustomerId: string;
  email: string;
  provider: ProviderEnum;
  metadata?: Record<string, any>;
}

export interface CreateSubscriptionDto {
  customerId: string;
  priceId: string;
  metadata?: Record<string, any>;
  trialPeriodDays?: number;
}

export interface CreateSubscriptionResult {
  providerSubscriptionId: string;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  customerId: string;
  priceId: string;
  metadata?: Record<string, any>;
}

export interface CancelSubscriptionDto {
  subscriptionId: string;
  cancelImmediately?: boolean;
}

export interface CancelSubscriptionResult {
  providerSubscriptionId: string;
  status: string;
  cancelAt?: Date;
  canceledAt?: Date;
}

export interface WebhookEvent {
  type: string;
  data: any;
  rawPayload: any;
}

export interface SyncSubscriptionResult {
  providerSubscriptionId: string;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAt?: Date;
  canceledAt?: Date;
  metadata?: Record<string, any>;
}

export interface IPaymentProvider {
  /**
   * Get the provider type
   */
  getProvider(): ProviderEnum;

  /**
   * Create a customer in the payment provider
   */
  createCustomer(dto: CreateCustomerDto): Promise<CreateCustomerResult>;

  /**
   * Create a subscription for a customer
   */
  createSubscription(dto: CreateSubscriptionDto): Promise<CreateSubscriptionResult>;

  /**
   * Cancel a subscription
   */
  cancelSubscription(dto: CancelSubscriptionDto): Promise<CancelSubscriptionResult>;

  /**
   * Sync subscription data from webhook event
   */
  syncSubscriptionFromWebhook(event: WebhookEvent): Promise<SyncSubscriptionResult | null>;

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string | Buffer, signature: string): boolean;

  /**
   * Parse webhook event
   */
  parseWebhookEvent(payload: string | Buffer): WebhookEvent;
}

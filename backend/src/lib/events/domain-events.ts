// Domain Events for the Billing Aggregator

export enum DomainEventType {
  // Customer events
  CUSTOMER_CREATED = 'customer.created',
  CUSTOMER_UPDATED = 'customer.updated',
  CUSTOMER_DELETED = 'customer.deleted',

  // Subscription events
  SUBSCRIPTION_CREATED = 'subscription.created',
  SUBSCRIPTION_UPDATED = 'subscription.updated',
  SUBSCRIPTION_CANCELED = 'subscription.canceled',
  SUBSCRIPTION_TRIAL_ENDING = 'subscription.trial_ending',
  SUBSCRIPTION_RENEWED = 'subscription.renewed',

  // Invoice events
  INVOICE_CREATED = 'invoice.created',
  INVOICE_PAID = 'invoice.paid',
  INVOICE_PAYMENT_FAILED = 'invoice.payment_failed',
  INVOICE_UPCOMING = 'invoice.upcoming',
  INVOICE_VOIDED = 'invoice.voided',

  // Payment events
  PAYMENT_SUCCEEDED = 'payment.succeeded',
  PAYMENT_FAILED = 'payment.failed',
  REFUND_CREATED = 'refund.created',
  REFUND_PROCESSED = 'refund.processed',

  // Payment method events
  PAYMENT_METHOD_ADDED = 'payment_method.added',
  PAYMENT_METHOD_REMOVED = 'payment_method.removed',
  PAYMENT_METHOD_UPDATED = 'payment_method.updated',
  PAYMENT_METHOD_EXPIRING = 'payment_method.expiring',

  // Usage events
  USAGE_RECORDED = 'usage.recorded',
  USAGE_THRESHOLD_REACHED = 'usage.threshold_reached',

  // Credit events
  CREDIT_GRANTED = 'credit.granted',
  CREDIT_APPLIED = 'credit.applied',
  CREDIT_EXPIRED = 'credit.expired',
}

export interface DomainEvent<T = any> {
  type: DomainEventType;
  tenantId: string;
  timestamp: Date;
  data: T;
  metadata?: Record<string, any>;
}

// Specific event payloads
export interface CustomerCreatedEvent extends DomainEvent {
  type: DomainEventType.CUSTOMER_CREATED;
  data: {
    customerId: string;
    email: string;
    provider: string;
  };
}

export interface SubscriptionCreatedEvent extends DomainEvent {
  type: DomainEventType.SUBSCRIPTION_CREATED;
  data: {
    subscriptionId: string;
    customerId: string;
    planId: string;
    status: string;
  };
}

export interface InvoicePaidEvent extends DomainEvent {
  type: DomainEventType.INVOICE_PAID;
  data: {
    invoiceId: string;
    customerId: string;
    amount: number;
    currency: string;
  };
}

export interface PaymentFailedEvent extends DomainEvent {
  type: DomainEventType.PAYMENT_FAILED;
  data: {
    customerId: string;
    subscriptionId?: string;
    amount: number;
    reason: string;
  };
}

export interface UsageRecordedEvent extends DomainEvent {
  type: DomainEventType.USAGE_RECORDED;
  data: {
    customerId: string;
    subscriptionId: string;
    quantity: number;
    unit: string;
  };
}

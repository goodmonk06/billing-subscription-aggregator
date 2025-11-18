import {
  PrismaClient,
  PaymentProvider,
  BillingInterval,
  SubscriptionStatus,
  InvoiceStatus,
  TransactionType,
  TransactionStatus,
  PaymentMethodType,
  WebhookStatus,
  AuditAction,
} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Phase 3 comprehensive seed...\n');

  // Clean up existing data (in reverse dependency order)
  console.log('🧹 Cleaning up existing data...');
  await prisma.auditLog.deleteMany();
  await prisma.webhook.deleteMany();
  await prisma.usageRecord.deleteMany();
  await prisma.credit.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.invoiceLineItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.paymentMethod.deleteMany();
  await prisma.paymentEvent.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.tenant.deleteMany();
  console.log('✅ Cleanup complete\n');

  // ===== TENANTS =====
  console.log('👥 Creating tenants...');
  const acmeTenant = await prisma.tenant.create({
    data: {
      name: 'Acme Corporation',
      settings: {
        billingEmail: 'billing@acme.com',
        currency: 'usd',
        taxRate: 0.08,
        invoicePrefix: 'ACME',
      },
    },
  });

  const cocoonTenant = await prisma.tenant.create({
    data: {
      name: 'Cocoon Mental Platform',
      settings: {
        billingEmail: 'finance@cocoon.health',
        currency: 'usd',
        taxRate: 0,
        invoicePrefix: 'COCOON',
      },
    },
  });

  const techStartupTenant = await prisma.tenant.create({
    data: {
      name: 'TechStartup Inc',
      settings: {
        billingEmail: 'accounts@techstartup.io',
        currency: 'usd',
        taxRate: 0.10,
        invoicePrefix: 'TECH',
      },
    },
  });

  console.log(`✅ Created 3 tenants\n`);

  // ===== PLANS =====
  console.log('📋 Creating plans...');
  const plans = await Promise.all([
    // Acme plans
    prisma.plan.create({
      data: {
        tenantId: acmeTenant.id,
        name: 'Starter',
        price: 999, // $9.99
        currency: 'usd',
        billingInterval: BillingInterval.MONTH,
        intervalCount: 1,
        providerPlanIdsJson: { stripe: 'price_starter', paypal: 'plan_starter' },
        description: 'Perfect for individuals',
        features: ['5 projects', '10GB storage', 'Email support'],
        trialPeriodDays: 14,
        usageType: 'licensed',
      },
    }),
    prisma.plan.create({
      data: {
        tenantId: acmeTenant.id,
        name: 'Professional',
        price: 2999, // $29.99
        currency: 'usd',
        billingInterval: BillingInterval.MONTH,
        providerPlanIdsJson: { stripe: 'price_pro', paypal: 'plan_pro' },
        description: 'For growing teams',
        features: ['Unlimited projects', '100GB storage', 'Priority support', 'API access'],
        trialPeriodDays: 14,
        usageType: 'licensed',
      },
    }),
    prisma.plan.create({
      data: {
        tenantId: acmeTenant.id,
        name: 'Enterprise',
        price: 9999, // $99.99
        currency: 'usd',
        billingInterval: BillingInterval.MONTH,
        providerPlanIdsJson: { stripe: 'price_enterprise', paypal: 'plan_enterprise' },
        description: 'For large organizations',
        features: [
          'Unlimited everything',
          '1TB storage',
          '24/7 support',
          'Dedicated account manager',
          'Custom integrations',
        ],
        usageType: 'licensed',
      },
    }),
    prisma.plan.create({
      data: {
        tenantId: acmeTenant.id,
        name: 'API Usage Plan',
        price: 0, // Base price $0, usage-based
        currency: 'usd',
        billingInterval: BillingInterval.MONTH,
        providerPlanIdsJson: { stripe: 'price_api_usage' },
        description: 'Pay per API call',
        features: ['$0.001 per API call', 'No monthly commitment'],
        usageType: 'metered',
      },
    }),
    // Cocoon plans
    prisma.plan.create({
      data: {
        tenantId: cocoonTenant.id,
        name: 'Individual Therapy',
        price: 4999, // $49.99
        currency: 'usd',
        billingInterval: BillingInterval.MONTH,
        providerPlanIdsJson: { stripe: 'price_therapy_individual' },
        description: 'One-on-one therapy sessions',
        features: ['4 sessions/month', 'Chat support', 'Resource library access'],
        trialPeriodDays: 7,
      },
    }),
    prisma.plan.create({
      data: {
        tenantId: cocoonTenant.id,
        name: 'Premium Care',
        price: 9999, // $99.99
        currency: 'usd',
        billingInterval: BillingInterval.MONTH,
        providerPlanIdsJson: { stripe: 'price_therapy_premium' },
        description: 'Comprehensive mental health support',
        features: [
          'Unlimited sessions',
          '24/7 crisis support',
          'Medication management',
          'Family therapy access',
        ],
      },
    }),
    // TechStartup plans
    prisma.plan.create({
      data: {
        tenantId: techStartupTenant.id,
        name: 'Developer',
        price: 1999, // $19.99
        currency: 'usd',
        billingInterval: BillingInterval.MONTH,
        providerPlanIdsJson: { stripe: 'price_developer' },
        description: 'For individual developers',
        features: ['100K API calls/month', 'Community support'],
      },
    }),
  ]);

  console.log(`✅ Created ${plans.length} plans\n`);

  // ===== CUSTOMERS =====
  console.log('👤 Creating customers...');
  const customers = await Promise.all([
    // Acme customers
    prisma.customer.create({
      data: {
        tenantId: acmeTenant.id,
        email: 'john.doe@example.com',
        name: 'John Doe',
        phone: '+1-555-0101',
        externalCustomerId: 'cus_stripe_john',
        provider: PaymentProvider.STRIPE,
        address: {
          line1: '123 Main St',
          city: 'San Francisco',
          state: 'CA',
          postal_code: '94102',
          country: 'US',
        },
        balance: 0,
        metadataJson: { company: 'Tech Corp', vip: true },
      },
    }),
    prisma.customer.create({
      data: {
        tenantId: acmeTenant.id,
        email: 'jane.smith@example.com',
        name: 'Jane Smith',
        phone: '+1-555-0102',
        externalCustomerId: 'cus_stripe_jane',
        provider: PaymentProvider.STRIPE,
        balance: 500, // $5.00 credit
        metadataJson: { company: 'Design Studio' },
      },
    }),
    prisma.customer.create({
      data: {
        tenantId: acmeTenant.id,
        email: 'bob.wilson@example.com',
        name: 'Bob Wilson',
        externalCustomerId: 'payer_paypal_bob',
        provider: PaymentProvider.PAYPAL,
        metadataJson: { referralCode: 'FRIEND2024' },
      },
    }),
    // Cocoon customers
    prisma.customer.create({
      data: {
        tenantId: cocoonTenant.id,
        email: 'alice.brown@example.com',
        name: 'Alice Brown',
        phone: '+1-555-0201',
        externalCustomerId: 'cus_stripe_alice',
        provider: PaymentProvider.STRIPE,
        metadataJson: { age: 32, therapistPreference: 'female' },
      },
    }),
    prisma.customer.create({
      data: {
        tenantId: cocoonTenant.id,
        email: 'charlie.green@example.com',
        name: 'Charlie Green',
        externalCustomerId: 'cus_stripe_charlie',
        provider: PaymentProvider.STRIPE,
        metadataJson: { age: 28, emergencyContact: '+1-555-9999' },
      },
    }),
    // TechStartup customers
    prisma.customer.create({
      data: {
        tenantId: techStartupTenant.id,
        email: 'dev@startup.io',
        name: 'Startup Developer',
        externalCustomerId: 'cus_stripe_startup',
        provider: PaymentProvider.STRIPE,
        metadataJson: { apiKey: 'sk_test_123', tier: 'pro' },
      },
    }),
  ]);

  console.log(`✅ Created ${customers.length} customers\n`);

  // ===== PAYMENT METHODS =====
  console.log('💳 Creating payment methods...');
  const paymentMethods = await Promise.all([
    prisma.paymentMethod.create({
      data: {
        tenantId: acmeTenant.id,
        customerId: customers[0].id, // John
        providerPaymentMethodId: 'pm_stripe_john_visa',
        provider: PaymentProvider.STRIPE,
        type: PaymentMethodType.CARD,
        isDefault: true,
        card: {
          brand: 'visa',
          last4: '4242',
          exp_month: 12,
          exp_year: 2025,
        },
        billingDetails: {
          name: 'John Doe',
          email: 'john.doe@example.com',
        },
      },
    }),
    prisma.paymentMethod.create({
      data: {
        tenantId: acmeTenant.id,
        customerId: customers[1].id, // Jane
        providerPaymentMethodId: 'pm_stripe_jane_mastercard',
        provider: PaymentProvider.STRIPE,
        type: PaymentMethodType.CARD,
        isDefault: true,
        card: {
          brand: 'mastercard',
          last4: '5555',
          exp_month: 6,
          exp_year: 2026,
        },
      },
    }),
    prisma.paymentMethod.create({
      data: {
        tenantId: cocoonTenant.id,
        customerId: customers[3].id, // Alice
        providerPaymentMethodId: 'pm_stripe_alice_amex',
        provider: PaymentProvider.STRIPE,
        type: PaymentMethodType.CARD,
        isDefault: true,
        card: {
          brand: 'amex',
          last4: '0005',
          exp_month: 3,
          exp_year: 2027,
        },
      },
    }),
  ]);

  console.log(`✅ Created ${paymentMethods.length} payment methods\n`);

  // ===== SUBSCRIPTIONS =====
  console.log('📅 Creating subscriptions...');
  const now = new Date();
  const nextMonth = new Date(now);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const subscriptions = await Promise.all([
    // Active subscription
    prisma.subscription.create({
      data: {
        tenantId: acmeTenant.id,
        customerId: customers[0].id,
        planId: plans[1].id, // Professional
        provider: PaymentProvider.STRIPE,
        providerSubscriptionId: 'sub_stripe_john_pro',
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: now,
        currentPeriodEnd: nextMonth,
        quantity: 1,
        collectionMethod: 'charge_automatically',
        metadataJson: { source: 'website', campaign: 'summer2024' },
      },
    }),
    // Trialing subscription
    prisma.subscription.create({
      data: {
        tenantId: acmeTenant.id,
        customerId: customers[1].id,
        planId: plans[0].id, // Starter
        provider: PaymentProvider.STRIPE,
        providerSubscriptionId: 'sub_stripe_jane_starter',
        status: SubscriptionStatus.TRIALING,
        currentPeriodStart: twoWeeksAgo,
        currentPeriodEnd: nextMonth,
        trialStart: twoWeeksAgo,
        trialEnd: nextMonth,
        metadataJson: { referrer: 'john.doe@example.com' },
      },
    }),
    // Usage-based subscription
    prisma.subscription.create({
      data: {
        tenantId: acmeTenant.id,
        customerId: customers[2].id,
        planId: plans[3].id, // API Usage
        provider: PaymentProvider.PAYPAL,
        providerSubscriptionId: 'sub_paypal_bob_api',
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: now,
        currentPeriodEnd: nextMonth,
      },
    }),
    // Cocoon subscriptions
    prisma.subscription.create({
      data: {
        tenantId: cocoonTenant.id,
        customerId: customers[3].id,
        planId: plans[5].id, // Premium Care
        provider: PaymentProvider.STRIPE,
        providerSubscriptionId: 'sub_stripe_alice_premium',
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: now,
        currentPeriodEnd: nextMonth,
        metadataJson: { therapistId: 'therapist_456' },
      },
    }),
    prisma.subscription.create({
      data: {
        tenantId: cocoonTenant.id,
        customerId: customers[4].id,
        planId: plans[4].id, // Individual Therapy
        provider: PaymentProvider.STRIPE,
        providerSubscriptionId: 'sub_stripe_charlie_therapy',
        status: SubscriptionStatus.TRIALING,
        currentPeriodStart: now,
        currentPeriodEnd: nextMonth,
        trialStart: now,
        trialEnd: nextMonth,
      },
    }),
  ]);

  console.log(`✅ Created ${subscriptions.length} subscriptions\n`);

  // ===== INVOICES =====
  console.log('🧾 Creating invoices...');
  const invoice1 = await prisma.invoice.create({
    data: {
      tenantId: acmeTenant.id,
      customerId: customers[0].id,
      subscriptionId: subscriptions[0].id,
      provider: PaymentProvider.STRIPE,
      providerInvoiceId: 'in_stripe_001',
      status: InvoiceStatus.PAID,
      number: 'ACME-001',
      subtotal: 2999,
      tax: 240, // 8% tax
      total: 3239,
      amountDue: 3239,
      amountPaid: 3239,
      amountRemaining: 0,
      description: 'Professional Plan - Monthly',
      paidAt: now,
      lineItems: {
        create: [
          {
            description: 'Professional Plan',
            quantity: 1,
            unitAmount: 2999,
            amount: 2999,
          },
        ],
      },
    },
  });

  const invoice2 = await prisma.invoice.create({
    data: {
      tenantId: cocoonTenant.id,
      customerId: customers[3].id,
      subscriptionId: subscriptions[3].id,
      provider: PaymentProvider.STRIPE,
      providerInvoiceId: 'in_stripe_002',
      status: InvoiceStatus.PAID,
      number: 'COCOON-001',
      subtotal: 9999,
      tax: 0,
      total: 9999,
      amountDue: 9999,
      amountPaid: 9999,
      amountRemaining: 0,
      description: 'Premium Care - Monthly',
      paidAt: now,
      hostedInvoiceUrl: 'https://invoice.stripe.com/i/acct_xxx/test_xxx',
      lineItems: {
        create: [
          {
            description: 'Premium Care Plan',
            quantity: 1,
            unitAmount: 9999,
            amount: 9999,
          },
        ],
      },
    },
  });

  const dueDate = new Date(now);
  dueDate.setDate(dueDate.getDate() + 7);

  const invoice3 = await prisma.invoice.create({
    data: {
      tenantId: acmeTenant.id,
      customerId: customers[1].id,
      subscriptionId: subscriptions[1].id,
      provider: PaymentProvider.STRIPE,
      status: InvoiceStatus.OPEN,
      number: 'ACME-002',
      subtotal: 999,
      tax: 80,
      total: 1079,
      amountDue: 1079,
      amountPaid: 0,
      amountRemaining: 1079,
      description: 'Starter Plan - Monthly',
      dueDate: dueDate,
      lineItems: {
        create: [
          {
            description: 'Starter Plan',
            quantity: 1,
            unitAmount: 999,
            amount: 999,
          },
        ],
      },
    },
  });

  console.log(`✅ Created 3 invoices\n`);

  // ===== TRANSACTIONS =====
  console.log('💰 Creating transactions...');
  await Promise.all([
    prisma.transaction.create({
      data: {
        tenantId: acmeTenant.id,
        customerId: customers[0].id,
        invoiceId: invoice1.id,
        providerTransactionId: 'ch_stripe_001',
        provider: PaymentProvider.STRIPE,
        type: TransactionType.CHARGE,
        status: TransactionStatus.SUCCEEDED,
        amount: 3239,
        currency: 'usd',
        fee: 94, // ~2.9% fee
        net: 3145,
        description: 'Payment for invoice ACME-001',
        processedAt: now,
      },
    }),
    prisma.transaction.create({
      data: {
        tenantId: cocoonTenant.id,
        customerId: customers[3].id,
        invoiceId: invoice2.id,
        providerTransactionId: 'ch_stripe_002',
        provider: PaymentProvider.STRIPE,
        type: TransactionType.CHARGE,
        status: TransactionStatus.SUCCEEDED,
        amount: 9999,
        currency: 'usd',
        fee: 290,
        net: 9709,
        description: 'Payment for invoice COCOON-001',
        processedAt: now,
      },
    }),
  ]);

  console.log(`✅ Created 2 transactions\n`);

  // ===== CREDITS =====
  console.log('🎁 Creating credits...');
  await Promise.all([
    prisma.credit.create({
      data: {
        tenantId: acmeTenant.id,
        customerId: customers[1].id, // Jane has $5 credit
        amount: 500,
        currency: 'usd',
        remaining: 500,
        description: 'Referral bonus',
        reason: 'promotion',
        metadataJson: { referralCode: 'FRIEND2024', referredBy: customers[0].id },
      },
    }),
    prisma.credit.create({
      data: {
        tenantId: acmeTenant.id,
        customerId: customers[0].id,
        amount: 1000,
        currency: 'usd',
        remaining: 0,
        description: 'Refund credit',
        reason: 'refund',
        appliedAt: twoWeeksAgo,
        metadataJson: { originalInvoiceId: 'inv_old_001' },
      },
    }),
  ]);

  console.log(`✅ Created 2 credits\n`);

  // ===== USAGE RECORDS =====
  console.log('📊 Creating usage records...');
  const usageTimestamps = [
    new Date(now.getTime() - 24 * 60 * 60 * 1000), // 1 day ago
    new Date(now.getTime() - 12 * 60 * 60 * 1000), // 12 hours ago
    new Date(now.getTime() - 6 * 60 * 60 * 1000), // 6 hours ago
  ];

  for (const timestamp of usageTimestamps) {
    await prisma.usageRecord.create({
      data: {
        tenantId: acmeTenant.id,
        customerId: customers[2].id, // Bob on API Usage plan
        subscriptionId: subscriptions[2].id,
        planId: plans[3].id,
        quantity: Math.floor(Math.random() * 10000) + 1000, // 1000-11000 API calls
        unit: 'api_calls',
        timestamp,
        description: 'API usage for period',
      },
    });
  }

  console.log(`✅ Created ${usageTimestamps.length} usage records\n`);

  // ===== WEBHOOKS =====
  console.log('🔔 Creating webhook records...');
  await Promise.all([
    prisma.webhook.create({
      data: {
        tenantId: acmeTenant.id,
        provider: PaymentProvider.STRIPE,
        eventType: 'invoice.paid',
        status: WebhookStatus.SUCCEEDED,
        payload: {
          id: 'evt_001',
          type: 'invoice.paid',
          data: { object: { id: 'in_stripe_001' } },
        },
        signature: 'whsec_test_signature_001',
        attempts: 1,
        succeededAt: now,
      },
    }),
    prisma.webhook.create({
      data: {
        tenantId: acmeTenant.id,
        provider: PaymentProvider.STRIPE,
        eventType: 'customer.subscription.created',
        status: WebhookStatus.SUCCEEDED,
        payload: {
          id: 'evt_002',
          type: 'customer.subscription.created',
          data: { object: { id: 'sub_stripe_john_pro' } },
        },
        attempts: 1,
        succeededAt: now,
      },
    }),
  ]);

  console.log(`✅ Created 2 webhook records\n`);

  // ===== AUDIT LOGS =====
  console.log('📝 Creating audit logs...');
  await Promise.all([
    prisma.auditLog.create({
      data: {
        tenantId: acmeTenant.id,
        userId: 'admin_user_1',
        action: AuditAction.CREATE,
        entityType: 'subscription',
        entityId: subscriptions[0].id,
        changes: {
          status: 'ACTIVE',
          planId: plans[1].id,
        },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
      },
    }),
    prisma.auditLog.create({
      data: {
        tenantId: acmeTenant.id,
        userId: 'admin_user_1',
        action: AuditAction.UPDATE,
        entityType: 'customer',
        entityId: customers[0].id,
        changes: {
          before: { name: 'John' },
          after: { name: 'John Doe' },
        },
        ipAddress: '192.168.1.1',
      },
    }),
  ]);

  console.log(`✅ Created 2 audit logs\n`);

  // ===== PAYMENT EVENTS =====
  console.log('📬 Creating payment events...');
  await Promise.all([
    prisma.paymentEvent.create({
      data: {
        tenantId: acmeTenant.id,
        provider: PaymentProvider.STRIPE,
        type: 'INVOICE_PAID',
        payloadJson: {
          invoice_id: invoice1.id,
          amount: 3239,
        },
        processedAt: now,
      },
    }),
    prisma.paymentEvent.create({
      data: {
        tenantId: cocoonTenant.id,
        provider: PaymentProvider.STRIPE,
        type: 'SUBSCRIPTION_CREATED',
        payloadJson: {
          subscription_id: subscriptions[3].id,
          customer_id: customers[3].id,
        },
        processedAt: now,
      },
    }),
  ]);

  console.log(`✅ Created 2 payment events\n`);

  // ===== SUMMARY =====
  console.log('\n🎉 Phase 3 seed completed successfully!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 COMPREHENSIVE DATA SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const counts = {
    tenants: await prisma.tenant.count(),
    customers: await prisma.customer.count(),
    plans: await prisma.plan.count(),
    subscriptions: await prisma.subscription.count(),
    invoices: await prisma.invoice.count(),
    invoiceLineItems: await prisma.invoiceLineItem.count(),
    paymentMethods: await prisma.paymentMethod.count(),
    transactions: await prisma.transaction.count(),
    credits: await prisma.credit.count(),
    usageRecords: await prisma.usageRecord.count(),
    webhooks: await prisma.webhook.count(),
    auditLogs: await prisma.auditLog.count(),
    paymentEvents: await prisma.paymentEvent.count(),
  };

  console.log('Core Entities:');
  console.log(`  ✓ Tenants: ${counts.tenants}`);
  console.log(`  ✓ Customers: ${counts.customers}`);
  console.log(`  ✓ Plans: ${counts.plans}`);
  console.log(`  ✓ Subscriptions: ${counts.subscriptions}`);
  console.log('');
  console.log('Billing & Invoicing:');
  console.log(`  ✓ Invoices: ${counts.invoices}`);
  console.log(`  ✓ Invoice Line Items: ${counts.invoiceLineItems}`);
  console.log(`  ✓ Transactions: ${counts.transactions}`);
  console.log('');
  console.log('Payment & Usage:');
  console.log(`  ✓ Payment Methods: ${counts.paymentMethods}`);
  console.log(`  ✓ Credits: ${counts.credits}`);
  console.log(`  ✓ Usage Records: ${counts.usageRecords}`);
  console.log('');
  console.log('System & Audit:');
  console.log(`  ✓ Webhooks: ${counts.webhooks}`);
  console.log(`  ✓ Audit Logs: ${counts.auditLogs}`);
  console.log(`  ✓ Payment Events: ${counts.paymentEvents}`);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('💡 DEMO SCENARIOS AVAILABLE:\n');
  console.log('1. Subscription Management:');
  console.log(`   GET /tenants/${acmeTenant.id}/subscriptions`);
  console.log(`   GET /tenants/${cocoonTenant.id}/subscriptions\n`);

  console.log('2. Invoice Management:');
  console.log(`   GET /invoices?tenantId=${acmeTenant.id}`);
  console.log(`   GET /invoices/${invoice1.id}\n`);

  console.log('3. Usage-Based Billing:');
  console.log(`   Subscription: ${subscriptions[2].id} (API Usage Plan)`);
  console.log(`   View usage: GET /usage?subscriptionId=${subscriptions[2].id}\n`);

  console.log('4. Customer Portal:');
  console.log(`   Customer: ${customers[0].email} (${customers[0].id})`);
  console.log(`   View payment methods, invoices, credits\n`);

  console.log('5. Admin UI:');
  console.log(`   http://localhost:3001`);
  console.log(`   → View tenants, plans, subscriptions, invoices\n`);

  console.log('6. Metrics & Analytics:');
  console.log(`   Total MRR: $${(plans.slice(0, 5).reduce((sum, p) => sum + p.price, 0) / 100).toFixed(2)}`);
  console.log(`   Active Subscriptions: ${subscriptions.filter((s) => s.status === 'ACTIVE').length}`);
  console.log(`   Total Revenue: $${((3239 + 9999) / 100).toFixed(2)}\n`);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

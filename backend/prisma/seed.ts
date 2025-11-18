import { PrismaClient, PaymentProvider, BillingInterval, SubscriptionStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Clean up existing data
  await prisma.paymentEvent.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.tenant.deleteMany();

  console.log('✅ Cleaned up existing data');

  // Create tenants
  const acmeTenant = await prisma.tenant.create({
    data: {
      name: 'Acme Corporation',
    },
  });

  const cocoonTenant = await prisma.tenant.create({
    data: {
      name: 'Cocoon Mental Platform',
    },
  });

  console.log(`✅ Created tenants: ${acmeTenant.name}, ${cocoonTenant.name}`);

  // Create plans for Acme
  const acmeBasicPlan = await prisma.plan.create({
    data: {
      tenantId: acmeTenant.id,
      name: 'Basic Plan',
      description: 'Perfect for individuals and small teams',
      price: 999, // $9.99
      currency: 'usd',
      billingInterval: BillingInterval.MONTH,
      providerPlanIdsJson: {
        stripe: 'price_basic_monthly',
        paypal: 'plan_basic_monthly',
      },
      isActive: true,
    },
  });

  const acmeProPlan = await prisma.plan.create({
    data: {
      tenantId: acmeTenant.id,
      name: 'Pro Plan',
      description: 'For growing businesses',
      price: 2999, // $29.99
      currency: 'usd',
      billingInterval: BillingInterval.MONTH,
      providerPlanIdsJson: {
        stripe: 'price_pro_monthly',
        paypal: 'plan_pro_monthly',
      },
      isActive: true,
    },
  });

  const acmeAnnualPlan = await prisma.plan.create({
    data: {
      tenantId: acmeTenant.id,
      name: 'Annual Pro Plan',
      description: 'Save 20% with annual billing',
      price: 28800, // $288.00 (20% off $29.99 * 12)
      currency: 'usd',
      billingInterval: BillingInterval.YEAR,
      providerPlanIdsJson: {
        stripe: 'price_pro_yearly',
        paypal: 'plan_pro_yearly',
      },
      isActive: true,
    },
  });

  // Create plans for Cocoon
  const cocoonStarterPlan = await prisma.plan.create({
    data: {
      tenantId: cocoonTenant.id,
      name: 'Starter',
      description: 'Basic mental health support',
      price: 1499, // $14.99
      currency: 'usd',
      billingInterval: BillingInterval.MONTH,
      providerPlanIdsJson: {
        stripe: 'price_cocoon_starter',
        paypal: 'plan_cocoon_starter',
      },
      isActive: true,
    },
  });

  const cocoonPremiumPlan = await prisma.plan.create({
    data: {
      tenantId: cocoonTenant.id,
      name: 'Premium',
      description: 'Full access to therapists and resources',
      price: 4999, // $49.99
      currency: 'usd',
      billingInterval: BillingInterval.MONTH,
      providerPlanIdsJson: {
        stripe: 'price_cocoon_premium',
        paypal: 'plan_cocoon_premium',
      },
      isActive: true,
    },
  });

  console.log(`✅ Created ${5} plans`);

  // Create customers for Acme
  const customer1 = await prisma.customer.create({
    data: {
      tenantId: acmeTenant.id,
      email: 'john.doe@example.com',
      externalCustomerId: 'cus_stripe_john',
      provider: PaymentProvider.STRIPE,
      metadataJson: {
        name: 'John Doe',
        company: 'Tech Startup Inc',
      },
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      tenantId: acmeTenant.id,
      email: 'jane.smith@example.com',
      externalCustomerId: 'cus_stripe_jane',
      provider: PaymentProvider.STRIPE,
      metadataJson: {
        name: 'Jane Smith',
        company: 'Design Co',
      },
    },
  });

  const customer3 = await prisma.customer.create({
    data: {
      tenantId: acmeTenant.id,
      email: 'bob.wilson@example.com',
      externalCustomerId: 'payer_paypal_bob',
      provider: PaymentProvider.PAYPAL,
      metadataJson: {
        name: 'Bob Wilson',
        company: 'Marketing Agency',
      },
    },
  });

  // Create customers for Cocoon
  const customer4 = await prisma.customer.create({
    data: {
      tenantId: cocoonTenant.id,
      email: 'alice.brown@example.com',
      externalCustomerId: 'cus_stripe_alice',
      provider: PaymentProvider.STRIPE,
      metadataJson: {
        name: 'Alice Brown',
        age: 32,
      },
    },
  });

  const customer5 = await prisma.customer.create({
    data: {
      tenantId: cocoonTenant.id,
      email: 'charlie.green@example.com',
      externalCustomerId: 'cus_stripe_charlie',
      provider: PaymentProvider.STRIPE,
      metadataJson: {
        name: 'Charlie Green',
        age: 28,
      },
    },
  });

  console.log(`✅ Created ${5} customers`);

  // Create subscriptions
  const now = new Date();
  const nextMonth = new Date(now);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const nextYear = new Date(now);
  nextYear.setFullYear(nextYear.getFullYear() + 1);

  await prisma.subscription.create({
    data: {
      tenantId: acmeTenant.id,
      customerId: customer1.id,
      planId: acmeProPlan.id,
      provider: PaymentProvider.STRIPE,
      providerSubscriptionId: 'sub_stripe_john_pro',
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: now,
      currentPeriodEnd: nextMonth,
      metadataJson: {
        source: 'website',
        campaign: 'summer2024',
      },
    },
  });

  await prisma.subscription.create({
    data: {
      tenantId: acmeTenant.id,
      customerId: customer2.id,
      planId: acmeBasicPlan.id,
      provider: PaymentProvider.STRIPE,
      providerSubscriptionId: 'sub_stripe_jane_basic',
      status: SubscriptionStatus.TRIALING,
      currentPeriodStart: now,
      currentPeriodEnd: nextMonth,
      metadataJson: {
        source: 'referral',
        referrer: 'john.doe@example.com',
      },
    },
  });

  await prisma.subscription.create({
    data: {
      tenantId: acmeTenant.id,
      customerId: customer3.id,
      planId: acmeAnnualPlan.id,
      provider: PaymentProvider.PAYPAL,
      providerSubscriptionId: 'sub_paypal_bob_annual',
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: now,
      currentPeriodEnd: nextYear,
      metadataJson: {
        source: 'partner',
        partnerId: 'partner_123',
      },
    },
  });

  await prisma.subscription.create({
    data: {
      tenantId: cocoonTenant.id,
      customerId: customer4.id,
      planId: cocoonPremiumPlan.id,
      provider: PaymentProvider.STRIPE,
      providerSubscriptionId: 'sub_stripe_alice_premium',
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: now,
      currentPeriodEnd: nextMonth,
      metadataJson: {
        therapistId: 'therapist_456',
        sessionCount: 4,
      },
    },
  });

  await prisma.subscription.create({
    data: {
      tenantId: cocoonTenant.id,
      customerId: customer5.id,
      planId: cocoonStarterPlan.id,
      provider: PaymentProvider.STRIPE,
      providerSubscriptionId: 'sub_stripe_charlie_starter',
      status: SubscriptionStatus.TRIALING,
      currentPeriodStart: now,
      currentPeriodEnd: nextMonth,
      metadataJson: {
        trialDaysRemaining: 14,
      },
    },
  });

  console.log(`✅ Created ${5} subscriptions`);

  // Create some payment events
  await prisma.paymentEvent.create({
    data: {
      tenantId: acmeTenant.id,
      provider: PaymentProvider.STRIPE,
      type: 'SUBSCRIPTION_CREATED',
      payloadJson: {
        id: 'evt_1',
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_stripe_john_pro',
            customer: 'cus_stripe_john',
          },
        },
      },
      processedAt: now,
    },
  });

  await prisma.paymentEvent.create({
    data: {
      tenantId: acmeTenant.id,
      provider: PaymentProvider.STRIPE,
      type: 'INVOICE_PAID',
      payloadJson: {
        id: 'evt_2',
        type: 'invoice.paid',
        data: {
          object: {
            id: 'in_1',
            subscription: 'sub_stripe_john_pro',
            amount_paid: 2999,
          },
        },
      },
      processedAt: now,
    },
  });

  console.log(`✅ Created ${2} payment events`);

  console.log('\n🎉 Seed completed successfully!\n');
  console.log('📊 Summary:');
  console.log(`   - Tenants: 2`);
  console.log(`   - Plans: 5`);
  console.log(`   - Customers: 5`);
  console.log(`   - Subscriptions: 5`);
  console.log(`   - Payment Events: 2`);
  console.log('\n💡 Try accessing:');
  console.log(`   - GET http://localhost:3000/tenants`);
  console.log(`   - GET http://localhost:3000/plans`);
  console.log(`   - GET http://localhost:3000/tenants/${acmeTenant.id}/subscriptions`);
  console.log(`   - Admin UI: http://localhost:3001\n`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

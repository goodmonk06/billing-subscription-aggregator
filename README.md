# Billing & Subscription Aggregator

A unified billing and subscription management backend that abstracts multiple payment providers (Stripe, PayPal, and future Japanese gateways) behind a clean, consistent API.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Your Application                             │
│                 (e.g., cocoon-mental-platform)                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ HTTP/REST API
                         │
┌────────────────────────▼────────────────────────────────────────┐
│              Billing Subscription Aggregator                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Internal API Layer                     │   │
│  │  • POST /tenants/:id/customers                           │   │
│  │  • POST /tenants/:id/subscriptions                       │   │
│  │  • GET  /tenants/:id/subscriptions                       │   │
│  │  • DELETE /tenants/:id/subscriptions/:subscriptionId     │   │
│  └──────────────────────┬───────────────────────────────────┘   │
│                         │                                         │
│  ┌──────────────────────▼───────────────────────────────────┐   │
│  │              Payment Provider Abstraction                 │   │
│  │    (Interface: createCustomer, createSubscription,       │   │
│  │     cancelSubscription, syncSubscriptionFromWebhook)     │   │
│  └─────────┬─────────────────────────────────┬──────────────┘   │
│            │                                 │                   │
│  ┌─────────▼──────────┐          ┌──────────▼──────────┐       │
│  │  Stripe Provider   │          │  PayPal Provider    │       │
│  │  (Fully impl.)     │          │  (Stub/TODO)        │       │
│  └─────────┬──────────┘          └──────────┬──────────┘       │
│            │                                 │                   │
│  ┌─────────▼─────────────────────────────────▼──────────────┐   │
│  │              Database (PostgreSQL + Prisma)              │   │
│  │  Models: Tenant, Customer, Plan, Subscription,          │   │
│  │          PaymentEvent                                    │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────┬───────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
┌─────────▼─────┐  ┌──────▼──────┐  ┌────▼──────┐
│  Stripe API   │  │ PayPal API  │  │ Future... │
└───────────────┘  └─────────────┘  └───────────┘
```

## 🚀 Features

- ✅ **Multi-tenant architecture** - Isolate billing data per tenant
- ✅ **Payment provider abstraction** - Unified interface for all payment providers
- ✅ **Stripe integration** - Fully implemented with test mode support
- ✅ **PayPal stub** - Clear interface with TODO markers for implementation
- ✅ **Webhook handling** - Automatic subscription sync from provider webhooks
- ✅ **Admin dashboard** - Next.js UI for managing tenants, plans, and subscriptions
- ✅ **Type-safe** - Full TypeScript support with Prisma
- ✅ **Event logging** - Track all payment events in the database

## 📦 Tech Stack

### Backend
- **Framework**: NestJS + TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Payment Providers**: Stripe SDK (+ PayPal stub)
- **Validation**: class-validator

### Admin UI
- **Framework**: Next.js 15 (App Router)
- **Styling**: TailwindCSS
- **Type Safety**: TypeScript

## 🗄️ Database Schema

```prisma
model Tenant {
  id            String         @id @default(cuid())
  name          String
  apiKey        String         @unique
  customers     Customer[]
  plans         Plan[]
  subscriptions Subscription[]
  paymentEvents PaymentEvent[]
}

model Customer {
  id                 String          @id @default(cuid())
  tenantId           String
  externalCustomerId String          // Stripe/PayPal customer ID
  provider           PaymentProvider // STRIPE | PAYPAL
  email              String
  metadataJson       Json?
  subscriptions      Subscription[]
}

model Plan {
  id                 String          @id @default(cuid())
  tenantId           String
  name               String
  price              Int             // cents
  currency           String
  billingInterval    BillingInterval // MONTH | YEAR
  providerPlanIdsJson Json           // { "stripe": "price_xxx", "paypal": "plan_xxx" }
  subscriptions      Subscription[]
}

model Subscription {
  id                     String             @id @default(cuid())
  tenantId               String
  customerId             String
  planId                 String
  status                 SubscriptionStatus
  currentPeriodStart     DateTime
  currentPeriodEnd       DateTime
  cancelAt               DateTime?
  providerSubscriptionId String
  provider               PaymentProvider
}

model PaymentEvent {
  id          String           @id @default(cuid())
  tenantId    String
  provider    PaymentProvider
  type        PaymentEventType
  payloadJson Json             // Full webhook payload
  processedAt DateTime?
}
```

## 🔧 Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database
- Stripe test account (for full functionality)

### Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Copy `.env.example` to `.env` and update:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/billing_aggregator"
   STRIPE_SECRET_KEY="sk_test_your_stripe_secret_key"
   STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret"
   PORT=3000
   NODE_ENV=development
   ```

4. **Setup database**:
   ```bash
   # Generate Prisma client
   npx prisma generate

   # Run migrations
   npx prisma migrate dev --name init

   # (Optional) Seed with sample data
   npx prisma db seed
   ```

5. **Start the backend**:
   ```bash
   npm run start:dev
   ```
   Backend will run on `http://localhost:3000`

### Admin UI Setup

1. **Navigate to admin UI directory**:
   ```bash
   cd admin-ui
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment** (optional):
   Create `.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3000
   ```

4. **Start the dev server**:
   ```bash
   npm run dev
   ```
   Admin UI will run on `http://localhost:3001`

## 📚 API Reference

### Admin Endpoints

#### Tenants
- `GET /tenants` - List all tenants
- `POST /tenants` - Create a new tenant
- `GET /tenants/:id` - Get tenant details
- `PATCH /tenants/:id` - Update tenant
- `DELETE /tenants/:id` - Delete tenant

#### Plans
- `GET /plans?tenantId=xxx` - List plans (optionally filtered by tenant)
- `POST /plans` - Create a new plan
- `GET /plans/:id` - Get plan details
- `PATCH /plans/:id` - Update plan
- `DELETE /plans/:id` - Delete plan

### Tenant-Level API (For Client Applications)

#### Create Customer
```http
POST /tenants/:tenantId/customers
Content-Type: application/json

{
  "email": "customer@example.com",
  "name": "John Doe",
  "provider": "STRIPE",
  "metadata": { "userId": "user_123" }
}
```

#### Create Subscription
```http
POST /tenants/:tenantId/subscriptions
Content-Type: application/json

{
  "customerId": "cuid_customer_id",
  "planId": "cuid_plan_id",
  "trialPeriodDays": 14,
  "metadata": { "source": "webapp" }
}
```

#### Get Subscriptions
```http
GET /tenants/:tenantId/subscriptions?status=ACTIVE&customerId=xxx
```

#### Cancel Subscription
```http
DELETE /tenants/:tenantId/subscriptions/:subscriptionId
Content-Type: application/json

{
  "cancelImmediately": false
}
```

### Webhooks

#### Stripe Webhook
```http
POST /webhook/stripe
Stripe-Signature: t=xxx,v1=xxx

{
  "type": "customer.subscription.updated",
  "data": { ... }
}
```

#### PayPal Webhook (stub)
```http
POST /webhook/paypal
PAYPAL-TRANSMISSION-SIG: xxx

{
  "event_type": "BILLING.SUBSCRIPTION.UPDATED",
  "resource": { ... }
}
```

## 🔌 Integration Example

Here's how another service (e.g., `cocoon-mental-platform`) would integrate:

```typescript
// In your application
class BillingService {
  private readonly baseUrl = 'http://billing-aggregator:3000';
  private readonly tenantId = 'your_tenant_id';

  async createCustomerSubscription(userEmail: string, planId: string) {
    // 1. Create customer
    const customer = await fetch(
      `${this.baseUrl}/tenants/${this.tenantId}/customers`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          provider: 'STRIPE',
        }),
      }
    ).then(r => r.json());

    // 2. Create subscription
    const subscription = await fetch(
      `${this.baseUrl}/tenants/${this.tenantId}/subscriptions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customer.id,
          planId: planId,
        }),
      }
    ).then(r => r.json());

    return subscription;
  }

  async cancelSubscription(subscriptionId: string) {
    return await fetch(
      `${this.baseUrl}/tenants/${this.tenantId}/subscriptions/${subscriptionId}`,
      { method: 'DELETE' }
    ).then(r => r.json());
  }

  async getActiveSubscriptions() {
    return await fetch(
      `${this.baseUrl}/tenants/${this.tenantId}/subscriptions?status=ACTIVE`
    ).then(r => r.json());
  }
}
```

## 🔐 Stripe Setup

1. Get your test API keys from https://dashboard.stripe.com/test/apikeys
2. Create products and prices in Stripe Dashboard
3. Setup webhook endpoint:
   - URL: `https://your-domain.com/webhook/stripe`
   - Events to listen for:
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.paid`
     - `invoice.payment_failed`

## 🚧 PayPal Implementation (TODO)

The PayPal provider is currently a stub. To implement:

1. Install PayPal SDK: `npm install @paypal/checkout-server-sdk`
2. Implement methods in `backend/src/payments/providers/paypal.provider.ts`
3. Key methods to implement:
   - `createCustomer()` - Note: PayPal uses email instead of customer objects
   - `createSubscription()` - Use PayPal Billing Plans API
   - `cancelSubscription()` - Cancel subscription via API
   - `verifyWebhookSignature()` - Implement PayPal webhook verification
   - `syncSubscriptionFromWebhook()` - Handle PayPal webhook events

## 📊 Admin Dashboard

Access the admin dashboard at `http://localhost:3001`:

- **Home** - Overview and quick links
- **Tenants** - View all tenants with stats
- **Plans** - View plans per tenant
- **Subscriptions** - Monitor active subscriptions

## 🧪 Testing

```bash
# Backend tests
cd backend
npm run test

# E2E tests
npm run test:e2e
```

## 📝 Future Enhancements

- [ ] Complete PayPal integration
- [ ] Add Japanese payment gateways (GMO, PAY.JP, etc.)
- [ ] Implement customer portal
- [ ] Add usage-based billing
- [ ] Multi-currency support
- [ ] Dunning management
- [ ] Analytics dashboard
- [ ] Export/reporting features

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write tests
5. Submit a pull request

## 📄 License

MIT

## 🆘 Support

For issues or questions, please create an issue in the GitHub repository.

# Billing & Subscription Aggregator

A unified billing and subscription management backend that abstracts multiple payment providers (Stripe, PayPal, and future Japanese gateways) behind a clean, consistent API.

## Overview

This system provides a multi-tenant billing aggregation layer that:
- Unifies subscription management across multiple payment providers
- Provides a consistent API for creating customers, plans, and subscriptions
- Handles webhook events and keeps subscription state synchronized
- Offers an admin dashboard for monitoring and management

**Use Case**: Integrate billing into your application without directly coupling to payment provider SDKs. Ideal for SaaS platforms, mental health apps, e-commerce systems, or any service requiring subscription management.

## Tech Stack

### Backend
- **Framework**: NestJS + TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Payment Providers**: Stripe SDK (fully implemented) + PayPal (stub)
- **Validation**: class-validator with global validation pipe
- **Error Handling**: Centralized exception filter
- **Testing**: Jest with realistic test coverage

### Admin UI
- **Framework**: Next.js 15 (App Router)
- **Styling**: TailwindCSS
- **Type Safety**: Full TypeScript support

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Development**: Hot-reload for both backend and frontend
- **Database**: PostgreSQL 16

## Domain Model Summary

### Core Entities

```
Tenant (Multi-tenant isolation)
├── Plan (Billing plans with provider mappings)
├── Customer (End users with provider IDs)
├── Subscription (Active subscriptions)
└── PaymentEvent (Webhook event log)
```

### Key Relationships
- **Tenant** → Many Plans, Customers, Subscriptions
- **Customer** → Many Subscriptions (one per plan)
- **Plan** → Many Subscriptions
- **Subscription** → References Customer, Plan, and Provider

### Provider Abstraction
- **IPaymentProvider** interface defines: createCustomer, createSubscription, cancelSubscription, syncSubscriptionFromWebhook
- **StripeProvider**: Fully implemented
- **PayPalProvider**: Stub with clear TODOs

## Getting Started

### Requirements

- **Node.js** 20+ and npm
- **Docker** and Docker Compose
- **Stripe Test Account** (for full functionality)

### Quick Start (Docker)

1. **Clone and setup environment**:
   ```bash
   git clone <repository-url>
   cd billing-subscription-aggregator

   # Copy environment files
   cp backend/.env.example backend/.env
   cp admin-ui/.env.example admin-ui/.env
   ```

2. **Configure backend environment**:
   Edit `backend/.env` with your Stripe test keys:
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/billing_aggregator?schema=public"
   STRIPE_SECRET_KEY="sk_test_your_stripe_secret_key"
   STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret"
   ```

3. **Start with Docker Compose**:
   ```bash
   # Start PostgreSQL database
   docker compose -f docker-compose.dev.yml up -d

   # Or start everything (requires building images first)
   npm run docker:build
   npm run docker:up
   ```

4. **Setup database**:
   ```bash
   cd backend
   npm install
   npm run db:generate
   npm run db:migrate
   npm run db:seed
   ```

5. **Start development servers**:
   ```bash
   # In terminal 1 - Backend
   cd backend
   npm run dev

   # In terminal 2 - Admin UI
   cd admin-ui
   npm run dev
   ```

6. **Access the application**:
   - Backend API: http://localhost:3000
   - Admin Dashboard: http://localhost:3001
   - Prisma Studio: `npm run db:studio` (from backend/)

### Alternative Setup (Local Development without Docker)

1. **Install PostgreSQL locally** or use a cloud provider

2. **Update DATABASE_URL** in `backend/.env` to your PostgreSQL connection string

3. **Run setup from project root**:
   ```bash
   npm run setup        # Installs all dependencies
   npm run db:migrate   # Runs database migrations
   npm run db:seed      # Seeds demo data
   ```

4. **Start development**:
   ```bash
   npm run dev          # Starts backend in watch mode
   # In another terminal:
   npm run dev:admin    # Starts admin UI
   ```

## Example Flow: Complete Vertical Slice

This implementation includes a working end-to-end flow for the subscription lifecycle:

### 1. Create a Tenant
```bash
curl -X POST http://localhost:3000/tenants \
  -H "Content-Type: application/json" \
  -d '{"name": "Acme Corp"}'
```

Response:
```json
{
  "id": "clxxx...",
  "name": "Acme Corp",
  "apiKey": "clyyyy...",
  "createdAt": "2025-11-18T...",
  "updatedAt": "2025-11-18T..."
}
```

### 2. Create a Plan
```bash
curl -X POST http://localhost:3000/plans \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "clxxx...",
    "name": "Pro Plan",
    "price": 2999,
    "currency": "usd",
    "billingInterval": "MONTH",
    "providerPlanIdsJson": {
      "stripe": "price_xxx",
      "paypal": "plan_xxx"
    },
    "description": "Professional tier"
  }'
```

### 3. Create a Customer
```bash
curl -X POST http://localhost:3000/tenants/clxxx.../customers \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "name": "John Doe",
    "provider": "STRIPE"
  }'
```

### 4. Create a Subscription
```bash
curl -X POST http://localhost:3000/tenants/clxxx.../subscriptions \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer-id",
    "planId": "plan-id",
    "trialPeriodDays": 14
  }'
```

### 5. View Subscriptions
```bash
curl http://localhost:3000/tenants/clxxx.../subscriptions
```

### 6. Cancel a Subscription
```bash
curl -X DELETE http://localhost:3000/tenants/clxxx.../subscriptions/sub-id \
  -H "Content-Type: application/json" \
  -d '{"cancelImmediately": false}'
```

### Using the Admin UI

1. Navigate to http://localhost:3001
2. Click "Tenants" to see all tenants
3. Select a tenant to view their plans and subscriptions
4. Real-time data synced from the API

### Demo Credentials

After running `npm run db:seed`, you'll have:
- **2 Tenants**: Acme Corporation, Cocoon Mental Platform
- **5 Plans**: Various pricing tiers
- **5 Customers**: Sample users with Stripe/PayPal IDs
- **5 Subscriptions**: Mix of ACTIVE, TRIALING statuses

Access demo data:
```bash
# View all tenants
curl http://localhost:3000/tenants

# View Acme Corp subscriptions (use tenant ID from above)
curl http://localhost:3000/tenants/{tenant-id}/subscriptions
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Your Application                             │
│                 (e.g., cocoon-mental-platform)                   │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP/REST API
                         ▼
┌────────────────────────────────────────────────────────────────┐
│              Billing Subscription Aggregator                    │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  NestJS API Layer                                        │  │
│  │  • Global validation & error handling                    │  │
│  │  • Tenant/Plan/Customer/Subscription endpoints           │  │
│  │  • Webhook handlers (Stripe, PayPal)                     │  │
│  └────────────────────┬─────────────────────────────────────┘  │
│                       ▼                                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Payment Provider Abstraction (IPaymentProvider)         │  │
│  │  ├─ StripeProvider (✅ Fully implemented)                │  │
│  │  └─ PayPalProvider (🚧 Stub with TODOs)                  │  │
│  └────────────────────┬─────────────────────────────────────┘  │
│                       ▼                                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Prisma + PostgreSQL                                     │  │
│  │  • Tenant, Customer, Plan, Subscription, PaymentEvent    │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────┬───────────────────────────────────────┘
                          ▼
              ┌───────────┴───────────┐
              ▼                       ▼
        Stripe API              PayPal API
```

## Available Scripts

### Root Level
```bash
npm run dev              # Start backend in dev mode
npm run dev:backend      # Start backend only
npm run dev:admin        # Start admin UI only
npm run build            # Build both backend and admin
npm run test             # Run backend tests
npm run lint             # Lint all code

# Database
npm run db:generate      # Generate Prisma client
npm run db:migrate       # Run migrations
npm run db:seed          # Seed database
npm run db:studio        # Open Prisma Studio
npm run db:reset         # Reset database

# Docker
npm run docker:up        # Start all services
npm run docker:down      # Stop all services
npm run docker:build     # Build images
npm run docker:logs      # View logs
npm run docker:db        # Start PostgreSQL only
```

### Backend (`cd backend`)
```bash
npm run dev              # Start with hot reload
npm run build            # Build for production
npm run start            # Start production server
npm run test             # Run unit tests
npm run test:e2e         # Run e2e tests
npm run test:cov         # Coverage report
npm run lint             # Lint and fix
```

### Admin UI (`cd admin-ui`)
```bash
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Lint code
```

## Testing

Run the test suite:
```bash
cd backend
npm test
```

Tests cover:
- **TenantsService**: CRUD operations, validation, error handling
- **PaymentsService**: Customer creation, subscription lifecycle
- **Domain Logic**: Status mapping, provider abstraction

Coverage report:
```bash
npm run test:cov
```

## Integration Guide

### For Client Applications

Example: Integrating from `cocoon-mental-platform`:

```typescript
// services/billing.service.ts
class BillingService {
  private readonly baseUrl = process.env.BILLING_API_URL;
  private readonly tenantId = process.env.BILLING_TENANT_ID;

  async createUserSubscription(userId: string, email: string, planId: string) {
    // 1. Create customer
    const customer = await fetch(
      `${this.baseUrl}/tenants/${this.tenantId}/customers`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          provider: 'STRIPE',
          metadata: { userId }
        })
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
          planId,
          trialPeriodDays: 14
        })
      }
    ).then(r => r.json());

    return { customer, subscription };
  }

  async cancelUserSubscription(subscriptionId: string) {
    return await fetch(
      `${this.baseUrl}/tenants/${this.tenantId}/subscriptions/${subscriptionId}`,
      { method: 'DELETE' }
    ).then(r => r.json());
  }

  async getUserSubscriptions() {
    return await fetch(
      `${this.baseUrl}/tenants/${this.tenantId}/subscriptions?status=ACTIVE`
    ).then(r => r.json());
  }
}
```

### Environment Variables

**Backend** (`backend/.env`):
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/billing_aggregator?schema=public
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3001
```

**Admin UI** (`admin-ui/.env`):
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Stripe Setup

1. Get test API keys from https://dashboard.stripe.com/test/apikeys
2. Create products and prices in Stripe Dashboard
3. Setup webhook endpoint:
   - URL: `https://your-domain.com/webhook/stripe`
   - Events: `customer.subscription.*`, `invoice.paid`, `invoice.payment_failed`
4. Copy webhook secret to `STRIPE_WEBHOOK_SECRET`

## Future Extensions

- [ ] **Complete PayPal Integration**: Implement all PayPal provider methods
- [ ] **Japanese Payment Gateways**: Add GMO Payment, PAY.JP, etc.
- [ ] **Customer Portal**: Self-service subscription management
- [ ] **Usage-Based Billing**: Track and bill by usage metrics
- [ ] **Multi-Currency**: Support multiple currencies per tenant
- [ ] **Dunning Management**: Automatic retry logic for failed payments
- [ ] **Analytics Dashboard**: Revenue metrics, churn analysis
- [ ] **Webhook Retry Logic**: Exponential backoff for failed webhooks
- [ ] **Audit Logs**: Track all API operations for compliance
- [ ] **Rate Limiting**: Protect API endpoints
- [ ] **API Documentation**: Swagger/OpenAPI integration
- [ ] **E2E Tests**: Playwright for admin UI testing

## Troubleshooting

### Database Connection Issues
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Restart database
npm run docker:down
npm run docker:db
```

### Migration Errors
```bash
# Reset and re-run migrations
npm run db:reset
npm run db:seed
```

### Port Already in Use
```bash
# Find process using port 3000
lsof -ti:3000 | xargs kill -9

# Or change PORT in .env
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Write tests for your changes
4. Ensure tests pass: `npm test`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## License

MIT

## Support

For issues or questions:
- Create an issue in the GitHub repository
- Check existing issues for solutions
- Review the troubleshooting section above

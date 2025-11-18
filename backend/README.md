# Billing Aggregator Backend

NestJS backend for the billing subscription aggregator.

## Quick Start

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your database and Stripe credentials

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Start development server
npm run start:dev
```

## API Documentation

Server runs on `http://localhost:3000`

See main README.md for complete API documentation.

## Project Structure

```
src/
├── main.ts                 # Application entry point
├── app.module.ts          # Root module
├── prisma.service.ts      # Prisma database service
├── payments/              # Payment provider abstraction
│   ├── interfaces/        # TypeScript interfaces
│   ├── providers/         # Stripe, PayPal implementations
│   └── payments.service.ts
├── webhooks/              # Webhook handlers
│   ├── webhooks.controller.ts
│   └── webhooks.service.ts
├── tenants/               # Tenant management
│   ├── tenants.controller.ts
│   ├── tenants.service.ts
│   └── tenants-subscriptions.controller.ts
└── plans/                 # Plan management
    ├── plans.controller.ts
    └── plans.service.ts
```

## Development

```bash
# Run in development mode
npm run start:dev

# Run tests
npm run test

# Run e2e tests
npm run test:e2e

# Lint
npm run lint

# Format
npm run format
```

## Database Management

```bash
# Create a migration
npx prisma migrate dev --name migration_name

# Reset database
npx prisma migrate reset

# View database in Prisma Studio
npx prisma studio
```

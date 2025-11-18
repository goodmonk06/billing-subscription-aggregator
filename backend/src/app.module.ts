import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PaymentsModule } from './payments/payments.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { TenantsModule } from './tenants/tenants.module';
import { PlansModule } from './plans/plans.module';
import { InvoicesModule } from './invoices/invoices.module';
import { PaymentMethodsModule } from './payment-methods/payment-methods.module';
import { TransactionsModule } from './transactions/transactions.module';
import { UsageModule } from './usage/usage.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PaymentsModule,
    WebhooksModule,
    TenantsModule,
    PlansModule,
    InvoicesModule,
    PaymentMethodsModule,
    TransactionsModule,
    UsageModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

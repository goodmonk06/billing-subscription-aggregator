import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentsService } from './payments.service';
import { PaymentProviderFactory } from './providers/provider.factory';
import { PrismaService } from '../prisma.service';

@Module({
  imports: [ConfigModule],
  providers: [PaymentsService, PaymentProviderFactory, PrismaService],
  exports: [PaymentsService, PaymentProviderFactory],
})
export class PaymentsModule {}

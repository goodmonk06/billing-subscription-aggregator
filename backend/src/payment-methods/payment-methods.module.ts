import { Module } from '@nestjs/common';
import { PaymentMethodsService } from './payment-methods.service';
import { PaymentMethodsController } from './payment-methods.controller';
import { PrismaService } from '../prisma.service';
import { DomainEventEmitter } from '../lib/events/event-emitter';

@Module({
  controllers: [PaymentMethodsController],
  providers: [PaymentMethodsService, PrismaService, DomainEventEmitter],
  exports: [PaymentMethodsService],
})
export class PaymentMethodsModule {}

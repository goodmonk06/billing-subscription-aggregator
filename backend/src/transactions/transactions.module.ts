import { Module } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { PrismaService } from '../prisma.service';
import { DomainEventEmitter } from '../lib/events/event-emitter';

@Module({
  controllers: [TransactionsController],
  providers: [TransactionsService, PrismaService, DomainEventEmitter],
  exports: [TransactionsService],
})
export class TransactionsModule {}

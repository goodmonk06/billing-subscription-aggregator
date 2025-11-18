import { Module } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { PrismaService } from '../prisma.service';
import { DomainEventEmitter } from '../lib/events/event-emitter';

@Module({
  controllers: [InvoicesController],
  providers: [InvoicesService, PrismaService, DomainEventEmitter],
  exports: [InvoicesService],
})
export class InvoicesModule {}

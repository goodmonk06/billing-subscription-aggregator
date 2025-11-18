import { Module } from '@nestjs/common';
import { UsageService } from './usage.service';
import { UsageController } from './usage.controller';
import { PrismaService } from '../prisma.service';
import { DomainEventEmitter } from '../lib/events/event-emitter';

@Module({
  controllers: [UsageController],
  providers: [UsageService, PrismaService, DomainEventEmitter],
  exports: [UsageService],
})
export class UsageModule {}

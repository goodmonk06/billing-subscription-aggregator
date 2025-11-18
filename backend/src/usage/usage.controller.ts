import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Headers,
} from '@nestjs/common';
import { UsageService, RecordUsageDto } from './usage.service';

@Controller('usage')
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  /**
   * POST /usage
   * Record usage for a subscription
   */
  @Post()
  async recordUsage(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: RecordUsageDto,
  ) {
    return this.usageService.recordUsage(tenantId, dto);
  }

  /**
   * GET /usage/subscription/:subscriptionId
   * Get usage records for a subscription
   */
  @Get('subscription/:subscriptionId')
  async findBySubscription(
    @Param('subscriptionId') subscriptionId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.usageService.findBySubscription(
      subscriptionId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  /**
   * GET /usage/subscription/:subscriptionId/aggregate
   * Get aggregated usage for a subscription
   */
  @Get('subscription/:subscriptionId/aggregate')
  async getAggregatedUsage(
    @Param('subscriptionId') subscriptionId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    if (!startDate || !endDate) {
      // Default to current month
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      return this.usageService.getAggregatedUsage(
        subscriptionId,
        start,
        end,
      );
    }

    return this.usageService.getAggregatedUsage(
      subscriptionId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  /**
   * GET /usage/customer/:customerId
   * Get usage records for a customer
   */
  @Get('customer/:customerId')
  async findByCustomer(
    @Param('customerId') customerId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.usageService.findByCustomer(
      customerId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }
}

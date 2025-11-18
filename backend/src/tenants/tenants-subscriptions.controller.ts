import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import { PaymentsService } from '../payments/payments.service';
import { PaymentProvider, SubscriptionStatus } from '@prisma/client';
import { IsString, IsNotEmpty, IsEnum, IsOptional, IsObject } from 'class-validator';

// DTOs for tenant-level operations
class CreateCustomerDto {
  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(PaymentProvider)
  provider: PaymentProvider;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

class CreateSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @IsString()
  @IsNotEmpty()
  planId: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @IsOptional()
  trialPeriodDays?: number;
}

class CancelSubscriptionDto {
  @IsOptional()
  cancelImmediately?: boolean = false;
}

/**
 * Tenant-level API endpoints for managing customers and subscriptions
 * These are the main endpoints that other services will call
 */
@Controller('tenants/:tenantId')
export class TenantsSubscriptionsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * POST /tenants/:tenantId/customers
   * Create a customer for a tenant
   */
  @Post('customers')
  async createCustomer(
    @Param('tenantId') tenantId: string,
    @Body(ValidationPipe) createCustomerDto: CreateCustomerDto,
  ) {
    return await this.paymentsService.createCustomer(
      tenantId,
      createCustomerDto.provider,
      {
        email: createCustomerDto.email,
        name: createCustomerDto.name,
        metadata: createCustomerDto.metadata,
      },
    );
  }

  /**
   * POST /tenants/:tenantId/subscriptions
   * Create a subscription for a customer
   */
  @Post('subscriptions')
  async createSubscription(
    @Param('tenantId') tenantId: string,
    @Body(ValidationPipe) createSubscriptionDto: CreateSubscriptionDto,
  ) {
    return await this.paymentsService.createSubscription(
      tenantId,
      createSubscriptionDto.customerId,
      createSubscriptionDto.planId,
      {
        metadata: createSubscriptionDto.metadata,
        trialPeriodDays: createSubscriptionDto.trialPeriodDays,
      },
    );
  }

  /**
   * GET /tenants/:tenantId/subscriptions
   * Get all subscriptions for a tenant
   */
  @Get('subscriptions')
  async getSubscriptions(
    @Param('tenantId') tenantId: string,
    @Query('customerId') customerId?: string,
    @Query('planId') planId?: string,
    @Query('status') status?: SubscriptionStatus,
  ) {
    return await this.paymentsService.getSubscriptions(tenantId, {
      customerId,
      planId,
      status,
    });
  }

  /**
   * GET /tenants/:tenantId/subscriptions/:id
   * Get a specific subscription
   */
  @Get('subscriptions/:id')
  async getSubscription(@Param('id') id: string) {
    return await this.paymentsService.getSubscription(id);
  }

  /**
   * DELETE /tenants/:tenantId/subscriptions/:id
   * Cancel a subscription
   */
  @Delete('subscriptions/:id')
  async cancelSubscription(
    @Param('id') id: string,
    @Body(ValidationPipe) cancelDto: CancelSubscriptionDto,
  ) {
    return await this.paymentsService.cancelSubscription(id, cancelDto.cancelImmediately);
  }
}

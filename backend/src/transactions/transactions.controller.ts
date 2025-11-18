import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TransactionsService, CreateTransactionDto } from './transactions.service';
import { TransactionType, TransactionStatus } from '@prisma/client';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  /**
   * POST /transactions
   * Create a new transaction
   */
  @Post()
  async create(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreateTransactionDto,
  ) {
    return this.transactionsService.create(tenantId, dto);
  }

  /**
   * GET /transactions
   * List all transactions for a tenant with optional filters
   */
  @Get()
  async findAll(
    @Headers('x-tenant-id') tenantId: string,
    @Query('customerId') customerId?: string,
    @Query('type') type?: TransactionType,
    @Query('status') status?: TransactionStatus,
  ) {
    return this.transactionsService.findAll(tenantId, {
      customerId,
      type,
      status,
    });
  }

  /**
   * GET /transactions/customer/:customerId
   * Get all transactions for a customer
   */
  @Get('customer/:customerId')
  async findByCustomer(@Param('customerId') customerId: string) {
    return this.transactionsService.findByCustomer(customerId);
  }

  /**
   * GET /transactions/revenue
   * Get revenue for a tenant
   */
  @Get('revenue')
  async getRevenue(
    @Headers('x-tenant-id') tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.transactionsService.getRevenue(
      tenantId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  /**
   * GET /transactions/:id
   * Get a specific transaction
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.transactionsService.findOne(id);
  }

  /**
   * POST /transactions/:id/succeed
   * Mark transaction as succeeded
   */
  @Post(':id/succeed')
  @HttpCode(HttpStatus.OK)
  async markAsSucceeded(
    @Param('id') id: string,
    @Body('providerTransactionId') providerTransactionId?: string,
  ) {
    return this.transactionsService.markAsSucceeded(id, providerTransactionId);
  }

  /**
   * POST /transactions/:id/fail
   * Mark transaction as failed
   */
  @Post(':id/fail')
  @HttpCode(HttpStatus.OK)
  async markAsFailed(
    @Param('id') id: string,
    @Body('failureMessage') failureMessage?: string,
  ) {
    return this.transactionsService.markAsFailed(id, failureMessage);
  }
}

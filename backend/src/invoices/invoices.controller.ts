import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Headers,
} from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { QueryInvoicesDto } from './dto/query-invoices.dto';

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  /**
   * POST /invoices
   * Create a new invoice
   */
  @Post()
  async create(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreateInvoiceDto,
  ) {
    return this.invoicesService.create(tenantId, dto);
  }

  /**
   * GET /invoices
   * List all invoices for a tenant with optional filters
   */
  @Get()
  async findAll(
    @Headers('x-tenant-id') tenantId: string,
    @Query() query: QueryInvoicesDto,
  ) {
    return this.invoicesService.findAll(tenantId, query);
  }

  /**
   * GET /invoices/:id
   * Get a specific invoice by ID
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.invoicesService.findOne(id);
  }

  /**
   * POST /invoices/:id/pay
   * Mark an invoice as paid
   */
  @Post(':id/pay')
  @HttpCode(HttpStatus.OK)
  async markAsPaid(@Param('id') id: string) {
    return this.invoicesService.markAsPaid(id);
  }

  /**
   * POST /invoices/:id/void
   * Void an invoice
   */
  @Post(':id/void')
  @HttpCode(HttpStatus.OK)
  async void(@Param('id') id: string) {
    return this.invoicesService.void(id);
  }
}

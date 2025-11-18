import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PaymentMethodsService } from './payment-methods.service';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';

@Controller('payment-methods')
export class PaymentMethodsController {
  constructor(private readonly paymentMethodsService: PaymentMethodsService) {}

  /**
   * POST /payment-methods
   * Add a payment method to a customer
   */
  @Post()
  async create(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreatePaymentMethodDto,
  ) {
    return this.paymentMethodsService.create(tenantId, dto);
  }

  /**
   * GET /payment-methods/customer/:customerId
   * Get all payment methods for a customer
   */
  @Get('customer/:customerId')
  async findByCustomer(@Param('customerId') customerId: string) {
    return this.paymentMethodsService.findByCustomer(customerId);
  }

  /**
   * GET /payment-methods/expiring
   * Get payment methods expiring soon
   */
  @Get('expiring')
  async findExpiring() {
    return this.paymentMethodsService.findExpiring();
  }

  /**
   * GET /payment-methods/:id
   * Get a specific payment method
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.paymentMethodsService.findOne(id);
  }

  /**
   * POST /payment-methods/:id/set-default
   * Set a payment method as default
   */
  @Post(':id/set-default')
  @HttpCode(HttpStatus.OK)
  async setDefault(@Param('id') id: string) {
    return this.paymentMethodsService.setDefault(id);
  }

  /**
   * DELETE /payment-methods/:id
   * Remove a payment method
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.paymentMethodsService.remove(id);
  }
}

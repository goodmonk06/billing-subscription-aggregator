import {
  Controller,
  Post,
  Req,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { WebhooksService } from './webhooks.service';

@Controller('webhook')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly webhooksService: WebhooksService) {}

  /**
   * Stripe webhook endpoint
   * POST /webhook/stripe
   */
  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  async handleStripeWebhook(
    @Req() request: Request,
    @Headers('stripe-signature') signature: string,
  ) {
    this.logger.log('Received Stripe webhook');

    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    try {
      // Get raw body as Buffer
      const rawBody = request.body as Buffer;

      await this.webhooksService.processStripeWebhook(rawBody, signature);

      return { received: true };
    } catch (error) {
      this.logger.error(`Stripe webhook error: ${error.message}`, error.stack);
      throw new BadRequestException(error.message);
    }
  }

  /**
   * PayPal webhook endpoint
   * POST /webhook/paypal
   */
  @Post('paypal')
  @HttpCode(HttpStatus.OK)
  async handlePayPalWebhook(
    @Req() request: Request,
    @Headers('paypal-transmission-sig') signature: string,
  ) {
    this.logger.log('Received PayPal webhook');

    if (!signature) {
      throw new BadRequestException('Missing paypal-transmission-sig header');
    }

    try {
      // Get raw body as Buffer
      const rawBody = request.body as Buffer;

      await this.webhooksService.processPayPalWebhook(rawBody, signature);

      return { received: true };
    } catch (error) {
      this.logger.error(`PayPal webhook error: ${error.message}`, error.stack);
      throw new BadRequestException(error.message);
    }
  }
}

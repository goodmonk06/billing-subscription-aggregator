import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentProvider } from '@prisma/client';
import { IPaymentProvider } from '../interfaces/payment-provider.interface';
import { StripeProvider } from './stripe.provider';
import { PayPalProvider } from './paypal.provider';

@Injectable()
export class PaymentProviderFactory {
  private readonly logger = new Logger(PaymentProviderFactory.name);
  private readonly providers: Map<PaymentProvider, IPaymentProvider>;

  constructor(private readonly configService: ConfigService) {
    this.providers = new Map();
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // Initialize Stripe provider
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    const stripeWebhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');

    if (stripeSecretKey && stripeWebhookSecret) {
      const stripeProvider = new StripeProvider(stripeSecretKey, stripeWebhookSecret);
      this.providers.set(PaymentProvider.STRIPE, stripeProvider);
      this.logger.log('Stripe provider registered');
    } else {
      this.logger.warn('Stripe credentials not configured - Stripe provider unavailable');
    }

    // Initialize PayPal provider (stub)
    const paypalClientId = this.configService.get<string>('PAYPAL_CLIENT_ID', '');
    const paypalClientSecret = this.configService.get<string>('PAYPAL_CLIENT_SECRET', '');
    const paypalWebhookId = this.configService.get<string>('PAYPAL_WEBHOOK_ID', '');

    if (paypalClientId && paypalClientSecret) {
      const paypalProvider = new PayPalProvider(
        paypalClientId,
        paypalClientSecret,
        paypalWebhookId,
      );
      this.providers.set(PaymentProvider.PAYPAL, paypalProvider);
      this.logger.log('PayPal provider registered (stub)');
    } else {
      this.logger.warn('PayPal credentials not configured - PayPal provider unavailable');
    }
  }

  getProvider(provider: PaymentProvider): IPaymentProvider {
    const providerInstance = this.providers.get(provider);

    if (!providerInstance) {
      throw new Error(`Payment provider ${provider} is not configured or available`);
    }

    return providerInstance;
  }

  isProviderAvailable(provider: PaymentProvider): boolean {
    return this.providers.has(provider);
  }

  getAvailableProviders(): PaymentProvider[] {
    return Array.from(this.providers.keys());
  }
}

import { IsString, IsEnum, IsOptional, IsNumber, IsBoolean, Min, Max } from 'class-validator';
import { PaymentMethodType } from '@prisma/client';

export class CreatePaymentMethodDto {
  @IsString()
  customerId: string;

  @IsEnum(PaymentMethodType)
  type: PaymentMethodType;

  @IsOptional()
  @IsString()
  cardLast4?: string;

  @IsOptional()
  @IsString()
  cardBrand?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(12)
  cardExpMonth?: number;

  @IsOptional()
  @IsNumber()
  @Min(2024)
  cardExpYear?: number;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  bankLast4?: string;

  @IsOptional()
  billingDetails?: any;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

import { IsString, IsNotEmpty, IsInt, IsEnum, IsOptional, IsObject, Min } from 'class-validator';
import { BillingInterval } from '@prisma/client';

export class CreatePlanDto {
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @Min(0)
  price: number; // in smallest currency unit (cents)

  @IsString()
  @IsOptional()
  currency?: string = 'usd';

  @IsEnum(BillingInterval)
  billingInterval: BillingInterval;

  @IsObject()
  providerPlanIdsJson: Record<string, string>; // { "stripe": "price_xxx", "paypal": "plan_xxx" }

  @IsString()
  @IsOptional()
  description?: string;
}

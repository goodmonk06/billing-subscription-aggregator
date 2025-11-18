import { IsOptional, IsEnum, IsString } from 'class-validator';
import { InvoiceStatus } from '@prisma/client';

export class QueryInvoicesDto {
  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;
}

import { IsString, IsArray, IsNumber, IsOptional, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class InvoiceLineItemDto {
  @IsString()
  description: string;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitAmount: number;
}

export class CreateInvoiceDto {
  @IsString()
  customerId: string;

  @IsString()
  @IsOptional()
  subscriptionId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineItemDto)
  lineItems: InvoiceLineItemDto[];

  @IsNumber()
  @IsOptional()
  @Min(0)
  tax?: number;

  @IsOptional()
  dueDate?: Date;

  @IsString()
  @IsOptional()
  description?: string;
}

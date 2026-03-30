import { IsNumber, IsString, IsOptional, IsArray, IsEmail, IsObject, IsUrl } from 'class-validator';

export class CreatePaymentDto {
  @IsString()
  quoteId!: string;

  @IsNumber()
  amount!: number;                    // in smallest currency unit (cents, for USD)

  @IsString()
  currency!: string;                  // "USD"

  @IsString()
  @IsOptional()
  settlement_asset?: string;         // defaults to merchant's preference

  @IsString()
  @IsOptional()
  settlement_network?: string;       // defaults to merchant's preference

  @IsArray()
  @IsOptional()
  payment_methods?: ('card' | 'bank_transfer' | 'crypto')[];

  @IsObject()
  @IsOptional()
  customer?: { email?: string, name?: string };

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @IsUrl()
  @IsOptional()
  redirect_url?: string;
}

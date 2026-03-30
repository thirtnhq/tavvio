import {
  IsOptional,
  IsISO8601,
  IsString,
  IsNumber,
  IsIn,
} from 'class-validator';

const PAYMENT_STATUSES = [
  'PENDING',
  'QUOTE_LOCKED',
  'SOURCE_LOCKED',
  'STELLAR_LOCKED',
  'PROCESSING',
  'COMPLETED',
  'REFUNDING',
  'REFUNDED',
  'EXPIRED',
  'FAILED',
] as const;

export class PaymentFiltersDto {
  @IsIn(PAYMENT_STATUSES)
  @IsOptional()
  status?: (typeof PAYMENT_STATUSES)[number];

  @IsISO8601()
  @IsOptional()
  from?: string; // ISO date

  @IsISO8601()
  @IsOptional()
  to?: string; // ISO date

  @IsString()
  @IsOptional()
  currency?: string;

  @IsNumber()
  @IsOptional()
  minAmount?: number;

  @IsNumber()
  @IsOptional()
  maxAmount?: number;

  @IsString()
  @IsOptional()
  search?: string; // search by ID, customer email

  @IsNumber()
  @IsOptional()
  page?: number;

  @IsNumber()
  @IsOptional()
  limit?: number;

  @IsString()
  @IsOptional()
  @IsIn(['createdAt', 'amount', 'status'])
  sortBy?: 'createdAt' | 'amount' | 'status' = 'createdAt';

  @IsString()
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

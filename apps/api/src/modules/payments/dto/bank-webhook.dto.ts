import { IsOptional, IsString } from 'class-validator';

export class BankWebhookDto {
  @IsString()
  reference!: string;

  @IsString()
  amount!: string;

  @IsString()
  currency!: string;

  @IsString()
  @IsOptional()
  transactionId?: string;
}

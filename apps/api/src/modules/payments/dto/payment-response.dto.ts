export class PaymentResponseDto {
  id!: string;
  status!: string;
  checkout_url!: string;
  amount!: number;
  currency!: string;
  settlement_amount!: string;
  settlement_asset!: string;
  customer?: { email?: string; name?: string };
  metadata?: any;
  created_at!: Date;
  expires_at!: Date;
}

export type PayoutStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export type DestType = 'BANK_ACCOUNT' | 'MOBILE_MONEY' | 'CRYPTO_WALLET' | 'STELLAR';

export interface PayoutDestination {
  type?: string;
  accountNumber?: string;
  routingNumber?: string;
  bankName?: string;
  iban?: string;
  bic?: string;
  branchCode?: string;
  country?: string;
  phoneNumber?: string;
  provider?: string;
  address?: string;
  network?: string;
  asset?: string;
  memo?: string;
}

export interface Payout {
  id: string;
  merchantId: string;
  recipientName: string;
  destinationType: DestType;
  destination: PayoutDestination;
  amount: string;
  currency: string;
  status: PayoutStatus;
  stellarTxHash: string | null;
  scheduledAt: string | null;
  completedAt: string | null;
  failureReason: string | null;
  batchId: string | null;
  idempotencyKey: string | null;
  createdAt: string;
}

export interface PayoutListResponse {
  total: number;
  limit: number;
  offset: number;
  data: Payout[];
}

export interface PayoutFilters {
  status?: PayoutStatus;
  destinationType?: DestType;
  currency?: string;
  dateFrom?: Date;
  dateTo?: Date;
  batchId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface BatchSummary {
  batchId: string;
  totalPayouts: number;
  totalAmount: number;
  currency: string;
  statusCounts: Record<PayoutStatus, number>;
}

export default {};

export interface Recipient {
  id: string;
  merchantId: string;
  name: string;
  type: 'BANK_ACCOUNT' | 'MOBILE_MONEY' | 'CRYPTO_WALLET' | 'STELLAR';
  details: Record<string, any>;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Payout {
	id: string;
	merchantId?: string;
	recipientId?: string; // new
	recipientName?: string;
	destination?: Record<string, any>;
	amount: bigint | number | string;
	currency?: string;
	status?: string;
	scheduledAt?: string;
	completedAt?: string;
}

export type PayoutStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export default {};

export interface Payment {
	id: string;
	merchantId?: string;
	amount: bigint | number | string;
	currency?: string;
	status?: string;
	createdAt?: string;
}

export type PaymentStatus =
	| 'PENDING'
	| 'QUOTE_LOCKED'
	| 'SOURCE_LOCKED'
	| 'STELLAR_LOCKED'
	| 'PROCESSING'
	| 'COMPLETED'
	| 'REFUNDING'
	| 'REFUNDED'
	| 'EXPIRED'
	| 'FAILED';

/* ── Payment Links ── */

export type LinkType = 'single-use' | 'multi-use';
export type LinkStatus = 'active' | 'expired' | 'deactivated';

export interface PaymentLink {
	id: string;
	amount?: number;
	currency: string;
	description?: string;
	type: LinkType;
	status: LinkStatus;
	usageCount: number;
	expiresAt?: string;
	url: string;
	createdAt: string;
	updatedAt: string;
}

export interface PaymentLinkStats {
	usageCount: number;
	totalAmount: number;
	lastPaymentAt?: string;
}

// Matches backend CreateLinkDto
export interface CreatePaymentLinkInput {
	amount?: number;
	currency?: string;
	description?: string;
	single_use?: boolean;
	expires_at?: string;
}

export interface PaymentLinksResponse {
	data: PaymentLink[];
	total: number;
	page: number;
	limit: number;
}

export default {};

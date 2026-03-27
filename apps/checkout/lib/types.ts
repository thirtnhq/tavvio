export interface PaymentLink {
  id: string;
  merchantName: string;
  merchantLogo?: string;
  description?: string;
  amount?: number; // null for open amount links
  currency: string;
  expiresAt?: string;
  active: boolean;
  redeemed?: boolean;
  singleUse?: boolean;
}

export interface CreatePaymentRequest {
  linkId: string;
  amount?: number;
  email?: string;
}

export interface CreatePaymentResponse {
  id: string;
  status: string;
  redirectUrl?: string;
}
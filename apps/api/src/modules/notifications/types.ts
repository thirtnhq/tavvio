export interface EmailJobData {
  to: string | string[];
  subject: string;
  html: string;
  attachments?: {
    filename: string;
    content: string; // Base64 or Buffer
  }[];
}

// Minimal placeholder interfaces for domain objects
export interface Payment {
  id: string;
  amount: number;
  currency: string;
  reference?: string;
  date: Date;
  merchantName: string;
}

export interface Invoice {
  id: string;
  amount: number;
  currency: string;
  dueDate: Date;
  reference?: string;
}

export interface Payout {
  id: string;
  amount: number;
  currency: string;
  destination: string;
  status: string;
}

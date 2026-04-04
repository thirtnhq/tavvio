"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────────

export type InvoiceStatus =
  | "DRAFT"
  | "SENT"
  | "VIEWED"
  | "PARTIALLY_PAID"
  | "PAID"
  | "OVERDUE"
  | "CANCELLED";

export interface LineItem {
  description: string;
  qty: number;
  unitPrice: number;
  amount: number;
}

export interface CustomerAddress {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  country: string;
  zip?: string;
}

export interface Invoice {
  id: string;
  merchantId: string;
  invoiceNumber?: string;
  customerEmail: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: CustomerAddress;
  lineItems: LineItem[];
  subtotal: string;
  taxRate?: string;
  taxAmount?: string;
  discount?: string;
  total: string;
  amountPaid: string;
  currency: string;
  status: InvoiceStatus;
  dueDate?: string;
  notes?: string;
  pdfUrl?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedInvoices {
  data: Invoice[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CreateInvoiceInput {
  customerEmail: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: CustomerAddress;
  lineItems: Array<{ description: string; qty: number; unitPrice: number }>;
  taxRate?: number;
  discount?: number;
  currency: string;
  dueDate?: string;
  notes?: string;
  invoiceNumber?: string;
}

export type UpdateInvoiceInput = Partial<CreateInvoiceInput>;

export interface InvoicesParams {
  page?: number;
  limit?: number;
  status?: InvoiceStatus;
  currency?: string;
  search?: string;
  from?: string;
  to?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// ── Hooks ──────────────────────────────────────────────────────────────────────

export function useInvoices(params: InvoicesParams = {}) {
  return useQuery<PaginatedInvoices>({
    queryKey: ["invoices", params],
    queryFn: () =>
      api.get<PaginatedInvoices>("/v1/invoices", {
        params: params as Record<string, unknown>,
      }),
  });
}

export function useInvoice(id: string) {
  return useQuery<Invoice>({
    queryKey: ["invoice", id],
    queryFn: () => api.get<Invoice>(`/v1/invoices/${id}`),
    enabled: !!id,
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation<Invoice, Error, CreateInvoiceInput>({
    mutationFn: (body) => api.post<Invoice>("/v1/invoices", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient();

  return useMutation<Invoice, Error, { id: string; body: UpdateInvoiceInput }>({
    mutationFn: ({ id, body }) => api.patch<Invoice>(`/v1/invoices/${id}`, body),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.setQueryData(["invoice", data.id], data);
    },
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (id) => api.delete(`/v1/invoices/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}

export function useSendInvoice() {
  const queryClient = useQueryClient();

  return useMutation<Invoice, Error, { id: string; message?: string }>({
    mutationFn: ({ id, message }) =>
      api.post<Invoice>(`/v1/invoices/${id}/send`, { message }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.setQueryData(["invoice", data.id], data);
    },
  });
}

export function useCancelInvoice() {
  const queryClient = useQueryClient();

  return useMutation<Invoice, Error, string>({
    mutationFn: (id) => api.post<Invoice>(`/v1/invoices/${id}/cancel`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}

export function useInvoicePdfUrl() {
  return useMutation<{ url: string }, Error, string>({
    mutationFn: (id) => api.get<{ url: string }>(`/v1/invoices/${id}/pdf`),
  });
}

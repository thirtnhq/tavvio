import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MerchantProfile {
  id: string;
  name: string;
  email: string;
  companyName: string | null;
  logoUrl: string | null;
  brandColor: string | null;
  customDomain: string | null;
  settlementAsset: string;
  settlementAddress: string | null;
  settlementChain: string;
  kybStatus: "PENDING" | "SUBMITTED" | "APPROVED" | "REJECTED";
  feeBps: number;
  webhookUrl: string | null;
  webhookSecret: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  email: string;
  role: "OWNER" | "ADMIN" | "DEVELOPER" | "FINANCE" | "VIEWER";
}

export interface WebhookConfig {
  webhookUrl: string | null;
  subscribedEvents: string[];
  webhookSecret?: string;
}

export interface WebhookLog {
  id: string;
  eventType: string;
  payload: Record<string, unknown>;
  status: "PENDING" | "DELIVERED" | "FAILED" | "EXHAUSTED";
  attempts: number;
  lastAttemptAt: string | null;
  nextRetryAt: string | null;
  createdAt: string;
}

export interface WebhookLogsResponse {
  data: WebhookLog[];
  total: number;
  limit: number;
  offset: number;
}

export interface WebhookLogFilters {
  status?: string;
  eventType?: string;
  limit?: number;
  offset?: number;
}

// ─── Merchant Profile ────────────────────────────────────────────────────────

export function useMerchantProfile() {
  return useQuery<MerchantProfile>({
    queryKey: ["merchant-profile"],
    queryFn: () => api.get("/merchants/me"),
  });
}

export function useUpdateMerchantProfile() {
  const queryClient = useQueryClient();

  return useMutation<MerchantProfile, Error, { name?: string; companyName?: string }>({
    mutationFn: (body) => api.patch("/merchants/me", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant-profile"] });
    },
  });
}

// ─── Branding ────────────────────────────────────────────────────────────────

export function useUpdateBranding() {
  const queryClient = useQueryClient();

  return useMutation<
    MerchantProfile,
    Error,
    { logoUrl?: string; brandColor?: string; customDomain?: string }
  >({
    mutationFn: (body) => api.patch("/merchants/me/branding", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant-profile"] });
    },
  });
}

// ─── API Keys ────────────────────────────────────────────────────────────────

export interface ApiKeyItem {
  id: string;
  name: string;
  maskedKey: string;
  mode: "LIVE" | "TEST";
  lastUsedAt: string | null;
  createdAt: string;
}

export interface GenerateApiKeyResponse {
  apiKey: string;
  id: string;
  name: string;
  maskedKey: string;
  mode: string;
  message: string;
}

export function useApiKeys() {
  return useQuery<ApiKeyItem[]>({
    queryKey: ["api-keys"],
    queryFn: () => api.get("/merchants/api-keys"),
  });
}

export function useGenerateApiKey() {
  const queryClient = useQueryClient();

  return useMutation<
    GenerateApiKeyResponse,
    Error,
    { mode: "live" | "test"; name: string }
  >({
    mutationFn: ({ mode, name }) =>
      api.post("/merchants/api-keys", { name }, { params: { mode } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
  });
}

export function useRevokeApiKey() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (id) => api.delete(`/merchants/api-keys/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
  });
}

// ─── Team ────────────────────────────────────────────────────────────────────

export function useTeamMembers() {
  return useQuery<TeamMember[]>({
    queryKey: ["team-members"],
    queryFn: () => api.get("/merchants/me/team"),
  });
}

export function useInviteTeamMember() {
  const queryClient = useQueryClient();

  return useMutation<TeamMember, Error, { email: string; role: string }>({
    mutationFn: (body) => api.post("/merchants/me/team", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
    },
  });
}

export function useUpdateTeamMemberRole() {
  const queryClient = useQueryClient();

  return useMutation<TeamMember, Error, { id: string; role: string }>({
    mutationFn: ({ id, role }) => api.patch(`/merchants/me/team/${id}`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
    },
  });
}

export function useRemoveTeamMember() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (id) => api.delete(`/merchants/me/team/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
    },
  });
}

// ─── Webhooks ────────────────────────────────────────────────────────────────

export function useWebhookConfig() {
  return useQuery<WebhookConfig>({
    queryKey: ["webhook-config"],
    queryFn: () => api.get("/v1/webhooks"),
  });
}

export function useRegisterWebhook() {
  const queryClient = useQueryClient();

  return useMutation<WebhookConfig, Error, { webhookUrl: string; subscribedEvents: string[] }>({
    mutationFn: (body) => api.post("/v1/webhooks", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhook-config"] });
    },
  });
}

export function useUpdateWebhook() {
  const queryClient = useQueryClient();

  return useMutation<
    WebhookConfig,
    Error,
    { webhookUrl?: string; subscribedEvents?: string[] }
  >({
    mutationFn: (body) => api.patch("/v1/webhooks", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhook-config"] });
    },
  });
}

export function useWebhookLogs(filters: WebhookLogFilters = {}) {
  return useQuery<WebhookLogsResponse>({
    queryKey: ["webhook-logs", filters],
    queryFn: () =>
      api.get("/v1/webhooks/logs", {
        params: filters as Record<string, unknown>,
      }),
  });
}

export function useRetryWebhookDelivery() {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean; message: string }, Error, string>({
    mutationFn: (id) => api.post(`/v1/webhooks/logs/${id}/retry`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhook-logs"] });
    },
  });
}

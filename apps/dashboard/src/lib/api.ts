import { getToken, refreshAccessToken, clearTokens, isTokenExpired } from "./auth";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

function getApiConnectionErrorMessage() {
  return `Cannot reach the Useroutr API at ${BASE_URL}. Start it with \`npm run start:api\` or set NEXT_PUBLIC_API_URL.`;
}

interface RequestOptions {
  params?: Record<string, unknown>;
  headers?: Record<string, string>;
}

let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

interface ApiErrorBody {
  error?: { message?: string; code?: string };
  message?: string;
}

function extractErrorMessage(body: ApiErrorBody, fallback: string): string {
  return body?.error?.message ?? body?.message ?? fallback;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  const json = JSON.parse(text);

  // Unwrap the { data: T } envelope from the API's TransformInterceptor
  if (json && typeof json === "object" && "data" in json && !("meta" in json)) {
    return json.data as T;
  }

  return json as T;
}

async function getValidToken(): Promise<string | null> {
  const token = getToken();
  if (!token) return null;

  if (!isTokenExpired(token)) return token;

  // Token expired — refresh
  if (isRefreshing) {
    // Queue this request until refresh completes
    return new Promise((resolve) => {
      refreshQueue.push(resolve);
    });
  }

  isRefreshing = true;
  const newToken = await refreshAccessToken();
  isRefreshing = false;

  // Resolve all queued requests
  refreshQueue.forEach((cb) => cb(newToken));
  refreshQueue = [];

  return newToken;
}

async function request<T>(
  method: string,
  path: string,
  options: RequestOptions & { body?: unknown } = {}
): Promise<T> {
  const url = new URL(path, BASE_URL);

  if (options.params) {
    Object.entries(options.params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  const token = typeof window !== "undefined" ? await getValidToken() : null;

  let res: Response;

  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  try {
    res = await fetch(url.toString(), {
      method,
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      body: isFormData ? (options.body as FormData) : options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new Error(getApiConnectionErrorMessage());
  }

  if (res.status === 401) {
    // Attempt one more refresh
    if (typeof window !== "undefined") {
      const newToken = await refreshAccessToken();
      if (!newToken) {
        clearTokens();
        window.location.href = "/login";
        throw new Error("Session expired");
      }

      // Retry the original request with new token
      let retryRes: Response;

      try {
        retryRes = await fetch(url.toString(), {
          method,
          headers: {
            ...(isFormData ? {} : { "Content-Type": "application/json" }),
            Authorization: `Bearer ${newToken}`,
            ...options.headers,
          },
          body: isFormData ? (options.body as FormData) : options.body ? JSON.stringify(options.body) : undefined,
        });
      } catch {
        throw new Error(getApiConnectionErrorMessage());
      }

      if (retryRes.status === 401) {
        clearTokens();
        window.location.href = "/login";
        throw new Error("Session expired");
      }

      if (!retryRes.ok) {
        const retryErrorBody = await parseResponse<ApiErrorBody>(
          retryRes
        ).catch(() => ({} as ApiErrorBody));
        throw new Error(
          extractErrorMessage(retryErrorBody, `API error: ${retryRes.status} ${retryRes.statusText}`)
        );
      }

      return parseResponse<T>(retryRes);
    }
  }

  if (!res.ok) {
    const errorBody = await parseResponse<ApiErrorBody>(res).catch(
      () => ({} as ApiErrorBody)
    );
    throw new Error(extractErrorMessage(errorBody, `API error: ${res.status} ${res.statusText}`));
  }

  return parseResponse<T>(res);
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>("GET", path, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("POST", path, { ...options, body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("PUT", path, { ...options, body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("PATCH", path, { ...options, body }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>("DELETE", path, options),
};

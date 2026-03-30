const TOKEN_KEY = "tavvio-token";
const REFRESH_KEY = "tavvio-refresh-token";
const VERIFICATION_EMAIL_KEY = "tavvio-verification-email";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

interface JwtPayload {
  exp?: number;
}

function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const [, encodedPayload] = token.split(".");
    if (!encodedPayload) return null;

    const normalized = encodedPayload
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(encodedPayload.length / 4) * 4, "=");

    return JSON.parse(atob(normalized)) as JwtPayload;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(accessToken: string, refreshToken?: string) {
  localStorage.setItem(TOKEN_KEY, accessToken);
  if (refreshToken) {
    localStorage.setItem(REFRESH_KEY, refreshToken);
  }
}

export function getPendingVerificationEmail(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(VERIFICATION_EMAIL_KEY);
}

export function setPendingVerificationEmail(email: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(VERIFICATION_EMAIL_KEY, email);
}

export function clearPendingVerificationEmail() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(VERIFICATION_EMAIL_KEY);
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  return !payload?.exp || Date.now() >= payload.exp * 1000;
}

export function getTokenExpiryMs(token: string): number | null {
  const payload = decodeJwtPayload(token);
  return payload?.exp ? payload.exp * 1000 : null;
}

export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      clearTokens();
      return null;
    }

    const data = await res.json() as { accessToken: string; refreshToken?: string };
    setTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch {
    clearTokens();
    return null;
  }
}

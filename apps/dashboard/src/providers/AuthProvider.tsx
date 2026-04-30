"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import {
  clearPendingVerificationEmail,
  clearTokens,
  getPendingVerificationEmail,
  getToken,
  getTokenExpiryMs,
  isTokenExpired,
  setPendingVerificationEmail,
  refreshAccessToken,
  setTokens,
} from "@/lib/auth";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Merchant {
  id: string;
  email: string;
  name: string;
  companyName?: string;
  logoUrl?: string;
  emailVerifiedAt?: string | null;
}

export interface RegisterDto {
  name: string;
  companyName: string;
  email: string;
  password: string;
}

interface AuthState {
  merchant: Merchant | null;
  token: string | null;
  verificationEmail: string | null;
  isLoading: boolean;
  login(email: string, password: string): Promise<void>;
  register(dto: RegisterDto): Promise<void>;
  logout(): void;
  refreshToken(): Promise<void>;
  resendVerificationEmail(): Promise<void>;
  verifyOtp(email: string, code: string): Promise<void>;
}

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthState | undefined>(undefined);

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/verify",
  "/forgot-password",
  "/reset-password",
  "/payments",
];
const AUTH_ENTRY_PATHS = ["/login", "/register"];

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const logout = useCallback(() => {
    clearRefreshTimer();
    // Best-effort: tell the API about the logout. We don't await failures so
    // the user is signed out locally even if the network is down.
    void api.post("/auth/logout").catch(() => undefined);
    clearTokens();
    setToken(null);
    setMerchant(null);
    router.replace("/login");
  }, [clearRefreshTimer, router]);

  // ── Schedule auto-refresh ──────────────────────────────────────────────────

  const scheduleRefresh = useCallback(
    (accessToken: string) => {
      clearRefreshTimer();

      const expiryMs = getTokenExpiryMs(accessToken);
      if (!expiryMs) return;

      // Refresh 60 seconds before expiry
      const delay = expiryMs - Date.now() - 60_000;

      if (delay <= 0) {
        void (async () => {
          const newToken = await refreshAccessToken();
          if (newToken) {
            setToken(newToken);
            scheduleRefresh(newToken);
            return;
          }
          logout();
        })();
        return;
      }

      refreshTimerRef.current = setTimeout(async () => {
        const newToken = await refreshAccessToken();
        if (newToken) {
          setToken(newToken);
          scheduleRefresh(newToken);
          return;
        }
        logout();
      }, delay);
    },
    [clearRefreshTimer, logout]
  );

  // ── Load existing session on mount ─────────────────────────────────────────

  useEffect(() => {
    setVerificationEmail(getPendingVerificationEmail());

    const checkAuth = async () => {
      try {
        const storedToken = getToken();
        if (!storedToken) return;

        const activeToken = isTokenExpired(storedToken)
          ? await refreshAccessToken()
          : storedToken;

        if (!activeToken) return;

        setToken(activeToken);
        const me = await api.get<Merchant>("/auth/me");
        setMerchant(me);
        setVerificationEmail((cur) => cur ?? me.email);
        scheduleRefresh(activeToken);
      } catch {
        clearTokens();
      } finally {
        setIsLoading(false);
      }
    };

    void checkAuth();

    return () => {
      clearRefreshTimer();
    };
  }, [clearRefreshTimer, scheduleRefresh]);

  // ── Guard: redirect unauthenticated users ──────────────────────────────────

  useEffect(() => {
    if (isLoading) return;

    const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

    if (!merchant && !isPublic) {
      const loginUrl = `/login?redirect=${encodeURIComponent(pathname)}`;
      router.replace(loginUrl);
      return;
    }

    if (merchant && AUTH_ENTRY_PATHS.some((p) => pathname.startsWith(p))) {
      // Redirect to where the user came from, or home
      const redirect = searchParams.get("redirect") || "/";
      router.replace(redirect);
    }
  }, [merchant, isLoading, pathname, router, searchParams]);

  // ── Auth actions ───────────────────────────────────────────────────────────

  const login = async (email: string, password: string) => {
    const data = await api.post<{
      accessToken: string;
      refreshToken?: string;
      merchant: Merchant;
    }>("/auth/login", { email, password });

    setTokens(data.accessToken, data.refreshToken);
    setToken(data.accessToken);
    setMerchant(data.merchant);
    clearPendingVerificationEmail();
    setVerificationEmail(null);
    scheduleRefresh(data.accessToken);

    // Redirect to original destination or home
    const redirect = searchParams.get("redirect") || "/";
    router.replace(redirect);
  };

  const register = async (dto: RegisterDto) => {
    const data = await api.post<{
      accessToken: string;
      refreshToken?: string;
      merchant: Merchant;
    }>("/auth/register", dto);

    setTokens(data.accessToken, data.refreshToken);
    setToken(data.accessToken);
    setMerchant(data.merchant);
    const merchantEmail = data.merchant.email ?? dto.email;
    setPendingVerificationEmail(merchantEmail);
    setVerificationEmail(merchantEmail);
    scheduleRefresh(data.accessToken);
    router.replace(`/verify?email=${encodeURIComponent(merchantEmail)}`);
  };

  const refreshTokenFn = async () => {
    const newToken = await refreshAccessToken();
    if (newToken) {
      setToken(newToken);
      scheduleRefresh(newToken);
    } else {
      logout();
    }
  };

  const resendVerificationEmail = async () => {
    const email = verificationEmail ?? merchant?.email;
    if (!email) {
      throw new Error("No email address available for verification.");
    }

    try {
      await api.post("/auth/resend-verification", { email });
    } catch (error) {
      if (error instanceof Error && /404|not found/i.test(error.message)) {
        throw new Error("Resend email is not available from the API yet.");
      }
      throw error;
    }
  };

  const verifyOtp = async (email: string, code: string) => {
    const updated = await api.post<Merchant>("/auth/verify", { email, code });
    setMerchant((prev) => ({ ...(prev ?? updated), ...updated }));
    clearPendingVerificationEmail();
    setVerificationEmail(null);
    router.replace("/");
  };

  return (
    <AuthContext.Provider
      value={{
        merchant,
        token,
        verificationEmail,
        isLoading,
        login,
        register,
        logout,
        refreshToken: refreshTokenFn,
        resendVerificationEmail,
        verifyOtp,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

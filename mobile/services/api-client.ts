import * as SecureStore from "expo-secure-store";

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const ACCESS_KEY = "savoria_access_token";
const REFRESH_KEY = "savoria_refresh_token";

if (!API_URL) {
  throw new Error("EXPO_PUBLIC_API_URL wajib dikonfigurasi");
}

export type SessionUser = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role_id: number;
  role: string;
  active: boolean;
  must_change_password: boolean;
};

export type AuthSession = {
  user: SessionUser;
  access_token: string;
  refresh_token: string;
  expires_at: string;
};

async function setSession(session: AuthSession | null) {
  if (!session) {
    await SecureStore.deleteItemAsync(ACCESS_KEY);
    await SecureStore.deleteItemAsync(REFRESH_KEY);
    return;
  }
  await SecureStore.setItemAsync(ACCESS_KEY, session.access_token);
  await SecureStore.setItemAsync(REFRESH_KEY, session.refresh_token);
}

async function refresh(): Promise<boolean> {
  const token = await SecureStore.getItemAsync(REFRESH_KEY);
  if (!token) return false;
  const response = await fetch(`${API_URL}/v1/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: token }),
  });
  if (!response.ok) {
    await setSession(null);
    return false;
  }
  await setSession((await response.json()) as AuthSession);
  return true;
}

export async function request<T>(path: string, init: RequestInit = {}, canRefresh = true): Promise<T> {
  const token = await SecureStore.getItemAsync(ACCESS_KEY);
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });
  if (response.status === 401 && canRefresh && (await refresh())) {
    return request<T>(path, init, false);
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: "Server bermasalah" }));
    throw new Error(body.error || "Permintaan gagal");
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const authService = {
  async login(email: string, password: string) {
    const session = await request<AuthSession>("/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }, false);
    await setSession(session);
    return session;
  },
  async sessionUser() {
    try {
      return await request<SessionUser>("/v1/auth/me");
    } catch {
      return null;
    }
  },
  async logout() {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_KEY);
    try {
      if (refreshToken) {
        await request<void>("/v1/auth/logout", { method: "POST", body: JSON.stringify({ refresh_token: refreshToken }) });
      }
    } finally {
      await setSession(null);
    }
  },
};

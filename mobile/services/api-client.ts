import * as SecureStore from "expo-secure-store";

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const ACCESS_KEY = "savoria_access_token";
const REFRESH_KEY = "savoria_refresh_token";
const USER_KEY = "savoria_session_user";
const sessionListeners = new Set<() => void>();

if (!API_URL) {
  throw new Error("EXPO_PUBLIC_API_URL wajib dikonfigurasi");
}

export type SessionUser = {
  id: string;
  email: string;
  full_name: string;
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

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function setSession(session: AuthSession | null) {
  if (!session) {
    await SecureStore.deleteItemAsync(ACCESS_KEY);
    await SecureStore.deleteItemAsync(REFRESH_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    return;
  }
  await SecureStore.setItemAsync(ACCESS_KEY, session.access_token);
  await SecureStore.setItemAsync(REFRESH_KEY, session.refresh_token);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(session.user));
}

async function getCachedUser() {
  const rawUser = await SecureStore.getItemAsync(USER_KEY);
  if (!rawUser) return null;

  try {
    return JSON.parse(rawUser) as SessionUser;
  } catch {
    await SecureStore.deleteItemAsync(USER_KEY);
    return null;
  }
}

function notifySessionExpired() {
  sessionListeners.forEach((listener) => listener());
}

export function onSessionExpired(listener: () => void) {
  sessionListeners.add(listener);
  return () => {
    sessionListeners.delete(listener);
  };
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
    if (response.status === 401) {
      await setSession(null);
    }
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
    if (response.status === 401) {
      await setSession(null);
      notifySessionExpired();
    }
    throw new ApiError(body.error || "Permintaan gagal", response.status);
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
      const user = await request<SessionUser>("/v1/auth/me");
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
      return user;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        return null;
      }
      return getCachedUser();
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

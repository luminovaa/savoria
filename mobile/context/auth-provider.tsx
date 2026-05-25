import SplashScreenComponent from "@/app/(app)/welcome";
import { authService, SessionUser } from "@/services/api-client";
import { useRouter, useSegments, SplashScreen } from "expo-router";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

SplashScreen.preventAutoHideAsync();

type AuthContextProps = {
  user: SessionUser | null;
  initialized: boolean;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  onLayoutRootView: () => Promise<void>;
};

const AuthContext = createContext<AuthContextProps>({
  user: null,
  initialized: false,
  signInWithPassword: async () => {},
  signOut: async () => {},
  onLayoutRootView: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    authService.sessionUser().then(setUser).finally(() => {
      setInitialized(true);
      setAppIsReady(true);
    });
  }, []);

  useEffect(() => {
    if (!initialized || !appIsReady) return;
    const inProtectedGroup = segments.includes("(protected)");
    if (user && !inProtectedGroup) router.replace("/(app)/(protected)/home");
    if (!user && inProtectedGroup) router.replace("/(app)/welcome");
  }, [appIsReady, initialized, router, segments, user]);

  async function signInWithPassword(email: string, password: string) {
    const session = await authService.login(email, password);
    setUser(session.user);
  }

  async function signOut() {
    await authService.logout();
    setUser(null);
  }

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) await SplashScreen.hideAsync();
  }, [appIsReady]);

  if (!initialized || !appIsReady) return <SplashScreenComponent />;

  return (
    <AuthContext.Provider value={{ user, initialized, signInWithPassword, signOut, onLayoutRootView }}>
      {children}
    </AuthContext.Provider>
  );
}

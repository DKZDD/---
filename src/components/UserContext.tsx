"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { SafeUser } from "@/db/schema";
import { authHeaders, clearToken } from "@/lib/session";
import { useLive } from "@/lib/useLive";

type Ctx = {
  user: SafeUser | null;
  loading: boolean;
  refresh: () => void;
  logout: () => Promise<void>;
};

const UserCtx = createContext<Ctx>({
  user: null,
  loading: true,
  refresh: () => {},
  logout: async () => {},
});

export const useUser = () => useContext(UserCtx);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", {
        cache: "no-store",
        headers: { ...authHeaders() },
      });
      setUser(res.ok ? ((await res.json()) as SafeUser) : null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // tempo real: se o admin mudar seu plano/status, a sessão reflete na hora
  useLive(
    useCallback(() => {
      void refresh();
    }, [refresh]),
    "users",
  );

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { ...authHeaders() },
      });
    } catch {
      /* segue com o logout local */
    }
    clearToken();
    setUser(null);
    window.location.assign("/");
  }, []);

  return (
    <UserCtx.Provider value={{ user, loading, refresh: () => void refresh(), logout }}>
      {children}
    </UserCtx.Provider>
  );
}

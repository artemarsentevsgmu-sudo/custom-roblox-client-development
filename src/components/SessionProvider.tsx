"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import useSWR from "swr";
import { api, fetcher } from "@/lib/client";

export type Me = {
  authenticated: boolean;
  user?: {
    id: number;
    name: string;
    displayName: string;
    description: string;
    created: string | null;
    hasVerifiedBadge: boolean;
    avatarUrl: string | null;
    fullBodyUrl: string | null;
    isPremium: boolean;
    loginMethod: string;
  };
  stats?: {
    robux: number | null;
    friends: number | null;
    followers: number | null;
    following: number | null;
    groups: number | null;
    unreadMessages: number | null;
    friendRequests: number | null;
  };
  presence?: { userPresenceType?: number; lastLocation?: string } | null;
  balanceHistory?: { robux: number; capturedAt: string }[];
};

type Ctx = {
  me: Me | undefined;
  loading: boolean;
  refresh: () => void;
  loginOpen: boolean;
  openLogin: () => void;
  closeLogin: () => void;
  logout: () => Promise<void>;
};

const SessionCtx = createContext<Ctx | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const { data, isLoading, mutate } = useSWR<Me>("/api/me", fetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: true,
  });
  const [loginOpen, setLoginOpen] = useState(false);

  const logout = useCallback(async () => {
    await api("/api/auth/logout", { method: "POST", body: "{}" });
    await mutate();
  }, [mutate]);

  const value = useMemo<Ctx>(
    () => ({
      me: data,
      loading: isLoading,
      refresh: () => void mutate(),
      loginOpen,
      openLogin: () => setLoginOpen(true),
      closeLogin: () => setLoginOpen(false),
      logout,
    }),
    [data, isLoading, loginOpen, logout, mutate],
  );

  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionCtx);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}

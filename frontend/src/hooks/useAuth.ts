"use client";

import { useCallback, useEffect, useState } from "react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8000";

export type AuthUser = {
  id: number;
  name: string;
  email: string | null;
  role: string;
  organization?: { id: number; name: string; sport?: string | null } | null;
  organization_id?: number | null;
};

type VerifyInviteResponse = {
  role: string;
  email?: string | null;
  organization_id?: number | null;
  organization?: { id: number; name: string; sport?: string | null } | null;
};

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteInfo, setInviteInfo] = useState<VerifyInviteResponse | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/me`, {
        credentials: "include",
      });
      if (!res.ok) {
        setUser(null);
        return;
      }
      const data = (await res.json()) as AuthUser;
      setUser(data);
    } catch (err) {
      console.error("auth refresh error", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const verifyInvite = useCallback(async (code: string) => {
    setInviteInfo(null);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/invites/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Verification failed (${res.status})`);
      }
      const data = (await res.json()) as VerifyInviteResponse;
      setInviteInfo(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invite verification failed");
      throw err;
    }
  }, []);

  const register = useCallback(
    async (payload: { code: string; name: string; email: string; password: string }) => {
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/api/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail || `Register failed (${res.status})`);
        }
        const data = (await res.json()) as AuthUser;
        setUser(data);
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Registration failed");
        throw err;
      }
    },
    []
  );

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Login failed (${res.status})`);
      }
      const data = (await res.json()) as AuthUser;
      setUser(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    setError(null);
    try {
      await fetch(`${API_BASE}/api/logout`, {
        method: "POST",
        credentials: "include",
      });
      setUser(null);
    } catch (err) {
      console.error("logout failed", err);
    }
  }, []);

  return {
    user,
    loading,
    error,
    inviteInfo,
    refresh,
    verifyInvite,
    register,
    login,
    logout,
    setError,
  };
}

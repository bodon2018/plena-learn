"use client";

/**
 * NEW: src/hooks/useUsersStore.ts
 * - Single source of truth for Admin users.
 * - Persists to localStorage.
 * API:
 *   users[], createUser, updateUser, deleteUser
 */

import { useCallback, useEffect, useState } from "react";

export type UserRole = "Coach" | "Player" | "Team";
export type AdminUser = { id: string; name: string; role: UserRole; email: string };

const LS_KEY = "app.admin.users";

// Seed to keep visuals; safe to remove later.
const seed: AdminUser[] = [
  { id: "u1", name: "User A", role: "Coach", email: "a@example.com" },
  { id: "u2", name: "User B", role: "Player", email: "b@example.com" },
];

export function useUsersStore() {
  const [users, setUsers] = useState<AdminUser[]>([]);

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null;
      if (raw) setUsers(JSON.parse(raw) as AdminUser[]);
      else {
        setUsers(seed);
        localStorage.setItem(LS_KEY, JSON.stringify(seed));
      }
    } catch {
      setUsers(seed);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(users));
    } catch {
      /* ignore */
    }
  }, [users]);

  const createUser = useCallback((user: Omit<AdminUser, "id">) => {
    const newUser: AdminUser = { id: String(Date.now()), ...user };
    setUsers((prev) => [...prev, newUser]);
  }, []);

  const updateUser = useCallback((id: string, patch: Partial<AdminUser>) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  }, []);

  const deleteUser = useCallback((id: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
  }, []);

  return { users, createUser, updateUser, deleteUser };
}

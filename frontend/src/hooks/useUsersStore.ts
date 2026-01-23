"use client";

/**
 * Admin users store backed by backend /api/users endpoints.
 */

import { useCallback, useEffect, useState } from "react";

export type UserRole = "Coach" | "Player" | "Team" | "admin" | "user";
export type AdminUser = { id: string; name: string; role: UserRole; email: string };

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8000";

export function useUsersStore() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/users`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Load failed (${res.status})`);
      const data = await res.json();
      const mapped =
        Array.isArray(data) &&
        data.map(
          (u: any) =>
            ({
              id: String(u.id),
              name: u.name,
              role: (u.role as UserRole) || "user",
              email: u.email ?? "",
            } as AdminUser)
        );
      setUsers(mapped || []);
    } catch (err) {
      console.error("loadUsers error", err);
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const createUser = useCallback(
    async (user: Omit<AdminUser, "id">) => {
      setError(null);
      const payload = {
        name: user.name,
        email: user.email,
        role: user.role,
      };
      const res = await fetch(`${API_BASE}/api/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Create failed (${res.status})`);
      }
      const created = await res.json();
      setUsers((prev) => [...prev, { id: String(created.id), name: created.name, role: created.role, email: created.email ?? "" }]);
    },
    []
  );

  const updateUser = useCallback(
    async (id: string, patch: Partial<AdminUser>) => {
      setError(null);
      const res = await fetch(`${API_BASE}/api/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Update failed (${res.status})`);
      }
      const updated = await res.json();
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { id, name: updated.name, role: updated.role, email: updated.email ?? "" } : u))
      );
    },
    []
  );

  const deleteUser = useCallback(async (id: string) => {
    setError(null);
    const res = await fetch(`${API_BASE}/api/users/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.detail || `Delete failed (${res.status})`);
    }
    setUsers((prev) => prev.filter((u) => u.id !== id));
  }, []);

  return { users, loading, error, createUser, updateUser, deleteUser, loadUsers };
}

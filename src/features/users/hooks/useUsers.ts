"use client";

import { useCallback, useEffect, useState } from "react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8000";

const ORG_ID = "test_org";

// =============================================================================
// Types
// =============================================================================

export type UserRole = "coach" | "player" | "assistant";

export type User = {
  id: number;
  user_id: string;
  org_id: string;
  name: string;
  role: string | null;
  created_at: string;
  has_fingerprint: boolean;
};

export type CreateUserForm = {
  name: string;
  role: UserRole;
};

type UseUsersReturn = {
  // Users list
  users: User[];
  isLoading: boolean;
  error: string | null;
  refreshUsers: () => Promise<void>;

  // Create user
  createForm: CreateUserForm;
  setCreateFormField: <K extends keyof CreateUserForm>(field: K, value: CreateUserForm[K]) => void;
  canCreate: boolean;
  isCreating: boolean;
  createError: string | null;
  createUser: () => Promise<void>;

  // Delete user
  deletingIds: Set<string>;
  deleteError: string | null;
  deleteUser: (userId: string) => Promise<void>;

  // Fingerprint
  uploadingFingerprintFor: string | null;
  fingerprintError: string | null;
  uploadFingerprint: (userId: string, audioBlob: Blob) => Promise<void>;
  deleteFingerprint: (userId: string) => Promise<void>;
};

// =============================================================================
// Helpers
// =============================================================================

/**
 * Generate a user_id from the name.
 * e.g., "Coach Smith" → "coach_smith"
 */
function generateUserId(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "_");
}

// =============================================================================
// Hook
// =============================================================================

export function useUsers(): UseUsersReturn {
  // ---------------------------------------------------------------------------
  // Users list state
  // ---------------------------------------------------------------------------
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Create user state
  // ---------------------------------------------------------------------------
  const [createForm, setCreateForm] = useState<CreateUserForm>({
    name: "",
    role: "player",
  });
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Delete user state
  // ---------------------------------------------------------------------------
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Fingerprint state
  // ---------------------------------------------------------------------------
  const [uploadingFingerprintFor, setUploadingFingerprintFor] = useState<string | null>(null);
  const [fingerprintError, setFingerprintError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Load users
  // ---------------------------------------------------------------------------
  const refreshUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/orgs/${ORG_ID}/users`);

      if (!res.ok) {
        throw new Error(`Failed to load users: ${res.status}`);
      }

      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading users:", err);
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load on mount
  useEffect(() => {
    void refreshUsers();
  }, [refreshUsers]);

  // ---------------------------------------------------------------------------
  // Create user form helpers
  // ---------------------------------------------------------------------------
  const setCreateFormField = useCallback(
    <K extends keyof CreateUserForm>(field: K, value: CreateUserForm[K]) => {
      setCreateForm((prev) => ({ ...prev, [field]: value }));
      setCreateError(null);
    },
    []
  );

  const canCreate = !!(createForm.name.trim() && !isCreating);

  // ---------------------------------------------------------------------------
  // Create user
  // ---------------------------------------------------------------------------
  const createUser = useCallback(async () => {
    if (!canCreate) return;

    setIsCreating(true);
    setCreateError(null);

    const userId = generateUserId(createForm.name);

    try {
      const res = await fetch(`${API_BASE}/api/orgs/${ORG_ID}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          name: createForm.name.trim(),
          role: createForm.role,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to create user: ${res.status}`);
      }

      // Reset form
      setCreateForm({ name: "", role: "player" });

      // Refresh list
      await refreshUsers();
    } catch (err) {
      console.error("Error creating user:", err);
      setCreateError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setIsCreating(false);
    }
  }, [canCreate, createForm, refreshUsers]);

  // ---------------------------------------------------------------------------
  // Delete user
  // ---------------------------------------------------------------------------
  const deleteUser = useCallback(
    async (userId: string) => {
      setDeletingIds((prev) => new Set(prev).add(userId));
      setDeleteError(null);

      try {
        const res = await fetch(
          `${API_BASE}/api/orgs/${ORG_ID}/users/${encodeURIComponent(userId)}`,
          { method: "DELETE" }
        );

        if (!res.ok) {
          throw new Error(`Failed to delete user: ${res.status}`);
        }

        // Remove from local state
        setUsers((prev) => prev.filter((u) => u.user_id !== userId));
      } catch (err) {
        console.error("Error deleting user:", err);
        setDeleteError(err instanceof Error ? err.message : "Failed to delete user");
      } finally {
        setDeletingIds((prev) => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
      }
    },
    []
  );

  // ---------------------------------------------------------------------------
  // Upload fingerprint
  // ---------------------------------------------------------------------------
  const uploadFingerprint = useCallback(
    async (userId: string, audioBlob: Blob) => {
      setUploadingFingerprintFor(userId);
      setFingerprintError(null);

      try {
        const formData = new FormData();
        formData.append("file", audioBlob, "fingerprint.webm");

        const res = await fetch(
          `${API_BASE}/api/orgs/${ORG_ID}/users/${encodeURIComponent(userId)}/fingerprint`,
          {
            method: "POST",
            body: formData,
          }
        );

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.detail || `Failed to upload fingerprint: ${res.status}`);
        }

        // Refresh users to update has_fingerprint status
        await refreshUsers();
      } catch (err) {
        console.error("Error uploading fingerprint:", err);
        setFingerprintError(err instanceof Error ? err.message : "Failed to upload fingerprint");
      } finally {
        setUploadingFingerprintFor(null);
      }
    },
    [refreshUsers]
  );

  // ---------------------------------------------------------------------------
  // Delete fingerprint
  // ---------------------------------------------------------------------------
  const deleteFingerprint = useCallback(
    async (userId: string) => {
      setUploadingFingerprintFor(userId);
      setFingerprintError(null);

      try {
        const res = await fetch(
          `${API_BASE}/api/orgs/${ORG_ID}/users/${encodeURIComponent(userId)}/fingerprint`,
          { method: "DELETE" }
        );

        if (!res.ok) {
          throw new Error(`Failed to delete fingerprint: ${res.status}`);
        }

        // Refresh users to update has_fingerprint status
        await refreshUsers();
      } catch (err) {
        console.error("Error deleting fingerprint:", err);
        setFingerprintError(err instanceof Error ? err.message : "Failed to delete fingerprint");
      } finally {
        setUploadingFingerprintFor(null);
      }
    },
    [refreshUsers]
  );

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------
  return {
    // Users list
    users,
    isLoading,
    error,
    refreshUsers,

    // Create user
    createForm,
    setCreateFormField,
    canCreate,
    isCreating,
    createError,
    createUser,

    // Delete user
    deletingIds,
    deleteError,
    deleteUser,

    // Fingerprint
    uploadingFingerprintFor,
    fingerprintError,
    uploadFingerprint,
    deleteFingerprint,
  };
}
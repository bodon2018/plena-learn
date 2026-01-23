import { useCallback, useMemo, useState } from "react";
import { useUsersStore, type UserRole, type AdminUser } from "@/hooks/useUsersStore";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type EditableUser = AdminUser & {
  isEditing: boolean;
  draftName: string;
  draftRole: UserRole;
  draftEmail: string;
};

type CreateUserForm = {
  name: string;
  role: UserRole;
  email: string;
};

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

const ROLES: UserRole[] = ["Coach", "Player", "Team", "admin", "user"];

function isValidEmail(email: string): boolean {
  return /\S+@\S+\.\S+/.test(email);
}

// -----------------------------------------------------------------------------
// Hook
// -----------------------------------------------------------------------------

type UseUsersReturn = {
  // Users list
  users: EditableUser[];

  // Create form
  form: CreateUserForm;
  setFormField: <K extends keyof CreateUserForm>(key: K, value: CreateUserForm[K]) => void;
  canCreate: boolean;
  createUser: () => Promise<void>;

  // Edit actions
  startEditing: (id: string) => void;
  cancelEditing: (id: string) => void;
  updateDraft: (id: string, field: "name" | "role" | "email", value: string) => void;
  saveUser: (id: string) => void;
  deleteUser: (id: string) => void;

  // Constants
  roles: UserRole[];
};

export function useUsers(): UseUsersReturn {
  // ---------------------------------------------------------------------------
  // Store
  // ---------------------------------------------------------------------------
  const {
    users: storeUsers,
    createUser: storeCreateUser,
    updateUser: storeUpdateUser,
    deleteUser: storeDeleteUser,
  } = useUsersStore();

  // ---------------------------------------------------------------------------
  // Local edit state
  // ---------------------------------------------------------------------------
  const [editState, setEditState] = useState<
    Record<string, { isEditing: boolean; draftName: string; draftRole: UserRole; draftEmail: string }>
  >({});

  // ---------------------------------------------------------------------------
  // Create form state
  // ---------------------------------------------------------------------------
  const [form, setForm] = useState<CreateUserForm>({
    name: "",
    role: "Coach",
    email: "",
  });

  // ---------------------------------------------------------------------------
  // Computed
  // ---------------------------------------------------------------------------

  const users: EditableUser[] = useMemo(() => {
    return storeUsers.map((user) => {
      const edit = editState[user.id];
      return {
        ...user,
        isEditing: edit?.isEditing ?? false,
        draftName: edit?.draftName ?? user.name,
        draftRole: edit?.draftRole ?? user.role,
        draftEmail: edit?.draftEmail ?? user.email,
      };
    });
  }, [storeUsers, editState]);

  const canCreate = form.name.trim().length > 0 && isValidEmail(form.email);

  // ---------------------------------------------------------------------------
  // Form helpers
  // ---------------------------------------------------------------------------

  const setFormField = useCallback(
    <K extends keyof CreateUserForm>(key: K, value: CreateUserForm[K]) => {
      setForm((f) => ({ ...f, [key]: value }));
    },
    []
  );

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const createUser = useCallback(async () => {
    if (!canCreate) return;

    await storeCreateUser({
      name: form.name.trim(),
      role: form.role,
      email: form.email.trim(),
    });

    setForm({ name: "", role: "Coach", email: "" });
  }, [canCreate, form, storeCreateUser]);

  const startEditing = useCallback((id: string) => {
    const user = storeUsers.find((u) => u.id === id);
    if (!user) return;

    setEditState((prev) => ({
      ...prev,
      [id]: {
        isEditing: true,
        draftName: user.name,
        draftRole: user.role,
        draftEmail: user.email,
      },
    }));
  }, [storeUsers]);

  const cancelEditing = useCallback((id: string) => {
    setEditState((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        isEditing: false,
      },
    }));
  }, []);

  const updateDraft = useCallback(
    (id: string, field: "name" | "role" | "email", value: string) => {
      setEditState((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          ...(field === "name" && { draftName: value }),
          ...(field === "role" && { draftRole: value as UserRole }),
          ...(field === "email" && { draftEmail: value }),
        },
      }));
    },
    []
  );

  const saveUser = useCallback(
    async (id: string) => {
      const edit = editState[id];
      if (!edit) return;

      await storeUpdateUser(id, {
        name: edit.draftName.trim(),
        role: edit.draftRole,
        email: edit.draftEmail.trim(),
      });

      setEditState((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          isEditing: false,
        },
      }));
    },
    [editState, storeUpdateUser]
  );

  const deleteUser = useCallback(
    async (id: string) => {
      const user = storeUsers.find((u) => u.id === id);
      const name = user?.name || "this user";

      if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;

      await storeDeleteUser(id);
      setEditState((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    },
    [storeUsers, storeDeleteUser]
  );

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    users,
    form,
    setFormField,
    canCreate,
    createUser,
    startEditing,
    cancelEditing,
    updateDraft,
    saveUser,
    deleteUser,
    roles: ROLES,
  };
}

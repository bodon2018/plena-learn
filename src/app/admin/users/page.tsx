"use client";

/**
 * CHANGE: Admin › Users
 * - Added type annotations to silence TS 'any' warnings.
 * - No style or behavior changes.
 */

import { useMemo, useState } from "react";
import Card from "@/components/ui/Card";
import { cn } from "@/lib/cn";
// CHANGE: ensure typed imports exist
import { useUsersStore, type UserRole, type AdminUser } from "@/hooks/useUsersStore";

type EditableUser = AdminUser & {
  editing?: boolean;
  draftName?: string;
  draftRole?: UserRole;
  draftEmail?: string;
};

export default function UsersPage() {
  const { users, createUser, updateUser, deleteUser } = useUsersStore();

  const [local, setLocal] = useState<Record<string, Partial<EditableUser>>>({});

  const merged: EditableUser[] = useMemo(
    // CHANGE: annotate 'u' to AdminUser
    () =>
      users.map((u: AdminUser) => ({ ...u, ...(local[u.id] as object) })) as EditableUser[],
    [users, local]
  );

  const [form, setForm] = useState<{ name: string; role: UserRole; email: string }>({
    name: "",
    role: "Coach",
    email: "",
  });

  const onFormChange = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const validEmail = (e: string) => /\S+@\S+\.\S+/.test(e);
  const canCreate = form.name.trim().length > 0 && validEmail(form.email);

  const onCreate = () => {
    if (!canCreate) return;
    createUser({
      name: form.name.trim(),
      role: form.role,
      email: form.email.trim(),
    });
    setForm({ name: "", role: "Coach", email: "" });
  };

  const startEdit = (id: string) =>
    setLocal((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        // CHANGE: annotate 'u' in find callbacks
        draftName: users.find((u: AdminUser) => u.id === id)?.name ?? "",
        draftRole: users.find((u: AdminUser) => u.id === id)?.role ?? "Coach",
        draftEmail: users.find((u: AdminUser) => u.id === id)?.email ?? "",
      },
    }));

  const saveEdit = (id: string) => {
    const d = local[id] as EditableUser | undefined;
    if (!d) return;

    updateUser(id, {
      // CHANGE: annotate 'u' in find callbacks
      name: (d.draftName ?? "").trim() || users.find((u: AdminUser) => u.id === id)?.name,
      role: (d.draftRole as UserRole) ?? users.find((u: AdminUser) => u.id === id)?.role,
      email:
        (d.draftEmail ?? "").trim() || users.find((u: AdminUser) => u.id === id)?.email,
    });

    setLocal((prev) => ({ ...prev, [id]: { ...prev[id], editing: false } }));
  };

  const removeUser = (id: string) => {
    if (confirm("Delete this user? This will remove them everywhere.")) {
      deleteUser(id);
      setLocal((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const inputCls =
    "w-full rounded-2xl border border-neutral-300 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary";
  const rowBtnCls = "btn-outline text-xs";

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-xl font-bold">Add a user</h2>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-1">
            <label className="block text-sm text-neutral-700">Name</label>
            <input
              className={inputCls}
              placeholder="e.g., Pat Jones"
              value={form.name}
              onChange={(e) => onFormChange("name", e.target.value)}
            />
          </div>

          <div className="sm:col-span-1">
            <label className="block text-sm text-neutral-700">Role</label>
            <select
              className={inputCls}
              value={form.role}
              onChange={(e) => onFormChange("role", e.target.value as UserRole)}
            >
              <option>Coach</option>
              <option>Player</option>
              <option>Team</option>
              <option>Facilitator</option>
              <option>Teacher</option>
            </select>
          </div>

          <div className="sm:col-span-1">
            <label className="block text-sm text-neutral-700">Email</label>
            <input
              className={inputCls}
              placeholder="name@example.com"
              value={form.email}
              onChange={(e) => onFormChange("email", e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4">
          <button
            className={cn("btn-primary", !canCreate && "opacity-50 pointer-events-none")}
            onClick={onCreate}
            disabled={!canCreate}
          >
            + Add user
          </button>
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 text-xl font-bold">Names</h2>

        <div className="divide-y rounded-2xl border">
          {/* CHANGE: annotate 'u' to EditableUser */}
          {merged.map((u: EditableUser) => (
            <div
              key={u.id}
              className="flex flex-col gap-2 p-3 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="flex-1">
                {!u.editing ? (
                  <>
                    <div className="font-medium text-ink">{u.name}</div>
                    <div className="text-xs text-neutral-500">
                      {u.role} • {u.email}
                    </div>
                  </>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-3">
                    <input
                      className={inputCls}
                      value={u.draftName ?? ""}
                      onChange={(e) =>
                        setLocal((prev) => ({
                          ...prev,
                          [u.id]: { ...prev[u.id], draftName: e.target.value },
                        }))
                      }
                      placeholder="Name"
                    />
                    <select
                      className={inputCls}
                      value={u.draftRole ?? "Coach"}
                      onChange={(e) =>
                        setLocal((prev) => ({
                          ...prev,
                          [u.id]: {
                            ...prev[u.id],
                            draftRole: e.target.value as UserRole,
                          },
                        }))
                      }
                    >
                      <option>Coach</option>
                      <option>Player</option>
                      <option>Team</option>
                      <option>Facilitator</option>
                      <option>Teacher</option>
                    </select>
                    <input
                      className={inputCls}
                      value={u.draftEmail ?? ""}
                      onChange={(e) =>
                        setLocal((prev) => ({
                          ...prev,
                          [u.id]: { ...prev[u.id], draftEmail: e.target.value },
                        }))
                      }
                      placeholder="Email"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-2 sm:ml-3 sm:mt-0">
                {!u.editing ? (
                  <button className={rowBtnCls} onClick={() => setLocal((p) => ({ ...p, [u.id]: { ...p[u.id], editing: true } }))}>
                    Edit
                  </button>
                ) : (
                  <>
                    <button className="btn-primary text-xs" onClick={() => saveEdit(u.id)}>
                      Save
                    </button>
                    <button className={cn(rowBtnCls, "text-red-600")} onClick={() => removeUser(u.id)}>
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

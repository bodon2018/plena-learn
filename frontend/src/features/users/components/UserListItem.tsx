"use client";

import { cn } from "@/lib/cn";
import { User, Edit2, Save, X, Trash2 } from "lucide-react";
import type { UserRole } from "@/hooks/useUsersStore";
import type { EditableUser } from "../hooks/useUsers";

type UserListItemProps = {
  user: EditableUser;
  roles: UserRole[];
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onUpdateDraft: (field: "name" | "role" | "email", value: string) => void;
  onSave: () => void;
  onDelete: () => void;
};

/**
 * Get role badge color.
 */
function getRoleColor(role: UserRole): { bg: string; text: string } {
  switch (role) {
    case "Coach":
      return { bg: "bg-primary/10", text: "text-primary" };
    case "Player":
      return { bg: "bg-success/10", text: "text-success" };
    case "Team":
      return { bg: "bg-secondary/10", text: "text-secondary" };
    default:
      return { bg: "bg-neutral-100", text: "text-mute" };
  }
}

/**
 * Single user row with view and edit modes.
 */
export default function UserListItem({
  user,
  roles,
  onStartEdit,
  onCancelEdit,
  onUpdateDraft,
  onSave,
  onDelete,
}: UserListItemProps) {
  const roleColors = getRoleColor(user.role);

  const inputStyles = cn(
    "w-full px-3 py-2 rounded-lg",
    "border border-neutral-200 bg-white",
    "text-body-sm text-ink",
    "focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
  );

  // Edit mode
  if (user.isEditing) {
    return (
      <div
        className={cn(
          "p-4 rounded-xl",
          "bg-primary/5 border border-primary/20"
        )}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          {/* Name input */}
          <div>
            <label className="block text-caption text-mute mb-1">Name</label>
            <input
              type="text"
              value={user.draftName}
              onChange={(e) => onUpdateDraft("name", e.target.value)}
              placeholder="Full name"
              className={inputStyles}
            />
          </div>

          {/* Role select */}
          <div>
            <label className="block text-caption text-mute mb-1">Role</label>
            <select
              value={user.draftRole}
              onChange={(e) => onUpdateDraft("role", e.target.value)}
              className={inputStyles}
            >
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>

          {/* Email input */}
          <div>
            <label className="block text-caption text-mute mb-1">Email</label>
            <input
              type="email"
              value={user.draftEmail}
              onChange={(e) => onUpdateDraft("email", e.target.value)}
              placeholder="email@example.com"
              className={inputStyles}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-4">
          <button
            type="button"
            onClick={onSave}
            className={cn(
              "inline-flex items-center gap-1.5",
              "px-4 py-2 rounded-lg",
              "bg-primary text-white",
              "text-caption font-medium",
              "transition-all duration-150",
              "hover:bg-primary/90"
            )}
          >
            <Save className="w-3.5 h-3.5" />
            Save
          </button>

          <button
            type="button"
            onClick={onCancelEdit}
            className={cn(
              "inline-flex items-center gap-1.5",
              "px-4 py-2 rounded-lg",
              "border border-neutral-200",
              "text-caption font-medium text-mute",
              "transition-all duration-150",
              "hover:bg-neutral-100 hover:text-ink"
            )}
          >
            <X className="w-3.5 h-3.5" />
            Cancel
          </button>

          <div className="flex-1" />

          <button
            type="button"
            onClick={onDelete}
            className={cn(
              "inline-flex items-center gap-1.5",
              "px-4 py-2 rounded-lg",
              "border border-danger/40 text-danger",
              "text-caption font-medium",
              "transition-all duration-150",
              "hover:bg-danger/5"
            )}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        </div>
      </div>
    );
  }

  // View mode
  return (
    <div
      className={cn(
        "flex items-center gap-4 p-4",
        "rounded-xl",
        "border border-neutral-200",
        "hover:border-neutral-300 hover:bg-neutral-50",
        "transition-all duration-150"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "w-10 h-10 rounded-full",
          "flex items-center justify-center",
          "bg-neutral-100",
          "flex-shrink-0"
        )}
      >
        <User className="w-5 h-5 text-mute" />
      </div>

      {/* User info */}
      <div className="flex-1 min-w-0">
        <p className="text-body-sm font-medium text-ink truncate">
          {user.name}
        </p>
        <p className="text-caption text-mute truncate mt-0.5">
          {user.email}
        </p>
      </div>

      {/* Role badge */}
      <span
        className={cn(
          "px-3 py-1 rounded-lg",
          "text-caption font-medium",
          roleColors.bg,
          roleColors.text
        )}
      >
        {user.role}
      </span>

      {/* Edit button */}
      <button
        type="button"
        onClick={onStartEdit}
        className={cn(
          "p-2 rounded-lg",
          "text-mute",
          "transition-all duration-150",
          "hover:bg-neutral-100 hover:text-ink"
        )}
        title="Edit user"
      >
        <Edit2 className="w-4 h-4" />
      </button>
    </div>
  );
}

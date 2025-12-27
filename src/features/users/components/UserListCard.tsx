"use client";

import { cn } from "@/lib/cn";
import { Users } from "lucide-react";
import AdminCard from "@/components/ui/AdminCard";
import UserListItem from "./UserListItem";
import type { UserRole } from "@/hooks/useUsersStore";
import type { EditableUser } from "../hooks/useUsers";

type UserListCardProps = {
  users: EditableUser[];
  roles: UserRole[];
  onStartEdit: (id: string) => void;
  onCancelEdit: (id: string) => void;
  onUpdateDraft: (id: string, field: "name" | "role" | "email", value: string) => void;
  onSave: (id: string) => void;
  onDelete: (id: string) => void;
};

/**
 * Card displaying the list of users.
 */
export default function UserListCard({
  users,
  roles,
  onStartEdit,
  onCancelEdit,
  onUpdateDraft,
  onSave,
  onDelete,
}: UserListCardProps) {
  return (
    <AdminCard
      title="Team Members"
      description={`${users.length} ${users.length === 1 ? "member" : "members"} in your organization`}
    >
      {/* Empty state */}
      {users.length === 0 && (
        <div className="text-center py-12">
          <div
            className={cn(
              "w-16 h-16 rounded-full mx-auto mb-4",
              "bg-neutral-100",
              "flex items-center justify-center"
            )}
          >
            <Users className="w-8 h-8 text-mute" />
          </div>
          <p className="text-body text-mute">No users yet</p>
          <p className="text-body-sm text-subtle mt-1">
            Add your first team member above
          </p>
        </div>
      )}

      {/* User list */}
      {users.length > 0 && (
        <div className="space-y-3">
          {users.map((user) => (
            <UserListItem
              key={user.id}
              user={user}
              roles={roles}
              onStartEdit={() => onStartEdit(user.id)}
              onCancelEdit={() => onCancelEdit(user.id)}
              onUpdateDraft={(field, value) => onUpdateDraft(user.id, field, value)}
              onSave={() => onSave(user.id)}
              onDelete={() => onDelete(user.id)}
            />
          ))}
        </div>
      )}
    </AdminCard>
  );
}
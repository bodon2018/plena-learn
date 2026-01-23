"use client";

import { useUsers } from "./hooks/useUsers";
import AddUserCard from "./components/AddUserCard";
import UserListCard from "./components/UserListCard";

/**
 * Users management screen.
 * 
 * Features:
 * - Add new users with name, role, and email
 * - View list of all users with role badges
 * - Inline editing of user details
 * - Delete users with confirmation
 */
export default function UsersScreen() {
  const users = useUsers();

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-heading-1 text-ink">Users</h1>
        <p className="text-body text-mute mt-1">
          Manage team members and their roles
        </p>
      </div>

      {/* Add user form */}
      <AddUserCard
        form={users.form}
        onFieldChange={users.setFormField}
        canCreate={users.canCreate}
        onCreate={users.createUser}
        roles={users.roles}
      />

      {/* User list */}
      <UserListCard
        users={users.users}
        roles={users.roles}
        onStartEdit={users.startEditing}
        onCancelEdit={users.cancelEditing}
        onUpdateDraft={users.updateDraft}
        onSave={users.saveUser}
        onDelete={users.deleteUser}
      />
    </div>
  );
}
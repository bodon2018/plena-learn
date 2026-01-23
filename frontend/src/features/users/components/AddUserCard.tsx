"use client";

import { cn } from "@/lib/cn";
import { UserPlus } from "lucide-react";
import AdminCard from "@/components/ui/AdminCard";
import FormField from "@/components/ui/FormField";
import type { UserRole } from "@/hooks/useUsersStore";

type AddUserCardProps = {
  form: {
    name: string;
    role: UserRole;
    email: string;
  };
  onFieldChange: <K extends keyof AddUserCardProps["form"]>(
    key: K,
    value: AddUserCardProps["form"][K]
  ) => void;
  canCreate: boolean;
  onCreate: () => void;
  roles: UserRole[];
};

/**
 * Card for adding a new user.
 */
export default function AddUserCard({
  form,
  onFieldChange,
  canCreate,
  onCreate,
  roles,
}: AddUserCardProps) {
  return (
    <AdminCard
      title="Add User"
      description="Create a new user account for your organization"
    >
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Name */}
        <FormField
          type="text"
          label="Name"
          required
          placeholder="e.g., Pat Jones"
          value={form.name}
          onChange={(e) => onFieldChange("name", e.target.value)}
        />

        {/* Role */}
        <FormField
          type="select"
          label="Role"
          required
          value={form.role}
          onChange={(e) => onFieldChange("role", e.target.value as UserRole)}
        >
          {roles.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </FormField>

        {/* Email */}
        <FormField
          type="email"
          label="Email"
          required
          placeholder="name@example.com"
          value={form.email}
          onChange={(e) => onFieldChange("email", e.target.value)}
        />
      </div>

      <div className="mt-6">
        <button
          type="button"
          onClick={onCreate}
          disabled={!canCreate}
          className={cn(
            "inline-flex items-center gap-2",
            "px-5 py-2.5 rounded-xl",
            "bg-primary text-white",
            "text-ui font-semibold",
            "shadow-soft hover:shadow-lift",
            "transition-all duration-150",
            "active:scale-[0.98]",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          <UserPlus className="w-4 h-4" />
          Add User
        </button>
      </div>
    </AdminCard>
  );
}
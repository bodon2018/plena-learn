"use client";

import { cn } from "@/lib/cn";
import { UserPlus, Loader2, AlertCircle } from "lucide-react";
import type { CreateUserForm as CreateUserFormType, UserRole } from "../hooks/useUsers";

type CreateUserFormProps = {
  form: CreateUserFormType;
  onFieldChange: <K extends keyof CreateUserFormType>(field: K, value: CreateUserFormType[K]) => void;
  canCreate: boolean;
  isCreating: boolean;
  error: string | null;
  onSubmit: () => void;
};

const ROLE_OPTIONS: Array<{ value: UserRole; label: string }> = [
  { value: "coach", label: "Coach" },
  { value: "player", label: "Player" },
  { value: "assistant", label: "Assistant" },
];

/**
 * Form for creating a new user.
 */
export default function CreateUserForm({
  form,
  onFieldChange,
  canCreate,
  isCreating,
  error,
  onSubmit,
}: CreateUserFormProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Name input */}
        <div className="flex-1">
          <input
            type="text"
            value={form.name}
            onChange={(e) => onFieldChange("name", e.target.value)}
            placeholder="Name (e.g., Coach Smith)"
            className={cn(
              "w-full px-4 py-3 rounded-xl",
              "border border-neutral-200",
              "text-body text-ink",
              "placeholder:text-subtle",
              "focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10",
              "transition-all duration-150"
            )}
          />
        </div>

        {/* Role select */}
        <div className="sm:w-40">
          <select
            value={form.role}
            onChange={(e) => onFieldChange("role", e.target.value as UserRole)}
            className={cn(
              "w-full px-4 py-3 rounded-xl",
              "border border-neutral-200",
              "text-body text-ink",
              "bg-white",
              "focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10",
              "transition-all duration-150"
            )}
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={!canCreate}
          className={cn(
            "inline-flex items-center justify-center gap-2",
            "px-5 py-3 rounded-xl",
            "bg-primary text-white",
            "text-ui font-semibold",
            "shadow-soft hover:shadow-lift",
            "transition-all duration-150",
            "active:scale-[0.98]",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
            "sm:w-auto"
          )}
        >
          {isCreating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <UserPlus className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">Add User</span>
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div
          className={cn(
            "flex items-start gap-2 p-3 rounded-xl",
            "bg-danger/5 border border-danger/20"
          )}
        >
          <AlertCircle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
          <p className="text-body-sm text-danger">{error}</p>
        </div>
      )}
    </form>
  );
}  
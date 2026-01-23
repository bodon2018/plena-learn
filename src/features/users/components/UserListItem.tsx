"use client";

import { cn } from "@/lib/cn";
import { User as UserIcon, Mic, Trash2, Loader2, CheckCircle, XCircle } from "lucide-react";
import type { User } from "../hooks/useUsers";

type UserListItemProps = {
  user: User;
  isDeleting: boolean;
  isUploadingFingerprint: boolean;
  onRecordFingerprint: () => void;
  onDelete: () => void;
};

/**
 * Format role for display.
 */
function formatRole(role: string | null): string {
  if (!role) return "User";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

/**
 * Single user item in the users list.
 */
export default function UserListItem({
  user,
  isDeleting,
  isUploadingFingerprint,
  onRecordFingerprint,
  onDelete,
}: UserListItemProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 p-4",
        "rounded-xl",
        "border border-neutral-200",
        "bg-white",
        "transition-all duration-150",
        (isDeleting || isUploadingFingerprint) && "opacity-60"
      )}
    >
      {/* Avatar / Icon */}
      <div
        className={cn(
          "w-12 h-12 rounded-full",
          "flex items-center justify-center",
          "flex-shrink-0",
          "bg-primary/10"
        )}
      >
        <UserIcon className="w-6 h-6 text-primary" />
      </div>

      {/* User info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-body font-semibold text-ink truncate">
            {user.name}
          </p>
          <span
            className={cn(
              "px-2 py-0.5 rounded-md",
              "text-caption font-medium",
              "bg-neutral-100 text-mute"
            )}
          >
            {formatRole(user.role)}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-caption text-subtle">
            @{user.user_id}
          </span>
          {/* Fingerprint status */}
          <span
            className={cn(
              "inline-flex items-center gap-1",
              "text-caption",
              user.has_fingerprint ? "text-success" : "text-mute"
            )}
          >
            {user.has_fingerprint ? (
              <>
                <CheckCircle className="w-3 h-3" />
                Voice recorded
              </>
            ) : (
              <>
                <XCircle className="w-3 h-3" />
                No voice sample
              </>
            )}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Record fingerprint button */}
        <button
          type="button"
          onClick={onRecordFingerprint}
          disabled={isDeleting || isUploadingFingerprint}
          className={cn(
            "inline-flex items-center gap-1.5",
            "px-3 py-2 rounded-lg",
            "text-caption font-medium",
            "transition-all duration-150",
            user.has_fingerprint
              ? "border border-neutral-200 text-mute hover:bg-neutral-50 hover:text-ink"
              : "bg-secondary/10 text-secondary hover:bg-secondary/20"
          )}
        >
          {isUploadingFingerprint ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Mic className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">
            {user.has_fingerprint ? "Re-record" : "Record Voice"}
          </span>
        </button>

        {/* Delete button */}
        <button
          type="button"
          onClick={onDelete}
          disabled={isDeleting || isUploadingFingerprint}
          className={cn(
            "p-2 rounded-lg",
            "text-mute",
            "transition-all duration-150",
            "hover:bg-danger/5 hover:text-danger",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
          title="Delete user"
        >
          {isDeleting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}
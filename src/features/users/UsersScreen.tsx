"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/cn";
import { Users, RefreshCw, Loader2, AlertCircle } from "lucide-react";
import Card from "@/components/ui/Card";
import { useUsers } from "./hooks/useUsers";
import CreateUserForm from "./components/CreateUserForm";
import UserListItem from "./components/UserListItem";
import FingerprintRecorder from "./components/FingerprintRecorder";

/**
 * Users management screen for admin.
 * 
 * Features:
 * - List all users in the organization
 * - Create new users with name and role
 * - Record voice fingerprints for speaker identification
 * - Delete users
 */
export default function UsersScreen() {
  const users = useUsers();

  // Fingerprint recording modal state
  const [recordingForUser, setRecordingForUser] = useState<{
    userId: string;
    userName: string;
    hasFingerprint: boolean;
  } | null>(null);

  // Handle opening fingerprint recorder
  const handleOpenRecorder = useCallback(
    (userId: string, userName: string, hasFingerprint: boolean) => {
      setRecordingForUser({ userId, userName, hasFingerprint });
    },
    []
  );

  // Handle closing fingerprint recorder
  const handleCloseRecorder = useCallback(() => {
    setRecordingForUser(null);
  }, []);

  // Handle fingerprint upload
  const handleFingerprintUpload = useCallback(
    async (userId: string, audioBlob: Blob) => {
      await users.uploadFingerprint(userId, audioBlob);
      // Close modal on success
      if (!users.fingerprintError) {
        setRecordingForUser(null);
      }
    },
    [users]
  );

  // Handle delete user with confirmation
  const handleDeleteUser = useCallback(
    (userId: string, userName: string) => {
      if (confirm(`Delete user "${userName}"? This action cannot be undone.`)) {
        users.deleteUser(userId);
      }
    },
    [users]
  );

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-heading-1 text-ink">Users</h1>
        <p className="text-body text-mute mt-1">
          Manage team members and their voice fingerprints for speaker identification
        </p>
      </div>

      {/* Create user section */}
      <Card>
        <div className="space-y-4">
          <div>
            <h2 className="text-heading-3 text-ink mb-1">Add New User</h2>
            <p className="text-body-sm text-mute">
              Create a new team member. You can record their voice fingerprint after adding them.
            </p>
          </div>

          <CreateUserForm
            form={users.createForm}
            onFieldChange={users.setCreateFormField}
            canCreate={users.canCreate}
            isCreating={users.isCreating}
            error={users.createError}
            onSubmit={users.createUser}
          />
        </div>
      </Card>

      {/* Users list section */}
      <Card>
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-heading-3 text-ink">Team Members</h2>
              <p className="text-body-sm text-mute mt-1">
                {users.users.length} {users.users.length === 1 ? "user" : "users"} in your organization
              </p>
            </div>
            <button
              type="button"
              onClick={users.refreshUsers}
              disabled={users.isLoading}
              className={cn(
                "inline-flex items-center gap-1.5",
                "px-3 py-1.5 rounded-lg",
                "text-caption font-medium text-mute",
                "border border-neutral-200",
                "hover:bg-neutral-50 hover:text-ink",
                "transition-all duration-150",
                "disabled:opacity-50"
              )}
            >
              <RefreshCw className={cn("w-3.5 h-3.5", users.isLoading && "animate-spin")} />
              Refresh
            </button>
          </div>

          {/* Delete error */}
          {users.deleteError && (
            <div
              className={cn(
                "flex items-start gap-2 p-3 rounded-xl",
                "bg-danger/5 border border-danger/20"
              )}
            >
              <AlertCircle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
              <p className="text-body-sm text-danger">{users.deleteError}</p>
            </div>
          )}

          {/* Fingerprint error */}
          {users.fingerprintError && (
            <div
              className={cn(
                "flex items-start gap-2 p-3 rounded-xl",
                "bg-danger/5 border border-danger/20"
              )}
            >
              <AlertCircle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
              <p className="text-body-sm text-danger">{users.fingerprintError}</p>
            </div>
          )}

          {/* Loading state */}
          {users.isLoading && users.users.length === 0 && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          )}

          {/* Error state */}
          {users.error && !users.isLoading && (
            <div
              className={cn(
                "flex items-start gap-2 p-3 rounded-xl",
                "bg-danger/5 border border-danger/20"
              )}
            >
              <AlertCircle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
              <p className="text-body-sm text-danger">{users.error}</p>
            </div>
          )}

          {/* Empty state */}
          {!users.isLoading && !users.error && users.users.length === 0 && (
            <div
              className={cn(
                "text-center py-12 rounded-xl",
                "bg-neutral-50 border border-dashed border-neutral-200"
              )}
            >
              <div
                className={cn(
                  "w-14 h-14 rounded-full mx-auto mb-4",
                  "bg-neutral-100",
                  "flex items-center justify-center"
                )}
              >
                <Users className="w-7 h-7 text-mute" />
              </div>
              <p className="text-body-sm text-mute">No users yet</p>
              <p className="text-caption text-subtle mt-1">
                Add your first team member using the form above
              </p>
            </div>
          )}

          {/* Users list */}
          {users.users.length > 0 && (
            <div className="space-y-3">
              {users.users.map((user) => (
                <UserListItem
                  key={user.user_id}
                  user={user}
                  isDeleting={users.deletingIds.has(user.user_id)}
                  isUploadingFingerprint={users.uploadingFingerprintFor === user.user_id}
                  onRecordFingerprint={() =>
                    handleOpenRecorder(user.user_id, user.name, user.has_fingerprint)
                  }
                  onDelete={() => handleDeleteUser(user.user_id, user.name)}
                />
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Fingerprint recorder modal */}
      {recordingForUser && (
        <FingerprintRecorder
          userId={recordingForUser.userId}
          userName={recordingForUser.userName}
          hasFingerprint={recordingForUser.hasFingerprint}
          isUploading={users.uploadingFingerprintFor === recordingForUser.userId}
          onUpload={handleFingerprintUpload}
          onClose={handleCloseRecorder}
        />
      )}
    </div>
  );
}
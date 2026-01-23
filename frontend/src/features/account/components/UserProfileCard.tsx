"use client";

import { cn } from "@/lib/cn";
import { User } from "lucide-react";

type UserProfileCardProps = {
  /** User's display name */
  name?: string;
  /** User's email */
  email?: string;
  /** User's avatar URL */
  avatarUrl?: string | null;
};

/**
 * Card showing the user's profile information.
 */
export default function UserProfileCard({
  name = "Athlete",
  email = "athlete@example.com",
  avatarUrl,
}: UserProfileCardProps) {
  return (
    <div
      className={cn(
        "rounded-3xl",
        "bg-gradient-to-br from-primary to-sky",
        "p-6",
        "text-white",
        "shadow-lift"
      )}
    >
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div
          className={cn(
            "w-16 h-16 rounded-full",
            "bg-white/20",
            "flex items-center justify-center",
            "overflow-hidden",
            "ring-2 ring-white/30"
          )}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name}
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="w-8 h-8 text-white/80" />
          )}
        </div>

        {/* User info */}
        <div className="flex-1 min-w-0">
          <h2 className="text-heading-3 text-white truncate">
            {name}
          </h2>
          <p className="text-body-sm text-white/70 truncate mt-0.5">
            {email}
          </p>
        </div>
      </div>

      {/* Welcome message */}
      <div className="mt-4 pt-4 border-t border-white/20">
        <p className="text-body-sm text-white/80">
          Welcome back! Track your progress and keep improving.
        </p>
      </div>
    </div>
  );
}
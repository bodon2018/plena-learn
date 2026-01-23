"use client";

import { cn } from "@/lib/cn";
import { Shield } from "lucide-react";

type AdminProfileCardProps = {
  /** Admin's display name */
  name?: string;
  /** Admin's email */
  email?: string;
  /** Organization name */
  organization?: string;
  /** Admin's avatar URL */
  avatarUrl?: string | null;
};

/**
 * Card showing the admin's profile information.
 */
export default function AdminProfileCard({
  name = "Admin",
  email = "admin@example.com",
  organization = "Your Organization",
  avatarUrl,
}: AdminProfileCardProps) {
  return (
    <div
      className={cn(
        "rounded-3xl",
        "bg-gradient-to-br from-neutral-800 to-neutral-900",
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
            "bg-white/10",
            "flex items-center justify-center",
            "overflow-hidden",
            "ring-2 ring-white/20"
          )}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name}
              className="w-full h-full object-cover"
            />
          ) : (
            <Shield className="w-8 h-8 text-white/80" />
          )}
        </div>

        {/* Admin info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-heading-3 text-white truncate">
              {name}
            </h2>
            <span
              className={cn(
                "px-2 py-0.5 rounded-md",
                "text-caption-sm font-semibold uppercase",
                "bg-primary text-white"
              )}
            >
              Admin
            </span>
          </div>
          <p className="text-body-sm text-white/70 truncate mt-0.5">
            {email}
          </p>
        </div>
      </div>

      {/* Organization & welcome message */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <p className="text-caption text-white/50 uppercase tracking-wide">
          Organization
        </p>
        <p className="text-body font-medium text-white mt-1">
          {organization}
        </p>
        <p className="text-body-sm text-white/60 mt-3">
          Welcome back! Manage your organization settings and team from here.
        </p>
      </div>
    </div>
  );
}

"use client";

import { cn } from "@/lib/cn";
import { ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type AccountMenuItemProps = {
  /** Icon to display */
  icon: LucideIcon;
  /** Main label */
  label: string;
  /** Description text */
  description: string;
  /** Optional onClick handler */
  onClick?: () => void;
  /** Whether this is a destructive action (e.g., logout) */
  variant?: "default" | "danger";
};

/**
 * Reusable menu item for account sections.
 */
export default function AccountMenuItem({
  icon: Icon,
  label,
  description,
  onClick,
  variant = "default",
}: AccountMenuItemProps) {
  const isDanger = variant === "danger";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        // Layout
        "w-full flex items-center gap-4 p-4",
        "rounded-2xl",
        // Background
        "bg-white",
        "border border-neutral-200/80",
        // Hover state
        "transition-all duration-150",
        "hover:shadow-soft",
        isDanger
          ? "hover:border-danger/40 hover:bg-danger/[0.02]"
          : "hover:border-neutral-300",
        // Active state
        "active:scale-[0.99]",
        // Text alignment
        "text-left"
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "w-10 h-10 rounded-xl",
          "flex items-center justify-center",
          "flex-shrink-0",
          isDanger
            ? "bg-danger/10 text-danger"
            : "bg-primary/10 text-primary"
        )}
      >
        <Icon className="w-5 h-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-body-sm font-semibold",
            isDanger ? "text-danger" : "text-ink"
          )}
        >
          {label}
        </p>
        <p className="text-caption text-mute mt-0.5">
          {description}
        </p>
      </div>

      {/* Chevron */}
      <ChevronRight
        className={cn(
          "w-5 h-5 flex-shrink-0",
          isDanger ? "text-danger/40" : "text-neutral-300"
        )}
      />
    </button>
  );
}
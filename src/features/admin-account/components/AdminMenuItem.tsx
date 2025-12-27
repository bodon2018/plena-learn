"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";
import { ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type AdminMenuItemProps = {
  /** Link destination */
  href: string;
  /** Icon to display */
  icon: LucideIcon;
  /** Main label */
  label: string;
  /** Description text */
  description: string;
  /** Whether this is a destructive action (e.g., logout) */
  variant?: "default" | "danger";
  /** If true, renders as button instead of link */
  asButton?: boolean;
  /** Click handler for button variant */
  onClick?: () => void;
};

/**
 * Reusable menu item for admin account sections.
 */
export default function AdminMenuItem({
  href,
  icon: Icon,
  label,
  description,
  variant = "default",
  asButton = false,
  onClick,
}: AdminMenuItemProps) {
  const isDanger = variant === "danger";

  const content = (
    <>
      {/* Icon */}
      <div
        className={cn(
          "w-11 h-11 rounded-xl",
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
            "text-body font-semibold",
            isDanger ? "text-danger" : "text-ink"
          )}
        >
          {label}
        </p>
        <p className="text-body-sm text-mute mt-0.5">
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
    </>
  );

  const sharedStyles = cn(
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
  );

  if (asButton) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={sharedStyles}
      >
        {content}
      </button>
    );
  }

  return (
    <Link href={href} className={sharedStyles}>
      {content}
    </Link>
  );
}
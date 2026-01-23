import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

type AdminCardProps = {
  /** Card title */
  title?: string;
  /** Card description */
  description?: string;
  /** Additional header content (e.g., action buttons) */
  headerActions?: ReactNode;
  /** Card contents */
  children: ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Whether to include padding in the body */
  padded?: boolean;
};

/**
 * Admin-optimized card component.
 * 
 * Features:
 * - Optional title and description header
 * - Action slot in header for buttons
 * - Clean, professional styling
 * - Flexible padding options
 */
export default function AdminCard({
  title,
  description,
  headerActions,
  children,
  className,
  padded = true,
}: AdminCardProps) {
  const hasHeader = title || description || headerActions;

  return (
    <div
      className={cn(
        "rounded-2xl",
        "border border-neutral-200/80",
        "bg-white",
        "shadow-soft",
        className
      )}
    >
      {/* Header */}
      {hasHeader && (
        <div
          className={cn(
            "px-6 py-4",
            "border-b border-neutral-100",
            "flex items-start justify-between gap-4"
          )}
        >
          <div className="flex-1 min-w-0">
            {title && (
              <h2 className="text-heading-3 text-ink">{title}</h2>
            )}
            {description && (
              <p className="text-body-sm text-mute mt-1">{description}</p>
            )}
          </div>
          {headerActions && (
            <div className="flex-shrink-0 flex items-center gap-2">
              {headerActions}
            </div>
          )}
        </div>
      )}

      {/* Body */}
      <div className={cn(padded && "p-6")}>
        {children}
      </div>
    </div>
  );
}
"use client";

import { cn } from "@/lib/cn";
import { Bookmark, FileText } from "lucide-react";
import { formatTime } from "../hooks/useMediaPlayer";

type Annotation = {
  id?: number;
  media_file_id?: number;
  kind: "bookmark" | "note";
  timestamp_ms: number;
  text?: string | null;
  created_at?: string;
};

type AnnotationItemProps = {
  /** The annotation data */
  annotation: Annotation;
  /** Callback when user clicks to jump to this timestamp */
  onJump: (annotation: Annotation) => void;
};

/**
 * Single annotation item (bookmark or note).
 * 
 * Clickable card that jumps to the timestamp when tapped.
 * Shows different styling for bookmarks vs notes.
 */
export default function AnnotationItem({
  annotation,
  onJump,
}: AnnotationItemProps) {
  const isBookmark = annotation.kind === "bookmark";
  const timestampLabel = formatTime((annotation.timestamp_ms ?? 0) / 1000);

  // Format the creation date nicely
  const dateLabel = annotation.created_at
    ? new Date(annotation.created_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <button
      type="button"
      onClick={() => onJump(annotation)}
      className={cn(
        // Layout
        "w-full flex items-start gap-3 p-4",
        "rounded-2xl",
        // Border and background
        "border border-neutral-200/80",
        "bg-white",
        // Hover state
        "hover:border-primary/40 hover:bg-primary/[0.02]",
        "hover:shadow-soft",
        // Active state
        "active:scale-[0.99]",
        // Transition
        "transition-all duration-150",
        // Text alignment
        "text-left"
      )}
    >
      {/* Icon badge */}
      <div
        className={cn(
          "flex-shrink-0",
          "w-10 h-10 rounded-xl",
          "flex items-center justify-center",
          isBookmark
            ? "bg-sky/10 text-sky"
            : "bg-secondary/10 text-secondary"
        )}
      >
        {isBookmark ? (
          <Bookmark className="w-5 h-5" />
        ) : (
          <FileText className="w-5 h-5" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header row with type and date */}
        <div className="flex items-center justify-between gap-2 mb-1">
          <span
            className={cn(
              "text-caption-sm font-semibold uppercase tracking-wide",
              isBookmark ? "text-sky" : "text-secondary"
            )}
          >
            {isBookmark ? "Bookmark" : "Note"}
          </span>
          {dateLabel && (
            <span className="text-caption text-subtle">
              {dateLabel}
            </span>
          )}
        </div>

        {/* Timestamp */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-body-sm font-medium text-ink">
            {timestampLabel}
          </span>
          <span className="text-caption text-subtle">
            tap to jump
          </span>
        </div>

        {/* Note text (if present) */}
        {annotation.text && (
          <p className="text-body-sm text-mute line-clamp-2">
            {annotation.text}
          </p>
        )}
      </div>
    </button>
  );
}
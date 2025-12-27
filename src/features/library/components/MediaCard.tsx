"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";
import { Film, Mic, Trash2, Play, Upload, Calendar } from "lucide-react";
import {
  type MediaItem,
  getMediaUrl,
  formatDateLabel,
  formatContextLabel,
} from "../hooks/useLibrary";

type MediaCardProps = {
  /** The media item to display */
  item: MediaItem;
  /** Callback to delete this item */
  onDelete: (id: number) => void;
  /** Whether this item is currently being deleted */
  isDeleting: boolean;
};

/**
 * Card component for a single media item in the library.
 */
export default function MediaCard({ item, onDelete, isDeleting }: MediaCardProps) {
  const url = getMediaUrl(item);
  const isVideo = (item.recording_mode ?? "").toLowerCase() === "video";
  const isAudio = (item.recording_mode ?? "").toLowerCase() === "audio";
  const isUpload = (item.media_type ?? "").toLowerCase() === "upload";

  const contextLabel = formatContextLabel(item.session_context);
  const createdLabel = formatDateLabel(item.created_at);

  // Build the Learn page URL
  const learnHref = url
    ? `/user/learn?mediaId=${encodeURIComponent(String(item.id))}&mediaUrl=${encodeURIComponent(url)}`
    : `/user/learn?mediaId=${encodeURIComponent(String(item.id))}`;

  return (
    <div
      className={cn(
        "group",
        "rounded-2xl",
        "border border-neutral-200/80",
        "bg-white",
        "overflow-hidden",
        "transition-all duration-200",
        "hover:shadow-soft hover:border-neutral-300"
      )}
    >
      {/* Card content */}
      <div className="p-4">
        {/* Top row: badges */}
        <div className="flex items-center gap-2 mb-3">
          {/* Context badge */}
          <span
            className={cn(
              "inline-flex items-center gap-1.5",
              "px-2.5 py-1 rounded-lg",
              "text-caption-sm font-semibold uppercase tracking-wide",
              item.session_context === "game"
                ? "bg-secondary/10 text-secondary"
                : "bg-primary/10 text-primary"
            )}
          >
            {contextLabel}
          </span>

          {/* Media type badge */}
          {isVideo && (
            <span
              className={cn(
                "inline-flex items-center gap-1",
                "px-2 py-1 rounded-lg",
                "bg-sky/10 text-sky",
                "text-caption-sm font-medium"
              )}
            >
              <Film className="w-3 h-3" />
              Video
            </span>
          )}

          {isAudio && !isVideo && (
            <span
              className={cn(
                "inline-flex items-center gap-1",
                "px-2 py-1 rounded-lg",
                "bg-success/10 text-success",
                "text-caption-sm font-medium"
              )}
            >
              <Mic className="w-3 h-3" />
              Audio
            </span>
          )}

          {isUpload && (
            <span
              className={cn(
                "inline-flex items-center gap-1",
                "px-2 py-1 rounded-lg",
                "bg-neutral-100 text-mute",
                "text-caption-sm font-medium"
              )}
            >
              <Upload className="w-3 h-3" />
              Upload
            </span>
          )}
        </div>

        {/* Date */}
        {createdLabel && (
          <div className="flex items-center gap-1.5 text-caption text-mute mb-2">
            <Calendar className="w-3.5 h-3.5" />
            <span>{createdLabel}</span>
          </div>
        )}

        {/* Filename (truncated) */}
        <p className="text-body-sm text-ink font-medium truncate mb-4">
          {item.filename}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Open in Learn - Primary action */}
          <Link
            href={learnHref}
            className={cn(
              "flex-1",
              "inline-flex items-center justify-center gap-2",
              "px-4 py-2.5 rounded-xl",
              "bg-primary text-white",
              "text-ui font-semibold",
              "transition-all duration-150",
              "hover:bg-primary/90",
              "active:scale-[0.98]"
            )}
          >
            <Play className="w-4 h-4" />
            Open
          </Link>

          {/* Delete button */}
          <button
            type="button"
            onClick={() => onDelete(item.id)}
            disabled={isDeleting}
            className={cn(
              "p-2.5 rounded-xl",
              "border border-neutral-200",
              "text-mute",
              "transition-all duration-150",
              "hover:border-danger/40 hover:bg-danger/5 hover:text-danger",
              "active:scale-[0.98]",
              "disabled:opacity-50"
            )}
            aria-label="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
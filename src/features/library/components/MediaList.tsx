"use client";

import { cn } from "@/lib/cn";
import { Loader2 } from "lucide-react";
import type { MediaItem } from "../hooks/useLibrary";
import MediaCard from "./MediaCard";
import EmptyLibrary from "./EmptyLibrary";

type MediaListProps = {
  /** List of media items to display */
  items: MediaItem[];
  /** Whether the list is loading */
  isLoading: boolean;
  /** ID of item currently being deleted */
  deletingId: number | null;
  /** Callback to delete an item */
  onDelete: (id: number) => void;
  /** Callback to trigger upload (for empty state) */
  onUpload: () => void;
  /** Whether upload is in progress */
  isUploading: boolean;
};

/**
 * List/grid of media items with loading and empty states.
 */
export default function MediaList({
  items,
  isLoading,
  deletingId,
  onDelete,
  onUpload,
  isUploading,
}: MediaListProps) {
  // Loading state
  if (isLoading) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-3",
          "py-16",
          "text-mute"
        )}
      >
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="text-body-sm">Loading your library...</span>
      </div>
    );
  }

  // Empty state
  if (items.length === 0) {
    return <EmptyLibrary onUpload={onUpload} isUploading={isUploading} />;
  }

  // Grid of items
  return (
    <div
      className={cn(
        "grid gap-4",
        // Single column on mobile, 2 columns on larger screens
        "grid-cols-1 sm:grid-cols-2"
      )}
    >
      {items.map((item, index) => (
        <div
          key={item.id}
          className="animate-fade-up"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <MediaCard
            item={item}
            onDelete={onDelete}
            isDeleting={deletingId === item.id}
          />
        </div>
      ))}
    </div>
  );
}
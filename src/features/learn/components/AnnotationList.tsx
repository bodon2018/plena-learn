"use client";

import { useMemo } from "react";
import { cn } from "@/lib/cn";
import { Bookmark, Loader2 } from "lucide-react";
import AnnotationItem from "./AnnotationItem";

type Reply = {
  id: number;
  author_name: string;
  text: string;
  created_at?: string;
};

type Annotation = {
  id?: number;
  media_file_id?: number;
  kind: "bookmark" | "note";
  timestamp_ms: number;
  text?: string | null;
  created_at?: string;
  author_name?: string;
  replies?: Reply[];
};

type AnnotationListProps = {
  /** Array of annotations to display */
  annotations: Annotation[];
  /** Whether annotations are currently loading */
  isLoading: boolean;
  /** Error message if loading failed */
  error: string | null;
  /** Callback when user clicks an annotation to jump to timestamp */
  onJump: (annotation: Annotation) => void;
  /** Callback to delete an annotation */
  onDelete?: (annotationId: number) => void;
  /** Set of annotation IDs currently being deleted */
  deletingAnnotations?: Set<number>;
  /** Callback to add a reply to an annotation */
  onAddReply?: (annotationId: number, text: string) => Promise<void>;
};

/**
 * List of all annotations (bookmarks and notes) for the current media.
 * 
 * Handles:
 * - Loading state
 * - Error state
 * - Empty state
 * - Sorted list of annotations
 * - Delete functionality
 * - Team replies display and input
 */
export default function AnnotationList({
  annotations,
  isLoading,
  error,
  onJump,
  onDelete,
  deletingAnnotations = new Set(),
  onAddReply,
}: AnnotationListProps) {
  // Sort annotations by timestamp
  const sortedAnnotations = useMemo(
    () =>
      [...annotations].sort((a, b) => {
        const tA = a.timestamp_ms ?? 0;
        const tB = b.timestamp_ms ?? 0;
        if (tA !== tB) return tA - tB;
        return (a.id ?? 0) - (b.id ?? 0);
      }),
    [annotations]
  );

  const itemLabel = sortedAnnotations.length === 1 ? "item" : "items";

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <h2 className="text-heading-3 text-ink">Bookmarks & Notes</h2>
        {sortedAnnotations.length > 0 && (
          <span className="text-caption text-mute">
            {sortedAnnotations.length} {itemLabel}
          </span>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div
          className={cn(
            "flex items-center justify-center gap-3",
            "py-12",
            "text-mute"
          )}
        >
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-body-sm">Loading annotations…</span>
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div
          className={cn(
            "rounded-2xl",
            "bg-danger/5 border border-danger/20",
            "p-4",
            "text-body-sm text-danger"
          )}
        >
          {error}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && sortedAnnotations.length === 0 && (
        <div
          className={cn(
            "rounded-2xl",
            "bg-neutral-50 border border-neutral-200/60",
            "p-8",
            "text-center"
          )}
        >
          <div
            className={cn(
              "w-12 h-12 rounded-full",
              "bg-neutral-100",
              "flex items-center justify-center",
              "mx-auto mb-4"
            )}
          >
            <Bookmark className="w-6 h-6 text-mute" />
          </div>
          <p className="text-body-sm text-mute">No bookmarks or notes yet.</p>
          <p className="text-caption text-subtle mt-1">
            Play the recording and add bookmarks at moments you want to revisit.
          </p>
        </div>
      )}

      {/* Annotations list */}
      {!isLoading && !error && sortedAnnotations.length > 0 && (
        <ul className="space-y-2">
          {sortedAnnotations.map((annotation, index) => {
            const annotationId = annotation.id;
            const isDeleting = annotationId
              ? deletingAnnotations.has(annotationId)
              : false;

            return (
              <li
                key={
                  annotation.id ??
                  `${annotation.kind}-${annotation.timestamp_ms}-${index}`
                }
                className="animate-fade-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <AnnotationItem
                  annotation={annotation}
                  onJump={onJump}
                  onDelete={onDelete}
                  isDeleting={isDeleting}
                  onAddReply={onAddReply}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
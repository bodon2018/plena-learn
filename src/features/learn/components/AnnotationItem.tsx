"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { Bookmark, FileText, Trash2, Send, Loader2, MessageCircle, User } from "lucide-react";
import { formatTime } from "../hooks/useMediaPlayer";

// =============================================================================
// MOCK MODE - Set to true to test replies without backend
// =============================================================================
const MOCK_MODE = true;

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

type AnnotationItemProps = {
  /** The annotation data */
  annotation: Annotation;
  /** Callback when user clicks to jump to this timestamp */
  onJump: (annotation: Annotation) => void;
  /** Callback to delete this annotation */
  onDelete?: (annotationId: number) => void;
  /** Whether delete is in progress */
  isDeleting?: boolean;
  /** Callback to add a reply to this annotation */
  onAddReply?: (annotationId: number, text: string) => Promise<Reply | null>;
};

/**
 * Reply bubble component - styled like the old AI reply bubbles.
 */
function ReplyBubble({ reply }: { reply: Reply }) {
  const dateLabel = reply.created_at
    ? new Date(reply.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <div
      className={cn(
        // Layout - same as old AI bubbles
        "mt-2 ml-6",
        "p-3 rounded-xl",
        // Styling - using primary/blue tones
        "bg-gradient-to-br from-primary/10 to-sky/5",
        "border border-primary/20",
        // Animation
        "animate-fade-up"
      )}
    >
      {/* Author indicator row */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <div
          className={cn(
            "w-4 h-4 rounded-md",
            "bg-gradient-to-br from-primary to-sky",
            "flex items-center justify-center",
            "p-0.5"
          )}
        >
          <User className="w-2.5 h-2.5 text-white" />
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
          {reply.author_name}
        </span>
        {dateLabel && (
          <span className="text-[10px] text-mute ml-auto">{dateLabel}</span>
        )}
      </div>

      {/* Reply text */}
      <p className="text-body-sm text-ink leading-relaxed">
        {reply.text}
      </p>
    </div>
  );
}

/**
 * Single annotation item (bookmark or note).
 */
export default function AnnotationItem({
  annotation,
  onJump,
  onDelete,
  isDeleting = false,
  onAddReply,
}: AnnotationItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [localReplies, setLocalReplies] = useState<Reply[]>(annotation.replies || []);

  const isBookmark = annotation.kind === "bookmark";
  const timestampLabel = formatTime((annotation.timestamp_ms ?? 0) / 1000);
  const annotationId = annotation.id;
  const typeLabel = isBookmark ? "Bookmark" : "Note";

  const dateLabel = annotation.created_at
    ? new Date(annotation.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : null;

  const replies = localReplies;
  const hasReplies = replies.length > 0;

  const handleCardClick = () => {
    if (!showDeleteConfirm) {
      onJump(annotation);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
    setIsExpanded(false);
  };

  const handleConfirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (annotationId && onDelete) {
      onDelete(annotationId);
    }
    setShowDeleteConfirm(false);
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(false);
  };

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
    setShowDeleteConfirm(false);
  };

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!replyText.trim() || !annotationId) return;

    setIsSubmittingReply(true);

    try {
      if (MOCK_MODE) {
        // Mock mode: add reply locally
        await new Promise((resolve) => setTimeout(resolve, 500));
        
        const newReply: Reply = {
          id: Date.now(),
          author_name: "You",
          text: replyText.trim(),
          created_at: new Date().toISOString(),
        };
        
        setLocalReplies((prev) => [...prev, newReply]);
        setReplyText("");
      } else if (onAddReply) {
        const newReply = await onAddReply(annotationId, replyText.trim());
        if (newReply) {
          setLocalReplies((prev) => [...prev, newReply]);
        }
        setReplyText("");
      }
    } catch (err) {
      console.error("Failed to add reply:", err);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleInputClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div className="space-y-0">
      {/* Main annotation card */}
      <button
        type="button"
        onClick={handleCardClick}
        disabled={isDeleting}
        className={cn(
          "w-full flex items-start gap-3 p-4",
          "rounded-2xl",
          "border border-neutral-200/80",
          "bg-white",
          "hover:shadow-soft hover:border-primary/40 hover:bg-primary/[0.02]",
          "active:scale-[0.99]",
          "transition-all duration-150",
          "text-left",
          (isExpanded || showDeleteConfirm) && "rounded-b-none border-b-0",
          isDeleting && "opacity-50 pointer-events-none"
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
              : "bg-slate-700/10 text-slate-700"
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
          {/* Header row */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "text-caption-sm font-semibold uppercase tracking-wide",
                  isBookmark ? "text-sky" : "text-slate-700"
                )}
              >
                {typeLabel}
              </span>
              {annotation.author_name && (
                <span className="text-caption text-mute">
                  by {annotation.author_name}
                </span>
              )}
            </div>
            {dateLabel && (
              <span className="text-caption text-subtle">{dateLabel}</span>
            )}
          </div>

          {/* Timestamp */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-body-sm font-medium text-ink">
              {timestampLabel}
            </span>
            <span className="text-caption text-subtle">tap to jump</span>
          </div>

          {/* Note text */}
          {annotation.text && (
            <p className="text-body-sm text-mute line-clamp-2">
              {annotation.text}
            </p>
          )}

          {/* Reply button */}
          <div className="flex items-center gap-3 mt-2">
            <button
              type="button"
              onClick={handleToggleExpand}
              className={cn(
                "flex items-center gap-1.5",
                "text-caption font-medium",
                "transition-colors",
                isExpanded ? "text-primary" : "text-mute hover:text-primary"
              )}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              {hasReplies
                ? `${replies.length} ${replies.length === 1 ? "reply" : "replies"}`
                : "Reply"}
            </button>
          </div>
        </div>

        {/* Delete button */}
        {annotationId && onDelete && (
          <button
            type="button"
            onClick={handleDeleteClick}
            disabled={isDeleting}
            className={cn(
              "flex-shrink-0",
              "w-9 h-9 rounded-xl",
              "flex items-center justify-center",
              "transition-all duration-200",
              "text-neutral-400 hover:text-danger hover:bg-danger/10",
              "disabled:opacity-50"
            )}
            aria-label="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </button>

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div
          className={cn(
            "px-4 pb-4 pt-3",
            "bg-danger/5",
            "border border-t-0 border-danger/20",
            "rounded-b-2xl"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-body-sm text-danger mb-3">
            Delete this {isBookmark ? "bookmark" : "note"}? This cannot be undone.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCancelDelete}
              className={cn(
                "flex-1 py-2 px-4 rounded-xl",
                "border border-neutral-200",
                "text-body-sm font-medium text-ink",
                "hover:bg-neutral-50",
                "transition-colors"
              )}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className={cn(
                "flex-1 py-2 px-4 rounded-xl",
                "bg-danger text-white",
                "text-body-sm font-medium",
                "hover:bg-danger/90",
                "transition-colors",
                "disabled:opacity-50"
              )}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      )}

      {/* Expanded replies section */}
      {isExpanded && !showDeleteConfirm && (
        <div
          className={cn(
            "px-4 pb-4 pt-2",
            "bg-gradient-to-b from-white to-neutral-50/50",
            "border border-t-0 border-neutral-200/80",
            "rounded-b-2xl"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Existing replies */}
          {hasReplies && (
            <div className="space-y-0 mb-3">
              {replies.map((reply) => (
                <ReplyBubble key={reply.id} reply={reply} />
              ))}
            </div>
          )}

          {/* Reply input */}
          <form onSubmit={handleSubmitReply} className="flex gap-2">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onClick={handleInputClick}
              placeholder="Write a reply..."
              disabled={isSubmittingReply}
              className={cn(
                "flex-1 px-3 py-2",
                "rounded-xl",
                "border border-primary/20",
                "bg-white",
                "text-body-sm text-ink",
                "placeholder:text-primary/40",
                "focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10",
                "transition-all duration-150",
                "disabled:opacity-50"
              )}
            />
            <button
              type="submit"
              disabled={!replyText.trim() || isSubmittingReply}
              className={cn(
                "w-10 h-10 rounded-xl",
                "flex items-center justify-center",
                "bg-primary text-white",
                "hover:bg-primary/90",
                "active:scale-95",
                "transition-all duration-150",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {isSubmittingReply ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
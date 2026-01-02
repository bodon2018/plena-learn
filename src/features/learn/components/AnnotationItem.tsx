"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/cn";
import { Bookmark, FileText, Send, Loader2, Check } from "lucide-react";
import { formatTime } from "../hooks/useMediaPlayer";
import AIReplyBubble from "./AIReplyBubble";
import type { AIReply } from "../hooks/useAIAssistant";

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
  /** Whether AI is ready to answer questions */
  aiReady?: boolean;
  /** AI replies for this annotation */
  aiReplies?: AIReply[];
  /** Whether AI is currently loading a response */
  aiLoading?: boolean;
  /** Callback to ask AI a question */
  onAskAI?: (annotationId: number, question: string) => void;
  /** Whether this annotation is selected for multi-select */
  isSelected?: boolean;
  /** Callback when selection changes */
  onSelectionChange?: (annotationId: number, selected: boolean) => void;
  /** Whether multi-select mode is active */
  multiSelectMode?: boolean;
};

/**
 * Single annotation item (bookmark or note).
 * 
 * Clickable card that jumps to the timestamp when tapped.
 * Shows different styling for bookmarks vs notes.
 * Includes inline AI interaction when AI is ready.
 */
export default function AnnotationItem({
  annotation,
  onJump,
  aiReady = false,
  aiReplies = [],
  aiLoading = false,
  onAskAI,
  isSelected = false,
  onSelectionChange,
  multiSelectMode = false,
}: AnnotationItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [question, setQuestion] = useState("");

  const isBookmark = annotation.kind === "bookmark";
  const timestampLabel = formatTime((annotation.timestamp_ms ?? 0) / 1000);
  const annotationId = annotation.id;

  const typeLabel = isBookmark ? "Bookmark" : "Note";

  // Format the creation date
  const dateLabel = annotation.created_at
    ? new Date(annotation.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : null;

  const handleCardClick = () => {
    if (multiSelectMode && annotationId && onSelectionChange) {
      onSelectionChange(annotationId, !isSelected);
    } else {
      onJump(annotation);
    }
  };

  const handleAskClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const handleSubmitQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!question.trim() || !annotationId || !onAskAI) return;
    
    onAskAI(annotationId, question);
    setQuestion("");
  };

  const handleInputClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleSelectionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (annotationId && onSelectionChange) {
      onSelectionChange(annotationId, !isSelected);
    }
  };

  // Get latest reply and previous replies
  const latestReply = aiReplies.length > 0 ? aiReplies[aiReplies.length - 1] : null;
  const previousReplies = aiReplies.length > 1 ? aiReplies.slice(0, -1) : [];

  return (
    <div className="space-y-0">
      {/* Main annotation card */}
      <button
        type="button"
        onClick={handleCardClick}
        className={cn(
          "w-full flex items-start gap-3 p-4",
          "rounded-2xl",
          "border",
          "bg-white",
          "hover:shadow-soft",
          "active:scale-[0.99]",
          "transition-all duration-150",
          "text-left",
          isExpanded && "rounded-b-none border-b-0",
          isSelected
            ? "border-emerald-700 bg-emerald-900/5"
            : "border-neutral-200/80 hover:border-primary/40 hover:bg-primary/[0.02]"
        )}
      >
        {/* Selection checkbox (visible when AI ready) */}
        {aiReady && annotationId && (
          <button
            type="button"
            onClick={handleSelectionClick}
            className={cn(
              "flex-shrink-0",
              "w-6 h-6 rounded-lg",
              "border-2",
              "flex items-center justify-center",
              "transition-all duration-150",
              isSelected
                ? "bg-emerald-700 border-emerald-700 text-white"
                : "border-neutral-300 hover:border-emerald-600"
            )}
            aria-label={isSelected ? "Deselect" : "Select"}
          >
            {isSelected && <Check className="w-3.5 h-3.5" />}
          </button>
        )}

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
          {/* Header row with type and date */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <span
              className={cn(
                "text-caption-sm font-semibold uppercase tracking-wide",
                isBookmark ? "text-sky" : "text-slate-700"
              )}
            >
              {typeLabel}
            </span>
            {dateLabel && (
              <span className="text-caption text-subtle">{dateLabel}</span>
            )}
          </div>

          {/* Timestamp */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-body-sm font-medium text-ink">
              {timestampLabel}
            </span>
            <span className="text-caption text-subtle">
              {multiSelectMode ? "tap to select" : "tap to jump"}
            </span>
          </div>

          {/* Note text (if present) */}
          {annotation.text && (
            <p className="text-body-sm text-mute line-clamp-2">
              {annotation.text}
            </p>
          )}
        </div>

        {/* AI Ask button - Plena logo - more visible when not expanded */}
        {aiReady && annotationId && !multiSelectMode && (
          <button
            type="button"
            onClick={handleAskClick}
            className={cn(
              "flex-shrink-0",
              "w-9 h-9 rounded-xl",
              "flex items-center justify-center",
              "transition-all duration-200",
              isExpanded
                ? "bg-gradient-to-br from-emerald-700 to-emerald-800 shadow-md"
                : "bg-emerald-700/80 hover:bg-emerald-700"
            )}
            aria-label="Ask Plena AI"
          >
            <Image
              src="/plena-logo-white.png"
              alt="Ask Plena AI"
              width={20}
              height={20}
              className="object-contain"
            />
          </button>
        )}
      </button>

      {/* Expanded AI input section */}
      {isExpanded && aiReady && annotationId && (
        <div
          className={cn(
            "px-4 pb-4 pt-3",
            "bg-gradient-to-b from-white to-emerald-900/5",
            "border border-t-0 border-neutral-200/80",
            "rounded-b-2xl"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Previous replies - scrollable container */}
          {previousReplies.length > 0 && (
            <div
              className={cn(
                "mb-3 max-h-32 overflow-y-auto",
                "rounded-xl",
                "border border-emerald-800/10",
                "bg-emerald-900/5"
              )}
            >
              <div className="p-2 space-y-2">
                {previousReplies.map((reply, index) => (
                  <div
                    key={`${reply.annotationId}-${index}`}
                    className="text-caption text-mute p-2 bg-white rounded-lg"
                  >
                    <span className="font-medium text-ink">Q:</span> {reply.question}
                    <br />
                    <span className="font-medium text-emerald-800">A:</span> {reply.answer}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Latest reply */}
          {latestReply && (
            <div className="mb-3">
              <AIReplyBubble reply={latestReply} />
            </div>
          )}

          {/* Input form */}
          <form onSubmit={handleSubmitQuestion} className="flex gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onClick={handleInputClick}
              placeholder="Ask Plena AI about this moment..."
              disabled={aiLoading}
              className={cn(
                "flex-1 px-3 py-2",
                "rounded-xl",
                "border border-emerald-800/20",
                "bg-white",
                "text-body-sm text-ink",
                "placeholder:text-emerald-800/40",
                "focus:outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-900/10",
                "transition-all duration-150",
                "disabled:opacity-50"
              )}
            />
            <button
              type="submit"
              disabled={!question.trim() || aiLoading}
              className={cn(
                "w-10 h-10 rounded-xl",
                "flex items-center justify-center",
                "bg-emerald-700 text-white",
                "hover:bg-emerald-800",
                "active:scale-95",
                "transition-all duration-150",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {aiLoading ? (
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
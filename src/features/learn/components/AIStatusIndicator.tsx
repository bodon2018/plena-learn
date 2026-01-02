"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/cn";
import { X, Send, Loader2 } from "lucide-react";
import type { AIReadinessState } from "../hooks/useAIAssistant";

type AIStatusIndicatorProps = {
  /** Current AI readiness state */
  status: AIReadinessState;
  /** Number of selected annotations */
  selectedCount: number;
  /** Whether AI is loading a response for multi-select */
  isLoading?: boolean;
  /** Callback to ask AI about multiple selections */
  onAskMultiple?: (question: string) => void;
  /** Callback to clear selection */
  onClearSelection?: () => void;
};

/**
 * Floating AI status indicator with multi-select action sheet.
 * 
 * Shows in bottom-right corner of Learn screen:
 * - Gray + subtle pulse when processing
 * - Dark green + gentle glow when ready
 * - Expands to action sheet when items are selected
 * - Hidden when idle (no media)
 */
export default function AIStatusIndicator({
  status,
  selectedCount,
  isLoading = false,
  onAskMultiple,
  onClearSelection,
}: AIStatusIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [question, setQuestion] = useState("");

  // Don't render when idle
  if (status === "idle") return null;

  const isReady = status === "ready";
  const isProcessing = status === "processing";
  const isError = status === "error";
  const hasSelections = selectedCount > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !onAskMultiple) return;
    onAskMultiple(question);
    setQuestion("");
  };

  const handleIndicatorClick = () => {
    if (hasSelections) {
      setIsExpanded(!isExpanded);
    }
  };

  const handleClear = () => {
    setIsExpanded(false);
    onClearSelection?.();
  };

  return (
    <>
      {/* Backdrop when expanded */}
      {isExpanded && hasSelections && (
        <div
          className="fixed inset-0 bg-black/20 z-30 backdrop-blur-sm"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Action sheet for multi-select */}
      {isExpanded && hasSelections && (
        <div
          className={cn(
            "fixed bottom-0 left-0 right-0 z-50",
            "bg-white",
            "rounded-t-3xl",
            "shadow-2xl",
            "p-6 pb-8",
            "animate-slide-up",
            "md:left-auto md:right-8 md:bottom-24 md:w-96 md:rounded-2xl"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "w-8 h-8 rounded-lg",
                  "bg-gradient-to-br from-emerald-700 to-emerald-900",
                  "flex items-center justify-center",
                  "p-1"
                )}
              >
                <Image
                  src="/plena-logo-white.png"
                  alt="Plena AI"
                  width={24}
                  height={24}
                  className="object-contain"
                />
              </div>
              <div>
                <h3 className="text-ui font-semibold text-ink">Plena AI</h3>
                <p className="text-caption text-mute">
                  {selectedCount} {selectedCount === 1 ? "moment" : "moments"} selected
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClear}
              className={cn(
                "w-8 h-8 rounded-full",
                "bg-neutral-100 text-mute",
                "flex items-center justify-center",
                "hover:bg-neutral-200",
                "transition-colors"
              )}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Input form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask about these moments together..."
              disabled={isLoading}
              rows={3}
              className={cn(
                "w-full px-4 py-3",
                "rounded-xl",
                "border border-emerald-800/30",
                "bg-emerald-900/5",
                "text-body-sm text-ink",
                "placeholder:text-emerald-800/40",
                "focus:outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-900/10",
                "transition-all duration-150",
                "resize-none",
                "disabled:opacity-50"
              )}
            />
            <button
              type="submit"
              disabled={!question.trim() || isLoading}
              className={cn(
                "w-full py-3 px-4 rounded-xl",
                "bg-gradient-to-r from-emerald-700 to-emerald-800",
                "text-white font-semibold",
                "flex items-center justify-center gap-2",
                "hover:from-emerald-800 hover:to-emerald-900",
                "active:scale-[0.98]",
                "transition-all duration-150",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Thinking...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Ask Plena AI
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Floating indicator button */}
      <button
        type="button"
        onClick={handleIndicatorClick}
        disabled={!isReady && !hasSelections}
        className={cn(
          // Positioning
          "fixed bottom-24 right-4 z-40",
          "md:bottom-8 md:right-8",
          // Size and shape - expand when has selections
          hasSelections ? "px-4 py-3 rounded-2xl" : "w-14 h-14 rounded-2xl",
          // Flex center
          "flex items-center justify-center gap-2",
          // Base styling
          "border",
          "shadow-lg",
          "transition-all duration-300 ease-out",
          // State-based styling
          isProcessing &&
            !hasSelections && [
              "bg-neutral-100 border-neutral-200",
              "text-neutral-400",
              "cursor-wait",
            ],
          isReady &&
            !hasSelections && [
              "bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-800",
              "border-emerald-600/50",
              "text-white",
              "shadow-emerald-900/25 shadow-xl",
              "hover:shadow-emerald-900/40 hover:shadow-2xl",
              "hover:scale-105",
              "active:scale-95",
              "cursor-pointer",
            ],
          hasSelections && [
            "bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-800",
            "border-emerald-600/50",
            "text-white",
            "shadow-emerald-900/30 shadow-xl",
            "hover:shadow-emerald-900/50 hover:shadow-2xl",
            "active:scale-95",
            "cursor-pointer",
          ],
          isError &&
            !hasSelections && [
              "bg-neutral-50 border-neutral-200",
              "text-neutral-300",
              "cursor-not-allowed",
            ]
        )}
        aria-label={
          hasSelections
            ? `Ask Plena AI about ${selectedCount} selected items`
            : isReady
            ? "Plena AI ready"
            : isProcessing
            ? "Plena AI processing media..."
            : "Plena AI unavailable"
        }
      >
        {/* Pulsing ring for processing state */}
        {isProcessing && !hasSelections && (
          <div
            className={cn(
              "absolute inset-0 rounded-2xl",
              "border-2 border-neutral-300",
              "animate-ping opacity-40"
            )}
            style={{ animationDuration: "2s" }}
          />
        )}

        {/* Glowing ring for ready/selected state */}
        {(isReady || hasSelections) && (
          <div
            className={cn(
              "absolute inset-0 rounded-2xl",
              "bg-gradient-to-br from-emerald-600 to-emerald-800",
              "animate-pulse opacity-30 blur-sm"
            )}
            style={{ animationDuration: "3s" }}
          />
        )}

        {/* Content - Plena logo */}
        <div className="relative flex items-center gap-2">
          <Image
            src="/plena-logo-white.png"
            alt="Plena AI"
            width={hasSelections ? 20 : 28}
            height={hasSelections ? 20 : 28}
            className="object-contain"
          />
          {hasSelections && (
            <span className="text-ui font-semibold whitespace-nowrap">
              {selectedCount} selected
            </span>
          )}
        </div>

        {/* Processing dots animation */}
        {isProcessing && !hasSelections && (
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1 h-1 rounded-full bg-neutral-400"
                style={{
                  animation: "bounce 1s ease-in-out infinite",
                  animationDelay: `${i * 150}ms`,
                }}
              />
            ))}
          </div>
        )}

        {/* Inline keyframes */}
        <style jsx>{`
          @keyframes bounce {
            0%,
            80%,
            100% {
              transform: translateY(0);
            }
            40% {
              transform: translateY(-3px);
            }
          }
          @keyframes slide-up {
            from {
              transform: translateY(100%);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
          .animate-slide-up {
            animation: slide-up 0.3s ease-out;
          }
        `}</style>
      </button>
    </>
  );
}
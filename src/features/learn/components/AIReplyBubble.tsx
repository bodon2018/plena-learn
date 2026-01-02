"use client";

import Image from "next/image";
import { cn } from "@/lib/cn";
import type { AIReply } from "../hooks/useAIAssistant";

type AIReplyBubbleProps = {
  /** The AI reply to display */
  reply: AIReply;
};

/**
 * Compact AI reply bubble.
 * 
 * Displays below the user's annotation with:
 * - Plena logo AI indicator
 * - The user's question (condensed)
 * - AI's response (max 3 sentences expected)
 * 
 * Visually distinct from user notes but not overwhelming.
 * Uses darker green tones for a more refined look.
 */
export default function AIReplyBubble({ reply }: AIReplyBubbleProps) {
  return (
    <div
      className={cn(
        // Layout
        "mt-2 ml-6",
        "p-3 rounded-xl",
        // Styling - darker green gradient background
        "bg-gradient-to-br from-emerald-900/10 to-emerald-800/5",
        "border border-emerald-800/20",
        // Animation
        "animate-fade-up"
      )}
    >
      {/* AI indicator row */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <div
          className={cn(
            "w-4 h-4 rounded-md",
            "bg-gradient-to-br from-emerald-700 to-emerald-800",
            "flex items-center justify-center",
            "p-0.5"
          )}
        >
          <Image
            src="/plena-logo-white.png"
            alt="Plena AI"
            width={12}
            height={12}
            className="object-contain"
          />
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-800">
          Plena AI
        </span>
      </div>

      {/* Question (if shown) */}
      {reply.question && (
        <p className="text-caption text-emerald-900/60 italic mb-1.5 line-clamp-1">
          "{reply.question}"
        </p>
      )}

      {/* Answer */}
      <p className="text-body-sm text-ink leading-relaxed">
        {reply.answer}
      </p>
    </div>
  );
}
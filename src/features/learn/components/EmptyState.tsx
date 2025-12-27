"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";
import { Mic, Film, ArrowRight } from "lucide-react";

/**
 * Empty state shown when no recording is selected.
 * 
 * Provides a welcoming message and clear paths forward:
 * - Go to Session to record something new
 * - Go to Library to pick an existing recording
 */
export default function EmptyState() {
  return (
    <div
      className={cn(
        "rounded-3xl",
        "bg-gradient-to-br from-neutral-50 to-neutral-100",
        "border border-neutral-200/60",
        "p-8 md:p-12",
        "text-center",
        "animate-fade-up"
      )}
    >
      {/* Icon cluster */}
      <div className="flex justify-center mb-6">
        <div className="relative">
          {/* Background glow */}
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl scale-150" />
          
          {/* Main icon container */}
          <div
            className={cn(
              "relative w-20 h-20 rounded-full",
              "bg-gradient-to-br from-primary to-sky",
              "flex items-center justify-center",
              "shadow-lift"
            )}
          >
            <Mic className="w-9 h-9 text-white" />
          </div>
        </div>
      </div>

      {/* Heading */}
      <h2 className="text-heading-2 text-ink mb-2">
        No recording selected
      </h2>

      {/* Description */}
      <p className="text-body text-mute mb-8 max-w-sm mx-auto">
        Record a practice or game session, then come back here to review, 
        annotate, and learn from your performance.
      </p>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {/* Primary CTA - Start a session */}
        <Link
          href="/user/session"
          className={cn(
            "inline-flex items-center justify-center gap-2",
            "px-6 py-3 rounded-full",
            "bg-primary text-white",
            "text-ui font-semibold",
            "shadow-soft hover:shadow-lift",
            "transition-all duration-150",
            "active:scale-[0.98]"
          )}
        >
          <Mic className="w-4 h-4" />
          Start a Session
          <ArrowRight className="w-4 h-4" />
        </Link>

        {/* Secondary CTA - Browse library */}
        <Link
          href="/user/library"
          className={cn(
            "inline-flex items-center justify-center gap-2",
            "px-6 py-3 rounded-full",
            "bg-white text-ink",
            "border border-neutral-200",
            "text-ui font-semibold",
            "shadow-soft hover:shadow-lift hover:border-neutral-300",
            "transition-all duration-150",
            "active:scale-[0.98]"
          )}
        >
          <Film className="w-4 h-4" />
          Browse Library
        </Link>
      </div>
    </div>
  );
}
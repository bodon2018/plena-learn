"use client";

import Image from "next/image";
import { cn } from "@/lib/cn";

type ReportReadinessState = "idle" | "processing" | "ready" | "error";

type ReportButtonProps = {
  /** Current readiness state */
  status: ReportReadinessState;
  /** Callback when button is clicked */
  onClick: () => void;
};

/**
 * Floating button for report generation.
 * 
 * Shows in bottom-right corner of Learn screen:
 * - Gray + subtle pulse when processing (media being analyzed)
 * - Dark green + gentle glow when ready to generate reports
 * - Hidden when idle (no media)
 */
export default function ReportButton({
  status,
  onClick,
}: ReportButtonProps) {
  // Don't render when idle
  if (status === "idle") return null;

  const isReady = status === "ready";
  const isProcessing = status === "processing";
  const isError = status === "error";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!isReady}
      className={cn(
        // Positioning
        "fixed bottom-24 right-4 z-40",
        "md:bottom-8 md:right-8",
        // Size and shape
        "w-14 h-14 rounded-2xl",
        // Flex center
        "flex items-center justify-center",
        // Base styling
        "border",
        "shadow-lg",
        "transition-all duration-300 ease-out",
        // State-based styling
        isProcessing && [
          "bg-neutral-100 border-neutral-200",
          "text-neutral-400",
          "cursor-wait",
        ],
        isReady && [
          "bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-800",
          "border-emerald-600/50",
          "text-white",
          "shadow-emerald-900/25 shadow-xl",
          "hover:shadow-emerald-900/40 hover:shadow-2xl",
          "hover:scale-105",
          "active:scale-95",
          "cursor-pointer",
        ],
        isError && [
          "bg-neutral-50 border-neutral-200",
          "text-neutral-300",
          "cursor-not-allowed",
        ]
      )}
      aria-label={
        isReady
          ? "Generate development report"
          : isProcessing
          ? "Processing media..."
          : "Report generation unavailable"
      }
    >
      {/* Pulsing ring for processing state */}
      {isProcessing && (
        <div
          className={cn(
            "absolute inset-0 rounded-2xl",
            "border-2 border-neutral-300",
            "animate-ping opacity-40"
          )}
          style={{ animationDuration: "2s" }}
        />
      )}

      {/* Glowing ring for ready state */}
      {isReady && (
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
      <div className="relative">
        <Image
          src="/plena-logo-white.png"
          alt="Generate Report"
          width={28}
          height={28}
          className={cn(
            "object-contain",
            !isReady && "opacity-50"
          )}
        />
      </div>

      {/* Processing dots animation */}
      {isProcessing && (
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
      `}</style>
    </button>
  );
}
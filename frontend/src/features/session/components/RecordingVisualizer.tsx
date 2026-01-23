"use client";

import { cn } from "@/lib/cn";
import { Mic } from "lucide-react";

type RecordingVisualizerProps = {
  /** Whether currently recording */
  isRecording: boolean;
  /** Current duration formatted */
  duration: string;
  /** Recording mode (audio or video) */
  mode: "audio" | "video";
  /** Optional className */
  className?: string;
};

/**
 * Beautiful Siri-inspired visualizer for active recording.
 * 
 * Shows:
 * - Pulsing orbs when recording
 * - Animated waveform bars
 * - Duration counter
 * - Calm idle state when not recording
 */
export default function RecordingVisualizer({
  isRecording,
  duration,
  mode,
  className,
}: RecordingVisualizerProps) {
  // Only show for audio mode (video has its own preview)
  if (mode === "video") return null;

  return (
    <div
      className={cn(
        // Container
        "relative w-full aspect-[2/1] min-h-[180px] max-h-[220px]",
        "rounded-3xl overflow-hidden",
        // Background gradient
        "bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900",
        className
      )}
    >
      {/* Ambient glow - intensifies when recording */}
      <div
        className={cn(
          "absolute inset-0",
          "transition-all duration-700",
          isRecording
            ? "bg-gradient-to-t from-danger/30 via-danger/10 to-transparent"
            : "bg-gradient-to-t from-primary/10 via-transparent to-transparent"
        )}
      />

      {/* Animated orbs container */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative flex items-center justify-center">
          {/* Outer pulse ring - only when recording */}
          <div
            className={cn(
              "absolute w-32 h-32 rounded-full",
              "border-2",
              "transition-all duration-500",
              isRecording
                ? "border-danger/40 scale-100 animate-ping"
                : "border-primary/20 scale-75 opacity-0"
            )}
            style={{ animationDuration: "2s" }}
          />

          {/* Secondary pulse ring */}
          <div
            className={cn(
              "absolute w-28 h-28 rounded-full",
              "transition-all duration-500",
              isRecording
                ? "bg-danger/20 scale-100"
                : "bg-primary/10 scale-75"
            )}
            style={{
              animation: isRecording
                ? "pulse 1.5s ease-in-out infinite"
                : "none",
            }}
          />

          {/* Main orb */}
          <div
            className={cn(
              "absolute w-24 h-24 rounded-full",
              "transition-all duration-300",
              isRecording
                ? "bg-gradient-to-br from-danger via-red-500 to-danger shadow-lg shadow-danger/50"
                : "bg-gradient-to-br from-primary via-sky to-primary shadow-lg shadow-primary/30"
            )}
            style={{
              animation: isRecording
                ? "breathe 1s ease-in-out infinite"
                : "none",
            }}
          />

          {/* Inner glow */}
          <div
            className={cn(
              "absolute w-16 h-16 rounded-full",
              "bg-white/20 blur-sm",
              "transition-all duration-300",
              isRecording ? "scale-100 opacity-80" : "scale-75 opacity-40"
            )}
          />

          {/* Center icon */}
          <div
            className={cn(
              "relative z-10",
              "w-12 h-12 rounded-full",
              "bg-white/90",
              "flex items-center justify-center",
              "shadow-lg",
              "transition-transform duration-200",
              isRecording && "scale-90"
            )}
          >
            <Mic
              className={cn(
                "w-6 h-6 transition-colors duration-300",
                isRecording ? "text-danger" : "text-primary"
              )}
            />
          </div>
        </div>
      </div>

      {/* Waveform bars at bottom */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-end gap-[3px]">
        {Array.from({ length: 32 }).map((_, i) => {
          const centerDistance = Math.abs(i - 15.5);
          const baseHeight = Math.max(6, 28 - centerDistance * 1.5);

          return (
            <div
              key={i}
              className={cn(
                "w-[3px] rounded-full",
                "transition-all duration-150",
                isRecording
                  ? "bg-gradient-to-t from-danger/80 to-white/60"
                  : "bg-gradient-to-t from-primary/40 to-white/30"
              )}
              style={{
                height: isRecording ? `${baseHeight + Math.random() * 12}px` : "3px",
                animation: isRecording
                  ? `wave ${0.4 + Math.random() * 0.4}s ease-in-out infinite alternate`
                  : "none",
                animationDelay: `${i * 25}ms`,
              }}
            />
          );
        })}
      </div>

      {/* Duration display */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2">
        <div
          className={cn(
            "px-4 py-1.5 rounded-full",
            "bg-black/40 backdrop-blur-sm",
            "flex items-center gap-2"
          )}
        >
          {/* Recording indicator dot */}
          <div
            className={cn(
              "w-2 h-2 rounded-full",
              "transition-all duration-300",
              isRecording
                ? "bg-danger animate-pulse"
                : "bg-neutral-400"
            )}
          />
          <span className="text-white text-sm font-medium tabular-nums">
            {duration}
          </span>
        </div>
      </div>

      {/* Status text */}
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2">
        <span
          className={cn(
            "text-caption font-medium",
            "transition-colors duration-300",
            isRecording ? "text-danger/80" : "text-white/50"
          )}
        >
          {isRecording ? "Recording..." : "Ready to record"}
        </span>
      </div>

      {/* Inline keyframes */}
      <style jsx>{`
        @keyframes breathe {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }

        @keyframes wave {
          0% {
            transform: scaleY(1);
          }
          100% {
            transform: scaleY(0.5);
          }
        }
      `}</style>
    </div>
  );
}
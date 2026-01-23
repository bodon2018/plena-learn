"use client";

import { cn } from "@/lib/cn";
import { Square, Circle, ArrowRight, Loader2 } from "lucide-react";

type RecordingControlsProps = {
  /** Whether currently recording */
  isRecording: boolean;
  /** Whether recording is starting */
  isStarting: boolean;
  /** Current duration formatted */
  duration: string;
  /** Toggle recording on/off */
  onToggle: () => void;
  /** Handle finish and navigate */
  onFinish: () => void;
};

/**
 * Bottom control bar for recording.
 * 
 * Features:
 * - Large, prominent record button
 * - Duration display
 * - Finish button to complete session
 */
export default function RecordingControls({
  isRecording,
  isStarting,
  duration,
  onToggle,
  onFinish,
}: RecordingControlsProps) {
  return (
    <div
      className={cn(
        // Positioning
        "sticky bottom-4",
        // Container styling
        "rounded-3xl",
        "bg-white/90 backdrop-blur-lg",
        "border border-neutral-200/60",
        "shadow-elevated",
        // Padding
        "p-4"
      )}
    >
      <div className="flex items-center justify-between gap-4">
        {/* Duration display */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            {/* Status indicator */}
            <div
              className={cn(
                "w-3 h-3 rounded-full",
                "transition-all duration-300",
                isRecording
                  ? "bg-danger animate-pulse"
                  : isStarting
                  ? "bg-secondary animate-pulse"
                  : "bg-neutral-300"
              )}
            />
            
            {/* Status text and duration */}
            <div>
              <p className="text-ui font-medium text-ink">
                {isRecording
                  ? "Recording"
                  : isStarting
                  ? "Starting..."
                  : "Ready"}
              </p>
              <p className="text-caption text-mute tabular-nums">
                Duration: {duration}
              </p>
            </div>
          </div>
        </div>

        {/* Record button - center */}
        <div className="flex-shrink-0">
          <button
            type="button"
            onClick={onToggle}
            disabled={isStarting}
            className={cn(
              // Size and shape
              "w-16 h-16 rounded-full",
              // Flex centering
              "flex items-center justify-center",
              // Colors based on state
              isRecording
                ? "bg-danger hover:bg-red-600"
                : "bg-primary hover:bg-blue-600",
              // Ring for depth
              "ring-4",
              isRecording ? "ring-danger/20" : "ring-primary/20",
              // Shadow
              "shadow-lift",
              // Transitions
              "transition-all duration-200",
              // Active state
              "active:scale-95",
              // Disabled state
              isStarting && "opacity-70 cursor-not-allowed"
            )}
            aria-label={isRecording ? "Stop recording" : "Start recording"}
          >
            {isStarting ? (
              <Loader2 className="w-7 h-7 text-white animate-spin" />
            ) : isRecording ? (
              <Square className="w-6 h-6 text-white fill-white" />
            ) : (
              <Circle className="w-7 h-7 text-white fill-white" />
            )}
          </button>
        </div>

        {/* Finish button - right */}
        <div className="flex-1 min-w-0 flex justify-end">
          <button
            type="button"
            onClick={onFinish}
            className={cn(
              // Layout
              "inline-flex items-center gap-2",
              "px-5 py-2.5 rounded-full",
              // Colors
              "bg-neutral-900 text-white",
              // Hover
              "hover:bg-neutral-800",
              // Shadow
              "shadow-soft",
              // Transitions
              "transition-all duration-150",
              // Active
              "active:scale-[0.98]"
            )}
          >
            <span className="text-ui font-semibold">Finish</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Helper text */}
      <p className="text-caption text-center text-subtle mt-3">
        {isRecording
          ? "Tap the square to stop recording"
          : "Tap the circle to start recording"}
      </p>
    </div>
  );
}
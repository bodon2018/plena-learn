"use client";

import { cn } from "@/lib/cn";
import { Video } from "lucide-react";
import type { RefObject } from "react";

type VideoPreviewProps = {
  /** Whether currently recording */
  isRecording: boolean;
  /** Current duration formatted */
  duration: string;
  /** Ref for the video element */
  videoRef: RefObject<HTMLVideoElement | null>;
  /** Optional className */
  className?: string;
};

/**
 * Live camera preview for video recording mode.
 * Shows the camera feed with recording overlay.
 */
export default function VideoPreview({
  isRecording,
  duration,
  videoRef,
  className,
}: VideoPreviewProps) {
  return (
    <div
      className={cn(
        "relative",
        "rounded-3xl overflow-hidden",
        "bg-black",
        className
      )}
    >
      {/* Video element - using callback ref to bridge RefObject */}
      <video
        ref={(el) => {
          // Bridge the RefObject to the native ref
          (videoRef as React.MutableRefObject<HTMLVideoElement | null>).current = el;
        }}
        className="w-full aspect-video object-cover"
        autoPlay
        muted
        playsInline
      />

      {/* Recording overlay - top bar */}
      <div className="absolute top-0 inset-x-0 p-4">
        <div className="flex items-center justify-between">
          {/* Recording indicator */}
          <div
            className={cn(
              "px-3 py-1.5 rounded-full",
              "bg-black/50 backdrop-blur-sm",
              "flex items-center gap-2"
            )}
          >
            <div
              className={cn(
                "w-2 h-2 rounded-full",
                "transition-all duration-300",
                isRecording ? "bg-danger animate-pulse" : "bg-neutral-400"
              )}
            />
            <span className="text-white text-sm font-medium tabular-nums">
              {duration}
            </span>
          </div>

          {/* Video mode indicator */}
          <div
            className={cn(
              "px-3 py-1.5 rounded-full",
              "bg-black/50 backdrop-blur-sm",
              "flex items-center gap-2"
            )}
          >
            <Video className="w-4 h-4 text-white" />
            <span className="text-white text-xs font-medium">
              {isRecording ? "Recording" : "Preview"}
            </span>
          </div>
        </div>
      </div>

      {/* Recording border glow */}
      <div
        className={cn(
          "absolute inset-0 pointer-events-none",
          "rounded-3xl",
          "border-4 transition-colors duration-300",
          isRecording ? "border-danger/60" : "border-transparent"
        )}
      />

      {/* Corner recording indicator */}
      {isRecording && (
        <div className="absolute bottom-4 right-4">
          <div
            className={cn(
              "w-4 h-4 rounded-full",
              "bg-danger",
              "animate-pulse",
              "shadow-lg shadow-danger/50"
            )}
          />
        </div>
      )}
    </div>
  );
}
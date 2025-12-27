"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

type AudioVisualizerProps = {
  /** Whether audio is currently playing */
  isPlaying: boolean;
  /** Current playback progress as percentage (0-100) */
  progress: number;
  /** Optional additional class names */
  className?: string;
};

/**
 * A beautiful, Siri-inspired audio visualizer.
 * 
 * Shows animated orbs that pulse and move when audio is playing,
 * creating an engaging visual feedback for audio playback.
 * 
 * Design inspiration:
 * - Apple's Siri waveform
 * - Soft gradients and glows
 * - Organic, fluid motion
 */
export default function AudioVisualizer({
  isPlaying,
  progress,
  className,
}: AudioVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Update CSS custom property for progress-based effects
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.style.setProperty("--progress", `${progress}%`);
    }
  }, [progress]);

  return (
    <div
      ref={containerRef}
      className={cn(
        // Container sizing and shape
        "relative w-full aspect-[2/1] min-h-[160px] max-h-[200px]",
        "rounded-3xl overflow-hidden",
        // Dark gradient background
        "bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900",
        className
      )}
    >
      {/* Ambient glow layer */}
      <div
        className={cn(
          "absolute inset-0",
          "bg-gradient-to-t from-primary/20 via-transparent to-transparent",
          "transition-opacity duration-500",
          isPlaying ? "opacity-100" : "opacity-40"
        )}
      />

      {/* Animated orbs container */}
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Central orb cluster */}
        <div className="relative flex items-center justify-center">
          {/* Main central orb */}
          <div
            className={cn(
              "absolute w-20 h-20 rounded-full",
              "bg-gradient-to-br from-primary via-sky to-primary",
              "blur-sm",
              "transition-all duration-300 ease-apple",
              isPlaying
                ? "scale-100 opacity-80 animate-pulse"
                : "scale-75 opacity-40"
            )}
          />

          {/* Secondary orb - left */}
          <div
            className={cn(
              "absolute w-12 h-12 rounded-full",
              "bg-gradient-to-br from-sky via-primary to-secondary",
              "blur-md",
              "transition-all duration-500 ease-apple",
              isPlaying
                ? "opacity-70 -translate-x-16 scale-110"
                : "opacity-30 -translate-x-8 scale-75"
            )}
            style={{
              animationDelay: "150ms",
              animation: isPlaying
                ? "float-left 2s ease-in-out infinite alternate"
                : "none",
            }}
          />

          {/* Secondary orb - right */}
          <div
            className={cn(
              "absolute w-12 h-12 rounded-full",
              "bg-gradient-to-br from-secondary via-primary to-sky",
              "blur-md",
              "transition-all duration-500 ease-apple",
              isPlaying
                ? "opacity-70 translate-x-16 scale-110"
                : "opacity-30 translate-x-8 scale-75"
            )}
            style={{
              animationDelay: "300ms",
              animation: isPlaying
                ? "float-right 2.2s ease-in-out infinite alternate"
                : "none",
            }}
          />

          {/* Accent orb - top */}
          <div
            className={cn(
              "absolute w-8 h-8 rounded-full",
              "bg-gradient-to-br from-white/60 to-sky/40",
              "blur-sm",
              "transition-all duration-700 ease-apple",
              isPlaying
                ? "opacity-60 -translate-y-12 scale-100"
                : "opacity-20 -translate-y-4 scale-50"
            )}
            style={{
              animation: isPlaying
                ? "float-up 1.8s ease-in-out infinite alternate"
                : "none",
            }}
          />

          {/* Core bright spot */}
          <div
            className={cn(
              "absolute w-6 h-6 rounded-full",
              "bg-white",
              "blur-sm",
              "transition-all duration-200",
              isPlaying ? "opacity-90 scale-100" : "opacity-50 scale-75"
            )}
          />
        </div>
      </div>

      {/* Waveform bars */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-end gap-1">
        {Array.from({ length: 24 }).map((_, i) => {
          // Create varied heights based on position (center bars taller)
          const centerDistance = Math.abs(i - 11.5);
          const baseHeight = Math.max(8, 32 - centerDistance * 2);
          
          return (
            <div
              key={i}
              className={cn(
                "w-1 rounded-full",
                "bg-gradient-to-t from-primary/80 to-white/60",
                "transition-all duration-150",
                isPlaying ? "opacity-80" : "opacity-30"
              )}
              style={{
                height: isPlaying ? `${baseHeight + Math.random() * 8}px` : "4px",
                animation: isPlaying
                  ? `wave ${0.5 + Math.random() * 0.5}s ease-in-out infinite alternate`
                  : "none",
                animationDelay: `${i * 30}ms`,
              }}
            />
          );
        })}
      </div>

      {/* Progress indicator line */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
        <div
          className="h-full bg-gradient-to-r from-primary to-sky transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Inline keyframe styles for animations */}
      <style jsx>{`
        @keyframes float-left {
          0% {
            transform: translateX(-64px) translateY(0) scale(1.1);
          }
          100% {
            transform: translateX(-72px) translateY(-8px) scale(1);
          }
        }

        @keyframes float-right {
          0% {
            transform: translateX(64px) translateY(0) scale(1.1);
          }
          100% {
            transform: translateX(72px) translateY(-8px) scale(1);
          }
        }

        @keyframes float-up {
          0% {
            transform: translateY(-48px) scale(1);
          }
          100% {
            transform: translateY(-56px) scale(0.9);
          }
        }

        @keyframes wave {
          0% {
            transform: scaleY(1);
          }
          100% {
            transform: scaleY(0.6);
          }
        }
      `}</style>
    </div>
  );
}
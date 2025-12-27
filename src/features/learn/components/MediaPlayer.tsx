"use client";

import { useRef, useCallback } from "react";
import { cn } from "@/lib/cn";
import { Play, Pause, RotateCcw, RotateCw } from "lucide-react";
import AudioVisualizer from "./AudioVisualizer";

type MediaPlayerProps = {
  /** Resolved media URL */
  url: string;
  /** Whether media is video (true) or audio (false) */
  isVideo: boolean;
  /** Whether media is currently playing */
  isPlaying: boolean;
  /** Current time formatted (e.g., "1:23") */
  currentTimeFormatted: string;
  /** Duration formatted (e.g., "3:45") */
  durationFormatted: string;
  /** Progress as percentage (0-100) */
  progress: number;
  /** Ref setter for the media element */
  setMediaRef: (el: HTMLVideoElement | HTMLAudioElement | null) => void;
  /** Toggle play/pause */
  onTogglePlayPause: () => void;
  /** Skip forward */
  onSkipForward: () => void;
  /** Skip backward */
  onSkipBackward: () => void;
  /** Seek to percentage */
  onSeekToPercent: (percent: number) => void;
  /** Media element event handlers */
  onLoadedMetadata: () => void;
  onTimeUpdate: () => void;
  onPlay: () => void;
  onPause: () => void;
  onEnded: () => void;
};

/**
 * Custom media player with beautiful controls.
 * 
 * Features:
 * - For audio: Shows AudioVisualizer instead of native controls
 * - For video: Shows video with custom overlay controls
 * - Custom progress bar with seek functionality
 * - Skip forward/backward buttons
 * - Apple-inspired styling
 */
export default function MediaPlayer({
  url,
  isVideo,
  isPlaying,
  currentTimeFormatted,
  durationFormatted,
  progress,
  setMediaRef,
  onTogglePlayPause,
  onSkipForward,
  onSkipBackward,
  onSeekToPercent,
  onLoadedMetadata,
  onTimeUpdate,
  onPlay,
  onPause,
  onEnded,
}: MediaPlayerProps) {
  const progressBarRef = useRef<HTMLDivElement>(null);

  /**
   * Handle click/touch on the progress bar to seek.
   */
  const handleProgressBarClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const bar = progressBarRef.current;
      if (!bar) return;

      const rect = bar.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percent = (clickX / rect.width) * 100;
      onSeekToPercent(Math.max(0, Math.min(100, percent)));
    },
    [onSeekToPercent]
  );

  return (
    <div className="space-y-4">
      {/* Media display area */}
      <div className="relative">
        {isVideo ? (
          // Video player with custom controls
          <div className="relative rounded-2xl overflow-hidden bg-black">
            <video
              ref={(el) => setMediaRef(el)}
              src={url}
              className="w-full max-h-[280px] object-contain bg-black"
              onLoadedMetadata={onLoadedMetadata}
              onTimeUpdate={onTimeUpdate}
              onPlay={onPlay}
              onPause={onPause}
              onEnded={onEnded}
              playsInline
            />

            {/* Video overlay controls - centered play button */}
            <button
              type="button"
              onClick={onTogglePlayPause}
              className={cn(
                "absolute inset-0 flex items-center justify-center",
                "bg-black/20 opacity-0 hover:opacity-100 transition-opacity duration-200",
                // Always show when paused
                !isPlaying && "opacity-100"
              )}
            >
              <div
                className={cn(
                  "w-16 h-16 rounded-full",
                  "bg-white/90 backdrop-blur-sm",
                  "flex items-center justify-center",
                  "shadow-elevated",
                  "transition-transform duration-150 active:scale-95"
                )}
              >
                {isPlaying ? (
                  <Pause className="w-7 h-7 text-ink" />
                ) : (
                  <Play className="w-7 h-7 text-ink ml-1" />
                )}
              </div>
            </button>
          </div>
        ) : (
          // Audio player - show visualizer
          <AudioVisualizer isPlaying={isPlaying} progress={progress} />
        )}

        {/* Hidden audio element for audio playback */}
        {!isVideo && (
          <audio
            ref={(el) => setMediaRef(el)}
            src={url}
            onLoadedMetadata={onLoadedMetadata}
            onTimeUpdate={onTimeUpdate}
            onPlay={onPlay}
            onPause={onPause}
            onEnded={onEnded}
            className="hidden"
          />
        )}
      </div>

      {/* Controls bar */}
      <div className="space-y-3">
        {/* Progress bar */}
        <div
          ref={progressBarRef}
          onClick={handleProgressBarClick}
          className={cn(
            "relative h-2 rounded-full cursor-pointer",
            "bg-neutral-200",
            "overflow-hidden",
            "group"
          )}
        >
          {/* Progress fill */}
          <div
            className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-100"
            style={{ width: `${progress}%` }}
          />

          {/* Hover/active state - larger hit area */}
          <div
            className={cn(
              "absolute inset-y-0 left-0 right-0",
              "group-hover:bg-primary/10",
              "transition-colors duration-150"
            )}
          />

          {/* Scrubber handle */}
          <div
            className={cn(
              "absolute top-1/2 -translate-y-1/2 -translate-x-1/2",
              "w-4 h-4 rounded-full",
              "bg-white border-2 border-primary",
              "shadow-soft",
              "opacity-0 group-hover:opacity-100",
              "transition-opacity duration-150"
            )}
            style={{ left: `${progress}%` }}
          />
        </div>

        {/* Time display and controls */}
        <div className="flex items-center justify-between">
          {/* Current time */}
          <span className="text-caption text-mute min-w-[40px]">
            {currentTimeFormatted}
          </span>

          {/* Playback controls */}
          <div className="flex items-center gap-2">
            {/* Skip backward */}
            <button
              type="button"
              onClick={onSkipBackward}
              className={cn(
                "w-10 h-10 rounded-full",
                "flex items-center justify-center",
                "text-mute hover:text-ink",
                "hover:bg-neutral-100",
                "transition-all duration-150",
                "active:scale-95"
              )}
              aria-label="Skip backward 10 seconds"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            {/* Play/Pause */}
            <button
              type="button"
              onClick={onTogglePlayPause}
              className={cn(
                "w-14 h-14 rounded-full",
                "flex items-center justify-center",
                "bg-primary text-white",
                "shadow-soft hover:shadow-lift",
                "transition-all duration-150",
                "active:scale-95"
              )}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6 ml-0.5" />
              )}
            </button>

            {/* Skip forward */}
            <button
              type="button"
              onClick={onSkipForward}
              className={cn(
                "w-10 h-10 rounded-full",
                "flex items-center justify-center",
                "text-mute hover:text-ink",
                "hover:bg-neutral-100",
                "transition-all duration-150",
                "active:scale-95"
              )}
              aria-label="Skip forward 10 seconds"
            >
              <RotateCw className="w-5 h-5" />
            </button>
          </div>

          {/* Duration */}
          <span className="text-caption text-mute min-w-[40px] text-right">
            {durationFormatted}
          </span>
        </div>
      </div>
    </div>
  );
}
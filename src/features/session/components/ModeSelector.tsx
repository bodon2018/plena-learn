"use client";

import { cn } from "@/lib/cn";
import { Mic, Video } from "lucide-react";
import type { RecordingMode } from "../hooks/useRecording";

type ModeSelectorProps = {
  /** Current selected mode */
  value: RecordingMode;
  /** Callback when mode changes */
  onChange: (mode: RecordingMode) => void;
  /** Whether selection is disabled (e.g., during recording) */
  disabled?: boolean;
};

/**
 * Segmented control for selecting Audio vs Video recording mode.
 * Apple-style pill toggle.
 */
export default function ModeSelector({
  value,
  onChange,
  disabled = false,
}: ModeSelectorProps) {
  const options: Array<{
    id: RecordingMode;
    label: string;
    icon: typeof Mic;
  }> = [
    { id: "audio", label: "Audio", icon: Mic },
    { id: "video", label: "Video", icon: Video },
  ];

  return (
    <div
      className={cn(
        "inline-flex p-1",
        "rounded-full",
        "bg-neutral-100",
        disabled && "opacity-50"
      )}
    >
      {options.map((option) => {
        const Icon = option.icon;
        const isSelected = value === option.id;

        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            disabled={disabled}
            className={cn(
              // Layout
              "flex items-center gap-2 px-4 py-2",
              "rounded-full",
              // Typography
              "text-ui font-medium",
              // Transitions
              "transition-all duration-200",
              // Selected state
              isSelected
                ? "bg-white text-ink shadow-soft"
                : "text-mute hover:text-ink",
              // Disabled
              disabled && "cursor-not-allowed",
              // Active
              !disabled && "active:scale-[0.98]"
            )}
          >
            <Icon className="w-4 h-4" />
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
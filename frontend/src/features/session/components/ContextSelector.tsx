"use client";

import { cn } from "@/lib/cn";
import { Target, Trophy } from "lucide-react";
import type { SessionContext } from "../hooks/useRecording";

type ContextSelectorProps = {
  /** Current selected context */
  value: SessionContext;
  /** Callback when context changes */
  onChange: (context: SessionContext) => void;
  /** Whether selection is disabled (e.g., during recording) */
  disabled?: boolean;
};

/**
 * Custom styled selector for Practice vs Game context.
 * Replaces browser-default radio buttons with beautiful cards.
 */
export default function ContextSelector({
  value,
  onChange,
  disabled = false,
}: ContextSelectorProps) {
  const options: Array<{
    id: SessionContext;
    label: string;
    description: string;
    icon: typeof Target;
  }> = [
    {
      id: "practice",
      label: "Practice",
      description: "Training session or drill",
      icon: Target,
    },
    {
      id: "game",
      label: "Game",
      description: "Match or competition",
      icon: Trophy,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
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
              "flex flex-col items-center gap-2 p-4",
              "rounded-2xl",
              // Border
              "border-2",
              // Transitions
              "transition-all duration-150",
              // Selected state
              isSelected
                ? "border-primary bg-primary/5"
                : "border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50",
              // Disabled state
              disabled && "opacity-50 cursor-not-allowed",
              // Active state
              !disabled && "active:scale-[0.98]"
            )}
          >
            {/* Icon */}
            <div
              className={cn(
                "w-12 h-12 rounded-xl",
                "flex items-center justify-center",
                "transition-colors duration-150",
                isSelected
                  ? "bg-primary/10 text-primary"
                  : "bg-neutral-100 text-mute"
              )}
            >
              <Icon className="w-6 h-6" />
            </div>

            {/* Label */}
            <span
              className={cn(
                "text-ui font-semibold",
                "transition-colors duration-150",
                isSelected ? "text-primary" : "text-ink"
              )}
            >
              {option.label}
            </span>

            {/* Description */}
            <span className="text-caption text-mute text-center">
              {option.description}
            </span>

            {/* Selection indicator */}
            <div
              className={cn(
                "w-5 h-5 rounded-full",
                "border-2 flex items-center justify-center",
                "transition-all duration-150",
                isSelected
                  ? "border-primary bg-primary"
                  : "border-neutral-300 bg-white"
              )}
            >
              {isSelected && (
                <div className="w-2 h-2 rounded-full bg-white" />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
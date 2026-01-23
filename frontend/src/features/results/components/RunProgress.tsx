"use client";

import { cn } from "@/lib/cn";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Play,
} from "lucide-react";

type RunProgressProps = {
  /** Current run status */
  status: "queued" | "running" | "success" | "error" | "timeout" | null;
  /** Status message to display */
  message: string;
  /** Optional className */
  className?: string;
};

/**
 * Animated progress indicator for metric runs.
 */
export default function RunProgress({
  status,
  message,
  className,
}: RunProgressProps) {
  const isAnimating = status === "queued" || status === "running";
  const isSuccess = status === "success";
  const isFailed = status === "error" || status === "timeout";

  const getIcon = () => {
    if (isSuccess) return CheckCircle2;
    if (isFailed) return XCircle;
    if (isAnimating) return Loader2;
    return Play;
  };

  const getColor = () => {
    if (isSuccess) return "success";
    if (isFailed) return "danger";
    if (isAnimating) return "primary";
    return "neutral";
  };

  const Icon = getIcon();
  const color = getColor();

  const colorClasses = {
    success: {
      bg: "bg-success/10",
      text: "text-success",
      ring: "ring-success/30",
    },
    danger: {
      bg: "bg-danger/10",
      text: "text-danger",
      ring: "ring-danger/30",
    },
    primary: {
      bg: "bg-primary/10",
      text: "text-primary",
      ring: "ring-primary/30",
    },
    neutral: {
      bg: "bg-neutral-100",
      text: "text-mute",
      ring: "ring-neutral-200",
    },
  };

  const colors = colorClasses[color];

  return (
    <div className={cn("flex items-center gap-4", className)}>
      {/* Icon container */}
      <div className="relative">
        {/* Pulsing ring when animating */}
        {isAnimating && (
          <div
            className={cn(
              "absolute inset-0 rounded-full",
              "ring-4",
              colors.ring,
              "animate-ping opacity-30"
            )}
            style={{ animationDuration: "1.5s" }}
          />
        )}

        {/* Main circle */}
        <div
          className={cn(
            "relative w-12 h-12 rounded-full",
            "flex items-center justify-center",
            colors.bg,
            "transition-all duration-300"
          )}
        >
          <Icon
            className={cn(
              "w-6 h-6",
              colors.text,
              isAnimating && "animate-spin"
            )}
          />
        </div>
      </div>

      {/* Status message */}
      <div className="flex-1 min-w-0">
        <p className={cn("text-body font-medium", colors.text)}>
          {isAnimating ? "Processing" : isSuccess ? "Complete" : isFailed ? "Failed" : "Ready"}
        </p>
        <p className="text-body-sm text-mute mt-0.5">{message}</p>
      </div>

      {/* Animated dots when processing */}
      {isAnimating && (
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn("w-2 h-2 rounded-full", colors.bg, "bg-primary")}
              style={{
                animation: "bounce 1s ease-in-out infinite",
                animationDelay: `${i * 0.15}s`,
              }}
            />
          ))}
        </div>
      )}

      <style jsx>{`
        @keyframes bounce {
          0%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-4px);
          }
        }
      `}</style>
    </div>
  );
}
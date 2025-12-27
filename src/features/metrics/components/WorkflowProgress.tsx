"use client";

import { cn } from "@/lib/cn";
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  Database,
  UserCheck,
  Sparkles,
  Play,
} from "lucide-react";

type WorkflowStatus =
  | "drafting_intent"
  | "running_data_discovery"
  | "waiting_for_data_source"
  | "waiting_for_admin_approval"
  | "ready_to_run"
  | "failed"
  | string;

type WorkflowProgressProps = {
  /** Current workflow status */
  status: WorkflowStatus;
  /** Optional error message */
  errorMessage?: string;
  /** Optional className */
  className?: string;
};

/**
 * Get visual configuration for each status.
 */
function getStatusConfig(status: WorkflowStatus) {
  switch (status) {
    case "drafting_intent":
      return {
        icon: Sparkles,
        label: "Drafting Definition",
        description: "AI is creating the metric definition based on your description...",
        color: "primary",
        isAnimating: true,
      };
    case "running_data_discovery":
      return {
        icon: Database,
        label: "Analyzing Data",
        description: "Refining the metric definition based on available data...",
        color: "primary",
        isAnimating: true,
      };
    case "waiting_for_data_source":
      return {
        icon: Database,
        label: "Waiting for Data",
        description: "Select a CSV data source to continue",
        color: "secondary",
        isAnimating: false,
      };
    case "waiting_for_admin_approval":
      return {
        icon: UserCheck,
        label: "Awaiting Approval",
        description: "Review the definition and approve, edit, or reject",
        color: "secondary",
        isAnimating: false,
      };
    case "ready_to_run":
      return {
        icon: CheckCircle2,
        label: "Ready",
        description: "Metric is approved and ready to run",
        color: "success",
        isAnimating: false,
      };
    case "failed":
      return {
        icon: AlertCircle,
        label: "Failed",
        description: "Something went wrong",
        color: "danger",
        isAnimating: false,
      };
    default:
      return {
        icon: Clock,
        label: "Processing",
        description: `Status: ${status}`,
        color: "primary",
        isAnimating: true,
      };
  }
}

/**
 * Get color classes based on color name.
 */
function getColorClasses(color: string) {
  switch (color) {
    case "primary":
      return {
        bg: "bg-primary/10",
        text: "text-primary",
        ring: "ring-primary/30",
        glow: "shadow-primary/20",
      };
    case "secondary":
      return {
        bg: "bg-secondary/10",
        text: "text-secondary",
        ring: "ring-secondary/30",
        glow: "shadow-secondary/20",
      };
    case "success":
      return {
        bg: "bg-success/10",
        text: "text-success",
        ring: "ring-success/30",
        glow: "shadow-success/20",
      };
    case "danger":
      return {
        bg: "bg-danger/10",
        text: "text-danger",
        ring: "ring-danger/30",
        glow: "shadow-danger/20",
      };
    default:
      return {
        bg: "bg-neutral-100",
        text: "text-mute",
        ring: "ring-neutral-200",
        glow: "shadow-neutral-200",
      };
  }
}

/**
 * Animated workflow progress indicator.
 * 
 * Shows a circular progress animation when the AI workflow is processing,
 * with clear visual states for each workflow stage.
 */
export default function WorkflowProgress({
  status,
  errorMessage,
  className,
}: WorkflowProgressProps) {
  const config = getStatusConfig(status);
  const colors = getColorClasses(config.color);
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex flex-col items-center text-center p-8",
        className
      )}
    >
      {/* Animated circular indicator */}
      <div className="relative">
        {/* Outer pulsing ring - only when animating */}
        {config.isAnimating && (
          <>
            <div
              className={cn(
                "absolute inset-0 rounded-full",
                "ring-4",
                colors.ring,
                "animate-ping opacity-30"
              )}
              style={{ animationDuration: "2s" }}
            />
            <div
              className={cn(
                "absolute -inset-2 rounded-full",
                "ring-2",
                colors.ring,
                "animate-pulse opacity-50"
              )}
              style={{ animationDuration: "1.5s" }}
            />
          </>
        )}

        {/* Main circle */}
        <div
          className={cn(
            "relative w-20 h-20 rounded-full",
            "flex items-center justify-center",
            colors.bg,
            "transition-all duration-300",
            config.isAnimating && ["shadow-lg", colors.glow]
          )}
        >
          {/* Spinning loader behind icon when animating */}
          {config.isAnimating && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2
                className={cn(
                  "w-16 h-16 animate-spin opacity-20",
                  colors.text
                )}
              />
            </div>
          )}

          {/* Status icon */}
          <Icon
            className={cn(
              "relative z-10 w-8 h-8",
              colors.text,
              config.isAnimating && "animate-pulse"
            )}
          />
        </div>
      </div>

      {/* Status label */}
      <div className="mt-4">
        <h3
          className={cn(
            "text-heading-3 font-semibold",
            colors.text
          )}
        >
          {config.label}
        </h3>
      </div>

      {/* Description */}
      <p className="mt-2 text-body-sm text-mute max-w-xs">
        {errorMessage || config.description}
      </p>

      {/* Animated dots when processing */}
      {config.isAnimating && (
        <div className="mt-4 flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                "w-2 h-2 rounded-full",
                colors.bg,
                colors.text.replace("text-", "bg-")
              )}
              style={{
                animation: "bounce 1s ease-in-out infinite",
                animationDelay: `${i * 0.15}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Inline keyframes for bouncing dots */}
      <style jsx>{`
        @keyframes bounce {
          0%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-6px);
          }
        }
      `}</style>
    </div>
  );
}
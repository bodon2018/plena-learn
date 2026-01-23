"use client";

import { cn } from "@/lib/cn";
import { BarChart2, Loader2, AlertTriangle } from "lucide-react";
import AdminCard from "@/components/ui/AdminCard";
import type { PlotImage } from "../hooks/useResults";

type PlotsCardProps = {
  /** Whether a run has been started */
  hasRun: boolean;
  /** Whether run is in progress */
  isRunning: boolean;
  /** Whether run succeeded */
  isSuccess: boolean;
  /** Whether run failed */
  isFailed: boolean;
  /** Plot images to display */
  plots: PlotImage[];
};

/**
 * Card displaying visualization plots from the metric run.
 */
export default function PlotsCard({
  hasRun,
  isRunning,
  isSuccess,
  isFailed,
  plots,
}: PlotsCardProps) {
  // Empty state
  if (!hasRun) {
    return (
      <AdminCard title="Visualizations">
        <div className="text-center py-12">
          <div
            className={cn(
              "w-16 h-16 rounded-full mx-auto mb-4",
              "bg-neutral-100",
              "flex items-center justify-center"
            )}
          >
            <BarChart2 className="w-8 h-8 text-mute" />
          </div>
          <p className="text-body text-mute">Run a metric to see visualizations</p>
          <p className="text-body-sm text-subtle mt-1">
            Plots will appear here if the metric generates them
          </p>
        </div>
      </AdminCard>
    );
  }

  // Running state
  if (isRunning) {
    return (
      <AdminCard title="Visualizations">
        <div className="text-center py-12">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
          <p className="text-body text-mute">Processing...</p>
          <p className="text-body-sm text-subtle mt-1">
            Plots will appear when the run completes
          </p>
        </div>
      </AdminCard>
    );
  }

  // Failed state
  if (isFailed) {
    return (
      <AdminCard title="Visualizations">
        <div className="text-center py-12">
          <div
            className={cn(
              "w-16 h-16 rounded-full mx-auto mb-4",
              "bg-danger/10",
              "flex items-center justify-center"
            )}
          >
            <AlertTriangle className="w-8 h-8 text-danger" />
          </div>
          <p className="text-body text-mute">No visualizations available</p>
          <p className="text-body-sm text-subtle mt-1">
            The run did not complete successfully
          </p>
        </div>
      </AdminCard>
    );
  }

  // No plots
  if (plots.length === 0) {
    return (
      <AdminCard title="Visualizations">
        <div className="text-center py-12">
          <div
            className={cn(
              "w-16 h-16 rounded-full mx-auto mb-4",
              "bg-neutral-100",
              "flex items-center justify-center"
            )}
          >
            <BarChart2 className="w-8 h-8 text-mute" />
          </div>
          <p className="text-body text-mute">No plots generated</p>
          <p className="text-body-sm text-subtle mt-1">
            This metric did not produce any visualizations
          </p>
        </div>
      </AdminCard>
    );
  }

  // Display plots
  return (
    <AdminCard title="Visualizations">
      <div className="grid gap-6">
        {plots.map((plot, idx) => (
          <div
            key={`plot-${idx}`}
            className={cn(
              "rounded-xl overflow-hidden",
              "border border-neutral-200",
              "bg-white"
            )}
          >
            {/* Plot label */}
            {plot.label && (
              <div
                className={cn(
                  "px-4 py-3",
                  "border-b border-neutral-100",
                  "bg-neutral-50"
                )}
              >
                <h4 className="text-body-sm font-medium text-ink">
                  {plot.label}
                </h4>
              </div>
            )}

            {/* Plot image */}
            <div className="p-4">
              <img
                src={plot.src}
                alt={plot.label ?? `Visualization ${idx + 1}`}
                className="w-full rounded-lg"
              />
            </div>
          </div>
        ))}
      </div>
    </AdminCard>
  );
}
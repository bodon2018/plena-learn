"use client";

import { cn } from "@/lib/cn";
import {
  Play,
  RefreshCw,
  Loader2,
  AlertCircle,
  BarChart3,
  FileSpreadsheet,
} from "lucide-react";
import AdminCard from "@/components/ui/AdminCard";
import RunProgress from "./RunProgress";
import type { MetricDefinitionSummary } from "@/hooks/useMetricsDefinitionsStore";
import type { UploadedCsv } from "@/hooks/useDataSourcesStore";
import type { MetricRunRecord } from "../hooks/useResults";

type RunMetricCardProps = {
  // Metrics
  metrics: MetricDefinitionSummary[];
  metricsLoading: boolean;
  metricsError: string | null;
  onRefreshMetrics: () => void;
  selectedMetricId: string;
  onSelectMetric: (id: string) => void;
  selectedMetric: MetricDefinitionSummary | null;

  // CSVs
  csvs: UploadedCsv[];
  csvsLoading: boolean;
  csvsError: string | null;
  onRefreshCsvs: () => void;
  selectedCsvPath: string;
  onSelectCsv: (path: string) => void;

  // Run
  isRunning: boolean;
  runError: string | null;
  onRun: () => void;
  onRefreshRun: () => void;
  latestRun: MetricRunRecord | null;
  statusMessage: string;
  hasRunJob: boolean;
};

/**
 * Card for selecting a metric and CSV, then running the metric.
 */
export default function RunMetricCard({
  metrics,
  metricsLoading,
  metricsError,
  onRefreshMetrics,
  selectedMetricId,
  onSelectMetric,
  selectedMetric,
  csvs,
  csvsLoading,
  csvsError,
  onRefreshCsvs,
  selectedCsvPath,
  onSelectCsv,
  isRunning,
  runError,
  onRun,
  onRefreshRun,
  latestRun,
  statusMessage,
  hasRunJob,
}: RunMetricCardProps) {
  const canRun = selectedMetricId && selectedCsvPath && !isRunning;

  return (
    <AdminCard
      title="Run a Metric"
      description="Select a metric definition and a CSV file, then execute the metric."
      headerActions={
        hasRunJob && (
          <button
            type="button"
            onClick={onRefreshRun}
            className={cn(
              "inline-flex items-center gap-1.5",
              "px-3 py-1.5 rounded-lg",
              "text-caption font-medium text-mute",
              "border border-neutral-200",
              "hover:bg-neutral-50 hover:text-ink",
              "transition-all duration-150"
            )}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        )
      }
    >
      <div className="space-y-6">
        {/* Selectors grid */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Metric selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-ui font-medium text-ink flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Metric
              </label>
              <button
                type="button"
                onClick={onRefreshMetrics}
                disabled={metricsLoading}
                className={cn(
                  "inline-flex items-center gap-1",
                  "px-2 py-1 rounded-md",
                  "text-caption text-mute",
                  "hover:bg-neutral-100 hover:text-ink",
                  "transition-colors",
                  "disabled:opacity-50"
                )}
              >
                <RefreshCw className={cn("w-3 h-3", metricsLoading && "animate-spin")} />
                Refresh
              </button>
            </div>

            <select
              value={selectedMetricId}
              onChange={(e) => onSelectMetric(e.target.value)}
              disabled={metricsLoading || metrics.length === 0}
              className={cn(
                "w-full px-4 py-3 rounded-xl",
                "border border-neutral-200 bg-white",
                "text-body-sm text-ink",
                "focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10",
                "disabled:bg-neutral-50 disabled:cursor-not-allowed"
              )}
            >
              {metrics.length === 0 ? (
                <option value="">No metrics available</option>
              ) : (
                metrics.map((m) => (
                  <option key={m.job_id} value={m.job_id}>
                    {m.metric_name}
                  </option>
                ))
              )}
            </select>

            {metricsError && (
              <p className="text-caption text-danger">{metricsError}</p>
            )}

            {selectedMetric && (
              <p className="text-caption text-mute line-clamp-2">
                {selectedMetric.description}
              </p>
            )}
          </div>

          {/* CSV selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-ui font-medium text-ink flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-secondary" />
                CSV Data
              </label>
              <button
                type="button"
                onClick={onRefreshCsvs}
                disabled={csvsLoading}
                className={cn(
                  "inline-flex items-center gap-1",
                  "px-2 py-1 rounded-md",
                  "text-caption text-mute",
                  "hover:bg-neutral-100 hover:text-ink",
                  "transition-colors",
                  "disabled:opacity-50"
                )}
              >
                <RefreshCw className={cn("w-3 h-3", csvsLoading && "animate-spin")} />
                Refresh
              </button>
            </div>

            <select
              value={selectedCsvPath}
              onChange={(e) => onSelectCsv(e.target.value)}
              disabled={csvsLoading || csvs.length === 0}
              className={cn(
                "w-full px-4 py-3 rounded-xl",
                "border border-neutral-200 bg-white",
                "text-body-sm text-ink",
                "focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10",
                "disabled:bg-neutral-50 disabled:cursor-not-allowed"
              )}
            >
              {csvs.length === 0 ? (
                <option value="">No CSVs available</option>
              ) : (
                csvs.map((f) => (
                  <option key={f.saved_path} value={f.saved_path}>
                    {f.original_filename} ({(f.size_bytes / 1024).toFixed(1)} KB)
                  </option>
                ))
              )}
            </select>

            {csvsError && (
              <p className="text-caption text-danger">{csvsError}</p>
            )}

            {csvs.length === 0 && !csvsLoading && (
              <p className="text-caption text-mute">
                Upload a CSV in Data Sources first.
              </p>
            )}
          </div>
        </div>

        {/* Run button and status */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <button
            type="button"
            onClick={onRun}
            disabled={!canRun}
            className={cn(
              "inline-flex items-center justify-center gap-2",
              "px-6 py-3 rounded-xl",
              "bg-primary text-white",
              "text-ui font-semibold",
              "shadow-soft hover:shadow-lift",
              "transition-all duration-150",
              "active:scale-[0.98]",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {isRunning ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Run Metric
              </>
            )}
          </button>

          {/* Status indicator */}
          {hasRunJob && latestRun && (
            <RunProgress
              status={latestRun.status}
              message={statusMessage}
              className="flex-1"
            />
          )}

          {!hasRunJob && (
            <p className="text-body-sm text-mute">{statusMessage}</p>
          )}
        </div>

        {/* Run error */}
        {runError && (
          <div
            className={cn(
              "flex items-start gap-3 p-4 rounded-xl",
              "bg-danger/5 border border-danger/20"
            )}
          >
            <AlertCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-body-sm font-medium text-danger">Run Error</p>
              <p className="text-caption text-danger/80 mt-1">{runError}</p>
            </div>
          </div>
        )}

        {/* Stderr on failure */}
        {latestRun?.stderr && (latestRun.status === "error" || latestRun.status === "timeout") && (
          <div
            className={cn(
              "p-4 rounded-xl",
              "bg-danger/5 border border-danger/20"
            )}
          >
            <p className="text-body-sm font-medium text-danger mb-2">Error Output</p>
            <pre
              className={cn(
                "p-3 rounded-lg",
                "bg-white border border-danger/20",
                "text-caption text-danger/80",
                "overflow-auto max-h-40",
                "whitespace-pre-wrap break-words"
              )}
            >
              {latestRun.stderr}
            </pre>
          </div>
        )}
      </div>
    </AdminCard>
  );
}
"use client";

import { cn } from "@/lib/cn";
import { RefreshCw, Loader2, AlertCircle, BarChart3 } from "lucide-react";
import AdminCard from "@/components/ui/AdminCard";
import MetricDefinitionItem from "./MetricDefinitionItem";

type MetricDefinition = {
  job_id: string;
  metric_name: string;
  description: string;
  sport?: string | null;
  constraints?: Record<string, unknown>;
  org_context?: string;
  status: string;
  created_at?: string;
};

type MetricDefinitionsListProps = {
  definitions: MetricDefinition[];
  isLoading: boolean;
  error: string | null;
  deleteError: string | null;
  deletingIds: Record<string, boolean>;
  onRefresh: () => void;
  onDelete: (jobId: string, metricName?: string) => void;
};

/**
 * List of existing metric definitions.
 */
export default function MetricDefinitionsList({
  definitions,
  isLoading,
  error,
  deleteError,
  deletingIds,
  onRefresh,
  onDelete,
}: MetricDefinitionsListProps) {
  return (
    <AdminCard
      title="Existing Metrics"
      description="All metric definitions in your organization"
      headerActions={
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className={cn(
            "inline-flex items-center gap-1.5",
            "px-3 py-1.5 rounded-lg",
            "text-caption font-medium text-mute",
            "border border-neutral-200",
            "hover:bg-neutral-50 hover:text-ink",
            "transition-all duration-150",
            "disabled:opacity-50"
          )}
        >
          <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
          Refresh
        </button>
      }
    >
      {/* Errors */}
      {(error || deleteError) && (
        <div
          className={cn(
            "flex items-start gap-2 p-3 rounded-xl mb-4",
            "bg-danger/5 border border-danger/20"
          )}
        >
          <AlertCircle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
          <p className="text-body-sm text-danger">{error || deleteError}</p>
        </div>
      )}

      {/* Loading */}
      {isLoading && definitions.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && definitions.length === 0 && (
        <div
          className={cn(
            "text-center py-12 rounded-xl",
            "bg-neutral-50"
          )}
        >
          <BarChart3 className="w-12 h-12 text-mute mx-auto mb-3" />
          <p className="text-body text-mute">No metrics created yet</p>
          <p className="text-body-sm text-subtle mt-1">
            Create your first metric using the form above
          </p>
        </div>
      )}

      {/* List */}
      {definitions.length > 0 && (
        <div className="space-y-3">
          {definitions.map((metric) => (
            <MetricDefinitionItem
              key={metric.job_id}
              metric={metric}
              onDelete={onDelete}
              isDeleting={deletingIds[metric.job_id] ?? false}
            />
          ))}
        </div>
      )}
    </AdminCard>
  );
}
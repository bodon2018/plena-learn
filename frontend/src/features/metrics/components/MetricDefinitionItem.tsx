"use client";

import { cn } from "@/lib/cn";
import { Trash2, Loader2, Calendar, Tag } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";

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

type MetricDefinitionItemProps = {
  metric: MetricDefinition;
  onDelete: (jobId: string, metricName?: string) => void;
  isDeleting: boolean;
};

/**
 * Format constraints for display.
 */
function formatConstraints(c?: Record<string, unknown>): string | null {
  if (!c || Object.keys(c).length === 0) return null;
  const s = JSON.stringify(c);
  return s.length > 80 ? `${s.slice(0, 80)}…` : s;
}

/**
 * Format date for display.
 */
function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Single metric definition item in the list.
 */
export default function MetricDefinitionItem({
  metric,
  onDelete,
  isDeleting,
}: MetricDefinitionItemProps) {
  const constraints = formatConstraints(metric.constraints);
  const createdDate = formatDate(metric.created_at);

  return (
    <div
      className={cn(
        "p-4 rounded-xl",
        "bg-white border border-neutral-200/80",
        "hover:shadow-soft",
        "transition-all duration-150"
      )}
    >
      <div className="flex items-start gap-4">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Header: Name + Status */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <h4 className="text-body font-semibold text-ink truncate">
              {metric.metric_name}
            </h4>
            <StatusBadge status={metric.status} size="sm" />
          </div>

          {/* Description */}
          <p className="text-body-sm text-mute line-clamp-2 mb-3">
            {metric.description}
          </p>

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-3 text-caption text-mute">
            {/* Sport */}
            {metric.sport && (
              <span className="inline-flex items-center gap-1">
                <Tag className="w-3 h-3" />
                {metric.sport}
              </span>
            )}

            {/* Created date */}
            {createdDate && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {createdDate}
              </span>
            )}

            {/* Constraints (if any) */}
            {constraints && (
              <span
                className="text-subtle truncate max-w-[200px]"
                title={JSON.stringify(metric.constraints, null, 2)}
              >
                Constraints: {constraints}
              </span>
            )}
          </div>

          {/* Job ID (subtle) */}
          <p className="text-caption-sm text-subtle mt-2">
            Job: {metric.job_id}
          </p>
        </div>

        {/* Delete button */}
        <button
          type="button"
          onClick={() => onDelete(metric.job_id, metric.metric_name)}
          disabled={isDeleting}
          className={cn(
            "p-2 rounded-lg",
            "text-mute",
            "hover:bg-danger/5 hover:text-danger",
            "transition-all duration-150",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
          title="Delete metric"
        >
          {isDeleting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}
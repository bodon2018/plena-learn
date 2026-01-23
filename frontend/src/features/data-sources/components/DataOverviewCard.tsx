"use client";

import { cn } from "@/lib/cn";
import {
  FileSpreadsheet,
  Rows3,
  Columns3,
  AlertTriangle,
  Loader2,
  Table2,
} from "lucide-react";
import AdminCard from "@/components/ui/AdminCard";
import type { DataSourceOverview, UploadedCsv } from "@/hooks/useDataSourcesStore";

type DataOverviewCardProps = {
  selectedFile: UploadedCsv | null;
  overview: DataSourceOverview | null;
  isLoading: boolean;
  error: string | null;
};

/**
 * Format bytes to human-readable size.
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Card displaying overview of selected data source.
 */
export default function DataOverviewCard({
  selectedFile,
  overview,
  isLoading,
  error,
}: DataOverviewCardProps) {
  // Empty state - no file selected
  if (!selectedFile) {
    return (
      <AdminCard title="Data Overview">
        <div className="text-center py-12">
          <div
            className={cn(
              "w-16 h-16 rounded-full mx-auto mb-4",
              "bg-neutral-100",
              "flex items-center justify-center"
            )}
          >
            <Table2 className="w-8 h-8 text-mute" />
          </div>
          <p className="text-body text-mute">Select a file to see its overview</p>
          <p className="text-body-sm text-subtle mt-1">
            Choose a CSV from the list above
          </p>
        </div>
      </AdminCard>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <AdminCard title="Data Overview">
        <div className="text-center py-12">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
          <p className="text-body text-mute">Loading overview...</p>
        </div>
      </AdminCard>
    );
  }

  // Error state
  if (error) {
    return (
      <AdminCard title="Data Overview">
        <div
          className={cn(
            "flex items-start gap-3 p-4 rounded-xl",
            "bg-danger/5 border border-danger/20"
          )}
        >
          <AlertTriangle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-body-sm font-medium text-danger">
              Failed to load overview
            </p>
            <p className="text-caption text-danger/80 mt-1">{error}</p>
          </div>
        </div>
      </AdminCard>
    );
  }

  // No overview data
  if (!overview) {
    return (
      <AdminCard title="Data Overview">
        <div className="text-center py-8">
          <p className="text-body-sm text-mute">No overview data available</p>
        </div>
      </AdminCard>
    );
  }

  // Sort missing values by count (descending)
  const sortedMissingValues = Object.entries(overview.missing_values || {}).sort(
    (a, b) => b[1] - a[1]
  );

  return (
    <AdminCard title="Data Overview">
      <div className="space-y-6">
        {/* File info */}
        <div
          className={cn(
            "p-4 rounded-xl",
            "bg-primary/5 border border-primary/20"
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-10 h-10 rounded-xl",
                "bg-primary/10",
                "flex items-center justify-center"
              )}
            >
              <FileSpreadsheet className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-body font-medium text-ink truncate">
                {overview.original_filename}
              </p>
              <p className="text-caption text-mute">
                {formatBytes(overview.size_bytes)}
              </p>
            </div>
          </div>
        </div>

        {/* Shape stats */}
        <div className="grid grid-cols-2 gap-4">
          <div
            className={cn(
              "p-4 rounded-xl",
              "bg-neutral-50 border border-neutral-200"
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <Rows3 className="w-4 h-4 text-mute" />
              <span className="text-caption text-mute">Rows</span>
            </div>
            <p className="text-heading-2 text-ink">
              {overview.row_count.toLocaleString()}
            </p>
          </div>

          <div
            className={cn(
              "p-4 rounded-xl",
              "bg-neutral-50 border border-neutral-200"
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <Columns3 className="w-4 h-4 text-mute" />
              <span className="text-caption text-mute">Columns</span>
            </div>
            <p className="text-heading-2 text-ink">
              {overview.column_count.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Columns */}
        <div>
          <h3 className="text-ui font-semibold text-ink mb-3">Columns</h3>
          <div className="flex flex-wrap gap-2">
            {overview.columns.map((col) => (
              <span
                key={col.name}
                className={cn(
                  "px-3 py-1.5 rounded-lg",
                  "bg-white border border-neutral-200",
                  "text-caption text-ink",
                  "cursor-help"
                )}
                title={
                  col.dtype
                    ? `Type: ${col.dtype}${
                        typeof col.nullable === "boolean"
                          ? `, Nullable: ${col.nullable}`
                          : ""
                      }`
                    : col.name
                }
              >
                {col.name}
                {col.dtype && (
                  <span className="ml-1.5 text-subtle">({col.dtype})</span>
                )}
              </span>
            ))}
          </div>
        </div>

        {/* Missing values */}
        <div>
          <h3 className="text-ui font-semibold text-ink mb-3">Missing Values</h3>

          {sortedMissingValues.length === 0 ? (
            <div
              className={cn(
                "p-4 rounded-xl text-center",
                "bg-success/5 border border-success/20"
              )}
            >
              <p className="text-body-sm text-success">
                No missing values detected
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {sortedMissingValues.map(([col, count]) => {
                const percentage = (
                  (count / overview.row_count) *
                  100
                ).toFixed(1);
                const isHigh = count / overview.row_count > 0.1;

                return (
                  <div
                    key={col}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl",
                      "border",
                      isHigh
                        ? "bg-secondary/5 border-secondary/20"
                        : "bg-neutral-50 border-neutral-200"
                    )}
                  >
                    <span className="text-body-sm text-ink">{col}</span>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "text-body-sm font-medium",
                          isHigh ? "text-secondary" : "text-mute"
                        )}
                      >
                        {count.toLocaleString()}
                      </span>
                      <span className="text-caption text-mute">
                        ({percentage}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AdminCard>
  );
}
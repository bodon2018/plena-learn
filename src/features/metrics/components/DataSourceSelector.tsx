"use client";

import { cn } from "@/lib/cn";
import { RefreshCw, Database, Loader2, AlertCircle, FileSpreadsheet } from "lucide-react";

type CsvFile = {
  saved_path: string;
  original_filename: string;
  size_bytes: number;
};

type DataSourceSelectorProps = {
  csvs: CsvFile[];
  isLoading: boolean;
  error: string | null;
  selectedPath: string;
  onSelect: (path: string) => void;
  onRefresh: () => void;
  onAttach: () => void;
  isAttaching: boolean;
  attachError: string | null;
};

/**
 * CSV data source selector for metric workflows.
 */
export default function DataSourceSelector({
  csvs,
  isLoading,
  error,
  selectedPath,
  onSelect,
  onRefresh,
  onAttach,
  isAttaching,
  attachError,
}: DataSourceSelectorProps) {
  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-secondary" />
          <h3 className="text-ui font-semibold text-ink">Select Data Source</h3>
        </div>
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
      </div>

      {/* Error */}
      {error && (
        <div
          className={cn(
            "flex items-start gap-2 p-3 rounded-xl",
            "bg-danger/5 border border-danger/20"
          )}
        >
          <AlertCircle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
          <p className="text-body-sm text-danger">{error}</p>
        </div>
      )}

      {/* Loading */}
      {isLoading && !csvs.length && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && csvs.length === 0 && (
        <div
          className={cn(
            "text-center py-8 rounded-xl",
            "bg-neutral-50 border border-dashed border-neutral-200"
          )}
        >
          <FileSpreadsheet className="w-10 h-10 text-mute mx-auto mb-3" />
          <p className="text-body-sm text-mute">No CSV files available</p>
          <p className="text-caption text-subtle mt-1">
            Upload a CSV in the Data Sources tab, then return here.
          </p>
        </div>
      )}

      {/* CSV list */}
      {csvs.length > 0 && (
        <div className="space-y-2">
          {csvs.map((csv) => {
            const isSelected = selectedPath === csv.saved_path;

            return (
              <button
                key={csv.saved_path}
                type="button"
                onClick={() => onSelect(csv.saved_path)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl",
                  "text-left",
                  "transition-all duration-150",
                  "border",
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50"
                )}
              >
                {/* Selection indicator */}
                <div
                  className={cn(
                    "w-5 h-5 rounded-full border-2",
                    "flex items-center justify-center",
                    "flex-shrink-0",
                    isSelected
                      ? "border-primary bg-primary"
                      : "border-neutral-300"
                  )}
                >
                  {isSelected && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>

                {/* File icon */}
                <FileSpreadsheet
                  className={cn(
                    "w-5 h-5 flex-shrink-0",
                    isSelected ? "text-primary" : "text-mute"
                  )}
                />

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "text-body-sm font-medium truncate",
                      isSelected ? "text-primary" : "text-ink"
                    )}
                  >
                    {csv.original_filename}
                  </p>
                  <p className="text-caption text-mute">
                    {formatBytes(csv.size_bytes)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Attach error */}
      {attachError && (
        <div
          className={cn(
            "flex items-start gap-2 p-3 rounded-xl",
            "bg-danger/5 border border-danger/20"
          )}
        >
          <AlertCircle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
          <p className="text-body-sm text-danger">{attachError}</p>
        </div>
      )}

      {/* Attach button */}
      {csvs.length > 0 && (
        <button
          type="button"
          onClick={onAttach}
          disabled={!selectedPath || isAttaching}
          className={cn(
            "w-full inline-flex items-center justify-center gap-2",
            "px-4 py-3 rounded-xl",
            "bg-primary text-white",
            "text-ui font-semibold",
            "shadow-soft hover:shadow-lift",
            "transition-all duration-150",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {isAttaching ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Attaching...
            </>
          ) : (
            <>
              <Database className="w-4 h-4" />
              Attach Selected CSV
            </>
          )}
        </button>
      )}
    </div>
  );
}
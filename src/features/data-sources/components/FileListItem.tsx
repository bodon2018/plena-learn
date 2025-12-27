"use client";

import { cn } from "@/lib/cn";
import { FileSpreadsheet, Check, Trash2, Loader2 } from "lucide-react";
import type { UploadedCsv } from "@/hooks/useDataSourcesStore";

type FileListItemProps = {
  file: UploadedCsv;
  isSelected: boolean;
  isDeleting: boolean;
  onSelect: () => void;
  onClear: () => void;
  onDelete: () => void;
  disabled?: boolean;
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
 * Single file item in the data sources list.
 */
export default function FileListItem({
  file,
  isSelected,
  isDeleting,
  onSelect,
  onClear,
  onDelete,
  disabled,
}: FileListItemProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 p-4",
        "rounded-xl",
        "transition-all duration-150",
        "border",
        isSelected
          ? "border-primary bg-primary/5"
          : "border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50"
      )}
    >
      {/* File icon */}
      <div
        className={cn(
          "w-10 h-10 rounded-xl",
          "flex items-center justify-center",
          "flex-shrink-0",
          isSelected ? "bg-primary/10" : "bg-neutral-100"
        )}
      >
        <FileSpreadsheet
          className={cn("w-5 h-5", isSelected ? "text-primary" : "text-mute")}
        />
      </div>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-body-sm font-medium truncate",
            isSelected ? "text-primary" : "text-ink"
          )}
        >
          {file.original_filename}
        </p>
        <p className="text-caption text-mute mt-0.5">
          {formatBytes(file.size_bytes)}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Select/Selected button */}
        {isSelected ? (
          <button
            type="button"
            onClick={onClear}
            className={cn(
              "inline-flex items-center gap-1.5",
              "px-3 py-1.5 rounded-lg",
              "bg-primary text-white",
              "text-caption font-medium",
              "transition-all duration-150",
              "hover:bg-primary/90"
            )}
          >
            <Check className="w-3.5 h-3.5" />
            Selected
          </button>
        ) : (
          <button
            type="button"
            onClick={onSelect}
            disabled={disabled}
            className={cn(
              "px-3 py-1.5 rounded-lg",
              "border border-neutral-200",
              "text-caption font-medium text-mute",
              "transition-all duration-150",
              "hover:bg-neutral-100 hover:text-ink",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            Select
          </button>
        )}

        {/* Delete button */}
        <button
          type="button"
          onClick={onDelete}
          disabled={isDeleting || disabled}
          className={cn(
            "p-2 rounded-lg",
            "text-mute",
            "transition-all duration-150",
            "hover:bg-danger/5 hover:text-danger",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
          title="Delete file"
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
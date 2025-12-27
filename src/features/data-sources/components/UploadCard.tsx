"use client";

import { useRef } from "react";
import { cn } from "@/lib/cn";
import {
  Upload,
  RefreshCw,
  Loader2,
  AlertCircle,
  FileSpreadsheet,
  Plus,
} from "lucide-react";
import AdminCard from "@/components/ui/AdminCard";
import FileListItem from "./FileListItem";
import type { UploadedCsv } from "@/hooks/useDataSourcesStore";

type UploadCardProps = {
  files: UploadedCsv[];
  filesLoading: boolean;
  filesError: string | null;
  uploading: boolean;
  uploadError: string | null;
  selectedSavedPath: string | null;
  deletingPath: string | null;
  deleteError: string | null;
  onRefresh: () => void;
  onUpload: (file: File) => void;
  onSelect: (savedPath: string) => void;
  onClear: () => void;
  onDelete: (savedPath: string, originalFilename?: string) => void;
};

/**
 * Card for uploading and managing CSV files.
 */
export default function UploadCard({
  files,
  filesLoading,
  filesError,
  uploading,
  uploadError,
  selectedSavedPath,
  deletingPath,
  deleteError,
  onRefresh,
  onUpload,
  onSelect,
  onClear,
  onDelete,
}: UploadCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list || list.length === 0) return;

    for (const f of Array.from(list)) {
      onUpload(f);
    }

    e.currentTarget.value = "";
  };

  return (
    <AdminCard
      title="Data Sources"
      description="Upload and manage CSV files for metric analysis"
      headerActions={
        <button
          type="button"
          onClick={onRefresh}
          disabled={filesLoading}
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
          <RefreshCw className={cn("w-3.5 h-3.5", filesLoading && "animate-spin")} />
          Refresh
        </button>
      }
    >
      <div className="space-y-6">
        {/* Upload zone */}
        <div
          className={cn(
            "relative",
            "rounded-xl border-2 border-dashed",
            "transition-all duration-150",
            uploading
              ? "border-primary bg-primary/5"
              : "border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            multiple
            disabled={uploading}
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />

          <div className="flex flex-col items-center justify-center py-8 px-4">
            <div
              className={cn(
                "w-12 h-12 rounded-full mb-3",
                "flex items-center justify-center",
                uploading ? "bg-primary/10" : "bg-neutral-100"
              )}
            >
              {uploading ? (
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              ) : (
                <Upload className="w-6 h-6 text-mute" />
              )}
            </div>

            <p className="text-body-sm font-medium text-ink">
              {uploading ? "Uploading..." : "Drop CSV files here or click to upload"}
            </p>
            <p className="text-caption text-mute mt-1">
              Supports .csv files
            </p>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className={cn(
                "mt-4 inline-flex items-center gap-2",
                "px-4 py-2 rounded-lg",
                "bg-primary text-white",
                "text-ui font-medium",
                "transition-all duration-150",
                "hover:bg-primary/90",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              <Plus className="w-4 h-4" />
              Select Files
            </button>
          </div>
        </div>

        {/* Upload error */}
        {uploadError && (
          <div
            className={cn(
              "flex items-start gap-2 p-3 rounded-xl",
              "bg-danger/5 border border-danger/20"
            )}
          >
            <AlertCircle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
            <p className="text-body-sm text-danger">{uploadError}</p>
          </div>
        )}

        {/* Delete error */}
        {deleteError && (
          <div
            className={cn(
              "flex items-start gap-2 p-3 rounded-xl",
              "bg-danger/5 border border-danger/20"
            )}
          >
            <AlertCircle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
            <p className="text-body-sm text-danger">{deleteError}</p>
          </div>
        )}

        {/* Files list */}
        <div>
          <h3 className="text-ui font-semibold text-ink mb-3">
            Uploaded Files
          </h3>

          {/* Loading */}
          {filesLoading && files.length === 0 && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          )}

          {/* Error */}
          {filesError && (
            <div
              className={cn(
                "flex items-start gap-2 p-3 rounded-xl",
                "bg-danger/5 border border-danger/20"
              )}
            >
              <AlertCircle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
              <p className="text-body-sm text-danger">{filesError}</p>
            </div>
          )}

          {/* Empty state */}
          {!filesLoading && !filesError && files.length === 0 && (
            <div
              className={cn(
                "text-center py-8 rounded-xl",
                "bg-neutral-50 border border-dashed border-neutral-200"
              )}
            >
              <FileSpreadsheet className="w-10 h-10 text-mute mx-auto mb-3" />
              <p className="text-body-sm text-mute">No files uploaded yet</p>
              <p className="text-caption text-subtle mt-1">
                Upload a CSV to get started
              </p>
            </div>
          )}

          {/* File list */}
          {files.length > 0 && (
            <div className="space-y-2">
              {files.map((file) => (
                <FileListItem
                  key={file.saved_path}
                  file={file}
                  isSelected={file.saved_path === selectedSavedPath}
                  isDeleting={deletingPath === file.saved_path}
                  onSelect={() => onSelect(file.saved_path)}
                  onClear={onClear}
                  onDelete={() => onDelete(file.saved_path, file.original_filename)}
                  disabled={uploading || filesLoading}
                />
              ))}
            </div>
          )}

          {/* Helper text */}
          {files.length > 0 && (
            <p className="text-caption text-mute mt-3">
              Deleting a file removes it from the server. Metrics that reference it may fail.
            </p>
          )}
        </div>
      </div>
    </AdminCard>
  );
}
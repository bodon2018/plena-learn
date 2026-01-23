"use client";

import { cn } from "@/lib/cn";
import { FileText, Trash2, Loader2, RefreshCw, AlertCircle, CheckCircle, Clock } from "lucide-react";
import Card from "@/components/ui/Card";
import type { ReferenceMaterial } from "../hooks/useReferenceMaterials";

type MaterialsListProps = {
  materials: ReferenceMaterial[];
  isLoading: boolean;
  error: string | null;
  deletingIds: Set<string>;
  deleteError: string | null;
  onRefresh: () => void;
  onDelete: (docId: string) => void;
};

/**
 * List of uploaded reference materials.
 */
export default function MaterialsList({
  materials,
  isLoading,
  error,
  deletingIds,
  deleteError,
  onRefresh,
  onDelete,
}: MaterialsListProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <Card>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-heading-3 text-ink">Uploaded Materials</h2>
          <p className="text-body-sm text-mute mt-1">
            {materials.length} {materials.length === 1 ? "document" : "documents"} available
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className={cn(
            "inline-flex items-center gap-2",
            "px-3 py-2 rounded-lg",
            "text-caption font-medium text-mute",
            "hover:bg-neutral-100 hover:text-ink",
            "transition-all duration-150",
            "disabled:opacity-50"
          )}
        >
          <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* Delete error */}
      {deleteError && (
        <div
          className={cn(
            "flex items-start gap-3 p-4 rounded-xl mb-4",
            "bg-danger/5 border border-danger/20"
          )}
        >
          <AlertCircle className="w-5 h-5 text-danger flex-shrink-0" />
          <p className="text-body-sm text-danger">{deleteError}</p>
        </div>
      )}

      {/* Loading state */}
      {isLoading && materials.length === 0 && (
        <div className="flex items-center justify-center gap-3 py-12 text-mute">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-body-sm">Loading materials...</span>
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div
          className={cn(
            "rounded-xl",
            "bg-danger/5 border border-danger/20",
            "p-4",
            "text-body-sm text-danger"
          )}
        >
          {error}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && materials.length === 0 && (
        <div
          className={cn(
            "rounded-2xl",
            "bg-neutral-50 border border-neutral-200/60",
            "p-8",
            "text-center"
          )}
        >
          <div
            className={cn(
              "w-12 h-12 rounded-full",
              "bg-neutral-100",
              "flex items-center justify-center",
              "mx-auto mb-4"
            )}
          >
            <FileText className="w-6 h-6 text-mute" />
          </div>
          <p className="text-body-sm text-mute">No materials uploaded yet.</p>
          <p className="text-caption text-subtle mt-1">
            Upload PDFs to enhance your AI-generated reports.
          </p>
        </div>
      )}

      {/* Materials list */}
      {!isLoading && !error && materials.length > 0 && (
        <div className="space-y-3">
          {materials.map((material) => {
            const isDeleting = deletingIds.has(material.doc_id);

            return (
              <div
                key={material.doc_id}
                className={cn(
                  "flex items-start gap-4 p-4 rounded-xl",
                  "border border-neutral-200/80",
                  "bg-white",
                  "transition-all duration-150",
                  isDeleting && "opacity-50"
                )}
              >
                {/* Icon */}
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl flex-shrink-0",
                    "bg-primary/10",
                    "flex items-center justify-center"
                  )}
                >
                  <FileText className="w-5 h-5 text-primary" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-ui font-semibold text-ink">
                        {material.filename}
                      </h3>
                      {material.description && (
                        <p className="text-body-sm text-mute mt-0.5 line-clamp-2">
                          {material.description}
                        </p>
                      )}
                    </div>

                    {/* Status badge */}
                    <div className="flex-shrink-0">
                      {material.is_indexed ? (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1",
                            "px-2 py-1 rounded-md",
                            "text-caption font-medium",
                            "bg-success/10 text-success"
                          )}
                        >
                          <CheckCircle className="w-3 h-3" />
                          Indexed
                        </span>
                      ) : material.index_error ? (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1",
                            "px-2 py-1 rounded-md",
                            "text-caption font-medium",
                            "bg-danger/10 text-danger"
                          )}
                        >
                          <AlertCircle className="w-3 h-3" />
                          Error
                        </span>
                      ) : (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1",
                            "px-2 py-1 rounded-md",
                            "text-caption font-medium",
                            "bg-secondary/10 text-secondary"
                          )}
                        >
                          <Clock className="w-3 h-3" />
                          Processing
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Meta info */}
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    <span className="text-caption text-subtle">
                      {formatFileSize(material.file_size_bytes)}
                    </span>
                    <span className="text-caption text-subtle">
                      {material.page_count} {material.page_count === 1 ? "page" : "pages"}
                    </span>
                    {material.chunk_count > 0 && (
                      <span className="text-caption text-subtle">
                        {material.chunk_count} chunks
                      </span>
                    )}
                    {material.uploaded_at && (
                      <span className="text-caption text-subtle">
                        Uploaded {formatDate(material.uploaded_at)}
                      </span>
                    )}
                  </div>

                  {/* Categories */}
                  {material.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {material.categories.map((cat) => (
                        <span
                          key={cat}
                          className={cn(
                            "px-2 py-0.5 rounded-md",
                            "text-caption",
                            "bg-neutral-100 text-mute"
                          )}
                        >
                          {cat.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Index error message */}
                  {material.index_error && (
                    <p className="text-caption text-danger mt-2">
                      {material.index_error}
                    </p>
                  )}
                </div>

                {/* Delete button */}
                <button
                  type="button"
                  onClick={() => onDelete(material.doc_id)}
                  disabled={isDeleting}
                  className={cn(
                    "flex-shrink-0",
                    "w-9 h-9 rounded-xl",
                    "flex items-center justify-center",
                    "transition-all duration-200",
                    "text-neutral-400 hover:text-danger hover:bg-danger/10",
                    "disabled:opacity-50"
                  )}
                  aria-label="Delete material"
                >
                  {isDeleting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
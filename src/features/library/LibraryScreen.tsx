"use client";

import { cn } from "@/lib/cn";
import { AlertCircle, X } from "lucide-react";
import { useLibrary } from "./hooks/useLibrary";
import LibraryHeader from "./components/LibraryHeader";
import MediaList from "./components/MediaList";

/**
 * Library screen - View and manage recordings and uploads.
 * 
 * Features:
 * - Grid view of all media items
 * - Upload new media files
 * - Delete items from library
 * - Open items in Learn for annotation
 */
export default function LibraryScreen() {
  const library = useLibrary();

  return (
    <div className="space-y-6">
      {/* Header with title and upload button */}
      <LibraryHeader
        isUploading={library.isUploading}
        fileInputRef={library.fileInputRef}
        onClickUpload={library.handleClickUpload}
        onFilesSelected={library.handleSelectedFiles}
      />

      {/* Error banner */}
      {library.error && (
        <div
          className={cn(
            "flex items-start gap-3 p-4",
            "rounded-2xl",
            "bg-danger/5 border border-danger/20",
            "animate-fade-up"
          )}
        >
          <AlertCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-body-sm text-danger font-medium">
              Something went wrong
            </p>
            <p className="text-caption text-danger/80 mt-0.5">
              {library.error}
            </p>
          </div>
          <button
            type="button"
            onClick={library.clearError}
            className="text-danger/60 hover:text-danger transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Media list */}
      <MediaList
        items={library.items}
        isLoading={library.isLoading}
        deletingId={library.deletingId}
        onDelete={library.handleDelete}
        onUpload={library.handleClickUpload}
        isUploading={library.isUploading}
      />
    </div>
  );
}
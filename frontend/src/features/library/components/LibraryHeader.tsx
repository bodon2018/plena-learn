"use client";

import { type ChangeEvent } from "react";
import { cn } from "@/lib/cn";
import { Upload, Loader2 } from "lucide-react";

type LibraryHeaderProps = {
  /** Whether upload is in progress */
  isUploading: boolean;
  /** Ref for the hidden file input */
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  /** Callback to trigger file picker */
  onClickUpload: () => void;
  /** Callback when files are selected */
  onFilesSelected: (e: ChangeEvent<HTMLInputElement>) => void;
};

/**
 * Header section with page title and upload button.
 */
export default function LibraryHeader({
  isUploading,
  fileInputRef,
  onClickUpload,
  onFilesSelected,
}: LibraryHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      {/* Title and description */}
      <div>
        <h1 className="text-heading-1 text-ink">Library</h1>
        <p className="text-body text-mute mt-1">
          Your recordings and uploaded media
        </p>
      </div>

      {/* Upload button */}
      <div className="flex-shrink-0">
        {/* Hidden file input */}
        <input
          ref={(el) => {
            (fileInputRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
          }}
          type="file"
          multiple
          accept="audio/*,video/*"
          className="hidden"
          onChange={onFilesSelected}
        />

        {/* Visible button */}
        <button
          type="button"
          onClick={onClickUpload}
          disabled={isUploading}
          className={cn(
            "inline-flex items-center gap-2",
            "px-4 py-2.5 rounded-full",
            "bg-white",
            "border border-neutral-200",
            "text-ui font-semibold text-ink",
            "shadow-soft",
            "transition-all duration-150",
            "hover:border-primary hover:text-primary hover:shadow-lift",
            "active:scale-[0.98]",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Upload
            </>
          )}
        </button>
      </div>
    </div>
  );
}
"use client";

import { cn } from "@/lib/cn";
import { Film, Mic, Upload } from "lucide-react";

type EmptyLibraryProps = {
  /** Callback to trigger file upload */
  onUpload: () => void;
  /** Whether upload is in progress */
  isUploading: boolean;
};

/**
 * Empty state shown when no recordings or uploads exist.
 */
export default function EmptyLibrary({ onUpload, isUploading }: EmptyLibraryProps) {
  return (
    <div
      className={cn(
        "rounded-3xl",
        "bg-gradient-to-br from-neutral-50 to-neutral-100",
        "border border-neutral-200/60",
        "p-8 md:p-12",
        "text-center",
        "animate-fade-up"
      )}
    >
      {/* Icon cluster */}
      <div className="flex justify-center mb-6">
        <div className="relative">
          {/* Background icons */}
          <div className="absolute -left-8 top-2 opacity-30">
            <Mic className="w-8 h-8 text-primary" />
          </div>
          <div className="absolute -right-8 top-2 opacity-30">
            <Upload className="w-8 h-8 text-secondary" />
          </div>

          {/* Main icon */}
          <div
            className={cn(
              "relative w-20 h-20 rounded-full",
              "bg-gradient-to-br from-primary to-sky",
              "flex items-center justify-center",
              "shadow-lift"
            )}
          >
            <Film className="w-9 h-9 text-white" />
          </div>
        </div>
      </div>

      {/* Heading */}
      <h2 className="text-heading-2 text-ink mb-2">
        Your library is empty
      </h2>

      {/* Description */}
      <p className="text-body text-mute mb-8 max-w-sm mx-auto">
        Record a practice or game session, or upload existing media to start 
        building your library.
      </p>

      {/* Action button */}
      <button
        type="button"
        onClick={onUpload}
        disabled={isUploading}
        className={cn(
          "inline-flex items-center justify-center gap-2",
          "px-6 py-3 rounded-full",
          "bg-primary text-white",
          "text-ui font-semibold",
          "shadow-soft hover:shadow-lift",
          "transition-all duration-150",
          "active:scale-[0.98]",
          "disabled:opacity-50"
        )}
      >
        <Upload className="w-4 h-4" />
        {isUploading ? "Uploading..." : "Upload Media"}
      </button>
    </div>
  );
}
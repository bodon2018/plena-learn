"use client";

import { useRef } from "react";
import { cn } from "@/lib/cn";
import { Upload, FileText, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import Card from "@/components/ui/Card";
import type { UploadForm } from "../hooks/useReferenceMaterials";

type UploadMaterialFormProps = {
  form: UploadForm;
  onFieldChange: <K extends keyof UploadForm>(field: K, value: UploadForm[K]) => void;
  onFileChange: (file: File | null) => void;
  canUpload: boolean;
  isUploading: boolean;
  error: string | null;
  uploadSuccess: boolean;
  onSubmit: () => void;
};

const CATEGORY_OPTIONS = [
  { value: "general", label: "General" },
  { value: "scouting", label: "Scouting" },
  { value: "tactical", label: "Tactical" },
  { value: "valuation", label: "Valuation" },
  { value: "player_development", label: "Player Development" },
  { value: "coaching_development", label: "Coaching Development" },
];

/**
 * Form for uploading reference materials.
 */
export default function UploadMaterialForm({
  form,
  onFieldChange,
  onFileChange,
  canUpload,
  isUploading,
  error,
  uploadSuccess,
  onSubmit,
}: UploadMaterialFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    onFileChange(file);
    
    // Auto-fill name from filename if empty
    if (file && !form.name) {
      const nameWithoutExt = file.name.replace(/\.pdf$/i, "");
      onFieldChange("name", nameWithoutExt);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file?.type === "application/pdf") {
      onFileChange(file);
      if (!form.name) {
        const nameWithoutExt = file.name.replace(/\.pdf$/i, "");
        onFieldChange("name", nameWithoutExt);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  const handleCategoryToggle = (category: string) => {
    const current = form.categories;
    if (current.includes(category)) {
      // Don't allow removing the last category
      if (current.length > 1) {
        onFieldChange("categories", current.filter((c) => c !== category));
      }
    } else {
      onFieldChange("categories", [...current, category]);
    }
  };

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section header */}
        <div>
          <h2 className="text-heading-3 text-ink mb-1">Upload Material</h2>
          <p className="text-body-sm text-mute">
            Upload PDF documents that will help ground AI-generated reports with your organization's context
          </p>
        </div>

        {/* File drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-2xl",
            "p-8",
            "flex flex-col items-center justify-center gap-3",
            "cursor-pointer",
            "transition-all duration-150",
            "border-neutral-300 bg-neutral-50",
            "hover:border-primary hover:bg-primary/5"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {form.name ? (
            <>
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-body font-medium text-ink">{form.name}.pdf</p>
                <p className="text-caption text-mute">Click or drag to replace</p>
              </div>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-xl bg-neutral-200 flex items-center justify-center">
                <Upload className="w-6 h-6 text-mute" />
              </div>
              <div className="text-center">
                <p className="text-body font-medium text-ink">
                  Drop a PDF here or click to browse
                </p>
                <p className="text-caption text-mute">
                  Supported format: PDF (max 50MB)
                </p>
              </div>
            </>
          )}
        </div>

        {/* Material name */}
        <div className="space-y-2">
          <label htmlFor="material-name" className="text-ui font-medium text-ink">
            Material Name
          </label>
          <input
            id="material-name"
            type="text"
            value={form.name}
            onChange={(e) => onFieldChange("name", e.target.value)}
            placeholder="e.g., Player Development Framework 2025"
            className={cn(
              "w-full px-4 py-3 rounded-xl",
              "border border-neutral-200",
              "text-body text-ink",
              "placeholder:text-subtle",
              "focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10",
              "transition-all duration-150"
            )}
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label htmlFor="material-description" className="text-ui font-medium text-ink">
            Description <span className="text-mute font-normal">(optional)</span>
          </label>
          <textarea
            id="material-description"
            value={form.description}
            onChange={(e) => onFieldChange("description", e.target.value)}
            placeholder="Briefly describe what this document contains..."
            rows={3}
            className={cn(
              "w-full px-4 py-3 rounded-xl",
              "border border-neutral-200",
              "text-body text-ink",
              "placeholder:text-subtle",
              "focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10",
              "transition-all duration-150",
              "resize-none"
            )}
          />
        </div>

        {/* Categories */}
        <div className="space-y-2">
          <label className="text-ui font-medium text-ink">
            Categories
          </label>
          <p className="text-caption text-mute">
            Select which report types this material is relevant for
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {CATEGORY_OPTIONS.map((option) => {
              const isSelected = form.categories.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleCategoryToggle(option.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg",
                    "text-caption font-medium",
                    "border",
                    "transition-all duration-150",
                    isSelected
                      ? "bg-primary text-white border-primary"
                      : "bg-white text-mute border-neutral-200 hover:border-primary hover:text-primary"
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div
            className={cn(
              "flex items-start gap-3 p-4 rounded-xl",
              "bg-danger/5 border border-danger/20"
            )}
          >
            <AlertCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
            <p className="text-body-sm text-danger">{error}</p>
          </div>
        )}

        {/* Success message */}
        {uploadSuccess && (
          <div
            className={cn(
              "flex items-start gap-3 p-4 rounded-xl",
              "bg-success/5 border border-success/20"
            )}
          >
            <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-body-sm font-medium text-success">Document uploaded successfully!</p>
              <p className="text-caption text-mute mt-0.5">
                Your document is now being indexed. Check the list below for processing status.
              </p>
            </div>
          </div>
        )}

        {/* Processing status */}
        {isUploading && (
          <div
            className={cn(
              "flex items-center gap-4 p-4 rounded-xl",
              "bg-primary/5 border border-primary/20"
            )}
          >
            <div className="relative">
              <div
                className={cn(
                  "w-10 h-10 rounded-xl",
                  "bg-primary/10",
                  "flex items-center justify-center"
                )}
              >
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              </div>
            </div>
            <div className="flex-1">
              <p className="text-ui font-semibold text-primary">Processing...</p>
              <p className="text-caption text-mute">
                Uploading and indexing your document. This may take a moment.
              </p>
            </div>
          </div>
        )}

        {/* Submit button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!canUpload}
            className={cn(
              "inline-flex items-center gap-2",
              "px-6 py-3 rounded-xl",
              "bg-primary text-white",
              "text-ui font-semibold",
              "shadow-soft hover:shadow-lift",
              "transition-all duration-150",
              "active:scale-[0.98]",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
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
                Upload Material
              </>
            )}
          </button>
        </div>
      </form>
    </Card>
  );
}
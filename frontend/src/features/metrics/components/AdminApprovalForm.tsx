"use client";

import { cn } from "@/lib/cn";
import {
  CheckCircle,
  XCircle,
  Edit3,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";
import FormField from "@/components/ui/FormField";

type AdminDraft = {
  plain_language_definition: string;
  operational_definition: string;
  data_disclaimer: string;
  comment: string;
};

type AdminApprovalFormProps = {
  draft: AdminDraft;
  onDraftChange: <K extends keyof AdminDraft>(key: K, value: AdminDraft[K]) => void;
  isEditing: boolean;
  onStartEditing: () => void;
  onCancelEditing: () => void;
  canSubmitEdits: boolean;
  isSubmitting: boolean;
  error: string | null;
  onApprove: () => void;
  onSubmitEdits: () => void;
  onReject: () => void;
};

/**
 * Read-only field display component.
 */
function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-ui font-medium text-ink">{label}</label>
      <div
        className={cn(
          "p-4 rounded-xl",
          "bg-neutral-50 border border-neutral-200",
          "text-body-sm text-ink",
          "whitespace-pre-wrap",
          "min-h-[80px]"
        )}
      >
        {value || <span className="text-mute">Not available yet.</span>}
      </div>
    </div>
  );
}

/**
 * Admin approval form for reviewing metric definitions.
 */
export default function AdminApprovalForm({
  draft,
  onDraftChange,
  isEditing,
  onStartEditing,
  onCancelEditing,
  canSubmitEdits,
  isSubmitting,
  error,
  onApprove,
  onSubmitEdits,
  onReject,
}: AdminApprovalFormProps) {
  return (
    <div className="space-y-6">
      {/* Header with edit toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-ui font-semibold text-ink">Review Definition</h3>
          <p className="text-caption text-mute mt-0.5">
            {isEditing
              ? "Edit the fields below, then submit your changes"
              : "Review the AI-generated definition and approve, edit, or reject"}
          </p>
        </div>

        {!isEditing ? (
          <button
            type="button"
            onClick={onStartEditing}
            disabled={isSubmitting}
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
            <Edit3 className="w-3.5 h-3.5" />
            Edit
          </button>
        ) : (
          <button
            type="button"
            onClick={onCancelEditing}
            disabled={isSubmitting}
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
            <X className="w-3.5 h-3.5" />
            Cancel
          </button>
        )}
      </div>

      {/* Fields */}
      <div className="space-y-4">
        {/* Plain Language Definition */}
        {isEditing ? (
          <FormField
            type="textarea"
            label="Plain-Language Definition"
            required
            value={draft.plain_language_definition}
            onChange={(e) =>
              onDraftChange("plain_language_definition", e.target.value)
            }
            placeholder="Explain what will be computed in plain English (high-school level)."
            rows={4}
            disabled={isSubmitting}
          />
        ) : (
          <ReadOnlyField
            label="Plain-Language Definition"
            value={draft.plain_language_definition}
          />
        )}

        {/* Operational Definition */}
        {isEditing ? (
          <FormField
            type="textarea"
            label="Operational Definition"
            required
            value={draft.operational_definition}
            onChange={(e) =>
              onDraftChange("operational_definition", e.target.value)
            }
            placeholder="Define the metric precisely in plain terms."
            rows={4}
            disabled={isSubmitting}
          />
        ) : (
          <ReadOnlyField
            label="Operational Definition"
            value={draft.operational_definition}
          />
        )}

        {/* Data Disclaimer */}
        {isEditing ? (
          <FormField
            type="textarea"
            label="Data Disclaimer"
            required
            value={draft.data_disclaimer}
            onChange={(e) => onDraftChange("data_disclaimer", e.target.value)}
            placeholder="Explain any limitations due to the available data."
            rows={3}
            disabled={isSubmitting}
          />
        ) : (
          <ReadOnlyField
            label="Data Disclaimer"
            value={draft.data_disclaimer}
          />
        )}

        {/* Comment (always editable) */}
        <FormField
          type="textarea"
          label="Comment"
          value={draft.comment}
          onChange={(e) => onDraftChange("comment", e.target.value)}
          placeholder="Optional note for audit trail"
          rows={2}
          disabled={isSubmitting}
          helpText="This comment will be saved with your decision"
        />
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

      {/* Validation hint when editing */}
      {isEditing && !canSubmitEdits && (
        <p className="text-caption text-mute">
          All three definition fields must be filled to submit edits.
        </p>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        {isEditing ? (
          // Edit mode: Submit edits button
          <button
            type="button"
            onClick={onSubmitEdits}
            disabled={!canSubmitEdits || isSubmitting}
            className={cn(
              "inline-flex items-center gap-2",
              "px-5 py-2.5 rounded-xl",
              "bg-primary text-white",
              "text-ui font-semibold",
              "shadow-soft hover:shadow-lift",
              "transition-all duration-150",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Edit3 className="w-4 h-4" />
                Submit Edits
              </>
            )}
          </button>
        ) : (
          // Review mode: Approve and Reject buttons
          <>
            <button
              type="button"
              onClick={onApprove}
              disabled={isSubmitting}
              className={cn(
                "inline-flex items-center gap-2",
                "px-5 py-2.5 rounded-xl",
                "bg-success text-white",
                "text-ui font-semibold",
                "shadow-soft hover:shadow-lift",
                "transition-all duration-150",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Approve
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                if (confirm("Reject this metric definition? This will fail the job.")) {
                  onReject();
                }
              }}
              disabled={isSubmitting}
              className={cn(
                "inline-flex items-center gap-2",
                "px-5 py-2.5 rounded-xl",
                "border border-danger/40 text-danger",
                "text-ui font-semibold",
                "hover:bg-danger/5",
                "transition-all duration-150",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              <XCircle className="w-4 h-4" />
              Reject
            </button>
          </>
        )}
      </div>
    </div>
  );
}
"use client";

import { cn } from "@/lib/cn";
import { Plus, Loader2, AlertCircle } from "lucide-react";
import AdminCard from "@/components/ui/AdminCard";
import FormField from "@/components/ui/FormField";

type CreateMetricFormProps = {
  form: {
    metricName: string;
    description: string;
    sport: string;
    orgContext: string;
  };
  onFieldChange: <K extends keyof CreateMetricFormProps["form"]>(
    key: K,
    value: CreateMetricFormProps["form"][K]
  ) => void;
  canCreate: boolean;
  isCreating: boolean;
  error: string | null;
  onSubmit: () => void;
};

/**
 * Form for creating a new metric definition.
 */
export default function CreateMetricForm({
  form,
  onFieldChange,
  canCreate,
  isCreating,
  error,
  onSubmit,
}: CreateMetricFormProps) {
  return (
    <AdminCard
      title="Create a Metric"
      description="Define a new metric for your organization. The AI will generate a detailed definition based on your description."
    >
      <div className="space-y-4">
        {/* Metric Name */}
        <FormField
          type="text"
          label="Metric Name"
          required
          placeholder='e.g., "Network talk"'
          value={form.metricName}
          onChange={(e) => onFieldChange("metricName", e.target.value)}
          disabled={isCreating}
        />

        {/* Description */}
        <FormField
          type="textarea"
          label="Description"
          required
          placeholder="Describe what you want computed, and (if helpful) add examples."
          value={form.description}
          onChange={(e) => onFieldChange("description", e.target.value)}
          disabled={isCreating}
          rows={4}
        />

        {/* Sport */}
        <FormField
          type="text"
          label="Sport"
          placeholder='e.g., "soccer"'
          value={form.sport}
          onChange={(e) => onFieldChange("sport", e.target.value)}
          disabled={isCreating}
          helpText="Optional - specify the sport context"
        />

        {/* Organization Context */}
        <FormField
          type="textarea"
          label="Organization Context"
          placeholder="Optional background about your org/team that can help define the metric."
          value={form.orgContext}
          onChange={(e) => onFieldChange("orgContext", e.target.value)}
          disabled={isCreating}
          rows={3}
        />

        {/* Error message */}
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

        {/* Submit button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onSubmit}
            disabled={!canCreate || isCreating}
            className={cn(
              "inline-flex items-center gap-2",
              "px-5 py-2.5 rounded-xl",
              "bg-primary text-white",
              "text-ui font-semibold",
              "shadow-soft hover:shadow-lift",
              "transition-all duration-150",
              "active:scale-[0.98]",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Create Metric
              </>
            )}
          </button>
        </div>
      </div>
    </AdminCard>
  );
}
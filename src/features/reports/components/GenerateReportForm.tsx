"use client";

import { cn } from "@/lib/cn";
import { FileText, Loader2, AlertCircle, RefreshCw, Play } from "lucide-react";
import Card from "@/components/ui/Card";
import type { GenerateReportForm, ReportType, CsvFile } from "../hooks/useReports";

type GenerateReportFormProps = {
  form: GenerateReportForm;
  onFieldChange: <K extends keyof GenerateReportForm>(field: K, value: GenerateReportForm[K]) => void;
  csvs: CsvFile[];
  csvsLoading: boolean;
  csvsError: string | null;
  onRefreshCsvs: () => void;
  canGenerate: boolean;
  isGenerating: boolean;
  error: string | null;
  onSubmit: () => void;
};

const REPORT_TYPE_OPTIONS: Array<{ value: ReportType; label: string }> = [
  { value: "scouting_report", label: "Scouting Report" },
  { value: "opposition_analysis", label: "Opposition Analysis" },
  { value: "player_valuation", label: "Player Valuation" },
  { value: "player_development", label: "Player Development" },
  { value: "coaching_development", label: "Coaching Development" },
];

/**
 * Form for generating a new report.
 */
export default function GenerateReportForm({
  form,
  onFieldChange,
  csvs,
  csvsLoading,
  csvsError,
  onRefreshCsvs,
  canGenerate,
  isGenerating,
  error,
  onSubmit,
}: GenerateReportFormProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section header */}
        <div>
          <h2 className="text-heading-3 text-ink mb-1">Generate Report</h2>
          <p className="text-body-sm text-mute">
            Select your data source and report type to generate an AI-powered analysis
          </p>
        </div>

        {/* Data Source Selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="csv-select" className="text-ui font-medium text-ink">
              Data Source
            </label>
            <button
              type="button"
              onClick={onRefreshCsvs}
              disabled={csvsLoading}
              className={cn(
                "inline-flex items-center gap-1",
                "text-caption text-mute",
                "hover:text-primary",
                "transition-colors"
              )}
            >
              <RefreshCw className={cn("w-3 h-3", csvsLoading && "animate-spin")} />
              Refresh
            </button>
          </div>

          {csvsError ? (
            <div className="p-3 rounded-xl bg-danger/5 border border-danger/20">
              <p className="text-caption text-danger">{csvsError}</p>
            </div>
          ) : csvsLoading ? (
            <div className="p-3 rounded-xl bg-neutral-50 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-mute" />
              <span className="text-caption text-mute">Loading data sources...</span>
            </div>
          ) : csvs.length === 0 ? (
            <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200">
              <p className="text-caption text-mute">
                No data sources available. Upload files in the Data Sources tab first.
              </p>
            </div>
          ) : (
            <select
              id="csv-select"
              value={form.selectedCsvPath}
              onChange={(e) => onFieldChange("selectedCsvPath", e.target.value)}
              className={cn(
                "w-full px-4 py-3 rounded-xl",
                "border border-neutral-200",
                "text-body text-ink",
                "bg-white",
                "focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10",
                "transition-all duration-150"
              )}
            >
              <option value="">Select a data source...</option>
              {csvs.map((csv) => (
                <option key={csv.saved_path} value={csv.saved_path}>
                  {csv.original_filename}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Report Type Selection */}
        <div className="space-y-2">
          <label htmlFor="report-type" className="text-ui font-medium text-ink">
            Report Type
          </label>
          <select
            id="report-type"
            value={form.reportType}
            onChange={(e) => onFieldChange("reportType", e.target.value as ReportType)}
            className={cn(
              "w-full px-4 py-3 rounded-xl",
              "border border-neutral-200",
              "text-body text-ink",
              "bg-white",
              "focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10",
              "transition-all duration-150"
            )}
          >
            {REPORT_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Organization ID */}
        <div className="space-y-2">
          <label htmlFor="org-id" className="text-ui font-medium text-ink">
            Organization ID
          </label>
          <p className="text-caption text-mute">
            Used to pull your organization's pre-uploaded reference materials
          </p>
          <input
            id="org-id"
            type="text"
            value={form.orgId}
            onChange={(e) => onFieldChange("orgId", e.target.value)}
            placeholder="e.g., my_club_2025"
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

        {/* Report Label (optional) */}
        <div className="space-y-2">
          <label htmlFor="report-label" className="text-ui font-medium text-ink">
            Report Label <span className="text-mute font-normal">(optional)</span>
          </label>
          <input
            id="report-label"
            type="text"
            value={form.reportLabel}
            onChange={(e) => onFieldChange("reportLabel", e.target.value)}
            placeholder="e.g., Q1 2025 Scouting Batch"
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

        {/* Additional Context (optional) */}
        <div className="space-y-2">
          <label htmlFor="context" className="text-ui font-medium text-ink">
            Additional Context <span className="text-mute font-normal">(optional)</span>
          </label>
          <textarea
            id="context"
            value={form.context}
            onChange={(e) => onFieldChange("context", e.target.value)}
            placeholder="Any specific focus areas or context for this report..."
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

        {/* Submit button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!canGenerate}
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
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Generate Report
              </>
            )}
          </button>
        </div>
      </form>
    </Card>
  );
}
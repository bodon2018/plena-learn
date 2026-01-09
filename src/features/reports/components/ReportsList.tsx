"use client";

import { cn } from "@/lib/cn";
import { 
  FileText, 
  Trash2, 
  Loader2, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Download,
  XCircle
} from "lucide-react";
import Card from "@/components/ui/Card";
import type { Report, ReportStatus } from "../hooks/useReports";

type ReportsListProps = {
  reports: Report[];
  isLoading: boolean;
  error: string | null;
  deletingIds: Set<string>;
  deleteError: string | null;
  onRefresh: () => void;
  onDelete: (reportId: string) => void;
  onDownload: (reportId: string) => void;
};

const STATUS_BADGE: Record<ReportStatus, { label: string; className: string; icon: typeof Clock }> = {
  pending: {
    label: "Pending",
    className: "bg-neutral-100 text-mute",
    icon: Clock,
  },
  drafting: {
    label: "Drafting",
    className: "bg-blue-100 text-blue-600",
    icon: Loader2,
  },
  critiquing: {
    label: "Reviewing",
    className: "bg-purple-100 text-purple-600",
    icon: Loader2,
  },
  generating_pdf: {
    label: "Generating",
    className: "bg-orange-100 text-orange-600",
    icon: Loader2,
  },
  completed: {
    label: "Completed",
    className: "bg-success/10 text-success",
    icon: CheckCircle,
  },
  error: {
    label: "Error",
    className: "bg-danger/10 text-danger",
    icon: XCircle,
  },
};

/**
 * List of all reports.
 */
export default function ReportsList({
  reports,
  isLoading,
  error,
  deletingIds,
  deleteError,
  onRefresh,
  onDelete,
  onDownload,
}: ReportsListProps) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatReportType = (type: string | undefined | null) => {
    if (!type) return "Report";
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <Card>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-heading-3 text-ink">Report History</h2>
          <p className="text-body-sm text-mute mt-1">
            {reports.length} {reports.length === 1 ? "report" : "reports"} generated
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
      {isLoading && reports.length === 0 && (
        <div className="flex items-center justify-center gap-3 py-12 text-mute">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-body-sm">Loading reports...</span>
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
      {!isLoading && !error && reports.length === 0 && (
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
          <p className="text-body-sm text-mute">No reports generated yet.</p>
          <p className="text-caption text-subtle mt-1">
            Use the form above to generate your first report.
          </p>
        </div>
      )}

      {/* Reports list */}
      {!isLoading && !error && reports.length > 0 && (
        <div className="space-y-3">
          {reports.map((report) => {
            const isDeleting = deletingIds.has(report.report_id);
            const statusConfig = STATUS_BADGE[report.status] || STATUS_BADGE.pending;
            const StatusIcon = statusConfig.icon;
            const isInProgress = ["drafting", "critiquing", "generating_pdf"].includes(report.status);

            return (
              <div
                key={report.report_id}
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
                        {formatReportType(report.report_type)}
                      </h3>
                      {report.report_label && (
                        <p className="text-body-sm text-mute mt-0.5">
                          {report.report_label}
                        </p>
                      )}
                    </div>

                    {/* Status badge */}
                    <span
                      className={cn(
                        "inline-flex items-center gap-1",
                        "px-2 py-1 rounded-md",
                        "text-caption font-medium",
                        statusConfig.className
                      )}
                    >
                      <StatusIcon
                        className={cn(
                          "w-3 h-3",
                          isInProgress && "animate-spin"
                        )}
                      />
                      {statusConfig.label}
                    </span>
                  </div>

                  {/* Meta info */}
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    {report.csv_filename && (
                      <span className="text-caption text-subtle">
                        {report.csv_filename}
                      </span>
                    )}
                    {report.created_at && (
                      <>
                        {report.csv_filename && (
                          <span className="text-caption text-subtle">•</span>
                        )}
                        <span className="text-caption text-subtle">
                          {formatDate(report.created_at)}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Error message */}
                  {report.status === "error" && report.error_message && (
                    <p className="text-caption text-danger mt-2">
                      {report.error_message}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Download button */}
                  {report.status === "completed" && (
                    <button
                      type="button"
                      onClick={() => onDownload(report.report_id)}
                      className={cn(
                        "w-9 h-9 rounded-xl",
                        "flex items-center justify-center",
                        "transition-all duration-200",
                        "text-success hover:bg-success/10"
                      )}
                      aria-label="Download report"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  )}

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => onDelete(report.report_id)}
                    disabled={isDeleting || isInProgress}
                    className={cn(
                      "w-9 h-9 rounded-xl",
                      "flex items-center justify-center",
                      "transition-all duration-200",
                      "text-neutral-400 hover:text-danger hover:bg-danger/10",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                    aria-label="Delete report"
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
          })}
        </div>
      )}
    </Card>
  );
}
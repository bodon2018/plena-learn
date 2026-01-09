"use client";

import { cn } from "@/lib/cn";
import { 
  FileText, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Download,
  RefreshCw,
  Clock,
  Pencil,
  MessageSquare,
  FileOutput
} from "lucide-react";
import Card from "@/components/ui/Card";
import type { Report, ReportStatus } from "../hooks/useReports";

type ReportStatusCardProps = {
  report: Report | null;
  isLoading: boolean;
  onRefresh: () => void;
  onDownload: (reportId: string) => void;
};

const STATUS_CONFIG: Record<ReportStatus, {
  label: string;
  description: string;
  icon: typeof Loader2;
  color: string;
  bgColor: string;
  isAnimated: boolean;
}> = {
  pending: {
    label: "Pending",
    description: "Report generation is queued...",
    icon: Clock,
    color: "text-mute",
    bgColor: "bg-neutral-100",
    isAnimated: false,
  },
  drafting: {
    label: "Drafting",
    description: "AI is generating the initial report draft...",
    icon: Pencil,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    isAnimated: true,
  },
  critiquing: {
    label: "Reviewing",
    description: "AI is reviewing and refining the draft...",
    icon: MessageSquare,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
    isAnimated: true,
  },
  generating_pdf: {
    label: "Generating PDF",
    description: "Creating the final PDF document...",
    icon: FileOutput,
    color: "text-orange-600",
    bgColor: "bg-orange-100",
    isAnimated: true,
  },
  completed: {
    label: "Completed",
    description: "Report is ready for download",
    icon: CheckCircle,
    color: "text-success",
    bgColor: "bg-success/10",
    isAnimated: false,
  },
  error: {
    label: "Error",
    description: "Report generation failed",
    icon: AlertCircle,
    color: "text-danger",
    bgColor: "bg-danger/10",
    isAnimated: false,
  },
};

/**
 * Shows the status of the currently generating report.
 */
export default function ReportStatusCard({
  report,
  isLoading,
  onRefresh,
  onDownload,
}: ReportStatusCardProps) {
  // Don't show if no report is being tracked
  if (!report) return null;

  const config = STATUS_CONFIG[report.status] || STATUS_CONFIG.pending;
  const Icon = config.icon;
  const isTerminal = report.status === "completed" || report.status === "error";

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
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-heading-3 text-ink">Current Report</h2>
        {!isTerminal && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className={cn(
              "inline-flex items-center gap-1",
              "text-caption text-mute",
              "hover:text-primary",
              "transition-colors"
            )}
          >
            <RefreshCw className={cn("w-3 h-3", isLoading && "animate-spin")} />
            Refresh
          </button>
        )}
      </div>

      {/* Status display */}
      <div
        className={cn(
          "p-6 rounded-xl",
          "border",
          report.status === "completed"
            ? "border-success/30 bg-success/5"
            : report.status === "error"
            ? "border-danger/30 bg-danger/5"
            : "border-neutral-200 bg-neutral-50"
        )}
      >
        <div className="flex items-start gap-4">
          {/* Status icon */}
          <div
            className={cn(
              "w-12 h-12 rounded-xl flex-shrink-0",
              "flex items-center justify-center",
              config.bgColor
            )}
          >
            <Icon
              className={cn(
                "w-6 h-6",
                config.color,
                config.isAnimated && "animate-pulse"
              )}
            />
          </div>

          {/* Status info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn("text-ui font-semibold", config.color)}>
                {config.label}
              </span>
              {config.isAnimated && (
                <Loader2 className="w-4 h-4 animate-spin text-mute" />
              )}
            </div>
            <p className="text-body-sm text-mute">{config.description}</p>

            {/* Report details */}
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <span className="text-caption text-subtle">
                {formatReportType(report.report_type)}
              </span>
              {report.csv_filename && (
                <>
                  <span className="text-caption text-subtle">•</span>
                  <span className="text-caption text-subtle">
                    {report.csv_filename}
                  </span>
                </>
              )}
              {report.report_label && (
                <>
                  <span className="text-caption text-subtle">•</span>
                  <span className="text-caption text-subtle">
                    {report.report_label}
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

          {/* Download button for completed reports */}
          {report.status === "completed" && (
            <button
              type="button"
              onClick={() => onDownload(report.report_id)}
              className={cn(
                "inline-flex items-center gap-2",
                "px-4 py-2 rounded-xl",
                "bg-success text-white",
                "text-ui font-semibold",
                "hover:bg-success/90",
                "transition-all duration-150",
                "active:scale-[0.98]"
              )}
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button>
          )}
        </div>

        {/* Progress steps */}
        {!isTerminal && (
          <div className="flex items-center gap-2 mt-6 pt-4 border-t border-neutral-200/60">
            {(["drafting", "critiquing", "generating_pdf"] as ReportStatus[]).map(
              (step, index) => {
                const stepConfig = STATUS_CONFIG[step];
                const StepIcon = stepConfig.icon;
                const isPast =
                  ["drafting", "critiquing", "generating_pdf"].indexOf(report.status) > index;
                const isCurrent = report.status === step;

                return (
                  <div key={step} className="flex items-center gap-2 flex-1">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center",
                        isCurrent
                          ? stepConfig.bgColor
                          : isPast
                          ? "bg-success/10"
                          : "bg-neutral-100"
                      )}
                    >
                      {isPast ? (
                        <CheckCircle className="w-4 h-4 text-success" />
                      ) : (
                        <StepIcon
                          className={cn(
                            "w-4 h-4",
                            isCurrent ? stepConfig.color : "text-mute"
                          )}
                        />
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-caption",
                        isCurrent ? "text-ink font-medium" : "text-mute"
                      )}
                    >
                      {stepConfig.label}
                    </span>
                    {index < 2 && (
                      <div
                        className={cn(
                          "flex-1 h-0.5 rounded",
                          isPast ? "bg-success" : "bg-neutral-200"
                        )}
                      />
                    )}
                  </div>
                );
              }
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
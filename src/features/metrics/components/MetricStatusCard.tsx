"use client";

import { cn } from "@/lib/cn";
import { RefreshCw, AlertCircle } from "lucide-react";
import AdminCard from "@/components/ui/AdminCard";
import WorkflowProgress from "./WorkflowProgress";
import DataSourceSelector from "./DataSourceSelector";
import AdminApprovalForm from "./AdminApprovalForm";
import type { MetricJobRecord, CsvFile } from "../hooks/useMetrics";

type AdminDraft = {
  plain_language_definition: string;
  operational_definition: string;
  data_disclaimer: string;
  comment: string;
};

type MetricStatusCardProps = {
  job: MetricJobRecord | null;
  isLoading: boolean;
  onRefresh: () => void;
  // Data source props
  csvs: CsvFile[];
  csvLoading: boolean;
  csvError: string | null;
  selectedCsvPath: string;
  onSelectCsv: (path: string) => void;
  onRefreshCsvs: () => void;
  onAttachCsv: () => void;
  isAttaching: boolean;
  attachError: string | null;
  // Admin approval props
  adminDraft: AdminDraft;
  onAdminDraftChange: <K extends keyof AdminDraft>(key: K, value: AdminDraft[K]) => void;
  isEditing: boolean;
  onStartEditing: () => void;
  onCancelEditing: () => void;
  canSubmitEdits: boolean;
  isSubmittingDecision: boolean;
  decisionError: string | null;
  onApprove: () => void;
  onSubmitEdits: () => void;
  onReject: () => void;
};

/**
 * Status card showing current workflow state with appropriate actions.
 */
export default function MetricStatusCard({
  job,
  isLoading,
  onRefresh,
  // Data source
  csvs,
  csvLoading,
  csvError,
  selectedCsvPath,
  onSelectCsv,
  onRefreshCsvs,
  onAttachCsv,
  isAttaching,
  attachError,
  // Admin approval
  adminDraft,
  onAdminDraftChange,
  isEditing,
  onStartEditing,
  onCancelEditing,
  canSubmitEdits,
  isSubmittingDecision,
  decisionError,
  onApprove,
  onSubmitEdits,
  onReject,
}: MetricStatusCardProps) {
  // No job yet
  if (!job) {
    return (
      <AdminCard title="Workflow Status">
        <div className="text-center py-12">
          <div
            className={cn(
              "w-16 h-16 rounded-full mx-auto mb-4",
              "bg-neutral-100",
              "flex items-center justify-center"
            )}
          >
            <span className="text-2xl">🎯</span>
          </div>
          <p className="text-body text-mute">No metric workflow started yet</p>
          <p className="text-body-sm text-subtle mt-1">
            Create a metric above to begin
          </p>
        </div>
      </AdminCard>
    );
  }

  const status = job.status;
  const isProcessing =
    status === "drafting_intent" ||
    status === "running_data_discovery" ||
    (!["waiting_for_data_source", "waiting_for_admin_approval", "ready_to_run", "failed"].includes(status));

  return (
    <AdminCard
      title="Workflow Status"
      headerActions={
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
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
          <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
          Refresh
        </button>
      }
    >
      {/* Job info header */}
      <div className="mb-6 pb-4 border-b border-neutral-100">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-caption text-mute">
          <span>
            <span className="font-medium text-ink">Job:</span> {job.job_id}
          </span>
          {job.request?.metric_name && (
            <span>
              <span className="font-medium text-ink">Metric:</span> {job.request.metric_name}
            </span>
          )}
          {job.updated_at && (
            <span>
              <span className="font-medium text-ink">Updated:</span>{" "}
              {new Date(job.updated_at).toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {/* Processing state - show animated progress */}
      {isProcessing && (
        <WorkflowProgress status={status} />
      )}

      {/* Waiting for data source */}
      {status === "waiting_for_data_source" && (
        <>
          <WorkflowProgress status={status} className="mb-6" />
          <DataSourceSelector
            csvs={csvs}
            isLoading={csvLoading}
            error={csvError}
            selectedPath={selectedCsvPath}
            onSelect={onSelectCsv}
            onRefresh={onRefreshCsvs}
            onAttach={onAttachCsv}
            isAttaching={isAttaching}
            attachError={attachError}
          />
        </>
      )}

      {/* Waiting for admin approval */}
      {status === "waiting_for_admin_approval" && (
        <>
          <WorkflowProgress status={status} className="mb-6" />
          <AdminApprovalForm
            draft={adminDraft}
            onDraftChange={onAdminDraftChange}
            isEditing={isEditing}
            onStartEditing={onStartEditing}
            onCancelEditing={onCancelEditing}
            canSubmitEdits={canSubmitEdits}
            isSubmitting={isSubmittingDecision}
            error={decisionError}
            onApprove={onApprove}
            onSubmitEdits={onSubmitEdits}
            onReject={onReject}
          />
        </>
      )}

      {/* Ready to run */}
      {status === "ready_to_run" && (
        <WorkflowProgress status={status} />
      )}

      {/* Failed */}
      {status === "failed" && (
        <>
          <WorkflowProgress
            status={status}
            errorMessage={job.error?.error_message}
          />
          {job.error && (
            <div
              className={cn(
                "mt-4 flex items-start gap-2 p-4 rounded-xl",
                "bg-danger/5 border border-danger/20"
              )}
            >
              <AlertCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-body-sm font-medium text-danger">
                  Error: {job.error.error_code}
                </p>
                <p className="text-body-sm text-danger/80 mt-1">
                  {job.error.error_message}
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </AdminCard>
  );
}
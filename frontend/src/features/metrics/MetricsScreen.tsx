"use client";

import { useMetrics } from "./hooks/useMetrics";
import CreateMetricForm from "./components/CreateMetricForm";
import MetricStatusCard from "./components/MetricStatusCard";
import MetricDefinitionsList from "./components/MetricDefinitionsList";

/**
 * Metrics management screen.
 * 
 * Features:
 * - Create new metric definitions
 * - Track workflow progress with animated indicators
 * - Attach data sources when prompted
 * - Review and approve/edit/reject definitions
 * - View all existing metrics
 */
export default function MetricsScreen() {
  const metrics = useMetrics();

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-heading-1 text-ink">Metrics</h1>
        <p className="text-body text-mute mt-1">
          Create and manage metric definitions for your organization
        </p>
      </div>

      {/* Create metric form */}
      <CreateMetricForm
        form={metrics.form}
        onFieldChange={metrics.setFormField}
        canCreate={metrics.canCreate}
        isCreating={metrics.isCreating}
        error={metrics.createError}
        onSubmit={metrics.createMetric}
      />

      {/* Workflow status card */}
      <MetricStatusCard
        job={metrics.job}
        isLoading={metrics.isJobLoading}
        onRefresh={metrics.refreshJob}
        // Data source
        csvs={metrics.availableCsvs}
        csvLoading={metrics.csvLoading}
        csvError={metrics.csvError}
        selectedCsvPath={metrics.selectedCsvPath}
        onSelectCsv={metrics.setSelectedCsvPath}
        onRefreshCsvs={metrics.refreshCsvs}
        onAttachCsv={metrics.attachCsv}
        isAttaching={metrics.isAttaching}
        attachError={metrics.attachError}
        // Admin approval
        adminDraft={metrics.adminDraft}
        onAdminDraftChange={metrics.setAdminDraftField}
        isEditing={metrics.isEditing}
        onStartEditing={() => metrics.setIsEditing(true)}
        onCancelEditing={metrics.cancelEditing}
        canSubmitEdits={metrics.canSubmitEdits}
        isSubmittingDecision={metrics.isSubmittingDecision}
        decisionError={metrics.decisionError}
        onApprove={metrics.submitApproval}
        onSubmitEdits={metrics.submitEdits}
        onReject={metrics.submitRejection}
      />

      {/* Existing metrics list */}
      <MetricDefinitionsList
        definitions={metrics.definitions}
        isLoading={metrics.definitionsLoading}
        error={metrics.definitionsError}
        deleteError={metrics.deleteError}
        deletingIds={metrics.deletingIds}
        onRefresh={metrics.refreshDefinitions}
        onDelete={metrics.deleteMetric}
      />
    </div>
  );
}
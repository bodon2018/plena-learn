"use client";

import { useReports } from "./hooks/useReports";
import ReportTypesOverview from "./components/ReportTypesOverview";
import GenerateReportForm from "./components/GenerateReportForm";
import ReportStatusCard from "./components/ReportStatusCard";
import ReportsList from "./components/ReportsList";

/**
 * Reports management screen.
 * 
 * Features:
 * - Overview of 5 report types with descriptions
 * - Select CSV, report type, and org ID
 * - Track report generation workflow
 * - View and download completed reports
 */
export default function ReportsScreen() {
  const reports = useReports();

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-heading-1 text-ink">Reports</h1>
        <p className="text-body text-mute mt-1">
          Generate evidence-based reports grounded in your organization's reference materials and data
        </p>
      </div>

      {/* Report types overview */}
      <ReportTypesOverview />

      {/* Generate report form */}
      <GenerateReportForm
        form={reports.form}
        onFieldChange={reports.setFormField}
        csvs={reports.csvs}
        csvsLoading={reports.csvsLoading}
        csvsError={reports.csvsError}
        onRefreshCsvs={reports.refreshCsvs}
        canGenerate={reports.canGenerate}
        isGenerating={reports.isGenerating}
        error={reports.generateError}
        onSubmit={reports.generateReport}
      />

      {/* Current report status */}
      <ReportStatusCard
        report={reports.currentReport}
        isLoading={reports.isReportLoading}
        onRefresh={reports.refreshCurrentReport}
        onDownload={reports.downloadReport}
      />

      {/* Previous reports list */}
      <ReportsList
        reports={reports.reports}
        isLoading={reports.reportsLoading}
        error={reports.reportsError}
        deletingIds={reports.deletingIds}
        deleteError={reports.deleteError}
        onRefresh={reports.refreshReports}
        onDelete={reports.deleteReport}
        onDownload={reports.downloadReport}
      />
    </div>
  );
}
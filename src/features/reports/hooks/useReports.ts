"use client";

import { useCallback, useEffect, useState } from "react";

const API_BASE =
  process.env.NEXT_PUBLIC_AI_BASE_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8001";

// =============================================================================
// Types
// =============================================================================

export type ReportType = 
  | "scouting_report"
  | "opposition_analysis"
  | "player_valuation"
  | "player_development"
  | "coaching_development";

export type ReportStatus = 
  | "pending"
  | "drafting"
  | "critiquing"
  | "generating_pdf"
  | "completed"
  | "error";

export type Report = {
  report_id: string;
  status: ReportStatus;
  report_type: ReportType;
  csv_filename: string | null;
  report_label: string | null;
  created_at: string | null;
  updated_at: string | null;
  pdf_path: string | null;
  error_message: string | null;
};

export type CsvFile = {
  original_filename: string;
  saved_path: string;
  size_bytes: number;
  modified_at: string;
};

export type GenerateReportForm = {
  selectedCsvPath: string;
  reportType: ReportType;
  orgId: string;
  reportLabel: string;
  context: string;
};

type UseReportsReturn = {
  // Form
  form: GenerateReportForm;
  setFormField: <K extends keyof GenerateReportForm>(field: K, value: GenerateReportForm[K]) => void;

  // CSVs
  csvs: CsvFile[];
  csvsLoading: boolean;
  csvsError: string | null;
  refreshCsvs: () => Promise<void>;

  // Generate
  canGenerate: boolean;
  isGenerating: boolean;
  generateError: string | null;
  generateReport: () => Promise<void>;

  // Current report (being generated)
  currentReport: Report | null;
  isReportLoading: boolean;
  refreshCurrentReport: () => Promise<void>;

  // Reports list
  reports: Report[];
  reportsLoading: boolean;
  reportsError: string | null;
  refreshReports: () => Promise<void>;

  // Delete
  deletingIds: Set<string>;
  deleteError: string | null;
  deleteReport: (reportId: string) => Promise<void>;

  // Download
  downloadReport: (reportId: string) => void;
};

// =============================================================================
// Hook
// =============================================================================

export function useReports(): UseReportsReturn {
  // ---------------------------------------------------------------------------
  // Form state
  // ---------------------------------------------------------------------------
  const [form, setForm] = useState<GenerateReportForm>({
    selectedCsvPath: "",
    reportType: "player_development",
    orgId: "default_org",
    reportLabel: "",
    context: "",
  });

  // ---------------------------------------------------------------------------
  // CSVs state
  // ---------------------------------------------------------------------------
  const [csvs, setCsvs] = useState<CsvFile[]>([]);
  const [csvsLoading, setCsvsLoading] = useState(false);
  const [csvsError, setCsvsError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Generate state
  // ---------------------------------------------------------------------------
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Current report state
  // ---------------------------------------------------------------------------
  const [currentReport, setCurrentReport] = useState<Report | null>(null);
  const [isReportLoading, setIsReportLoading] = useState(false);

  // ---------------------------------------------------------------------------
  // Reports list state
  // ---------------------------------------------------------------------------
  const [reports, setReports] = useState<Report[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Delete state
  // ---------------------------------------------------------------------------
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Load CSVs
  // ---------------------------------------------------------------------------
  const refreshCsvs = useCallback(async () => {
    setCsvsLoading(true);
    setCsvsError(null);

    try {
      const res = await fetch(`${API_BASE}/admin/data-sources`);
      if (!res.ok) throw new Error(`Failed to load CSVs: ${res.status}`);
      const data = await res.json();
      setCsvs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading CSVs:", err);
      setCsvsError(err instanceof Error ? err.message : "Failed to load data sources");
    } finally {
      setCsvsLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Load reports
  // ---------------------------------------------------------------------------
  const refreshReports = useCallback(async () => {
    setReportsLoading(true);
    setReportsError(null);

    try {
      const res = await fetch(`${API_BASE}/admin/reports`);
      if (!res.ok) throw new Error(`Failed to load reports: ${res.status}`);
      const data = await res.json();
      setReports(data.reports || []);
    } catch (err) {
      console.error("Error loading reports:", err);
      setReportsError(err instanceof Error ? err.message : "Failed to load reports");
    } finally {
      setReportsLoading(false);
    }
  }, []);

  // Load on mount
  useEffect(() => {
    void refreshCsvs();
    void refreshReports();
  }, [refreshCsvs, refreshReports]);

  // ---------------------------------------------------------------------------
  // Form helpers
  // ---------------------------------------------------------------------------
  const setFormField = useCallback(
    <K extends keyof GenerateReportForm>(field: K, value: GenerateReportForm[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }));
      setGenerateError(null);
    },
    []
  );

  const canGenerate = !!(form.selectedCsvPath && form.reportType && form.orgId && !isGenerating);

  // ---------------------------------------------------------------------------
  // Generate report
  // ---------------------------------------------------------------------------
  const generateReport = useCallback(async () => {
    if (!canGenerate) return;

    setIsGenerating(true);
    setGenerateError(null);
    setCurrentReport(null);

    try {
      const res = await fetch(`${API_BASE}/admin/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selected_csv_path: form.selectedCsvPath,
          report_type: form.reportType,
          org_id: form.orgId,
          report_label: form.reportLabel || null,
          context: form.context || null,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || `Generation failed: ${res.status}`);
      }

      const report = await res.json();
      setCurrentReport(report);

      // Refresh reports list
      await refreshReports();

      // Reset form label
      setForm((prev) => ({ ...prev, reportLabel: "", context: "" }));
    } catch (err) {
      console.error("Error generating report:", err);
      setGenerateError(err instanceof Error ? err.message : "Failed to generate report");
    } finally {
      setIsGenerating(false);
    }
  }, [canGenerate, form, refreshReports]);

  // ---------------------------------------------------------------------------
  // Refresh current report
  // ---------------------------------------------------------------------------
  const refreshCurrentReport = useCallback(async () => {
    if (!currentReport?.report_id) return;

    setIsReportLoading(true);

    try {
      const res = await fetch(`${API_BASE}/admin/reports/${currentReport.report_id}`);
      if (!res.ok) throw new Error(`Failed to refresh report: ${res.status}`);
      const report = await res.json();
      setCurrentReport(report);
    } catch (err) {
      console.error("Error refreshing report:", err);
    } finally {
      setIsReportLoading(false);
    }
  }, [currentReport?.report_id]);

  // Poll current report while generating
  useEffect(() => {
    if (!currentReport) return;

    const terminalStatuses: ReportStatus[] = ["completed", "error"];
    if (terminalStatuses.includes(currentReport.status)) return;

    const interval = setInterval(() => {
      void refreshCurrentReport();
    }, 3000);

    return () => clearInterval(interval);
  }, [currentReport, refreshCurrentReport]);

  // ---------------------------------------------------------------------------
  // Delete report
  // ---------------------------------------------------------------------------
  const deleteReport = useCallback(async (reportId: string) => {
    setDeletingIds((prev) => new Set(prev).add(reportId));
    setDeleteError(null);

    try {
      const res = await fetch(`${API_BASE}/admin/reports/${reportId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error(`Failed to delete: ${res.status}`);

      setReports((prev) => prev.filter((r) => r.report_id !== reportId));

      if (currentReport?.report_id === reportId) {
        setCurrentReport(null);
      }
    } catch (err) {
      console.error("Error deleting report:", err);
      setDeleteError(err instanceof Error ? err.message : "Failed to delete report");
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(reportId);
        return next;
      });
    }
  }, [currentReport?.report_id]);

  // ---------------------------------------------------------------------------
  // Download report
  // ---------------------------------------------------------------------------
  const downloadReport = useCallback((reportId: string) => {
    const url = `${API_BASE}/admin/reports/${reportId}/pdf`;
    window.open(url, "_blank");
  }, []);

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------
  return {
    // Form
    form,
    setFormField,

    // CSVs
    csvs,
    csvsLoading,
    csvsError,
    refreshCsvs,

    // Generate
    canGenerate,
    isGenerating,
    generateError,
    generateReport,

    // Current report
    currentReport,
    isReportLoading,
    refreshCurrentReport,

    // Reports list
    reports,
    reportsLoading,
    reportsError,
    refreshReports,

    // Delete
    deletingIds,
    deleteError,
    deleteReport,

    // Download
    downloadReport,
  };
}
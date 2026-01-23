"use client";

import { useCallback, useEffect, useState } from "react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8000";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type ReportReadinessState = "idle" | "processing" | "ready" | "error";

export type ReportType = "coach" | "player";

type UseReportGeneratorProps = {
  /** Media ID to check readiness and generate reports for */
  mediaId: string | null;
};

type UseReportGeneratorReturn = {
  /** Current readiness state for report generation */
  readiness: ReportReadinessState;
  /** Whether the media is ready for report generation */
  isReady: boolean;
  /** Generate a report of the specified type */
  generateReport: (reportType: ReportType) => Promise<{ reportId: string } | null>;
  /** Check the status of a report */
  checkStatus: (reportId: string) => Promise<{ status: string; pdf_url?: string }>;
  /** Get the PDF download URL for a report */
  downloadPdf: (reportId: string) => void;
};

// -----------------------------------------------------------------------------
// Mock mode for testing without backend
// -----------------------------------------------------------------------------

const MOCK_MODE = true; // Set to false when backend is ready

// -----------------------------------------------------------------------------
// Hook
// -----------------------------------------------------------------------------

export function useReportGenerator({
  mediaId,
}: UseReportGeneratorProps): UseReportGeneratorReturn {
  const [readiness, setReadiness] = useState<ReportReadinessState>("idle");

  // ---------------------------------------------------------------------------
  // Poll for readiness when mediaId changes
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!mediaId) {
      setReadiness("idle");
      return;
    }

    // Start as processing
    setReadiness("processing");

    if (MOCK_MODE) {
      // Mock: become ready after 1.5 seconds
      const timeout = setTimeout(() => {
        setReadiness("ready");
      }, 1500);
      return () => clearTimeout(timeout);
    }

    // Real implementation: poll the status endpoint
    let cancelled = false;
    let pollInterval: ReturnType<typeof setInterval> | null = null;

    const checkReadiness = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/media/${encodeURIComponent(mediaId)}/report-status`,
          { credentials: "include" }
        );

        if (!res.ok) {
          if (!cancelled) setReadiness("error");
          return;
        }

        const data = await res.json();
        
        if (cancelled) return;

        if (data.status === "ready") {
          setReadiness("ready");
          if (pollInterval) clearInterval(pollInterval);
        } else if (data.status === "error") {
          setReadiness("error");
          if (pollInterval) clearInterval(pollInterval);
        }
        // Otherwise keep polling (status is "processing")
      } catch {
        if (!cancelled) setReadiness("error");
      }
    };

    // Initial check
    checkReadiness();

    // Poll every 3 seconds until ready
    pollInterval = setInterval(checkReadiness, 3000);

    return () => {
      cancelled = true;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [mediaId]);

  // ---------------------------------------------------------------------------
  // Generate report
  // ---------------------------------------------------------------------------

  const generateReport = useCallback(
    async (reportType: ReportType): Promise<{ reportId: string } | null> => {
      if (!mediaId) return null;

      if (MOCK_MODE) {
        // Mock: return a fake report ID after a short delay
        await new Promise((resolve) => setTimeout(resolve, 500));
        return { reportId: `mock-report-${Date.now()}` };
      }

      try {
        const res = await fetch(`${API_BASE}/api/media/${encodeURIComponent(mediaId)}/reports`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ report_type: reportType }),
        });

        if (!res.ok) {
          throw new Error(`Failed to generate report: ${res.status}`);
        }

        const data = await res.json();
        return { reportId: data.report_id };
      } catch (err) {
        console.error("Error generating report:", err);
        return null;
      }
    },
    [mediaId]
  );

  // ---------------------------------------------------------------------------
  // Check report status
  // ---------------------------------------------------------------------------

  const checkStatus = useCallback(
    async (reportId: string): Promise<{ status: string; pdf_url?: string }> => {
      if (MOCK_MODE) {
        // Mock: simulate processing then completion
        // Use a simple counter based on reportId to track "progress"
        const mockProgress = parseInt(reportId.split("-").pop() || "0", 10);
        const elapsed = Date.now() - mockProgress;
        
        // Complete after 3 seconds
        if (elapsed > 3000) {
          return { status: "completed", pdf_url: "/mock-report.pdf" };
        }
        return { status: "generating" };
      }

      try {
        const res = await fetch(
          `${API_BASE}/api/media/${encodeURIComponent(mediaId!)}/reports/${encodeURIComponent(reportId)}`,
          { credentials: "include" }
        );

        if (!res.ok) {
          return { status: "error" };
        }

        const data = await res.json();
        return {
          status: data.status,
          pdf_url: data.pdf_url || data.pdf_path,
        };
      } catch {
        return { status: "error" };
      }
    },
    [mediaId]
  );

  // ---------------------------------------------------------------------------
  // Download PDF
  // ---------------------------------------------------------------------------

  const downloadPdf = useCallback(
    (reportId: string) => {
      if (MOCK_MODE) {
        // Mock: just alert
        alert("Mock mode: PDF download would happen here");
        return;
      }

      // Open PDF in new tab or trigger download
      const pdfUrl = `${API_BASE}/api/media/${encodeURIComponent(mediaId!)}/reports/${encodeURIComponent(reportId)}/pdf`;
      window.open(pdfUrl, "_blank");
    },
    [mediaId]
  );

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    readiness,
    isReady: readiness === "ready",
    generateReport,
    checkStatus,
    downloadPdf,
  };
}

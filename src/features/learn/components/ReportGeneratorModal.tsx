"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/cn";
import { X, FileText, Users, Loader2, CheckCircle, AlertCircle, Download } from "lucide-react";

type ReportType = "coach" | "player";

type ReportStatus = "idle" | "generating" | "completed" | "error";

type ReportGeneratorModalProps = {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Media ID for report generation */
  mediaId: string | null;
  /** Callback to generate report */
  onGenerateReport: (reportType: ReportType) => Promise<{ reportId: string } | null>;
  /** Callback to check report status */
  onCheckStatus: (reportId: string) => Promise<{ status: string; pdf_url?: string }>;
  /** Callback to download PDF */
  onDownloadPdf: (reportId: string) => void;
};

/**
 * Modal for generating Coach or Player Development Reports.
 * 
 * Shows:
 * - Report type selection (Coach vs Player)
 * - Generation progress animation
 * - Success state with download option
 * - Error state with retry option
 */
export default function ReportGeneratorModal({
  isOpen,
  onClose,
  mediaId,
  onGenerateReport,
  onCheckStatus,
  onDownloadPdf,
}: ReportGeneratorModalProps) {
  const [selectedType, setSelectedType] = useState<ReportType | null>(null);
  const [status, setStatus] = useState<ReportStatus>("idle");
  const [reportId, setReportId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectType = (type: ReportType) => {
    setSelectedType(type);
  };

  const handleGenerate = async () => {
    if (!selectedType || !mediaId) return;

    setStatus("generating");
    setError(null);

    try {
      const result = await onGenerateReport(selectedType);
      
      if (!result?.reportId) {
        throw new Error("Failed to start report generation");
      }

      setReportId(result.reportId);

      // Poll for completion
      let attempts = 0;
      const maxAttempts = 60; // 2 minutes with 2s intervals
      
      const pollStatus = async () => {
        attempts++;
        const statusResult = await onCheckStatus(result.reportId);
        
        if (statusResult.status === "completed" || statusResult.status === "COMPLETED") {
          setStatus("completed");
          return;
        }
        
        if (statusResult.status === "error" || statusResult.status === "ERROR" || statusResult.status === "failed") {
          throw new Error("Report generation failed");
        }
        
        if (attempts >= maxAttempts) {
          throw new Error("Report generation timed out");
        }
        
        // Continue polling
        setTimeout(pollStatus, 2000);
      };

      await pollStatus();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to generate report");
    }
  };

  const handleDownload = () => {
    if (reportId) {
      onDownloadPdf(reportId);
    }
  };

  const handleReset = () => {
    setSelectedType(null);
    setStatus("idle");
    setReportId(null);
    setError(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        className={cn(
          "fixed z-50",
          "bottom-0 left-0 right-0",
          "md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2",
          "md:max-w-md md:w-full",
          "bg-white",
          "rounded-t-3xl md:rounded-2xl",
          "shadow-2xl",
          "animate-slide-up md:animate-fade-in"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-100">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-10 h-10 rounded-xl",
                "bg-gradient-to-br from-emerald-600 to-emerald-800",
                "flex items-center justify-center"
              )}
            >
              <Image
                src="/plena-logo-white.png"
                alt="Plena AI"
                width={24}
                height={24}
                className="object-contain"
              />
            </div>
            <div>
              <h2 className="text-heading-3 text-ink">Generate Report</h2>
              <p className="text-caption text-mute">Powered by Plena AI</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className={cn(
              "w-8 h-8 rounded-full",
              "bg-neutral-100 text-mute",
              "flex items-center justify-center",
              "hover:bg-neutral-200",
              "transition-colors"
            )}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Idle state - type selection */}
          {status === "idle" && (
            <div className="space-y-4">
              <p className="text-body-sm text-mute">
                Select the type of development report to generate:
              </p>

              {/* Report type options */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => handleSelectType("coach")}
                  className={cn(
                    "w-full p-4 rounded-xl",
                    "border-2",
                    "flex items-center gap-4",
                    "transition-all duration-150",
                    "text-left",
                    selectedType === "coach"
                      ? "border-emerald-600 bg-emerald-50"
                      : "border-neutral-200 hover:border-emerald-300 hover:bg-emerald-50/30"
                  )}
                >
                  <div
                    className={cn(
                      "w-12 h-12 rounded-xl",
                      "flex items-center justify-center",
                      selectedType === "coach"
                        ? "bg-emerald-600 text-white"
                        : "bg-neutral-100 text-neutral-500"
                    )}
                  >
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-ui font-semibold text-ink">
                      Coach Development Report
                    </h3>
                    <p className="text-caption text-mute">
                      Analysis focused on coaching strategies and team dynamics
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectType("player")}
                  className={cn(
                    "w-full p-4 rounded-xl",
                    "border-2",
                    "flex items-center gap-4",
                    "transition-all duration-150",
                    "text-left",
                    selectedType === "player"
                      ? "border-emerald-600 bg-emerald-50"
                      : "border-neutral-200 hover:border-emerald-300 hover:bg-emerald-50/30"
                  )}
                >
                  <div
                    className={cn(
                      "w-12 h-12 rounded-xl",
                      "flex items-center justify-center",
                      selectedType === "player"
                        ? "bg-emerald-600 text-white"
                        : "bg-neutral-100 text-neutral-500"
                    )}
                  >
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-ui font-semibold text-ink">
                      Player Development Report
                    </h3>
                    <p className="text-caption text-mute">
                      Individual player performance and growth insights
                    </p>
                  </div>
                </button>
              </div>

              {/* Generate button */}
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!selectedType}
                className={cn(
                  "w-full py-3 px-4 rounded-xl",
                  "bg-gradient-to-r from-emerald-600 to-emerald-700",
                  "text-white font-semibold",
                  "flex items-center justify-center gap-2",
                  "hover:from-emerald-700 hover:to-emerald-800",
                  "active:scale-[0.98]",
                  "transition-all duration-150",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                Generate Report
              </button>
            </div>
          )}

          {/* Generating state */}
          {status === "generating" && (
            <div className="py-8 text-center">
              <div className="relative w-20 h-20 mx-auto mb-6">
                {/* Spinning ring */}
                <div
                  className={cn(
                    "absolute inset-0 rounded-full",
                    "border-4 border-emerald-200"
                  )}
                />
                <div
                  className={cn(
                    "absolute inset-0 rounded-full",
                    "border-4 border-transparent border-t-emerald-600",
                    "animate-spin"
                  )}
                />
                {/* Center logo */}
                <div
                  className={cn(
                    "absolute inset-3 rounded-full",
                    "bg-gradient-to-br from-emerald-600 to-emerald-800",
                    "flex items-center justify-center"
                  )}
                >
                  <Image
                    src="/plena-logo-white.png"
                    alt="Processing"
                    width={28}
                    height={28}
                    className="object-contain"
                  />
                </div>
              </div>
              <h3 className="text-heading-3 text-ink mb-2">
                Generating Report
              </h3>
              <p className="text-body-sm text-mute">
                Plena AI is analyzing the session data...
              </p>
              <p className="text-caption text-subtle mt-1">
                This may take a minute or two
              </p>
            </div>
          )}

          {/* Completed state */}
          {status === "completed" && (
            <div className="py-8 text-center">
              <div
                className={cn(
                  "w-20 h-20 mx-auto mb-6 rounded-full",
                  "bg-emerald-100",
                  "flex items-center justify-center"
                )}
              >
                <CheckCircle className="w-10 h-10 text-emerald-600" />
              </div>
              <h3 className="text-heading-3 text-ink mb-2">
                Report Ready!
              </h3>
              <p className="text-body-sm text-mute mb-6">
                Your {selectedType === "coach" ? "Coach" : "Player"} Development Report has been generated.
              </p>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleDownload}
                  className={cn(
                    "w-full py-3 px-4 rounded-xl",
                    "bg-gradient-to-r from-emerald-600 to-emerald-700",
                    "text-white font-semibold",
                    "flex items-center justify-center gap-2",
                    "hover:from-emerald-700 hover:to-emerald-800",
                    "active:scale-[0.98]",
                    "transition-all duration-150"
                  )}
                >
                  <Download className="w-5 h-5" />
                  Download PDF
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className={cn(
                    "w-full py-3 px-4 rounded-xl",
                    "border border-neutral-200",
                    "text-ink font-medium",
                    "hover:bg-neutral-50",
                    "transition-colors"
                  )}
                >
                  Generate Another Report
                </button>
              </div>
            </div>
          )}

          {/* Error state */}
          {status === "error" && (
            <div className="py-8 text-center">
              <div
                className={cn(
                  "w-20 h-20 mx-auto mb-6 rounded-full",
                  "bg-danger/10",
                  "flex items-center justify-center"
                )}
              >
                <AlertCircle className="w-10 h-10 text-danger" />
              </div>
              <h3 className="text-heading-3 text-ink mb-2">
                Generation Failed
              </h3>
              <p className="text-body-sm text-mute mb-6">
                {error || "Something went wrong. Please try again."}
              </p>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleGenerate}
                  className={cn(
                    "w-full py-3 px-4 rounded-xl",
                    "bg-gradient-to-r from-emerald-600 to-emerald-700",
                    "text-white font-semibold",
                    "hover:from-emerald-700 hover:to-emerald-800",
                    "active:scale-[0.98]",
                    "transition-all duration-150"
                  )}
                >
                  Try Again
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className={cn(
                    "w-full py-3 px-4 rounded-xl",
                    "border border-neutral-200",
                    "text-ink font-medium",
                    "hover:bg-neutral-50",
                    "transition-colors"
                  )}
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Inline animations */}
        <style jsx>{`
          @keyframes slide-up {
            from {
              transform: translateY(100%);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
          @keyframes fade-in {
            from {
              opacity: 0;
              transform: translate(-50%, -48%);
            }
            to {
              opacity: 1;
              transform: translate(-50%, -50%);
            }
          }
          .animate-slide-up {
            animation: slide-up 0.3s ease-out;
          }
          .animate-fade-in {
            animation: fade-in 0.2s ease-out;
          }
        `}</style>
      </div>
    </>
  );
}
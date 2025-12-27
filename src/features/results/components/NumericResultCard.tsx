"use client";

import { cn } from "@/lib/cn";
import { Hash, AlertTriangle, FileText, Loader2 } from "lucide-react";
import AdminCard from "@/components/ui/AdminCard";

type NumericResultCardProps = {
  /** Whether a run has been started */
  hasRun: boolean;
  /** Whether run is in progress */
  isRunning: boolean;
  /** Whether run succeeded */
  isSuccess: boolean;
  /** Whether run failed */
  isFailed: boolean;
  /** The numeric/JSON result */
  result: unknown;
  /** Data disclaimer text */
  disclaimer: string;
  /** Raw stdout from the run */
  stdout?: string | null;
};

/**
 * Card displaying the numeric result, disclaimer, and raw output.
 */
export default function NumericResultCard({
  hasRun,
  isRunning,
  isSuccess,
  isFailed,
  result,
  disclaimer,
  stdout,
}: NumericResultCardProps) {
  const preStyles = cn(
    "p-4 rounded-xl",
    "bg-neutral-50 border border-neutral-200",
    "text-caption text-ink",
    "overflow-auto max-h-64",
    "whitespace-pre-wrap break-words",
    "font-mono"
  );

  // Empty state
  if (!hasRun) {
    return (
      <AdminCard title="Results">
        <div className="text-center py-12">
          <div
            className={cn(
              "w-16 h-16 rounded-full mx-auto mb-4",
              "bg-neutral-100",
              "flex items-center justify-center"
            )}
          >
            <Hash className="w-8 h-8 text-mute" />
          </div>
          <p className="text-body text-mute">Run a metric to see results</p>
          <p className="text-body-sm text-subtle mt-1">
            Select a metric and CSV above, then click Run
          </p>
        </div>
      </AdminCard>
    );
  }

  // Running state
  if (isRunning) {
    return (
      <AdminCard title="Results">
        <div className="text-center py-12">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
          <p className="text-body text-mute">Processing...</p>
          <p className="text-body-sm text-subtle mt-1">
            Results will appear when the run completes
          </p>
        </div>
      </AdminCard>
    );
  }

  // Failed state
  if (isFailed) {
    return (
      <AdminCard title="Results">
        <div className="text-center py-12">
          <div
            className={cn(
              "w-16 h-16 rounded-full mx-auto mb-4",
              "bg-danger/10",
              "flex items-center justify-center"
            )}
          >
            <AlertTriangle className="w-8 h-8 text-danger" />
          </div>
          <p className="text-body text-danger">Run did not complete successfully</p>
          <p className="text-body-sm text-mute mt-1">
            Check the error details above
          </p>
        </div>
      </AdminCard>
    );
  }

  // Success state
  return (
    <AdminCard title="Results">
      <div className="space-y-6">
        {/* Numeric Result */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Hash className="w-5 h-5 text-primary" />
            <h3 className="text-ui font-semibold text-ink">Computed Value</h3>
          </div>

          {result == null ? (
            <div
              className={cn(
                "p-4 rounded-xl",
                "bg-neutral-50 border border-neutral-200",
                "text-body-sm text-mute"
              )}
            >
              No structured JSON result found in output.
            </div>
          ) : (
            <pre className={preStyles}>
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
        </div>

        {/* Data Disclaimer */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-secondary" />
            <h3 className="text-ui font-semibold text-ink">Data Disclaimer</h3>
          </div>

          <div
            className={cn(
              "p-4 rounded-xl",
              "bg-secondary/5 border border-secondary/20",
              "text-body-sm text-ink",
              "whitespace-pre-wrap break-words"
            )}
          >
            {disclaimer || (
              <span className="text-mute">No disclaimer provided.</span>
            )}
          </div>
        </div>

        {/* Raw Output */}
        {stdout && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-5 h-5 text-mute" />
              <h3 className="text-ui font-semibold text-ink">Raw Output</h3>
            </div>

            <pre className={preStyles}>{stdout}</pre>
          </div>
        )}
      </div>
    </AdminCard>
  );
}
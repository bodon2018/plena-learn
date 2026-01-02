"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import {
  Hash,
  AlertTriangle,
  FileText,
  Loader2,
  ChevronDown,
  ChevronUp,
  Table,
  Info,
  Calculator,
} from "lucide-react";
import AdminCard from "@/components/ui/AdminCard";

type SmartResultCardProps = {
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
 * Parsed result structure for smart display.
 */
type ParsedResult = {
  metricName?: string;
  value: unknown;
  unit?: string;
  definition?: string;
  limitations?: string;
  gamesAnalyzed?: number;
  additionalStats?: Record<string, unknown>;
  isTableData: boolean;
  tableColumns?: string[];
  tableRows?: Record<string, unknown>[];
};

/**
 * Parse the result into a structured format for display.
 */
function parseResult(result: unknown): ParsedResult {
  const parsed: ParsedResult = {
    value: result,
    isTableData: false,
  };

  if (result == null) return parsed;

  // Handle direct array of objects (table data)
  if (Array.isArray(result) && result.length > 0 && typeof result[0] === "object") {
    parsed.isTableData = true;
    parsed.tableRows = result as Record<string, unknown>[];
    parsed.tableColumns = Object.keys(result[0] as object);
    return parsed;
  }

  // Handle structured result object
  if (typeof result === "object" && result !== null) {
    const r = result as Record<string, unknown>;

    parsed.metricName = r.metric_name as string | undefined;
    parsed.value = r.value ?? result;

    // Extract metadata
    if (r.metadata && typeof r.metadata === "object") {
      const meta = r.metadata as Record<string, unknown>;
      parsed.definition = meta.definition as string | undefined;
      parsed.unit = meta.unit as string | undefined;
      parsed.limitations = meta.limitations as string | undefined;
      parsed.gamesAnalyzed = meta.games_analyzed as number | undefined;

      // Collect additional stats
      const knownKeys = ["definition", "unit", "limitations", "games_analyzed"];
      const additional: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(meta)) {
        if (!knownKeys.includes(key) && val != null) {
          additional[key] = val;
        }
      }
      if (Object.keys(additional).length > 0) {
        parsed.additionalStats = additional;
      }
    }

    // Check if value is table data
    if (Array.isArray(parsed.value) && parsed.value.length > 0 && typeof parsed.value[0] === "object") {
      parsed.isTableData = true;
      parsed.tableRows = parsed.value as Record<string, unknown>[];
      parsed.tableColumns = Object.keys(parsed.value[0] as object);
    }
  }

  return parsed;
}

/**
 * Format a numeric value with appropriate precision.
 */
function formatValue(value: unknown, unit?: string): string {
  if (value == null) return "—";

  if (typeof value === "number") {
    // Check if it's a percentage (0-1 range with decimal)
    if (unit?.toLowerCase().includes("percent") || unit?.toLowerCase().includes("%")) {
      return `${(value * 100).toFixed(1)}%`;
    }
    // Format based on magnitude
    if (Number.isInteger(value)) {
      return value.toLocaleString();
    }
    if (Math.abs(value) < 0.01) {
      return value.toExponential(2);
    }
    return value.toFixed(3);
  }

  if (typeof value === "string") return value;

  return JSON.stringify(value);
}

/**
 * Format a key name for display (snake_case to Title Case).
 */
function formatKeyName(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Smart card displaying metric results with intelligent formatting.
 */
export default function SmartResultCard({
  hasRun,
  isRunning,
  isSuccess,
  isFailed,
  result,
  disclaimer,
  stdout,
}: SmartResultCardProps) {
  const [showRawOutput, setShowRawOutput] = useState(false);

  const parsed = useMemo(() => parseResult(result), [result]);

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
            Select a metric and CSV file, then click Run.
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
            Results will appear when complete.
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
          <p className="text-body text-danger">Run failed</p>
          <p className="text-body-sm text-mute mt-1">
            Check the error details below.
          </p>
        </div>
      </AdminCard>
    );
  }

  // Success state - smart display
  return (
    <AdminCard title="Results">
      <div className="space-y-6">
        {/* Metric Name Header */}
        {parsed.metricName && (
          <div className="pb-4 border-b border-neutral-200">
            <h3 className="text-heading-3 text-ink capitalize">
              {formatKeyName(parsed.metricName)}
            </h3>
            {parsed.definition && (
              <p className="text-body-sm text-mute mt-1">{parsed.definition}</p>
            )}
          </div>
        )}

        {/* Main Value Display */}
        {!parsed.isTableData && parsed.value != null && (
          <div
            className={cn(
              "p-6 rounded-2xl",
              "bg-gradient-to-br from-primary/5 to-sky/5",
              "border border-primary/20"
            )}
          >
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  "w-12 h-12 rounded-xl",
                  "bg-primary/10",
                  "flex items-center justify-center",
                  "flex-shrink-0"
                )}
              >
                <Calculator className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-caption text-mute uppercase tracking-wide mb-1">
                  Computed Value
                </p>
                <p className="text-heading-1 text-ink">
                  {formatValue(parsed.value, parsed.unit)}
                </p>
                {parsed.unit && !parsed.unit.toLowerCase().includes("percent") && (
                  <p className="text-body-sm text-mute mt-1">{parsed.unit}</p>
                )}
              </div>
            </div>

            {/* Additional stats */}
            {parsed.gamesAnalyzed && (
              <div className="mt-4 pt-4 border-t border-primary/10">
                <p className="text-caption text-mute">
                  Based on <span className="font-semibold text-ink">{parsed.gamesAnalyzed.toLocaleString()}</span> games analyzed
                </p>
              </div>
            )}
          </div>
        )}

        {/* Table Data Display */}
        {parsed.isTableData && parsed.tableRows && parsed.tableColumns && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Table className="w-5 h-5 text-primary" />
              <h3 className="text-ui font-semibold text-ink">Data Breakdown</h3>
              <span className="text-caption text-mute">
                ({parsed.tableRows.length} {parsed.tableRows.length === 1 ? "row" : "rows"})
              </span>
            </div>

            <div className="rounded-xl border border-neutral-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-200">
                      {parsed.tableColumns.map((col) => (
                        <th
                          key={col}
                          className="px-4 py-3 text-left text-caption font-semibold text-ink uppercase tracking-wide"
                        >
                          {formatKeyName(col)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.tableRows.slice(0, 20).map((row, i) => (
                      <tr
                        key={i}
                        className={cn(
                          "border-b border-neutral-100 last:border-0",
                          i % 2 === 0 ? "bg-white" : "bg-neutral-50/50"
                        )}
                      >
                        {parsed.tableColumns!.map((col) => (
                          <td
                            key={col}
                            className="px-4 py-3 text-body-sm text-ink"
                          >
                            {formatValue(row[col])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsed.tableRows.length > 20 && (
                <div className="px-4 py-2 bg-neutral-50 border-t border-neutral-200">
                  <p className="text-caption text-mute">
                    Showing 20 of {parsed.tableRows.length} rows
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Additional Statistics */}
        {parsed.additionalStats && Object.keys(parsed.additionalStats).length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-5 h-5 text-mute" />
              <h3 className="text-ui font-semibold text-ink">Additional Statistics</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(parsed.additionalStats).map(([key, val]) => (
                <div
                  key={key}
                  className={cn(
                    "p-3 rounded-xl",
                    "bg-neutral-50 border border-neutral-200"
                  )}
                >
                  <p className="text-caption text-mute mb-1">{formatKeyName(key)}</p>
                  <p className="text-body-sm font-medium text-ink">
                    {formatValue(val)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Limitations */}
        {parsed.limitations && (
          <div
            className={cn(
              "p-4 rounded-xl",
              "bg-amber-50 border border-amber-200"
            )}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-ui font-semibold text-amber-800 mb-1">Limitations</p>
                <p className="text-body-sm text-amber-700">{parsed.limitations}</p>
              </div>
            </div>
          </div>
        )}

        {/* Data Disclaimer */}
        {disclaimer && (
          <div
            className={cn(
              "p-4 rounded-xl",
              "bg-secondary/5 border border-secondary/20"
            )}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-ui font-semibold text-ink mb-1">Data Disclaimer</p>
                <p className="text-body-sm text-ink">{disclaimer}</p>
              </div>
            </div>
          </div>
        )}

        {/* Raw Output (collapsible) */}
        {stdout && (
          <div>
            <button
              type="button"
              onClick={() => setShowRawOutput(!showRawOutput)}
              className={cn(
                "flex items-center gap-2 w-full",
                "px-4 py-3 rounded-xl",
                "bg-neutral-50 border border-neutral-200",
                "hover:bg-neutral-100",
                "transition-colors duration-150"
              )}
            >
              <FileText className="w-5 h-5 text-mute" />
              <span className="text-ui font-medium text-ink flex-1 text-left">
                Raw Output
              </span>
              {showRawOutput ? (
                <ChevronUp className="w-5 h-5 text-mute" />
              ) : (
                <ChevronDown className="w-5 h-5 text-mute" />
              )}
            </button>

            {showRawOutput && (
              <pre
                className={cn(
                  "mt-2 p-4 rounded-xl",
                  "bg-neutral-900",
                  "text-caption font-mono",
                  "overflow-auto max-h-64",
                  "whitespace-pre-wrap break-words"
                )}
                style={{ color: "#e5e5e5" }}
              >
                {stdout || "No output available"}
              </pre>
            )}
          </div>
        )}
      </div>
    </AdminCard>
  );
}
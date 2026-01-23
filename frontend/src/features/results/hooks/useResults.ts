import { useCallback, useEffect, useMemo, useState } from "react";
import { useDataSourcesStore } from "@/hooks/useDataSourcesStore";
import { useMetricsDefinitionsStore } from "@/hooks/useMetricsDefinitionsStore";

const AI_BASE_URL =
  process.env.NEXT_PUBLIC_AI_BASE_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8001";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type MetricRunRecord = {
  run_id: string;
  status: "queued" | "running" | "success" | "error" | "timeout";
  selected_csv_saved_path: string;
  run_label?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  exit_code?: number | null;
  stdout?: string | null;
  stderr?: string | null;
  truncated_stdout?: boolean;
  truncated_stderr?: boolean;
  [key: string]: unknown;
};

export type MetricJobRecord = {
  job_id: string;
  status: string;
  updated_at?: string;
  created_at?: string;
  request?: {
    metric_name: string;
    description: string;
    sport?: string | null;
    constraints?: Record<string, unknown>;
  };
  data_disclaimer?: string | null;
  metadata?: {
    runs?: MetricRunRecord[];
    [key: string]: unknown;
  };
  error?: { error_code: string; error_message: string } | null;
};

export type PlotImage = {
  src: string;
  label?: string;
};

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/**
 * Extract JSON from stdout (handles mixed log output).
 */
function tryExtractJsonFromStdout(stdout?: string | null): unknown | null {
  if (!stdout) return null;
  const text = stdout.trim();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    // Fallback: extract JSON region
  }

  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first < 0 || last <= first) return null;

  try {
    return JSON.parse(text.slice(first, last + 1));
  } catch {
    return null;
  }
}

/**
 * Normalize plot data to img src.
 */
function normalizePlotToImgSrc(plot: unknown): PlotImage | null {
  if (!plot) return null;

  if (typeof plot === "string") {
    const s = plot.trim();
    if (!s) return null;
    if (s.startsWith("data:image/")) return { src: s };
    return { src: `data:image/png;base64,${s}` };
  }

  if (typeof plot === "object" && plot !== null) {
    const p = plot as Record<string, unknown>;
    const label = (p.title || p.name || p.label) as string | undefined;

    if (typeof p.data_uri === "string" && p.data_uri.startsWith("data:image/")) {
      return { src: p.data_uri, label };
    }

    if (typeof p.url === "string" && p.url) {
      return { src: p.url, label };
    }

    const b64 =
      (typeof p.png_base64 === "string" && p.png_base64) ||
      (typeof p.base64 === "string" && p.base64) ||
      (typeof p.data === "string" && p.data);

    if (b64) {
      const trimmed = (b64 as string).trim();
      if (!trimmed) return null;
      if (trimmed.startsWith("data:image/")) return { src: trimmed, label };
      return { src: `data:image/png;base64,${trimmed}`, label };
    }
  }

  return null;
}

/**
 * Get latest run from job.
 */
function getLatestRun(job?: MetricJobRecord | null): MetricRunRecord | null {
  const runs = job?.metadata?.runs;
  if (!Array.isArray(runs) || runs.length === 0) return null;
  return runs[runs.length - 1] ?? null;
}

/**
 * Check if run is terminal.
 */
function isRunTerminal(status?: string | null): boolean {
  return status === "success" || status === "error" || status === "timeout";
}

// -----------------------------------------------------------------------------
// Hook
// -----------------------------------------------------------------------------

// Type for metric definition from store
type MetricDefinition = {
  job_id: string;
  status: string;
  request?: {
    metric_name: string;
    description: string;
    sport?: string | null;
  };
  [key: string]: unknown;
};

// Type for CSV file from store
type CsvFile = {
  saved_path: string;
  original_filename?: string;
  [key: string]: unknown;
};

type UseResultsReturn = {
  // Metrics
  definitions: MetricDefinition[];
  metricsLoading: boolean;
  metricsError: string | null;
  refreshMetrics: () => Promise<void>;
  selectedMetricJobId: string;
  setSelectedMetricJobId: (id: string) => void;
  selectedMetric: MetricDefinition | null;

  // CSVs
  csvs: CsvFile[];
  csvsLoading: boolean;
  csvsError: string | null;
  refreshCsvs: () => Promise<void>;
  selectedCsvPath: string;
  setSelectedCsvPath: (path: string) => void;

  // Run
  runJob: MetricJobRecord | null;
  isRunning: boolean;
  runError: string | null;
  runMetric: () => Promise<void>;
  refreshRun: () => Promise<void>;

  // Results
  latestRun: MetricRunRecord | null;
  isRunTerminal: boolean;
  isRunSuccess: boolean;
  isRunFailed: boolean;
  numericResult: unknown;
  dataDisclaimer: string;
  plots: PlotImage[];
  statusMessage: string;
};

export function useResults(): UseResultsReturn {
  // ---------------------------------------------------------------------------
  // Stores
  // ---------------------------------------------------------------------------
  const metricsStore = useMetricsDefinitionsStore() as {
    definitions: MetricDefinition[];
    definitionsLoading: boolean;
    definitionsError: string | null;
    refreshDefinitions: () => Promise<void>;
  };
  const {
    definitions,
    definitionsLoading: metricsLoading,
    definitionsError: metricsError,
    refreshDefinitions: refreshMetrics,
  } = metricsStore;

  const dataSourcesStore = useDataSourcesStore() as {
    files: CsvFile[];
    filesLoading: boolean;
    filesError: string | null;
    refreshFiles: () => Promise<void>;
  };
  const {
    files: csvs,
    filesLoading: csvsLoading,
    filesError: csvsError,
    refreshFiles: refreshCsvs,
  } = dataSourcesStore;

  // ---------------------------------------------------------------------------
  // Selection state
  // ---------------------------------------------------------------------------
  const [selectedMetricJobId, setSelectedMetricJobId] = useState("");
  const [selectedCsvPath, setSelectedCsvPath] = useState("");

  // ---------------------------------------------------------------------------
  // Run state
  // ---------------------------------------------------------------------------
  const [runJob, setRunJob] = useState<MetricJobRecord | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // API calls
  // ---------------------------------------------------------------------------

  const fetchJob = useCallback(async (jobId: string): Promise<MetricJobRecord | null> => {
    try {
      const resp = await fetch(`${AI_BASE_URL}/admin/metrics/jobs/${jobId}`, {
        credentials: "include",
      });
      if (!resp.ok) return null;
      return (await resp.json()) as MetricJobRecord;
    } catch {
      return null;
    }
  }, []);

  const runMetric = useCallback(async () => {
    setRunError(null);

    if (!selectedMetricJobId) {
      setRunError("Select a metric first.");
      return;
    }
    if (!selectedCsvPath) {
      setRunError("Select a CSV file first.");
      return;
    }

    setIsRunning(true);
    try {
      // Fetch current job state
      const current = await fetchJob(selectedMetricJobId);
      if (!current) throw new Error("Failed to fetch selected metric job.");
      setRunJob(current);

      // Trigger run
      const payload = {
        saved_path: selectedCsvPath,
        run_name: null,
        comment: null,
      };

      const resp = await fetch(`${AI_BASE_URL}/admin/metrics/jobs/${selectedMetricJobId}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const body = await resp.text();
        throw new Error(`Run failed (${resp.status}): ${body}`);
      }

      // Re-fetch to get updated runs
      const updated = await fetchJob(selectedMetricJobId);
      if (updated) setRunJob(updated);
    } catch (err: unknown) {
      setRunError(err instanceof Error ? err.message : "Failed to run metric.");
    } finally {
      setIsRunning(false);
    }
  }, [selectedMetricJobId, selectedCsvPath, fetchJob]);

  const refreshRun = useCallback(async () => {
    if (!runJob?.job_id) return;
    const updated = await fetchJob(runJob.job_id);
    if (updated) setRunJob(updated);
  }, [runJob?.job_id, fetchJob]);

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  // Load initial data
  useEffect(() => {
    refreshMetrics();
    refreshCsvs();
  }, [refreshMetrics, refreshCsvs]);

  // Auto-select first metric
  useEffect(() => {
    if (!selectedMetricJobId && definitions.length > 0) {
      setSelectedMetricJobId(definitions[0].job_id);
    }
  }, [definitions, selectedMetricJobId]);

  // Auto-select first CSV
  useEffect(() => {
    if (!selectedCsvPath && csvs.length > 0) {
      setSelectedCsvPath(csvs[0].saved_path);
    }
  }, [csvs, selectedCsvPath]);

  // Poll while run is in progress
  useEffect(() => {
    if (!runJob?.job_id) return;

    const latest = getLatestRun(runJob);
    if (!latest || isRunTerminal(latest.status)) return;

    const id = window.setInterval(async () => {
      const updated = await fetchJob(runJob.job_id);
      if (updated) setRunJob(updated);
    }, 2000);

    return () => window.clearInterval(id);
  }, [runJob?.job_id, runJob?.metadata?.runs, fetchJob]);

  // ---------------------------------------------------------------------------
  // Computed values
  // ---------------------------------------------------------------------------

  const selectedMetric = useMemo(() => {
    return definitions.find((m) => m.job_id === selectedMetricJobId) ?? null;
  }, [definitions, selectedMetricJobId]);

  const latestRun = useMemo(() => getLatestRun(runJob), [runJob]);

  const runTerminal = isRunTerminal(latestRun?.status);
  const runSuccess = latestRun?.status === "success";
  const runFailed = runTerminal && !runSuccess;

  const extractedJson = useMemo(() => {
    return tryExtractJsonFromStdout(latestRun?.stdout ?? null);
  }, [latestRun?.stdout]);

  const numericResult = useMemo(() => {
    // Pass the full extracted JSON to allow SmartResultCard to parse metadata
    return extractedJson;
  }, [extractedJson]);

  const dataDisclaimer = useMemo(() => {
    const server = (runJob?.data_disclaimer ?? "").toString().trim();
    if (server) return server;

    const json = extractedJson as Record<string, unknown> | null;
    const fromJson =
      (json?.metadata as Record<string, unknown>)?.data_disclaimer ||
      (json?.metadata as Record<string, unknown>)?.disclaimer ||
      json?.data_disclaimer;

    if (typeof fromJson === "string" && fromJson.trim()) return fromJson.trim();
    return "";
  }, [runJob?.data_disclaimer, extractedJson]);

  const plots = useMemo(() => {
    const imgs: PlotImage[] = [];
    const json = extractedJson as Record<string, unknown> | null;
    const jsonPlots = json?.plots;

    if (Array.isArray(jsonPlots)) {
      for (const p of jsonPlots) {
        const norm = normalizePlotToImgSrc(p);
        if (norm) imgs.push(norm);
      }
    }

    return imgs;
  }, [extractedJson]);

  const statusMessage = useMemo(() => {
    if (!runJob) return "No run started yet.";

    const lr = getLatestRun(runJob);
    if (!lr) return `Status: ${runJob.status} (no runs yet)`;

    if (lr.status === "success") return "Run completed successfully.";
    if (lr.status === "timeout") return "Run timed out.";
    if (lr.status === "error") return `Run failed.${lr.stderr ? " See error details below." : ""}`;
    if (lr.status === "running") return "Running...";
    if (lr.status === "queued") return "Queued...";

    return `Run status: ${lr.status}`;
  }, [runJob]);

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    definitions,
    metricsLoading,
    metricsError,
    refreshMetrics,
    selectedMetricJobId,
    setSelectedMetricJobId: (id: string) => {
      setSelectedMetricJobId(id);
      setRunJob(null);
      setRunError(null);
    },
    selectedMetric,

    csvs,
    csvsLoading,
    csvsError,
    refreshCsvs,
    selectedCsvPath,
    setSelectedCsvPath,

    runJob,
    isRunning,
    runError,
    runMetric,
    refreshRun,

    latestRun,
    isRunTerminal: runTerminal,
    isRunSuccess: runSuccess,
    isRunFailed: runFailed,
    numericResult,
    dataDisclaimer,
    plots,
    statusMessage,
  };
}

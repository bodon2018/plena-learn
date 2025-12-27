"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { useDataSourcesStore } from "@/hooks/useDataSourcesStore";

// UPDATED: shared source of truth for “available metrics” (server-backed definitions list)
import { useMetricsDefinitionsStore } from "@/hooks/useMetricsDefinitionsStore";

const AI_BASE_URL = "http://127.0.0.1:8001";

/**
 * Shape for listing available metrics (definition-only).
 * We treat these as "metric definitions" identified by job_id.
 *
 * NOTE: This matches what the shared store returns from GET /admin/metrics/definitions.
 */
type MetricDefinitionSummary = {
  job_id: string;
  metric_name: string;
  description: string;
  sport?: string | null;
  constraints?: Record<string, any>;
  org_context?: string;
  created_at?: string;

  // Optional: some backends include status in the definitions list; we don’t require it here.
  status?: string;
};

/**
 * NEW: Run endpoint payload:
 *   POST /admin/metrics/jobs/{job_id}/run
 */
type RunMetricPayload = {
  saved_path: string;
  run_name?: string | null;
  comment?: string | null;
};

/**
 * NEW: Run record (stored in job.metadata.runs and also returned directly from POST /run).
 * Keep this minimal and tolerant: backend is the source of truth.
 */
type MetricRunRecord = {
  run_id: string;
  status: "queued" | "running" | "success" | "error" | "timeout";

  // Backend stores the selected CSV saved_path here (per your main.py)
  selected_csv_saved_path: string;

  run_label?: string | null;

  started_at?: string | null;
  finished_at?: string | null;

  exit_code?: number | null;

  stdout?: string | null;
  stderr?: string | null;

  truncated_stdout?: boolean;
  truncated_stderr?: boolean;

  // Future-proof: ignore unknown keys.
  [key: string]: any;
};

/**
 * Minimal JobRecord type we rely on for running + showing results.
 *
 * IMPORTANT UPDATE:
 * - python_execution is no longer the source of truth for results.
 * - runs are stored under metadata.runs (array of run records).
 */
type MetricJobRecord = {
  job_id: string;
  status: string;
  updated_at?: string;
  created_at?: string;

  request?: {
    metric_name: string;
    description: string;
    sport?: string | null;
    constraints?: Record<string, any>;
  };

  // Data disclaimer is displayed in the Numeric Result card.
  data_disclaimer?: string | null;

  // NEW: runs live in metadata.runs
  metadata?: {
    runs?: MetricRunRecord[];
    [key: string]: any;
  };

  error?: { error_code: string; error_message: string } | null;
};

/**
 * Extract a JSON object from python stdout.
 * - Some runs print a pure JSON blob (best case).
 * - If logs are included, we attempt a crude extraction from the first "{" to last "}".
 */
function tryExtractJsonFromStdout(stdout?: string | null): any | null {
  if (!stdout) return null;
  const text = stdout.trim();
  if (!text) return null;

  // Attempt direct JSON parse first.
  try {
    return JSON.parse(text);
  } catch {
    // Fallback: try extracting the widest JSON-looking region.
  }

  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first < 0 || last <= first) return null;

  const candidate = text.slice(first, last + 1);
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

/**
 * Normalize possible plot artifact shapes into something renderable in <img>.
 * We support a few common possibilities:
 * - data URI: "data:image/png;base64,...."
 * - base64 PNG string: "iVBORw0KGgo..." (we prefix as data URI)
 * - object with url/data_uri/png_base64/base64 fields
 */
function normalizePlotToImgSrc(plot: any): { src: string; label?: string } | null {
  if (!plot) return null;

  // 1) Direct string
  if (typeof plot === "string") {
    const s = plot.trim();
    if (!s) return null;

    // Already a data URI
    if (s.startsWith("data:image/")) return { src: s };

    // Likely raw base64 png: prefix it
    return { src: `data:image/png;base64,${s}` };
  }

  // 2) Object shapes
  if (typeof plot === "object") {
    const label = plot.title || plot.name || plot.label;

    if (typeof plot.data_uri === "string" && plot.data_uri.startsWith("data:image/")) {
      return { src: plot.data_uri, label };
    }

    if (typeof plot.url === "string" && plot.url) {
      return { src: plot.url, label };
    }

    const b64 =
      (typeof plot.png_base64 === "string" && plot.png_base64) ||
      (typeof plot.base64 === "string" && plot.base64) ||
      (typeof plot.data === "string" && plot.data);

    if (b64) {
      const trimmed = b64.trim();
      if (!trimmed) return null;
      if (trimmed.startsWith("data:image/")) return { src: trimmed, label };
      return { src: `data:image/png;base64,${trimmed}`, label };
    }
  }

  return null;
}

/**
 * Helper: pick the latest run record from a JobRecord (if any).
 * We treat "latest" as the last element in metadata.runs, which matches how main.py appends.
 */
function getLatestRun(job?: MetricJobRecord | null): MetricRunRecord | null {
  const runs = job?.metadata?.runs;
  if (!Array.isArray(runs) || runs.length === 0) return null;
  return runs[runs.length - 1] ?? null;
}

/**
 * Helper: terminal run states.
 */
function isRunTerminal(status?: string | null): boolean {
  return status === "success" || status === "error" || status === "timeout";
}

export default function ResultsAndVisualizationsPage() {
  /* STYLE: match your existing cards/inputs/buttons */
  const inputCls =
    "w-full rounded-2xl border border-neutral-300 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary";
  const rowBtnCls = "btn-outline text-xs";

  // ----------------------------
  // Available Metrics (definitions) - UPDATED: use shared store
  // ----------------------------
  const {
    definitions,
    definitionsLoading: metricsLoading,
    definitionsError: metricsError,
    refreshDefinitions,
  } = useMetricsDefinitionsStore();

  // Selected metric + CSV
  const [selectedMetricJobId, setSelectedMetricJobId] = useState<string>("");
  const [selectedCsvSavedPath, setSelectedCsvSavedPath] = useState<string>("");

  // ----------------------------
  // Available CSVs (server-backed store)
  // ----------------------------
  const {
    files: availableCsvs,
    filesLoading: csvsLoading,
    filesError: csvsError,
    refreshFiles: refreshCsvs,
  } = useDataSourcesStore();

  // ----------------------------
  // Run state
  // ----------------------------
  const [runLoading, setRunLoading] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  // The job record we are actively observing (includes metadata.runs).
  const [runJob, setRunJob] = useState<MetricJobRecord | null>(null);

  /**
   * Read job state:
   * - GET /admin/metrics/jobs/{job_id}
   *
   * Backend returns JobRecord.model_dump() (single source of truth).
   */
  const fetchJob = async (jobId: string): Promise<MetricJobRecord | null> => {
    try {
      const resp = await fetch(`${AI_BASE_URL}/admin/metrics/jobs/${jobId}`);
      if (!resp.ok) return null;
      return (await resp.json()) as MetricJobRecord;
    } catch {
      return null;
    }
  };

  /**
   * Trigger a run against a selected CSV.
   * - POST /admin/metrics/jobs/{job_id}/run
   * - Returns the run record immediately (backend executes synchronously today).
   */
  const triggerRun = async (jobId: string, csvSavedPath: string): Promise<MetricRunRecord> => {
    const payload: RunMetricPayload = {
      saved_path: csvSavedPath,
      // Keep null for now; you can add UI inputs later without changing backend.
      run_name: null,
      comment: null,
    };

    const resp = await fetch(`${AI_BASE_URL}/admin/metrics/jobs/${jobId}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`Run failed (${resp.status}): ${body}`);
    }

    return (await resp.json()) as MetricRunRecord;
  };

  /**
   * Run metric flow (definition job + CSV):
   * - Fetch job (read-only)
   * - Trigger /run with selected CSV
   * - Fetch job again to hydrate metadata.runs in UI
   */
  const runMetric = async () => {
    setRunError(null);

    if (!selectedMetricJobId) {
      setRunError("Select a metric first.");
      return;
    }
    if (!selectedCsvSavedPath) {
      setRunError("Select a CSV file first.");
      return;
    }

    setRunLoading(true);
    try {
      // Start from latest server state (so the UI can show prior runs before starting a new one).
      const current = await fetchJob(selectedMetricJobId);
      if (!current) throw new Error("Failed to fetch selected metric job from server.");
      setRunJob(current);

      // Trigger the new run (backend validates READY_TO_RUN + python_file_path + path safety).
      await triggerRun(selectedMetricJobId, selectedCsvSavedPath);

      // Re-fetch job so UI has the persisted run record under metadata.runs.
      const updated = await fetchJob(selectedMetricJobId);
      if (updated) setRunJob(updated);
    } catch (e: any) {
      setRunError(e?.message ?? "Failed to run metric.");
    } finally {
      setRunLoading(false);
    }
  };

  /**
   * Poll while the latest run is non-terminal.
   */
  useEffect(() => {
    if (!runJob?.job_id) return;

    const latest = getLatestRun(runJob);
    if (!latest) return;

    // Stop polling when the latest run is terminal.
    if (isRunTerminal(latest.status)) return;

    const id = window.setInterval(async () => {
      const updated = await fetchJob(runJob.job_id);
      if (updated) setRunJob(updated);
    }, 2000);

    return () => window.clearInterval(id);
  }, [runJob?.job_id, runJob?.metadata?.runs]);

  /**
   * Load initial lists:
   * - metrics definitions list via shared store
   * - CSV list via shared store
   */
  useEffect(() => {
    refreshDefinitions();
    refreshCsvs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Sensible defaults:
   * - Select the first metric if none selected.
   * - Select the most recent CSV if none selected.
   */
  useEffect(() => {
    if (!selectedMetricJobId && definitions.length > 0) {
      setSelectedMetricJobId(definitions[0].job_id);
    }
  }, [definitions, selectedMetricJobId]);

  useEffect(() => {
    if (!selectedCsvSavedPath && availableCsvs.length > 0) {
      setSelectedCsvSavedPath(availableCsvs[0].saved_path);
    }
  }, [availableCsvs, selectedCsvSavedPath]);

  const selectedMetric = useMemo(() => {
    return (definitions as MetricDefinitionSummary[]).find((m) => m.job_id === selectedMetricJobId) ?? null;
  }, [definitions, selectedMetricJobId]);

  // ----------------------------
  // Derived: latest run + numeric result + disclaimer + plots
  // ----------------------------
  const latestRun = useMemo(() => getLatestRun(runJob), [runJob]);

  const extractedJson = useMemo(() => {
    return tryExtractJsonFromStdout(latestRun?.stdout ?? null);
  }, [latestRun?.stdout]);

  const numericResult = useMemo(() => {
    if (extractedJson && typeof extractedJson === "object" && "value" in extractedJson) {
      return extractedJson.value;
    }
    return extractedJson;
  }, [extractedJson]);

  const dataDisclaimer = useMemo(() => {
    // Prefer server-provided data_disclaimer field if present.
    const server = (runJob?.data_disclaimer ?? "").toString().trim();
    if (server) return server;

    // Fallback if stdout JSON includes metadata.disclaimer or similar.
    const fromJson =
      extractedJson?.metadata?.data_disclaimer ||
      extractedJson?.metadata?.disclaimer ||
      extractedJson?.data_disclaimer;

    if (typeof fromJson === "string" && fromJson.trim()) return fromJson.trim();
    return "";
  }, [runJob?.data_disclaimer, extractedJson]);

  const plotImgs = useMemo(() => {
    const imgs: Array<{ src: string; label?: string }> = [];

    const jsonPlots = extractedJson?.plots;
    if (Array.isArray(jsonPlots)) {
      for (const p of jsonPlots) {
        const norm = normalizePlotToImgSrc(p);
        if (norm) imgs.push(norm);
      }
    }

    return imgs;
  }, [extractedJson]);

  const runStatusLine = useMemo(() => {
    if (!runJob) return "No run started yet.";

    const lr = getLatestRun(runJob);
    if (!lr) return `Status: ${runJob.status} (no runs yet)`;

    if (lr.status === "success") return "Run succeeded.";
    if (lr.status === "timeout") return "Run timed out.";
    if (lr.status === "error") return `Run failed.${lr.stderr ? " See stderr." : ""}`;

    return `Run status: ${lr.status}`;
  }, [runJob]);

  const showResultPanel = useMemo(() => {
    return Boolean(latestRun && latestRun.status === "success");
  }, [latestRun]);

  const showRunningPanel = useMemo(() => {
    return Boolean(latestRun && !isRunTerminal(latestRun.status));
  }, [latestRun]);

  const showFailedPanel = useMemo(() => {
    return Boolean(latestRun && isRunTerminal(latestRun.status) && latestRun.status !== "success");
  }, [latestRun]);

  /**
   * UI FIX (requested):
   * Ensure disclaimer / stdout / stderr do NOT overflow outside the Numeric Result card.
   *
   * Root cause: long unbroken strings (JSON on one line) + <pre> default no-wrapping can overflow.
   * Fix: wrap + constrain blocks:
   * - Add overflow-hidden to the block containers.
   * - Add max-w-full + whitespace-pre-wrap + break-words to <pre> and long-text containers.
   */
  const preCls =
    "mt-2 max-h-[260px] max-w-full overflow-auto rounded-2xl border bg-white p-3 text-xs text-neutral-700 whitespace-pre-wrap break-words";

  return (
    <div className="space-y-6">
      {/* -------------------- Controls -------------------- */}
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1">
            <h2 className="text-xl font-bold">Run a metric</h2>
            <div className="mt-2 text-sm text-neutral-700">
              Select a metric definition and a CSV file, then run the metric.
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <label className="block text-sm text-neutral-700">Metric</label>
                  <button
                    className={cn(rowBtnCls, metricsLoading && "opacity-50 pointer-events-none")}
                    disabled={metricsLoading}
                    onClick={refreshDefinitions}
                    title="Refresh metrics list"
                  >
                    Refresh
                  </button>
                </div>

                <select
                  className={inputCls}
                  value={selectedMetricJobId}
                  onChange={(e) => {
                    setSelectedMetricJobId(e.target.value);
                    setRunJob(null);
                    setRunError(null);
                  }}
                  disabled={metricsLoading || definitions.length === 0}
                >
                  {definitions.length === 0 ? (
                    <option value="">No metrics available</option>
                  ) : (
                    (definitions as MetricDefinitionSummary[]).map((m) => (
                      <option key={m.job_id} value={m.job_id}>
                        {m.metric_name} (job {m.job_id.slice(0, 8)}…)
                      </option>
                    ))
                  )}
                </select>

                {metricsError ? <div className="mt-2 text-xs text-neutral-500">{metricsError}</div> : null}

                {selectedMetric ? (
                  <div className="mt-2 text-xs text-neutral-500">
                    <span className="font-medium text-ink">Description:</span> {selectedMetric.description}
                  </div>
                ) : null}
              </div>

              <div>
                <div className="flex items-center justify-between gap-2">
                  <label className="block text-sm text-neutral-700">CSV file</label>
                  <button
                    className={cn(rowBtnCls, csvsLoading && "opacity-50 pointer-events-none")}
                    disabled={csvsLoading}
                    onClick={refreshCsvs}
                    title="Refresh CSV list"
                  >
                    Refresh
                  </button>
                </div>

                <select
                  className={inputCls}
                  value={selectedCsvSavedPath}
                  onChange={(e) => setSelectedCsvSavedPath(e.target.value)}
                  disabled={csvsLoading || availableCsvs.length === 0}
                >
                  {availableCsvs.length === 0 ? (
                    <option value="">No CSVs available</option>
                  ) : (
                    availableCsvs.map((f) => (
                      <option key={f.saved_path} value={f.saved_path}>
                        {f.original_filename} ({f.size_bytes.toLocaleString()} bytes)
                      </option>
                    ))
                  )}
                </select>

                {csvsError ? <div className="mt-2 text-sm text-red-600">{csvsError}</div> : null}

                {availableCsvs.length === 0 ? (
                  <div className="mt-2 text-xs text-neutral-500">
                    Upload a CSV in the Data Sources tab, then return here to run the metric.
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                className={cn(
                  "btn-primary",
                  (runLoading || !selectedMetricJobId || !selectedCsvSavedPath) &&
                    "opacity-50 pointer-events-none"
                )}
                disabled={runLoading || !selectedMetricJobId || !selectedCsvSavedPath}
                onClick={runMetric}
                title="Run the selected metric definition against the selected CSV"
              >
                {runLoading ? "Starting..." : "Run metric"}
              </button>

              <div className="text-sm text-neutral-700">{runStatusLine}</div>

              {runError ? <div className="text-sm text-red-600">{runError}</div> : null}
            </div>

            {/* Optional: show stderr when the latest run failed/timed out */}
            {latestRun?.stderr && showFailedPanel ? (
              <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-3 overflow-hidden">
                <div className="text-sm font-medium text-red-800">Run stderr</div>
                <pre className={preCls}>{latestRun.stderr}</pre>
              </div>
            ) : null}
          </div>

          <div className="mt-2 sm:mt-0">
            <button
              className={cn("btn-outline text-xs", !runJob?.job_id && "opacity-50 pointer-events-none")}
              disabled={!runJob?.job_id}
              onClick={async () => {
                if (!runJob?.job_id) return;
                const updated = await fetchJob(runJob.job_id);
                if (updated) setRunJob(updated);
              }}
              title="Fetch latest job state (includes metadata.runs)"
            >
              Refresh run
            </button>
          </div>
        </div>
      </Card>

      {/* -------------------- Card 1: Numeric Result + Data Disclaimer -------------------- */}
      <Card>
        <h2 className="text-xl font-bold">Numeric Result</h2>

        <div className="mt-4 grid gap-3 max-w-full">
          {!runJob ? (
            <div className="text-sm text-neutral-500">Run a metric to see results.</div>
          ) : showRunningPanel ? (
            <div className="text-sm text-neutral-500">Running… refresh will update automatically.</div>
          ) : showFailedPanel ? (
            <div className="text-sm text-neutral-500">Run did not complete successfully. See stderr above.</div>
          ) : showResultPanel ? (
            <>
              {/* Result block */}
              <div className="rounded-2xl border p-3 overflow-hidden">
                <div className="text-sm font-medium text-ink">Result</div>

                {numericResult == null ? (
                  <div className="mt-2 text-sm text-neutral-500">No structured JSON result found in stdout.</div>
                ) : (
                  <pre className={preCls}>{JSON.stringify(numericResult, null, 2)}</pre>
                )}
              </div>

              {/* Data disclaimer block */}
              <div className="rounded-2xl border p-3 overflow-hidden">
                <div className="text-sm font-medium text-ink">Data disclaimer</div>
                {/* FIX: break long text so it never spills outside the card */}
                <div className="mt-2 text-sm text-neutral-700 whitespace-pre-wrap break-words max-w-full">
                  {dataDisclaimer ? dataDisclaimer : <span className="text-neutral-500">None provided.</span>}
                </div>
              </div>

              {/* Raw stdout (latest run stdout) */}
              {latestRun?.stdout ? (
                <div className="rounded-2xl border p-3 overflow-hidden">
                  <div className="text-sm font-medium text-ink">Raw stdout</div>
                  {/* FIX: wrap JSON (single-line) to avoid horizontal overflow */}
                  <pre className={preCls}>{latestRun.stdout}</pre>
                </div>
              ) : null}
            </>
          ) : (
            <div className="text-sm text-neutral-500">No successful run results yet.</div>
          )}
        </div>
      </Card>

      {/* -------------------- Card 2: Plots -------------------- */}
      <Card>
        <h2 className="text-xl font-bold">Plots</h2>

        <div className="mt-4">
          {!runJob ? (
            <div className="text-sm text-neutral-500">Run a metric to see plots.</div>
          ) : showRunningPanel ? (
            <div className="text-sm text-neutral-500">Plots will appear when the run completes.</div>
          ) : showFailedPanel ? (
            <div className="text-sm text-neutral-500">No plots (run failed/timed out).</div>
          ) : plotImgs.length === 0 ? (
            <div className="text-sm text-neutral-500">No plots were produced for this metric run.</div>
          ) : (
            <div className="grid gap-3">
              {plotImgs.map((p, idx) => (
                <div key={`${p.src.slice(0, 24)}-${idx}`} className="rounded-2xl border p-3">
                  {p.label ? <div className="text-sm font-medium text-ink">{p.label}</div> : null}
                  <img
                    src={p.src}
                    alt={p.label ?? `Plot ${idx + 1}`}
                    className="mt-2 w-full rounded-2xl border bg-white"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

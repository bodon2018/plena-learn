
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
 * Payload for attaching data sources to a metric job.
 * Backend expects:
 *   POST /admin/metrics/jobs/{job_id}/data-sources
 *   { data_sources: [ { type: "upload_csv", saved_path: "...", display_name?: "..." } ] }
 */
type AttachDataSourcesPayload = {
  data_sources: Array<{
    type: "upload_csv";
    saved_path: string;
    display_name?: string;
    mime_type?: string;
  }>;
};

/**
 * Admin decision payload:
 *   POST /admin/metrics/jobs/{job_id}/admin-decision
 */
type AdminDecisionPayload = {
  decision: "approve" | "edit" | "reject";
  edits?: Record<string, any>;
  comment?: string | null;
};

/**
 * Minimal JobRecord type we rely on for running + showing results.
 * NOTE: We keep python_execution loose because its exact structure may evolve.
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

  // Execution capture (stdout/stderr) and any artifacts produced by the run.
  python_execution?: any;

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

  // Attempt direct JSON parse first (expected in your screenshot).
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
    // (We assume PNG; adjust if you emit other formats.)
    return { src: `data:image/png;base64,${s}` };
  }

  // 2) Object shapes
  if (typeof plot === "object") {
    const label = plot.title || plot.name || plot.label;

    if (typeof plot.data_uri === "string" && plot.data_uri.startsWith("data:image/")) {
      return { src: plot.data_uri, label };
    }

    if (typeof plot.url === "string" && plot.url) {
      // If you later host images somewhere, this will render them.
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

  // The job record we are actively running / observing
  const [runJob, setRunJob] = useState<MetricJobRecord | null>(null);

  /**
   * Read job state:
   * - GET /admin/metrics/jobs/{job_id}
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
   * Attach CSV to a job (if job is waiting for a data source).
   */
  const attachCsvToJob = async (jobId: string, csvSavedPath: string) => {
    // Find the selected file so we can include display_name (admin-friendly).
    const selected = availableCsvs.find((f) => f.saved_path === csvSavedPath);
    if (!selected) {
      throw new Error("Selected CSV is no longer available. Refresh and try again.");
    }

    const payload: AttachDataSourcesPayload = {
      data_sources: [
        {
          type: "upload_csv",
          saved_path: selected.saved_path,
          display_name: selected.original_filename, // helps readability in job logs/state
          mime_type: "text/csv",
        },
      ],
    };

    const resp = await fetch(`${AI_BASE_URL}/admin/metrics/jobs/${jobId}/data-sources`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`Attach data source failed (${resp.status}): ${body}`);
    }

    // Backend returns updated JobRecord.
    const updated = (await resp.json()) as MetricJobRecord;
    setRunJob(updated);
    return updated;
  };

  /**
   * Approve a job (if waiting for admin approval) to trigger generation/execution.
   * NOTE: This is what "Run metric" means in the current workflow.
   */
  const approveJob = async (jobId: string) => {
    const payload: AdminDecisionPayload = {
      decision: "approve",
      comment: null,
    };

    const resp = await fetch(`${AI_BASE_URL}/admin/metrics/jobs/${jobId}/admin-decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`Approve failed (${resp.status}): ${body}`);
    }

    const updated = (await resp.json()) as MetricJobRecord;
    setRunJob(updated);
    return updated;
  };

  /**
   * Run metric flow (definition job + CSV):
   * - Fetch job
   * - If waiting_for_data_source: attach CSV
   * - If waiting_for_admin_approval: approve (triggers execution)
   * - Then poll until terminal status
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
      // Always start from the latest server state.
      let current = await fetchJob(selectedMetricJobId);
      if (!current) {
        throw new Error("Failed to fetch selected metric job from server.");
      }
      setRunJob(current);

      // If job is completed already, we do not auto-rerun it (backend does not expose a rerun contract yet).
      if (current.status === "completed") {
        // Read-only path: user can still inspect output.
        return;
      }

      // If we need a CSV, attach it.
      if (current.status === "waiting_for_data_source") {
        current = await attachCsvToJob(current.job_id, selectedCsvSavedPath);
      }

      // If we need approval, approve to trigger execution.
      if (current.status === "waiting_for_admin_approval") {
        current = await approveJob(current.job_id);
      }

      // After attach/approve, the workflow should move through running states.
      // We let the polling effect below keep UI updated.
    } catch (e: any) {
      setRunError(e?.message ?? "Failed to run metric.");
    } finally {
      setRunLoading(false);
    }
  };

  /**
   * Poll runJob while it is in-flight so the Result/Plots cards update automatically.
   * This polling is READ-ONLY (it does not trigger execution).
   */
  useEffect(() => {
    if (!runJob?.job_id) return;

    const terminal = runJob.status === "completed" || runJob.status === "failed";
    if (terminal) return;

    const id = window.setInterval(async () => {
      const updated = await fetchJob(runJob.job_id);
      if (updated) setRunJob(updated);
    }, 2000);

    return () => window.clearInterval(id);
  }, [runJob?.job_id, runJob?.status]);

  /**
   * Load initial lists:
   * - UPDATED: metrics definitions list via shared store (refreshDefinitions)
   * - CSV list (server-backed store)
   */
  useEffect(() => {
    refreshDefinitions(); // UPDATED: required by request
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
  // Derived: numeric result + disclaimer + plots
  // ----------------------------
  const extractedJson = useMemo(() => {
    return tryExtractJsonFromStdout(runJob?.python_execution?.stdout ?? null);
  }, [runJob?.python_execution?.stdout]);

  const numericResult = useMemo(() => {
    // Prefer a `value` field if your metric returns { value: ... }.
    if (extractedJson && typeof extractedJson === "object" && "value" in extractedJson) {
      return extractedJson.value;
    }
    return extractedJson;
  }, [extractedJson]);

  const dataDisclaimer = useMemo(() => {
    // Prefer server-provided data_disclaimer field if present.
    const server = (runJob?.data_disclaimer ?? "").toString().trim();
    if (server) return server;

    // Fallback if your stdout JSON includes metadata.disclaimer or similar.
    const fromJson =
      extractedJson?.metadata?.data_disclaimer ||
      extractedJson?.metadata?.disclaimer ||
      extractedJson?.data_disclaimer;

    if (typeof fromJson === "string" && fromJson.trim()) return fromJson.trim();
    return "";
  }, [runJob?.data_disclaimer, extractedJson]);

  const plotImgs = useMemo(() => {
    const imgs: Array<{ src: string; label?: string }> = [];

    // 1) If backend attaches plot artifacts in python_execution.artifacts.plots
    const artifactsPlots = runJob?.python_execution?.artifacts?.plots;
    if (Array.isArray(artifactsPlots)) {
      for (const p of artifactsPlots) {
        const norm = normalizePlotToImgSrc(p);
        if (norm) imgs.push(norm);
      }
    }

    // 2) If stdout JSON includes plots
    const jsonPlots = extractedJson?.plots;
    if (Array.isArray(jsonPlots)) {
      for (const p of jsonPlots) {
        const norm = normalizePlotToImgSrc(p);
        if (norm) imgs.push(norm);
      }
    }

    return imgs;
  }, [runJob?.python_execution, extractedJson]);

  const runStatusLine = useMemo(() => {
    if (!runJob) return "No run started yet.";
    if (runJob.status === "completed") return "Completed.";
    if (runJob.status === "failed") return `Failed: ${runJob.error?.error_message ?? "See job.error"}`;
    return `Status: ${runJob.status}`;
  }, [runJob]);

  return (
    <div className="space-y-6">
      {/* -------------------- Controls (kept minimal, same design language) -------------------- */}
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1">
            <h2 className="text-xl font-bold">Run a metric</h2>
            <div className="mt-2 text-sm text-neutral-700">
              Select a metric definition and a CSV file, then run the metric.
            </div>

            {/* Metrics list + refresh */}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <label className="block text-sm text-neutral-700">Metric</label>
                  <button
                    className={cn(rowBtnCls, metricsLoading && "opacity-50 pointer-events-none")}
                    disabled={metricsLoading}
                    onClick={refreshDefinitions} // UPDATED: refresh via shared store
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
                    // Reset prior run state when switching metrics (prevents confusion).
                    setRunJob(null);
                    setRunError(null);
                  }}
                  disabled={metricsLoading || definitions.length === 0} // UPDATED
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

                {/* UPDATED: render store error (no localStorage fallback messaging) */}
                {metricsError ? <div className="mt-2 text-xs text-neutral-500">{metricsError}</div> : null}

                {selectedMetric ? (
                  <div className="mt-2 text-xs text-neutral-500">
                    <span className="font-medium text-ink">Description:</span> {selectedMetric.description}
                  </div>
                ) : null}
              </div>

              {/* CSV list + refresh */}
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

            {/* Run button + status */}
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                className={cn(
                  "btn-primary",
                  (runLoading || !selectedMetricJobId || !selectedCsvSavedPath) &&
                    "opacity-50 pointer-events-none"
                )}
                disabled={runLoading || !selectedMetricJobId || !selectedCsvSavedPath}
                onClick={runMetric}
                title="Attach CSV (if needed), approve (if needed), then execute"
              >
                {runLoading ? "Starting..." : "Run metric"}
              </button>

              <div className="text-sm text-neutral-700">{runStatusLine}</div>

              {runError ? <div className="text-sm text-red-600">{runError}</div> : null}
            </div>
          </div>

          {/* Lightweight debug / refresh for the current run job */}
          <div className="mt-2 sm:mt-0">
            <button
              className={cn("btn-outline text-xs", !runJob?.job_id && "opacity-50 pointer-events-none")}
              disabled={!runJob?.job_id}
              onClick={async () => {
                if (!runJob?.job_id) return;
                const updated = await fetchJob(runJob.job_id);
                if (updated) setRunJob(updated);
              }}
              title="Fetch latest run job state"
            >
              Refresh run
            </button>
          </div>
        </div>
      </Card>

      {/* -------------------- Card 1: Numeric Result + Data Disclaimer -------------------- */}
      <Card>
        <h2 className="text-xl font-bold">Numeric Result</h2>

        <div className="mt-4 grid gap-3">
          {!runJob ? (
            <div className="text-sm text-neutral-500">Run a metric to see results.</div>
          ) : runJob.status !== "completed" ? (
            <div className="text-sm text-neutral-500">
              {runJob.status === "failed"
                ? `Failed: ${runJob.error?.error_message ?? "See job.error"}`
                : "Running… refresh will update automatically."}
            </div>
          ) : (
            <>
              {/* Result block */}
              <div className="rounded-2xl border p-3">
                <div className="text-sm font-medium text-ink">Result</div>

                {/* Show a simple "not available" state if stdout isn't parseable yet */}
                {numericResult == null ? (
                  <div className="mt-2 text-sm text-neutral-500">
                    No structured JSON result found in stdout.
                  </div>
                ) : (
                  <pre className="mt-2 max-h-[260px] overflow-auto rounded-2xl border bg-white p-3 text-xs text-neutral-700">
                    {JSON.stringify(numericResult, null, 2)}
                  </pre>
                )}
              </div>

              {/* Data disclaimer block */}
              <div className="rounded-2xl border p-3">
                <div className="text-sm font-medium text-ink">Data disclaimer</div>
                <div className="mt-2 text-sm text-neutral-700 whitespace-pre-wrap">
                  {dataDisclaimer ? dataDisclaimer : <span className="text-neutral-500">None provided.</span>}
                </div>
              </div>

              {/* Optional: raw stdout (kept minimal, still useful for debugging) */}
              {runJob.python_execution?.stdout ? (
                <div className="rounded-2xl border p-3">
                  <div className="text-sm font-medium text-ink">Raw stdout</div>
                  <pre className="mt-2 max-h-[240px] overflow-auto rounded-2xl border bg-white p-3 text-xs text-neutral-700">
                    {runJob.python_execution.stdout}
                  </pre>
                </div>
              ) : null}
            </>
          )}
        </div>
      </Card>

      {/* -------------------- Card 2: Plots -------------------- */}
      <Card>
        <h2 className="text-xl font-bold">Plots</h2>

        <div className="mt-4">
          {!runJob ? (
            <div className="text-sm text-neutral-500">Run a metric to see plots.</div>
          ) : runJob.status !== "completed" ? (
            <div className="text-sm text-neutral-500">
              {runJob.status === "failed" ? "No plots (run failed)." : "Plots will appear when the run completes."}
            </div>
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

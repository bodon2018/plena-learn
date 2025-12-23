
"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "@/components/ui/Card";
import { cn } from "@/lib/cn";

// Reuse the server-backed “Available Data” list (CSV files under UPLOAD_RAW_DIR).
import { useDataSourcesStore } from "@/hooks/useDataSourcesStore";

// NEW: Shared source of truth for “available metrics” across Metrics + Results & Visualizations.
import { useMetricsDefinitionsStore } from "@/hooks/useMetricsDefinitionsStore";

/**
 * AI server base URL (local dev).
 * NOTE: In production, you’ll likely want this in an env var.
 */
const AI_BASE_URL = "http://127.0.0.1:8001";

/**
 * Frontend form model for creating a metric job (matches backend CreateMetricJobPayload).
 * Backend expects:
 *   { request: { metric_name, description, sport?, constraints? }, org_context? }
 */
type MetricJobCreatePayload = {
  request: {
    metric_name: string;
    description: string;
    sport?: string | null;
    constraints?: Record<string, any>;
  };
  org_context?: string;
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
 * Admin decision payload for the single admin gate.
 * Backend expects:
 *   POST /admin/metrics/jobs/{job_id}/admin-decision
 *   { decision: "approve" | "edit" | "reject", edits?: {...}, comment?: "..." }
 */
type AdminDecisionPayload = {
  decision: "approve" | "edit" | "reject";
  edits?: Record<string, any>;
  comment?: string | null;
};

/**
 * We keep JobRecord loosely typed here because backend currently returns a large object.
 * We only use a few stable fields in the UI.
 *
 * IMPORTANT:
 * - We add `plain_language_definition` because we want to show/edit it for admins.
 * - We only display/edit:
 *     1) plain_language_definition
 *     2) intent_spec.operational_definition
 *     3) data_disclaimer
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
  org_context?: string;

  data_sources?: any[];

  // Only field we need from intent_spec for admin UI (operational_definition).
  intent_spec?: { operational_definition?: string } | any;

  // Admin-facing texts we must show + allow edits for.
  plain_language_definition?: string | null;
  data_disclaimer?: string | null;

  // We intentionally do NOT render other workflow artifacts here.
  critique_report?: any;
  python_execution?: any;

  error?: { error_code: string; error_message: string } | null;
};

/**
 * Parse "Constraints (Optional)" input into a JSON object.
 *
 * Supported formats:
 *  1) JSON object:
 *     {"phase":"offense","debounce_sec":2,"include_coach":false}
 *
 *  2) key=value lines:
 *     phase=offense
 *     debounce_sec=2
 *     include_coach=false
 *
 * Notes:
 * - This produces a dictionary that the workflow can treat as flags/parameters.
 * - If parsing fails, we return a user-facing error message.
 */
function parseConstraintsInput(raw: string): { value?: Record<string, any>; error?: string } {
  const text = (raw || "").trim();
  if (!text) return { value: undefined };

  // Try JSON first (most explicit and reliable).
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return { value: parsed as Record<string, any> };
    }
    return { error: 'Constraints JSON must be an object (e.g., {"phase":"offense"}).' };
  } catch {
    // Fall back to key=value lines parsing.
  }

  const out: Record<string, any> = {};
  const lines = text.split("\n");

  for (const lineRaw of lines) {
    const line = lineRaw.trim();
    if (!line) continue;
    if (line.startsWith("#")) continue; // allow comments

    const sepIdx = line.includes("=") ? line.indexOf("=") : line.indexOf(":");
    if (sepIdx <= 0) {
      return {
        error: "Constraints lines must be in key=value format (or provide JSON). Example: phase=offense",
      };
    }

    const key = line.slice(0, sepIdx).trim();
    const vRaw = line.slice(sepIdx + 1).trim();

    if (!key) {
      return { error: "Constraints key cannot be empty." };
    }

    // Basic scalar parsing: booleans, null, numbers, otherwise string.
    const lower = vRaw.toLowerCase();
    let value: any = vRaw;

    if (lower === "true") value = true;
    else if (lower === "false") value = false;
    else if (lower === "null") value = null;
    else if (vRaw !== "" && !Number.isNaN(Number(vRaw))) value = Number(vRaw);
    else value = vRaw.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1"); // strip simple quotes

    out[key] = value;
  }

  return { value: out };
}

function summarizeConstraints(c?: Record<string, any>): string {
  if (!c || Object.keys(c).length === 0) return "None";
  const s = JSON.stringify(c);
  return s.length > 120 ? `${s.slice(0, 120)}…` : s;
}

export default function MetricsPage() {
  /**
   * NOTE (Updated):
   * “Existing Metric Definitions” is now sourced from the shared store which reads
   * the server endpoint GET /admin/metrics/definitions.
   *
   * This ensures Metrics tab and Results & Visualizations tab share the same truth.
   */
  const {
    definitions,
    definitionsLoading,
    definitionsError,
    refreshDefinitions,
  } = useMetricsDefinitionsStore();

  /**
   * The currently selected/most recent job we’re showing in the Status card.
   */
  const [job, setJob] = useState<MetricJobRecord | null>(null);

  /**
   * Create form state (matches required/optional fields requested).
   */
  const [form, setForm] = useState({
    metricName: "",
    description: "",
    sport: "",
    constraintsText: "",
    orgContext: "",
  });

  const [uiError, setUiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onFormChange = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const canCreate = form.metricName.trim().length > 0 && form.description.trim().length > 0;

  /* STYLE: shared pretty input classes to match existing design */
  const inputCls =
    "w-full rounded-2xl border border-neutral-300 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary";
  const textAreaCls =
    "w-full rounded-2xl border border-neutral-300 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary min-h-[110px]";

  // ----------------------------------------------------------------------------
  // Data source integration for Status card (WAITING_FOR_DATA_SOURCE).
  // We only *read* the shared store list here, and attach a selected CSV to the job.
  // ----------------------------------------------------------------------------
  const {
    files: availableCsvs,
    filesLoading: availableLoading,
    filesError: availableError,
    refreshFiles,
  } = useDataSourcesStore();

  // Local selection for “attach to this job” (kept local so we don’t affect Data Sources tab selection).
  const [selectedSavedPathForJob, setSelectedSavedPathForJob] = useState<string>("");

  // Attach state/errors (so Status card can show actionable feedback).
  const [attachLoading, setAttachLoading] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);

  // ----------------------------------------------------------------------------
  // Admin approval UI state (WAITING_FOR_ADMIN_APPROVAL).
  // We ONLY show/edit: plain_language_definition, intent_spec.operational_definition, data_disclaimer.
  // ----------------------------------------------------------------------------
  const [adminEditing, setAdminEditing] = useState(false);
  const [adminActionLoading, setAdminActionLoading] = useState(false);
  const [adminActionError, setAdminActionError] = useState<string | null>(null);

  // Draft edits (view-local) so refresh/polling does not clobber unsaved changes.
  const [adminDraft, setAdminDraft] = useState({
    plain_language_definition: "",
    operational_definition: "",
    data_disclaimer: "",
    comment: "",
  });

  // ----------------------------------------------------------------------------
  // NEW: On first render, load the server-backed definitions list.
  // This keeps “Existing Metric Definitions” accurate across reloads/sessions.
  // ----------------------------------------------------------------------------
  useEffect(() => {
    refreshDefinitions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Create metric job on AI server:
   * - POST /admin/metrics/jobs
   * - Backend runs S0/S1 and returns a JobRecord (typically WAITING_FOR_DATA_SOURCE).
   */
  const onCreate = async () => {
    setUiError(null);

    if (!canCreate) return;

    // Parse constraints into a dictionary.
    const parsed = parseConstraintsInput(form.constraintsText);
    if (parsed.error) {
      setUiError(parsed.error);
      return;
    }

    const payload: MetricJobCreatePayload = {
      request: {
        metric_name: form.metricName.trim(),
        description: form.description.trim(),
        sport: form.sport.trim() ? form.sport.trim() : null,
        // Only include constraints if present (keeps payload clean).
        ...(parsed.value ? { constraints: parsed.value } : {}),
      },
      // org_context is a top-level field in CreateMetricJobPayload.
      org_context: form.orgContext.trim() ? form.orgContext.trim() : "",
    };

    setIsSubmitting(true);
    try {
      const resp = await fetch(`${AI_BASE_URL}/admin/metrics/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const body = await resp.text();
        throw new Error(`Create metric job failed (${resp.status}): ${body}`);
      }

      const createdJob = (await resp.json()) as MetricJobRecord;

      // Show this job in the Status card.
      setJob(createdJob);

      // UPDATED: Refresh definitions from server so the list is correct for all sessions.
      // We do not maintain a separate local list anymore.
      refreshDefinitions();

      // Reset the form for the next create.
      setForm({
        metricName: "",
        description: "",
        sport: "",
        constraintsText: "",
        orgContext: "",
      });
    } catch (e: any) {
      setUiError(e?.message ?? "Failed to create metric job.");
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Refresh job status from AI server:
   * - GET /admin/metrics/jobs/{job_id}
   */
  const refreshJob = async (jobId: string) => {
    try {
      const resp = await fetch(`${AI_BASE_URL}/admin/metrics/jobs/${jobId}`);
      if (!resp.ok) return;
      const updated = (await resp.json()) as MetricJobRecord;
      setJob(updated);

      // UPDATED: If this refresh advances anything that should appear in the list endpoint,
      // pull latest definitions (safe + keeps list accurate across sessions).
      refreshDefinitions();
    } catch {
      // Keep UI quiet on refresh errors; admin can retry.
    }
  };

  /**
   * Light polling while job is in-flight so the Status card updates as the workflow advances.
   * This is intentionally conservative: stop polling once terminal states are reached.
   */
  useEffect(() => {
    if (!job?.job_id) return;

    const terminal = job.status === "completed" || job.status === "failed";
    if (terminal) return;

    const id = window.setInterval(() => refreshJob(job.job_id), 2000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.job_id, job?.status]);

  /**
   * When job is waiting for data source, load the server-backed list of CSVs.
   */
  useEffect(() => {
    if (job?.status !== "waiting_for_data_source") return;

    refreshFiles();
    setAttachError(null);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.status]);

  /**
   * If we’re at the data-source gate and we have files, pick a sensible default:
   * - If admin already picked a file, keep it.
   * - Else default to the most recent/first in the list.
   */
  useEffect(() => {
    if (job?.status !== "waiting_for_data_source") return;
    if (selectedSavedPathForJob) return;
    if (!availableCsvs || availableCsvs.length === 0) return;

    setSelectedSavedPathForJob(availableCsvs[0].saved_path);
  }, [job?.status, availableCsvs, selectedSavedPathForJob]);

  /**
   * Attach the selected CSV to the current job.
   * This unblocks the workflow:
   *   WAITING_FOR_DATA_SOURCE -> discovery -> adjust -> critique -> WAITING_FOR_ADMIN_APPROVAL
   */
  const attachSelectedCsvToJob = async () => {
    setAttachError(null);

    if (!job?.job_id) {
      setAttachError("No active job. Create a metric first.");
      return;
    }

    if (job.status !== "waiting_for_data_source") {
      setAttachError("Job is not waiting for a data source.");
      return;
    }

    if (!selectedSavedPathForJob) {
      setAttachError("Select a CSV to attach.");
      return;
    }

    // Find the selected file so we can include display_name (admin-friendly).
    const selected = availableCsvs.find((f) => f.saved_path === selectedSavedPathForJob);
    if (!selected) {
      setAttachError("Selected CSV is no longer available. Refresh and try again.");
      return;
    }

    const payload: AttachDataSourcesPayload = {
      data_sources: [
        {
          type: "upload_csv",
          saved_path: selected.saved_path,
          // Optional fields help with UI readability downstream (and are safe for the backend).
          display_name: selected.original_filename,
          mime_type: "text/csv",
        },
      ],
    };

    setAttachLoading(true);
    try {
      const resp = await fetch(`${AI_BASE_URL}/admin/metrics/jobs/${job.job_id}/data-sources`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const body = await resp.text();
        throw new Error(`Attach data source failed (${resp.status}): ${body}`);
      }

      // Backend returns updated JobRecord after advancing the workflow.
      const updatedJob = (await resp.json()) as MetricJobRecord;
      setJob(updatedJob);

      // UPDATED: refresh definitions so list reflects latest status for this metric.
      refreshDefinitions();
    } catch (e: any) {
      setAttachError(e?.message ?? "Failed to attach data source.");
    } finally {
      setAttachLoading(false);
    }
  };

  /**
   * Admin decision API call.
   *
   * IMPORTANT BACKEND NOTE (so you don’t lose time debugging):
   * - Today, your backend “EDIT” path applies `edits` only to `IntentSpec` via model_copy(update=edits).
   * - To fully support editing `plain_language_definition` and `data_disclaimer`, the backend must also:
   *     1) persist plain_language_definition in JobRecord
   *     2) persist data_disclaimer updates in JobRecord
   *   Otherwise, those edits may not be reflected after refresh.
   *
   * Frontend will send all three fields in edits exactly as requested.
   */
  const submitAdminDecision = async (payload: AdminDecisionPayload) => {
    setAdminActionError(null);

    if (!job?.job_id) {
      setAdminActionError("No active job.");
      return;
    }

    setAdminActionLoading(true);
    try {
      const resp = await fetch(`${AI_BASE_URL}/admin/metrics/jobs/${job.job_id}/admin-decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const body = await resp.text();
        throw new Error(`Admin decision failed (${resp.status}): ${body}`);
      }

      const updatedJob = (await resp.json()) as MetricJobRecord;

      // Update the Status card with the new server state.
      setJob(updatedJob);

      // UPDATED: refresh definitions list after admin actions (approve/edit/reject can change status).
      refreshDefinitions();

      // If this was an edit submission, exit edit mode so the admin sees the updated state clearly.
      if (payload.decision === "edit") {
        setAdminEditing(false);
      }
    } catch (e: any) {
      setAdminActionError(e?.message ?? "Failed to submit admin decision.");
    } finally {
      setAdminActionLoading(false);
    }
  };

  /**
   * Initialize the admin draft fields once we arrive at WAITING_FOR_ADMIN_APPROVAL.
   * We intentionally do NOT overwrite drafts while the admin is actively editing.
   */
  useEffect(() => {
    if (!job?.job_id) return;

    // If the job changes entirely, reset UI editing state (prevents draft leakage across jobs).
    setAdminActionError(null);

    // Only hydrate drafts when:
    // - We are at admin approval gate, and
    // - Admin is not currently editing (so refresh/polling doesn't clobber unsaved edits)
    if (job.status === "waiting_for_admin_approval" && !adminEditing) {
      const serverPlain = (job.plain_language_definition ?? "").toString();
      const serverOp = (job.intent_spec?.operational_definition ?? "").toString();
      const serverDisclaimer = (job.data_disclaimer ?? "").toString();

      setAdminDraft((d) => ({
        ...d,
        plain_language_definition: serverPlain,
        operational_definition: serverOp,
        data_disclaimer: serverDisclaimer,
        // comment is always local; we keep it unless the job changes
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.job_id, job?.status, job?.plain_language_definition, job?.data_disclaimer, job?.intent_spec]);

  const canSubmitEdits =
    adminDraft.plain_language_definition.trim().length > 0 &&
    adminDraft.operational_definition.trim().length > 0 &&
    adminDraft.data_disclaimer.trim().length > 0;

  const statusMessage = useMemo(() => {
    if (!job) return "No metric workflow started yet.";

    if (job.status === "waiting_for_data_source") {
      return "Waiting for you to attach a data source (CSV). Select an uploaded CSV below and attach it to this job.";
    }

    if (job.status === "waiting_for_admin_approval") {
      return "Waiting for admin approval. Review the definition below and approve, edit, or reject.";
    }

    if (job.status === "running_data_discovery") {
      return "Running data discovery and refining the metric definition based on available data…";
    }

    if (job.status === "drafting_intent") {
      return "Drafting the metric definition (intake + proposal)…";
    }

    if (job.status === "completed") {
      return "Completed. The metric python ran successfully and results are available in the job’s execution stdout.";
    }

    if (job.status === "failed") {
      return `Failed. ${job.error?.error_message ?? "See job.error for details."}`;
    }

    return `Status: ${job.status}`;
  }, [job]);

  return (
    <div className="space-y-6">
      {/* ---------- Create a metric ---------- */}
      <Card>
        <h2 className="text-xl font-bold">Create a metric</h2>

        <div className="mt-4 grid gap-3">
          {/* Metric Name (Required) */}
          <div>
            <label className="block text-sm text-neutral-700">Metric Name (Required)</label>
            <input
              className={inputCls}
              placeholder='e.g., "Network talk"'
              value={form.metricName}
              onChange={(e) => onFormChange("metricName", e.target.value)}
            />
          </div>

          {/* Description (Required) */}
          <div>
            <label className="block text-sm text-neutral-700">Description (Required)</label>
            <textarea
              className={textAreaCls}
              placeholder="Describe what you want computed, and (if helpful) add examples."
              value={form.description}
              onChange={(e) => onFormChange("description", e.target.value)}
            />
          </div>

          {/* Sport (Optional) */}
          <div>
            <label className="block text-sm text-neutral-700">Sport (Optional)</label>
            <input
              className={inputCls}
              placeholder='e.g., "soccer"'
              value={form.sport}
              onChange={(e) => onFormChange("sport", e.target.value)}
            />
          </div>

          {/* Constraints (Optional) + hover help */}
          <div>
            <div className="flex items-center gap-2">
              <label className="block text-sm text-neutral-700">Constraints (Optional)</label>
              <span
                className="cursor-help text-xs text-neutral-500"
                title={
                  "Constraints are key/value flags or parameters that the workflow should respect as requirements or preferences.\n\n" +
                  'Examples (JSON): {"phase":"offense","debounce_sec":2,"include_coach":false}\n' +
                  "Examples (key=value lines):\nphase=offense\ndebounce_sec=2\ninclude_coach=false"
                }
              >
                (hover for examples)
              </span>
            </div>

            <textarea
              className={cn(textAreaCls, "min-h-[90px]")}
              placeholder="JSON object or key=value lines (optional)"
              value={form.constraintsText}
              onChange={(e) => onFormChange("constraintsText", e.target.value)}
            />
          </div>

          {/* Organization Context (Optional) */}
          <div>
            <label className="block text-sm text-neutral-700">Organization Context (Optional)</label>
            <textarea
              className={cn(textAreaCls, "min-h-[90px]")}
              placeholder="Optional background about your org/team that can help define the metric."
              value={form.orgContext}
              onChange={(e) => onFormChange("orgContext", e.target.value)}
            />
          </div>

          {/* Inline error (validation or backend failures) */}
          {uiError ? <div className="text-sm text-red-600">{uiError}</div> : null}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            className={cn("btn-primary", (!canCreate || isSubmitting) && "opacity-50 pointer-events-none")}
            onClick={onCreate}
            disabled={!canCreate || isSubmitting}
          >
            + Create metric
          </button>

          <div className="text-xs text-neutral-500">Sends to {AI_BASE_URL}</div>
        </div>
      </Card>

      {/* ---------- Status ---------- */}
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h2 className="text-xl font-bold">Status</h2>
            <div className="mt-2 text-sm text-neutral-700">{statusMessage}</div>

            {/* Job identifiers (helps admin attach/approve correctly). */}
            {job ? (
              <div className="mt-3 text-xs text-neutral-500">
                <div>
                  <span className="font-medium text-ink">Job ID:</span> {job.job_id}
                </div>
                <div>
                  <span className="font-medium text-ink">Current status:</span> {job.status}
                </div>
                {job.updated_at ? (
                  <div>
                    <span className="font-medium text-ink">Updated:</span> {job.updated_at}
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* ------------------ WAITING_FOR_DATA_SOURCE: select + attach CSV ------------------ */}
            {job?.status === "waiting_for_data_source" ? (
              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl border p-3">
                  <div className="text-sm font-medium text-ink">Attach a CSV data source</div>

                  <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <button
                      className={cn("btn-outline text-xs", availableLoading && "opacity-50 pointer-events-none")}
                      disabled={availableLoading}
                      onClick={() => refreshFiles()}
                      title="Refresh the list of uploaded CSVs from the AI server"
                    >
                      Refresh available data
                    </button>

                    <div className="text-xs text-neutral-500">
                      Source: CSV files under the server upload/raw directory
                    </div>
                  </div>

                  {availableError ? <div className="mt-2 text-sm text-red-600">{availableError}</div> : null}

                  <div className="mt-3">
                    <label className="block text-sm text-neutral-700">Select an uploaded CSV</label>
                    <select
                      className={inputCls}
                      value={selectedSavedPathForJob}
                      onChange={(e) => setSelectedSavedPathForJob(e.target.value)}
                      disabled={availableLoading || availableCsvs.length === 0}
                    >
                      {availableCsvs.length === 0 ? (
                        <option value="">No uploaded CSVs available</option>
                      ) : (
                        <>
                          <option value="" disabled>
                            Select a file…
                          </option>
                          {availableCsvs.map((f) => (
                            <option key={f.saved_path} value={f.saved_path}>
                              {f.original_filename} ({f.size_bytes.toLocaleString()} bytes)
                            </option>
                          ))}
                        </>
                      )}
                    </select>

                    {availableCsvs.length === 0 ? (
                      <div className="mt-2 text-xs text-neutral-500">
                        No CSVs found. Upload a CSV in the Data Sources tab, then return here to attach it.
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-3 flex items-center gap-3">
                    <button
                      className={cn(
                        "btn-primary",
                        (attachLoading || !selectedSavedPathForJob) && "opacity-50 pointer-events-none"
                      )}
                      disabled={attachLoading || !selectedSavedPathForJob}
                      onClick={attachSelectedCsvToJob}
                    >
                      {attachLoading ? "Attaching..." : "Attach to job"}
                    </button>

                    {attachError ? <div className="text-sm text-red-600">{attachError}</div> : null}
                  </div>
                </div>
              </div>
            ) : null}

            {/* ------------------ WAITING_FOR_ADMIN_APPROVAL: show + edit 3 fields ------------------ */}
            {job?.status === "waiting_for_admin_approval" ? (
              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-ink">Admin Review</div>
                      <div className="mt-1 text-xs text-neutral-500">
                        Review and (optionally) edit the three admin-facing fields below, then approve or reject.
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {!adminEditing ? (
                        <button
                          className={cn("btn-outline text-xs", adminActionLoading && "opacity-50 pointer-events-none")}
                          disabled={adminActionLoading}
                          onClick={() => {
                            // Enter edit mode without changing server state.
                            setAdminEditing(true);
                            setAdminActionError(null);
                          }}
                        >
                          Edit fields
                        </button>
                      ) : (
                        <>
                          <button
                            className={cn("btn-outline text-xs", adminActionLoading && "opacity-50 pointer-events-none")}
                            disabled={adminActionLoading}
                            onClick={() => {
                              // Cancel restores the last server values (without needing a refresh).
                              setAdminEditing(false);
                              setAdminActionError(null);
                              setAdminDraft((d) => ({
                                ...d,
                                plain_language_definition: (job.plain_language_definition ?? "").toString(),
                                operational_definition: (job.intent_spec?.operational_definition ?? "").toString(),
                                data_disclaimer: (job.data_disclaimer ?? "").toString(),
                              }));
                            }}
                          >
                            Cancel
                          </button>

                          <button
                            className={cn(
                              "btn-primary text-xs",
                              (!canSubmitEdits || adminActionLoading) && "opacity-50 pointer-events-none"
                            )}
                            disabled={!canSubmitEdits || adminActionLoading}
                            onClick={() =>
                              submitAdminDecision({
                                decision: "edit",
                                edits: {
                                  plain_language_definition: adminDraft.plain_language_definition.trim(),
                                  operational_definition: adminDraft.operational_definition.trim(),
                                  data_disclaimer: adminDraft.data_disclaimer.trim(),
                                },
                                comment: adminDraft.comment.trim() ? adminDraft.comment.trim() : null,
                              })
                            }
                          >
                            {adminActionLoading ? "Saving..." : "Submit edits"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Field 1: plain_language_definition */}
                  <div className="mt-4">
                    <label className="block text-sm text-neutral-700">Plain-language definition</label>
                    {!adminEditing ? (
                      <div className="mt-1 rounded-2xl border bg-white p-3 text-sm text-neutral-700 whitespace-pre-wrap">
                        {(job.plain_language_definition ?? "").toString() || (
                          <span className="text-neutral-500">Not available yet.</span>
                        )}
                      </div>
                    ) : (
                      <textarea
                        className={cn(textAreaCls, "min-h-[90px]")}
                        value={adminDraft.plain_language_definition}
                        onChange={(e) =>
                          setAdminDraft((d) => ({ ...d, plain_language_definition: e.target.value }))
                        }
                        placeholder="Explain what will be computed in plain English (high-school level)."
                      />
                    )}
                  </div>

                  {/* Field 2: intent_spec.operational_definition */}
                  <div className="mt-4">
                    <label className="block text-sm text-neutral-700">Operational definition</label>
                    {!adminEditing ? (
                      <div className="mt-1 rounded-2xl border bg-white p-3 text-sm text-neutral-700 whitespace-pre-wrap">
                        {(job.intent_spec?.operational_definition ?? "").toString() || (
                          <span className="text-neutral-500">Not available yet.</span>
                        )}
                      </div>
                    ) : (
                      <textarea
                        className={cn(textAreaCls, "min-h-[90px]")}
                        value={adminDraft.operational_definition}
                        onChange={(e) =>
                          setAdminDraft((d) => ({ ...d, operational_definition: e.target.value }))
                        }
                        placeholder="Define the metric precisely in plain terms."
                      />
                    )}
                  </div>

                  {/* Field 3: data_disclaimer */}
                  <div className="mt-4">
                    <label className="block text-sm text-neutral-700">Data disclaimer</label>
                    {!adminEditing ? (
                      <div className="mt-1 rounded-2xl border bg-white p-3 text-sm text-neutral-700 whitespace-pre-wrap">
                        {(job.data_disclaimer ?? "").toString() || (
                          <span className="text-neutral-500">Not available yet.</span>
                        )}
                      </div>
                    ) : (
                      <textarea
                        className={cn(textAreaCls, "min-h-[90px]")}
                        value={adminDraft.data_disclaimer}
                        onChange={(e) => setAdminDraft((d) => ({ ...d, data_disclaimer: e.target.value }))}
                        placeholder="Explain any limitations due to the available data."
                      />
                    )}
                  </div>

                  {/* Optional comment (sent with approve/edit/reject). */}
                  <div className="mt-4">
                    <label className="block text-sm text-neutral-700">Comment (Optional)</label>
                    <textarea
                      className={cn(textAreaCls, "min-h-[70px]")}
                      value={adminDraft.comment}
                      onChange={(e) => setAdminDraft((d) => ({ ...d, comment: e.target.value }))}
                      placeholder="Optional note for audit trail (shown in job record)."
                      disabled={adminActionLoading}
                    />
                  </div>

                  {/* Approve / Reject actions */}
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <button
                      className={cn("btn-primary", adminActionLoading && "opacity-50 pointer-events-none")}
                      disabled={adminActionLoading}
                      onClick={() =>
                        submitAdminDecision({
                          decision: "approve",
                          comment: adminDraft.comment.trim() ? adminDraft.comment.trim() : null,
                        })
                      }
                      title="Approve and proceed to python generation + execution"
                    >
                      {adminActionLoading ? "Submitting..." : "Approve"}
                    </button>

                    <button
                      className={cn("btn-outline", adminActionLoading && "opacity-50 pointer-events-none")}
                      disabled={adminActionLoading}
                      onClick={() => {
                        if (!confirm("Reject this metric definition? This will fail the job.")) return;
                        submitAdminDecision({
                          decision: "reject",
                          comment: adminDraft.comment.trim() ? adminDraft.comment.trim() : null,
                        });
                      }}
                      title="Reject and fail the job"
                    >
                      Reject
                    </button>

                    {adminActionError ? <div className="text-sm text-red-600">{adminActionError}</div> : null}

                    {adminEditing && !canSubmitEdits ? (
                      <div className="text-xs text-neutral-500">
                        To submit edits, all three fields must be non-empty.
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            {/* ------------------ Terminal output: show execution capture (minimal) ------------------ */}
            {job?.status === "completed" && job?.python_execution ? (
              <div className="mt-4 rounded-2xl border p-3">
                <div className="text-sm font-medium text-ink">Execution output</div>
                <div className="mt-2 text-xs text-neutral-500">
                  Status: {job.python_execution.status}
                  {job.python_execution.exit_code !== undefined ? ` • exit_code=${job.python_execution.exit_code}` : ""}
                </div>
                {job.python_execution.stdout ? (
                  <div className="mt-3">
                    <div className="text-xs font-medium text-neutral-700">stdout</div>
                    <pre className="mt-1 max-h-[240px] overflow-auto rounded-2xl border bg-white p-3 text-xs text-neutral-700">
                      {job.python_execution.stdout}
                    </pre>
                  </div>
                ) : null}
                {job.python_execution.stderr ? (
                  <div className="mt-3">
                    <div className="text-xs font-medium text-neutral-700">stderr</div>
                    <pre className="mt-1 max-h-[240px] overflow-auto rounded-2xl border bg-white p-3 text-xs text-neutral-700">
                      {job.python_execution.stderr}
                    </pre>
                  </div>
                ) : null}
              </div>
            ) : null}

            {job?.status === "failed" && job?.error ? (
              <div className="mt-4 rounded-2xl border p-3">
                <div className="text-sm font-medium text-ink">Failure</div>
                <div className="mt-2 text-sm text-red-600">{job.error.error_message}</div>
              </div>
            ) : null}
          </div>

          {/* Manual refresh is useful if polling is disabled by browser policies */}
          <div>
            <button
              className={cn("btn-outline text-xs", !job?.job_id && "opacity-50 pointer-events-none")}
              onClick={() => job?.job_id && refreshJob(job.job_id)}
              disabled={!job?.job_id}
              title="Fetch latest job state from the AI server"
            >
              Refresh
            </button>
          </div>
        </div>
      </Card>

      {/* ---------- Existing Metric Definitions ---------- */}
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="mb-1 text-xl font-bold">Existing Metric Definitions</h2>
            <div className="text-xs text-neutral-500">
              Source of truth: AI server definitions list endpoint
            </div>
          </div>

          {/* NEW: Keep styling consistent; provide a refresh affordance for the list. */}
          <div className="flex items-center gap-2">
            <button
              className={cn("btn-outline text-xs", definitionsLoading && "opacity-50 pointer-events-none")}
              disabled={definitionsLoading}
              onClick={() => refreshDefinitions()}
              title="Refresh metrics definitions from the AI server"
            >
              {definitionsLoading ? "Refreshing..." : "Refresh list"}
            </button>
          </div>
        </div>

        {/* NEW: show list errors (does not interfere with other working UI). */}
        {definitionsError ? <div className="mt-3 text-sm text-red-600">{definitionsError}</div> : null}

        <div className="mt-3 divide-y rounded-2xl border">
          {definitions.length === 0 ? (
            <div className="p-3 text-sm text-neutral-500">
              {definitionsLoading ? "Loading metrics..." : "No metrics created yet."}
            </div>
          ) : (
            definitions.map((d) => (
              <div
                key={d.job_id}
                className="flex flex-col gap-1 p-3 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="flex-1">
                  {/* Required fields */}
                  <div className="font-medium text-ink">{d.metric_name}</div>
                  <div className="mt-1 text-xs text-neutral-500">{d.description}</div>

                  {/* Optional fields */}
                  <div className="mt-2 text-xs text-neutral-500">
                    <span className="font-medium text-ink">Sport:</span> {d.sport ? d.sport : "None"}
                    {" • "}
                    <span className="font-medium text-ink">Constraints:</span>{" "}
                    {summarizeConstraints(d.constraints ?? undefined)}
                    {" • "}
                    <span className="font-medium text-ink">Status:</span> {d.status}
                  </div>

                  {d.org_context ? (
                    <div className="mt-1 text-xs text-neutral-500">
                      <span className="font-medium text-ink">Org context:</span>{" "}
                      {d.org_context.length > 140 ? `${d.org_context.slice(0, 140)}…` : d.org_context}
                    </div>
                  ) : null}
                </div>

                {/* Minimal, discrete "reference" info aligned with current aesthetic */}
                <div className="text-xs text-neutral-500 sm:ml-3">
                  <div>
                    <span className="font-medium text-ink">Job:</span> {d.job_id}
                  </div>
                  {d.created_at ? (
                    <div>
                      <span className="font-medium text-ink">Created:</span> {d.created_at}
                    </div>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}


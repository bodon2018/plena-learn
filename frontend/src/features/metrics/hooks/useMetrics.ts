import { useCallback, useEffect, useRef, useState } from "react";
import { useDataSourcesStore, type UploadedCsv } from "@/hooks/useDataSourcesStore";
import { useMetricsDefinitionsStore, type MetricDefinitionSummary } from "@/hooks/useMetricsDefinitionsStore";

/**
 * AI server base URL.
 */
const AI_BASE_URL =
  process.env.NEXT_PUBLIC_AI_BASE_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8001";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

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
  org_context?: string;
  data_sources?: unknown[];
  intent_spec?: { operational_definition?: string } | unknown;
  plain_language_definition?: string | null;
  data_disclaimer?: string | null;
  critique_report?: unknown;
  python_execution?: unknown;
  metadata?: { runs?: unknown[] } | unknown;
  error?: { error_code: string; error_message: string } | null;
};

export type MetricDefinition = MetricDefinitionSummary;

export type CsvFile = UploadedCsv;

type CreateMetricForm = {
  metricName: string;
  description: string;
  sport: string;
  orgContext: string;
};

type AdminDraft = {
  plain_language_definition: string;
  operational_definition: string;
  data_disclaimer: string;
  comment: string;
};

// -----------------------------------------------------------------------------
// Hook
// -----------------------------------------------------------------------------

type UseMetricsReturn = {
  // Current job
  job: MetricJobRecord | null;
  isJobLoading: boolean;

  // Create form
  form: CreateMetricForm;
  setFormField: <K extends keyof CreateMetricForm>(key: K, value: CreateMetricForm[K]) => void;
  canCreate: boolean;
  isCreating: boolean;
  createError: string | null;
  createMetric: () => Promise<void>;

  // Data source attachment
  availableCsvs: CsvFile[];
  csvLoading: boolean;
  csvError: string | null;
  selectedCsvPath: string;
  setSelectedCsvPath: (path: string) => void;
  isAttaching: boolean;
  attachError: string | null;
  attachCsv: () => Promise<void>;
  refreshCsvs: () => Promise<void>;

  // Admin approval
  adminDraft: AdminDraft;
  setAdminDraftField: <K extends keyof AdminDraft>(key: K, value: AdminDraft[K]) => void;
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
  canSubmitEdits: boolean;
  isSubmittingDecision: boolean;
  decisionError: string | null;
  submitApproval: (comment?: string) => Promise<void>;
  submitEdits: () => Promise<void>;
  submitRejection: (comment?: string) => Promise<void>;
  cancelEditing: () => void;

  // Definitions list
  definitions: MetricDefinition[];
  definitionsLoading: boolean;
  definitionsError: string | null;
  refreshDefinitions: () => Promise<void>;

  // Delete
  deletingIds: Record<string, boolean>;
  deleteError: string | null;
  deleteMetric: (jobId: string, metricName?: string) => Promise<void>;

  // Refresh job
  refreshJob: () => Promise<void>;
};

export function useMetrics(): UseMetricsReturn {
  // ---------------------------------------------------------------------------
  // Current job state
  // ---------------------------------------------------------------------------
  const [job, setJob] = useState<MetricJobRecord | null>(null);
  const [isJobLoading, setIsJobLoading] = useState(false);

  // ---------------------------------------------------------------------------
  // Create form state
  // ---------------------------------------------------------------------------
  const [form, setForm] = useState<CreateMetricForm>({
    metricName: "",
    description: "",
    sport: "",
    orgContext: "",
  });
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Data source state - using shared store
  // ---------------------------------------------------------------------------
  const {
    files: availableCsvs,
    filesLoading: csvLoading,
    filesError: csvError,
    refreshFiles: refreshCsvs,
  } = useDataSourcesStore();
  
  const [selectedCsvPath, setSelectedCsvPath] = useState("");
  const [isAttaching, setIsAttaching] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Admin approval state
  // ---------------------------------------------------------------------------
  const [adminDraft, setAdminDraft] = useState<AdminDraft>({
    plain_language_definition: "",
    operational_definition: "",
    data_disclaimer: "",
    comment: "",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Definitions list state - using shared store
  // ---------------------------------------------------------------------------
  const {
    definitions,
    definitionsLoading,
    definitionsError,
    refreshDefinitions,
    removeDefinition,
  } = useMetricsDefinitionsStore();

  // ---------------------------------------------------------------------------
  // Delete state
  // ---------------------------------------------------------------------------
  const [deletingIds, setDeletingIds] = useState<Record<string, boolean>>({});
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Refs for polling
  // ---------------------------------------------------------------------------
  const pollingRef = useRef<number | null>(null);

  // ---------------------------------------------------------------------------
  // Computed values
  // ---------------------------------------------------------------------------
  const canCreate = form.metricName.trim().length > 0 && form.description.trim().length > 0;

  const canSubmitEdits =
    adminDraft.plain_language_definition.trim().length > 0 &&
    adminDraft.operational_definition.trim().length > 0 &&
    adminDraft.data_disclaimer.trim().length > 0;

  // ---------------------------------------------------------------------------
  // Form helpers
  // ---------------------------------------------------------------------------
  const setFormField = useCallback(
    <K extends keyof CreateMetricForm>(key: K, value: CreateMetricForm[K]) => {
      setForm((f) => ({ ...f, [key]: value }));
    },
    []
  );

  const setAdminDraftField = useCallback(
    <K extends keyof AdminDraft>(key: K, value: AdminDraft[K]) => {
      setAdminDraft((d) => ({ ...d, [key]: value }));
    },
    []
  );

  // ---------------------------------------------------------------------------
  // API calls
  // ---------------------------------------------------------------------------

  const refreshJob = useCallback(async () => {
    if (!job?.job_id) return;
    setIsJobLoading(true);
    try {
      const resp = await fetch(`${AI_BASE_URL}/admin/metrics/jobs/${job.job_id}`, {
        credentials: "include",
      });
      if (!resp.ok) return;
      const updated = await resp.json();
      setJob(updated);
      refreshDefinitions();
    } catch {
      // Silent fail on refresh
    } finally {
      setIsJobLoading(false);
    }
  }, [job?.job_id, refreshDefinitions]);

  const createMetric = useCallback(async () => {
    if (!canCreate) return;
    setCreateError(null);

    const payload = {
      request: {
        metric_name: form.metricName.trim(),
        description: form.description.trim(),
        sport: form.sport.trim() || null,
      },
      org_context: form.orgContext.trim() || "",
    };

    setIsCreating(true);
    try {
      const resp = await fetch(`${AI_BASE_URL}/admin/metrics/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const body = await resp.text();
        throw new Error(`Create failed (${resp.status}): ${body}`);
      }

      const createdJob = await resp.json();
      setJob(createdJob);
      refreshDefinitions();
      setForm({
        metricName: "",
        description: "",
        sport: "",
        orgContext: "",
      });
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to create metric");
    } finally {
      setIsCreating(false);
    }
  }, [canCreate, form, refreshDefinitions]);

  const attachCsv = useCallback(async () => {
    if (!job?.job_id || !selectedCsvPath) return;
    setAttachError(null);

    const selected = availableCsvs.find((f) => f.saved_path === selectedCsvPath);
    if (!selected) {
      setAttachError("Selected CSV not found");
      return;
    }

    const payload = {
      data_sources: [
        {
          type: "upload_csv",
          saved_path: selected.saved_path,
          display_name: selected.original_filename,
          mime_type: "text/csv",
        },
      ],
    };

    setIsAttaching(true);
    try {
      const resp = await fetch(
        `${AI_BASE_URL}/admin/metrics/jobs/${job.job_id}/data-sources`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        }
      );

      if (!resp.ok) {
        const body = await resp.text();
        throw new Error(`Attach failed (${resp.status}): ${body}`);
      }

      const updatedJob = await resp.json();
      setJob(updatedJob);
      refreshDefinitions();
    } catch (err: unknown) {
      setAttachError(err instanceof Error ? err.message : "Failed to attach CSV");
    } finally {
      setIsAttaching(false);
    }
  }, [job?.job_id, selectedCsvPath, availableCsvs, refreshDefinitions]);

  const submitDecision = useCallback(
    async (decision: "approve" | "edit" | "reject", edits?: Record<string, string>) => {
      if (!job?.job_id) return;
      setDecisionError(null);

      const payload = {
        decision,
        ...(edits ? { edits } : {}),
        comment: adminDraft.comment.trim() || null,
      };

      setIsSubmittingDecision(true);
      try {
      const resp = await fetch(
          `${AI_BASE_URL}/admin/metrics/jobs/${job.job_id}/admin-decision`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(payload),
          }
        );

        if (!resp.ok) {
          const body = await resp.text();
          throw new Error(`Decision failed (${resp.status}): ${body}`);
        }

        const updatedJob = await resp.json();
        setJob(updatedJob);
        refreshDefinitions();

        if (decision === "edit") {
          setIsEditing(false);
        }
      } catch (err: unknown) {
        setDecisionError(err instanceof Error ? err.message : "Failed to submit decision");
      } finally {
        setIsSubmittingDecision(false);
      }
    },
    [job?.job_id, adminDraft.comment, refreshDefinitions]
  );

  const submitApproval = useCallback(
    async () => submitDecision("approve"),
    [submitDecision]
  );

  const submitEdits = useCallback(async () => {
    await submitDecision("edit", {
      plain_language_definition: adminDraft.plain_language_definition.trim(),
      operational_definition: adminDraft.operational_definition.trim(),
      data_disclaimer: adminDraft.data_disclaimer.trim(),
    });
  }, [submitDecision, adminDraft]);

  const submitRejection = useCallback(
    async () => submitDecision("reject"),
    [submitDecision]
  );

  const cancelEditing = useCallback(() => {
    setIsEditing(false);
    setDecisionError(null);
    if (job) {
      setAdminDraft({
        plain_language_definition: (job.plain_language_definition ?? "").toString(),
        operational_definition: (job.intent_spec as { operational_definition?: string })?.operational_definition ?? "",
        data_disclaimer: (job.data_disclaimer ?? "").toString(),
        comment: "",
      });
    }
  }, [job]);

  const deleteMetric = useCallback(
    async (jobId: string, metricName?: string) => {
      setDeleteError(null);

      const label = metricName?.trim() ? `"${metricName.trim()}"` : `job ${jobId}`;
      if (!confirm(`Delete metric ${label}? This cannot be undone.`)) return;

      setDeletingIds((m) => ({ ...m, [jobId]: true }));

      try {
        let resp = await fetch(`${AI_BASE_URL}/admin/metrics/definitions/${jobId}`, {
          method: "DELETE",
          credentials: "include",
        });

        if (!resp.ok) {
          resp = await fetch(`${AI_BASE_URL}/admin/metrics/jobs/${jobId}`, {
            method: "DELETE",
            credentials: "include",
          });
        }

        if (!resp.ok) {
          const body = await resp.text();
          throw new Error(`Delete failed (${resp.status}): ${body}`);
        }

        if (job?.job_id === jobId) {
          setJob(null);
          setIsEditing(false);
          setDecisionError(null);
          setAttachError(null);
        }

        // Optimistic removal from store
        removeDefinition(jobId);
        
        // Also refresh from server to ensure consistency
        refreshDefinitions();
      } catch (err: unknown) {
        setDeleteError(err instanceof Error ? err.message : "Failed to delete metric");
      } finally {
        setDeletingIds((m) => {
          const next = { ...m };
          delete next[jobId];
          return next;
        });
      }
    },
    [job?.job_id, refreshDefinitions, removeDefinition]
  );

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  // Load definitions on mount
  useEffect(() => {
    refreshDefinitions();
  }, [refreshDefinitions]);

  // Poll while job is in-flight
  useEffect(() => {
    if (!job?.job_id) return;

    const stableStatuses = [
      "waiting_for_data_source",
      "waiting_for_admin_approval",
      "ready_to_run",
      "failed",
    ];

    if (stableStatuses.includes(job.status)) {
      if (pollingRef.current) {
        window.clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    pollingRef.current = window.setInterval(() => {
      refreshJob();
    }, 2000);

    return () => {
      if (pollingRef.current) {
        window.clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [job?.job_id, job?.status, refreshJob]);

  // Load CSVs when waiting for data source
  useEffect(() => {
    if (job?.status === "waiting_for_data_source") {
      refreshCsvs();
      setAttachError(null);
    }
  }, [job?.status, refreshCsvs]);

  // Set default CSV selection
  useEffect(() => {
    if (job?.status !== "waiting_for_data_source") return;
    if (selectedCsvPath) return;
    if (availableCsvs.length === 0) return;
    setSelectedCsvPath(availableCsvs[0].saved_path);
  }, [job?.status, availableCsvs, selectedCsvPath]);

  // Initialize admin draft when entering approval state
  useEffect(() => {
    if (!job?.job_id) return;
    setDecisionError(null);

    if (job.status === "waiting_for_admin_approval" && !isEditing) {
      setAdminDraft({
        plain_language_definition: (job.plain_language_definition ?? "").toString(),
        operational_definition: (job.intent_spec as { operational_definition?: string })?.operational_definition ?? "",
        data_disclaimer: (job.data_disclaimer ?? "").toString(),
        comment: "",
      });
    }
  }, [job?.job_id, job?.status, job?.plain_language_definition, job?.data_disclaimer, job?.intent_spec, isEditing]);

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------
  return {
    job,
    isJobLoading,
    form,
    setFormField,
    canCreate,
    isCreating,
    createError,
    createMetric,
    availableCsvs,
    csvLoading,
    csvError,
    selectedCsvPath,
    setSelectedCsvPath,
    isAttaching,
    attachError,
    attachCsv,
    refreshCsvs,
    adminDraft,
    setAdminDraftField,
    isEditing,
    setIsEditing,
    canSubmitEdits,
    isSubmittingDecision,
    decisionError,
    submitApproval,
    submitEdits,
    submitRejection,
    cancelEditing,
    definitions,
    definitionsLoading,
    definitionsError,
    refreshDefinitions,
    deletingIds,
    deleteError,
    deleteMetric,
    refreshJob,
  };
}

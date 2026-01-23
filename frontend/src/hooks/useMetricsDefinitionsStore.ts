"use client";

import { create } from "zustand";

const AI_BASE_URL =
  process.env.NEXT_PUBLIC_AI_BASE_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8001";

/**
 * What the server returns from GET /admin/metrics/definitions
 */
export type MetricDefinitionSummary = {
  job_id: string;
  status: string;
  created_at?: string | null;
  updated_at?: string | null;

  metric_name: string;
  description: string;
  sport?: string | null;
  constraints?: Record<string, any> | null;
  org_context?: string | null;

  plain_language_definition?: string | null;
  operational_definition?: string | null;
  data_disclaimer?: string | null;
};

type MetricsDefinitionsState = {
  // Source of truth for “available metrics”
  definitions: MetricDefinitionSummary[];

  // UX state
  definitionsLoading: boolean;
  definitionsError: string | null;

  // Actions
  refreshDefinitions: () => Promise<void>;

  // Optional helpers so pages can update locally without waiting for a refetch.
  upsertDefinition: (d: MetricDefinitionSummary) => void;
  removeDefinition: (job_id: string) => void;

  // Convenience getter
  getByJobId: (job_id: string) => MetricDefinitionSummary | undefined;
};

export const useMetricsDefinitionsStore = create<MetricsDefinitionsState>((set, get) => ({
  definitions: [],
  definitionsLoading: false,
  definitionsError: null,

  refreshDefinitions: async () => {
    set({ definitionsLoading: true, definitionsError: null });
    try {
      const resp = await fetch(`${AI_BASE_URL}/admin/metrics/definitions`, {
        method: "GET",
        credentials: "include",
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Failed to load metrics (${resp.status}): ${text}`);
      }

      const data = (await resp.json()) as { definitions: MetricDefinitionSummary[] };

      set({
        definitions: Array.isArray(data.definitions) ? data.definitions : [],
        definitionsLoading: false,
        definitionsError: null,
      });
    } catch (e: any) {
      set({
        definitionsLoading: false,
        definitionsError: e?.message ?? "Failed to load metrics definitions.",
      });
    }
  },

  upsertDefinition: (d: MetricDefinitionSummary) => {
    const prev = get().definitions;
    const idx = prev.findIndex((x) => x.job_id === d.job_id);

    const next =
      idx >= 0 ? [...prev.slice(0, idx), d, ...prev.slice(idx + 1)] : [d, ...prev];

    // Keep newest-first by created_at when possible.
    next.sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")));

    set({ definitions: next });
  },

  removeDefinition: (job_id: string) => {
    set({ definitions: get().definitions.filter((d) => d.job_id !== job_id) });
  },

  getByJobId: (job_id: string) => get().definitions.find((d) => d.job_id === job_id),
}));

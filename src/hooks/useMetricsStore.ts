"use client";

/**
 * NEW: src/hooks/useMetricsStore.ts
 *
 * Lightweight client store (no extra deps) that persists to localStorage.
 * This becomes the single source of truth for metric definitions across
 * Admin and (later) User pages.
 *
 * Why localStorage?
 * - Keeps the demo stable across routes in your App Router.
 * - Easy to swap with a server action / DB later without touching UIs.
 *
 * API:
 * - metrics                        : MetricDefinition[]
 * - setMetrics(fn|array)           : update whole list
 * - createMetric(def)              : append a new metric
 * - toggleActive(id)               : on/off switch
 * - updateMetric(id, patch)        : inline edits
 * - deleteMetric(id)               : remove a metric globally  // CHANGE: added delete API
 */

import { useEffect, useState, useCallback } from "react";
import type { MetricDefinition } from "@/lib/types/metrics";

const LS_KEY = "app.metrics.definitions";

const seed: MetricDefinition[] = [
  // Seeded to preserve your current Admin visuals. Safe to delete later.
  {
    id: "m1",
    name: "Metric 1",
    scope: "Coach",
    description: "Placeholder description",
    target: "≥ 80%",
    visibility: "Aggregate only (no raw clips)",
    active: true,
    progress: 0.45,
  },
  {
    id: "m2",
    name: "Metric 2",
    scope: "Player",
    description: "Placeholder description",
    target: "≥ 2.0",
    visibility: "Allow clip link if coach shares",
    active: false,
    progress: 0.25,
  },
  {
    id: "m3",
    name: "Metric 3",
    scope: "Coach",
    description: "Placeholder description",
    target: "≥ 2.0",
    visibility: "Aggregate only (no raw clips)",
    active: true,
    progress: 0.5,
  },
];

export function useMetricsStore() {
  const [metrics, setMetrics] = useState<MetricDefinition[]>([]);

  // Load once
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null;
      if (raw) {
        const parsed = JSON.parse(raw) as MetricDefinition[];
        setMetrics(parsed);
      } else {
        setMetrics(seed);
        localStorage.setItem(LS_KEY, JSON.stringify(seed));
      }
    } catch {
      setMetrics(seed);
    }
  }, []);

  // Save on change
  useEffect(() => {
    try {
      if (metrics.length) {
        localStorage.setItem(LS_KEY, JSON.stringify(metrics));
      }
    } catch {
      /* ignore */
    }
  }, [metrics]);

  // Append
  const createMetric = useCallback((def: Omit<MetricDefinition, "id">) => {
    const newMetric: MetricDefinition = { id: String(Date.now()), ...def };
    setMetrics((prev) => [...prev, newMetric]);
  }, []);

  // Toggle
  const toggleActive = useCallback((id: string) => {
    setMetrics((prev) => prev.map((m) => (m.id === id ? { ...m, active: !m.active } : m)));
  }, []);

  // Patch
  const updateMetric = useCallback((id: string, patch: Partial<MetricDefinition>) => {
    setMetrics((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }, []);

  // CHANGE: delete — remove a metric everywhere that consumes this store
  const deleteMetric = useCallback((id: string) => {
    setMetrics((prev) => prev.filter((m) => m.id !== id));
  }, []);

  // CHANGE: export deleteMetric so UI can call it (deletes app-wide)
  return { metrics, setMetrics, createMetric, toggleActive, updateMetric, deleteMetric };
}

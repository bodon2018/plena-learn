// CHANGE: Store now also holds simple mock progress & unlock state for each metric.
// This keeps pages consistent and lets Progress/Session/Learn read the same source.

import { create } from "zustand";
import { CATEGORIES, METRICS_BY_CATEGORY } from "@/lib/constants";
import type { MetricProgress } from "@/lib/progress";

type SessionState = {
  category: string;
  setCategory: (c: string) => void;

  // mock user progress by metric (normalized 0..1) and unlocks
  progressByMetric: Record<string, MetricProgress>;
  setMetricProgress: (metric: string, value: number) => void;
  unlockMetric: (metric: string) => void;

  getMetrics: () => string[];
  getMetricProgressList: () => MetricProgress[];
};

// seed: first metric unlocked with some progress; others locked
function seedProgress(category: string): Record<string, MetricProgress> {
  const metrics = METRICS_BY_CATEGORY[category] ?? [];
  const data: Record<string, MetricProgress> = {};
  metrics.forEach((m, i) => {
    data[m] = {
      metric: m,
      value: i === 0 ? 0.45 : 0.0, // CHANGE: start with partial progress on first metric
      target: 1,
      unlocked: i === 0 // CHANGE: only first metric unlocked initially
    };
  });
  return data;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  category: CATEGORIES[0],
  setCategory: (category) => set({
    category,
    progressByMetric: seedProgress(category), // CHANGE: reset progress when category changes
  }),

  progressByMetric: seedProgress(CATEGORIES[0]),
  setMetricProgress: (metric, value) => set((s) => ({
    progressByMetric: { ...s.progressByMetric, [metric]: { ...s.progressByMetric[metric], value } }
  })),
  unlockMetric: (metric) => set((s) => ({
    progressByMetric: { ...s.progressByMetric, [metric]: { ...s.progressByMetric[metric], unlocked: true } }
  })),

  getMetrics: () => METRICS_BY_CATEGORY[get().category] ?? [],
  getMetricProgressList: () => {
    const metrics = METRICS_BY_CATEGORY[get().category] ?? [];
    const map = get().progressByMetric;
    return metrics.map((m) => map[m] ?? { metric: m, value: 0, target: 1, unlocked: false });
  },
}));

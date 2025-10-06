/**
 * NEW: src/lib/types/metrics.ts
 * Shared metric types used across Admin and User UIs.
 * - Source of truth for the MetricDefinition shape.
 * - "progress" is optional and represents an aggregate 0..1 for dashboards.
 */

export type MetricScope = "Coach" | "Player" | "Facilitator" | "Teacher";
export type MetricVisibility =
  | "Aggregate only (no raw clips)"
  | "Allow clip link if coach shares";

export type MetricDefinition = {
  id: string;
  name: string;
  scope: MetricScope;
  description: string;
  target: string; // free-form, e.g., "≥ 3.0", "≥ 80%"
  visibility: MetricVisibility;
  active: boolean;
  /**
   * Optional aggregate for dashboards (0..1). Not required by the admin form,
   * but useful for placeholder cards and for future wiring to real aggregates.
   */
  progress?: number;
};

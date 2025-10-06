"use client";

/**
 * CHANGE: Stop injecting legacy metrics from sessionStore (getMetrics/METRICS_BY_CATEGORY).
 * SessionScreen now resolves metrics from the admin-defined source (useMetricsStore),
 * with graceful placeholders when none exist.
 */

import SessionScreen from "@/features/session/SessionScreen";
// import { useSessionStore } from "@/store/sessionStore"; // NOT NEEDED

export default function SessionPage() {
  // OLD:
  // const category = useSessionStore((s) => s.category);
  // const metrics  = useSessionStore((s) => s.getMetrics()) ?? [];
  // return <SessionScreen category={category} metrics={metrics} onFinish={() => {}} />;

  // NEW: Render without legacy props so SessionScreen binds to admin metrics.
  return <SessionScreen onFinish={() => {}} />;
}

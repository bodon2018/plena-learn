"use client";

/**
 * CHANGE: Remove legacy metrics injection from session store.
 * SummaryScreen now resolves metrics from the admin-defined source (useMetricsStore),
 * with graceful placeholders when none exist.
 */

import SummaryScreen from "@/features/summary/SummaryScreen";
// NOTE: session store is no longer needed here for metrics/category.
// import { useSessionStore } from "@/store/sessionStore";

export default function SummaryPage() {
  // OLD (removed):
  // const category = useSessionStore((s) => s.category);
  // const metrics  = useSessionStore((s) => s.getMetrics()) ?? [];

  // NEW: render SummaryScreen with no legacy props so it binds to admin metrics.
  return <SummaryScreen />;
}

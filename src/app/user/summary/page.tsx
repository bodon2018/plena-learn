// CHANGE: Summary page now pulls the current category and metrics from the store
// and renders the new SummaryScreen that (a) shows only 2 moments (Win + Urgent),
// and (b) mirrors Progress unlock state, focusing on the active metric.

"use client";

import SummaryScreen from "@/features/summary/SummaryScreen";
import { useSessionStore } from "@/store/sessionStore";

export default function SummaryPage() {
  // read the current category and metrics from the global store
  const category = useSessionStore((s) => s.category);
  const metrics  = useSessionStore((s) => s.getMetrics()) ?? [];

  return <SummaryScreen category={category} metrics={metrics} />;
}

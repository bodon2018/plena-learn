// CHANGE: Session page now uses the selected category from the store
// and derives the correct metrics. Added a defensive fallback ([]) so
// `metrics.map(...)` in the Session screen never throws on first render.

"use client";

import SessionScreen from "@/features/session/SessionScreen";
import { useSessionStore } from "@/store/sessionStore";

export default function SessionPage() {
  // CHANGE: read category from global store
  const category = useSessionStore((s) => s.category);

  // CHANGE: derive metrics for the current category; ensure it's always an array
  const metrics = useSessionStore((s) => s.getMetrics()) ?? [];

  // CHANGE: render the session screen with safe props
  return <SessionScreen category={category} metrics={metrics} onFinish={() => {}} />;
}

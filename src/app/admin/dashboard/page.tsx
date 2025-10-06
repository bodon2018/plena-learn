"use client";

/**
 * CHANGE: Admin Dashboard
 * - Metrics read from the shared store (useMetricsStore) instead of a hard-coded array.
 * - Only active metrics are shown as cards.
 * - Goal label pulled from the metric target (keeps your visual text).
 * - "Add metric" button unchanged visually and still routes to /admin/metrics.
 */

import Card from "@/components/ui/Card";
import ProgressBar from "@/components/ui/ProgressBar";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useMetricsStore } from "@/hooks/useMetricsStore";

export default function AdminDashboardPage() {
  const router = useRouter();
  const { metrics } = useMetricsStore();

  // CHANGE: show only active metrics; stable ordering by name then id
  const activeMetrics = useMemo(
    () =>
      metrics
        .filter((m) => m.active)
        .sort((a, b) => (a.name.localeCompare(b.name) || a.id.localeCompare(b.id))),
    [metrics]
  );

  return (
    <>
      {/* Page Title */}
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">Admin Dashboard</h1>
      </div>

      {/* Metric cards with Add metric button */}
      <div className="grid items-stretch gap-4 sm:grid-cols-4">
        {activeMetrics.map((m) => (
          <Card key={m.id}>
            <div className="flex items-start">
              <div>
                <h3 className="text-sm font-medium text-neutral-700">{m.name}</h3>
                <div className="mt-3">
                  {/* CHANGE: If progress is undefined, show 0 */}
                  <ProgressBar value={m.progress ?? 0} target={1} />
                </div>
                <div className="mt-2 flex justify-between text-xs text-neutral-600">
                  <span>{Math.round((m.progress ?? 0) * 100)}%</span>
                  <span>Admin goal: {m.target || "—"}</span>
                </div>
              </div>
            </div>
          </Card>
        ))}

        {/* Add metric button (standalone, smaller) */}
        <div className="flex items-center justify-center">
          <button onClick={() => router.push("/admin/metrics")} className="btn-primary scale-90">
            + Add metric
          </button>
        </div>
      </div>

      {/* Data card */}
      <Card className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xl font-bold">Data</h2>
        </div>

        {/* NOTE:
            This "Data" section appears to be a placeholder list of users and goals.
            It should eventually be driven by real aggregates keyed by metric IDs.
            For now, we keep the UI/UX intact, since your next step is wiring user pages.
        */}
        <div className="divide-y rounded-xl border">
          {["User A", "User B", "User C", "User D"].map((name, i) => (
            <div key={i} className="flex items-start gap-3 p-3">
              <div className="flex-1">
                <div className="font-medium text-ink">{name}</div>
                <div className="text-xs text-neutral-500">
                  {activeMetrics
                    .slice(0, 3)
                    .map((m) => `${m.name} : ${m.target || "goal"}`)
                    .join(", ")}
                </div>
              </div>

              <button
                type="button"
                className="rounded-full border border-neutral-300 px-3 py-1 text-xs text-ink hover:bg-neutral-50"
                // placeholder action
                onClick={() => router.push("/admin/metrics")}
              >
                Edit
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* Bottom policy card */}
      <Card className="mt-4">
        <p className="text-xs text-neutral-600">
          Users own raw moments by default. Admin sees aggregates unless a user shares a clip.
        </p>
      </Card>
    </>
  );
}

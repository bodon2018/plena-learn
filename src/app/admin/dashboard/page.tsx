"use client";

/**
 * CHANGE: Admin Dashboard
 * - Metrics read from the shared store (useMetricsStore) instead of a hard-coded array.
 * - Only active metrics are shown as cards.
 * - Goal label pulled from the metric target (keeps your visual text).
 * - "Add metric" button unchanged visually and still routes to /admin/metrics.
 * - NEW (prev step): Removed old "Data" card; added "Metrics" table card and "Charts" card.
 * - CHANGE (per request): Removed the small metric cards beneath the title,
 *   and moved the blue “Add metric” button to the bottom-right after Charts.
 */

import Card from "@/components/ui/Card";
// CHANGE: ProgressBar import removed because metric cards were deleted
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useMetricsStore } from "@/hooks/useMetricsStore";

export default function AdminDashboardPage() {
  const router = useRouter();
  const { metrics } = useMetricsStore();

  // CHANGE: activeMetrics computation removed since the little cards are deleted

  // Stable list (all definitions) for table + chart cycling (unchanged)
  const allMetrics = useMemo(
    () => [...metrics].sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id)),
    [metrics]
  );

  // Chart index + current metric (unchanged)
  const [chartIndex, setChartIndex] = useState(0);
  const hasMetrics = allMetrics.length > 0;
  const currentMetric = hasMetrics ? allMetrics[chartIndex % allMetrics.length] : undefined;

  // Placeholder aggregates for the table (unchanged)
  const rows = useMemo(
    () =>
      allMetrics.map((m) => {
        const proportion = Math.max(0, Math.min(1, m.progress ?? 0));
        const count = Math.round(proportion * 100);
        const minutes = 10;
        const rate = minutes > 0 ? count / minutes : 0;
        const ratio = "—";
        return { id: m.id, name: m.name, count, rate, proportion, ratio };
      }),
    [allMetrics]
  );

  return (
    <>
      {/* Page Title */}
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">Admin Dashboard</h1>
      </div>

      {/* CHANGE: removed the grid of small metric cards entirely */}

      {/* --- Metrics table card --- */}
      <Card className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xl font-bold">Metrics</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-neutral-600">
                <th className="px-3 py-2 font-medium">Metric</th>
                <th className="px-3 py-2 font-medium">Count</th>
                <th className="px-3 py-2 font-medium">Rate</th>
                <th className="px-3 py-2 font-medium">Proportion</th>
                <th className="px-3 py-2 font-medium">Ratio</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-2 text-ink">{r.name}</td>
                  <td className="px-3 py-2">{r.count}</td>
                  <td className="px-3 py-2">{r.rate.toFixed(2)}/min</td>
                  <td className="px-3 py-2">{Math.round(r.proportion * 100)}%</td>
                  <td className="px-3 py-2">{r.ratio}</td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td className="px-3 py-3 text-neutral-500" colSpan={5}>
                    No metrics yet. Create one to see it here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* --- Charts card (single metric pie + next) --- */}
      <Card className="mt-4 relative">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xl font-bold">Charts</h2>
          <div className="text-sm text-neutral-600">
            {currentMetric ? currentMetric.name : "No metric"}
          </div>
        </div>

        <div className="flex items-center justify-center py-4">
          {currentMetric ? (
            <Pie
              proportion={Math.max(0, Math.min(1, currentMetric.progress ?? 0))}
              size={160}
              label={`${Math.round((currentMetric.progress ?? 0) * 100)}%`}
            />
          ) : (
            <div className="text-sm text-neutral-500">Nothing to chart.</div>
          )}
        </div>

        {/* NEXT button bottom-right (unchanged) */}
        <div className="absolute bottom-3 right-3">
          <button
            className="btn-outline text-xs"
            onClick={() => hasMetrics && setChartIndex((i) => (i + 1) % allMetrics.length)}
            disabled={!hasMetrics}
          >
            Next
          </button>
        </div>
      </Card>

      {/* CHANGE: move the Add metric button down here, aligned to the right */}
      <div className="mt-4 flex justify-end">
        <button onClick={() => router.push("/admin/metrics")} className="btn-primary scale-90">
          + Add metric
        </button>
      </div>

      {/* Bottom policy card (unchanged) */}
      <Card className="mt-4">
        <p className="text-xs text-neutral-600">
          Users own raw moments by default. Admin sees aggregates unless a user shares a clip.
        </p>
      </Card>
    </>
  );
}

/* Tiny inline pie component (unchanged) */
function Pie({
  proportion,
  size = 160,
  stroke = 18,
  label,
}: {
  proportion: number;
  size?: number;
  stroke?: number;
  label?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const a = Math.max(0, Math.min(1, proportion));
  const filled = a * c;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <g transform={`translate(${size / 2}, ${size / 2})`}>
        <circle r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
        <circle
          r={r}
          fill="none"
          stroke="#2563eb"
          strokeWidth={stroke}
          strokeDasharray={`${filled} ${c - filled}`}
          transform="rotate(-90)"
          strokeLinecap="butt"
        />
        <text
          x="0"
          y="6"
          textAnchor="middle"
          className="fill-current"
          style={{ fontSize: 14, fill: "#111827" }}
        >
          {label}
        </text>
      </g>
    </svg>
  );
}

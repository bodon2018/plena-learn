"use client";

/**
 * CHANGE: Updated Admin Dashboard
 * - Removed Card wrapper around "Add metric"
 * - "Add metric" button is now a standalone dark-blue button
 * - Scaled down the button by ~20% for a balanced look
 */

import { useState } from "react";
import Card from "@/components/ui/Card";
import ProgressBar from "@/components/ui/ProgressBar";
import { cn } from "@/lib/cn";
import { useRouter } from "next/navigation";

type MetricCard = {
  id: string;
  title: string;
  value: number; // 0..1
  goalLabel: string;
};

type DataRow = {
  id: string;
  title: string;
  line: string;
  editing?: boolean;
  draftTitle?: string;
  draftLine?: string;
};

export default function AdminDashboardPage() {
  const router = useRouter();

  // Metrics
  const [metrics] = useState<MetricCard[]>([
    { id: "m1", title: "Metric 1", value: 0.45, goalLabel: "Admin goal: 100%" },
    { id: "m2", title: "Metric 2", value: 0.25, goalLabel: "Admin goal: 2.0" },
    { id: "m3", title: "Metric 3", value: 0.5, goalLabel: "Admin goal: 2.0" },
  ]);

  // Data rows
  const [rows, setRows] = useState<DataRow[]>([
    { id: "r1", title: "User A", line: "metric 1 : goal, metric 2 : goal, metric 3 : goal" },
    { id: "r2", title: "User B", line: "metric 1 : goal, metric 2 : goal, metric 3 : goal" },
    { id: "r3", title: "User C", line: "metric 1 : goal, metric 2 : goal, metric 3 : goal" },
    { id: "r4", title: "User D", line: "metric 1 : goal, metric 2 : goal, metric 3 : goal" },
  ]);

  const startEdit = (id: string) => {
    setRows((r) =>
      r.map((row) =>
        row.id === id ? { ...row, editing: true, draftTitle: row.title, draftLine: row.line } : row
      )
    );
  };

  const saveEdit = (id: string) => {
    setRows((r) =>
      r.map((row) =>
        row.id === id
          ? {
              ...row,
              editing: false,
              title: row.draftTitle?.trim() || row.title,
              line: row.draftLine?.trim() || row.line,
              draftTitle: undefined,
              draftLine: undefined,
            }
          : row
      )
    );
  };

  const onChangeDraft = (id: string, field: "title" | "line", value: string) => {
    setRows((r) =>
      r.map((row) =>
        row.id === id ? { ...row, [field === "title" ? "draftTitle" : "draftLine"]: value } : row
      )
    );
  };

  return (
    <>
      {/* Page Title */}
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">Admin Dashboard</h1>
      </div>

      {/* Metric cards with Add metric button */}
      <div className="grid gap-4 sm:grid-cols-4 items-stretch">
        {metrics.map((m) => (
          <Card key={m.id}>
            <div className="flex items-start">
              <div>
                <h3 className="text-sm font-medium text-neutral-700">{m.title}</h3>
                <div className="mt-3">
                  <ProgressBar value={m.value} target={1} />
                </div>
                <div className="mt-2 flex justify-between text-xs text-neutral-600">
                  <span>{Math.round(m.value * 100)}%</span>
                  <span>{m.goalLabel}</span>
                </div>
              </div>
            </div>
          </Card>
        ))}

        {/* CHANGE: Add metric button (standalone, smaller) */}
        <div className="flex items-center justify-center">
          <button
            onClick={() => router.push("/admin/metrics")}
            className="btn-primary scale-90"
          >
            + Add metric
          </button>
        </div>
      </div>

      {/* Data card */}
      <Card className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xl font-bold">Data</h2>
        </div>

        <div className="divide-y rounded-xl border">
          {rows.map((row) => (
            <div key={row.id} className="flex items-start gap-3 p-3">
              <div className="flex-1">
                {!row.editing ? (
                  <div className="font-medium text-ink">{row.title}</div>
                ) : (
                  <input
                    type="text"
                    value={row.draftTitle ?? ""}
                    onChange={(e) => onChangeDraft(row.id, "title", e.target.value)}
                    className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary"
                  />
                )}

                {!row.editing ? (
                  <div className="text-xs text-neutral-500">{row.line}</div>
                ) : (
                  <input
                    type="text"
                    value={row.draftLine ?? ""}
                    onChange={(e) => onChangeDraft(row.id, "line", e.target.value)}
                    placeholder="metric 1 : goal, metric 2 : goal, metric 3 : goal"
                    className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary"
                  />
                )}
              </div>

              {!row.editing ? (
                <button
                  type="button"
                  className="rounded-full border border-neutral-300 px-3 py-1 text-xs text-ink hover:bg-neutral-50"
                  onClick={() => startEdit(row.id)}
                >
                  Edit
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-primary text-xs"
                  onClick={() => saveEdit(row.id)}
                >
                  Save
                </button>
              )}
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

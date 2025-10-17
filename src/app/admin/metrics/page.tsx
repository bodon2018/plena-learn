"use client";

/**
 * CHANGE: Admin › Metrics
 * - Switched from component-local state to a shared metrics store (useMetricsStore).
 * - Definitions are now the single source of truth app-wide (will also feed user pages).
 * - Kept UI/UX identical: cards, inputs, buttons, rounded-2xl styling.
 * - Inline edit uses draft fields in-page only; saving writes back to the store.
 */

import { useMemo, useState } from "react";
import Card from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { useMetricsStore } from "@/hooks/useMetricsStore";
import type { MetricDefinition, MetricScope, MetricVisibility } from "@/lib/types/metrics";

type EditableMetric = MetricDefinition & {
  // edit drafts (view-local only)
  editing?: boolean;
  draftName?: string;
  draftDescription?: string;
  draftTarget?: string;
  draftVisibility?: MetricVisibility;
  draftScope?: MetricScope;
};

export default function MetricsPage() {
  // CHANGE: pull from single store
  // CHANGE (per request): import deleteMetric so removals propagate everywhere.
  const { metrics, createMetric, toggleActive, updateMetric, deleteMetric } = useMetricsStore();

  // VIEW-LOCAL copy to hold drafts (we don't mutate store fields for drafts)
  const [local, setLocal] = useState<Record<string, Partial<EditableMetric>>>({});

  // Compose display list by merging store + any draft flags
  const merged: EditableMetric[] = useMemo(() => {
    return metrics.map((m) => ({ ...m, ...(local[m.id] as object) })) as EditableMetric[];
  }, [metrics, local]);

  /* LOGIC: create form state */
  const [form, setForm] = useState({
    name: "",
    scope: "Coach" as MetricScope,
    description: "",
    target: "",
    visibility: "Aggregate only (no raw clips)" as MetricVisibility,
  });

  const onFormChange = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const canCreate =
    form.name.trim().length > 0 &&
    form.scope &&
    form.visibility;
  // CHANGE (previous step): creation no longer requires "Frequency of calculation" target.

  /* CHANGE: append newly created metric to the shared store */
  const onCreate = () => {
    if (!canCreate) return;
    createMetric({
      name: form.name.trim(),
      scope: form.scope,
      description: form.description.trim(),
      target: form.target.trim(),
      visibility: form.visibility,
      active: true,
      // NEW: default progress is undefined; dashboards can handle missing value
      progress: undefined,
    });
    setForm({
      name: "",
      scope: "Coach",
      description: "",
      target: "",
      visibility: "Aggregate only (no raw clips)",
    });
  };

  /* CHANGE: start inline editing by setting local draft flags */
  const startEdit = (id: string) =>
    setLocal((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        editing: true,
        draftName: metrics.find((m) => m.id === id)?.name ?? "",
        draftDescription: metrics.find((m) => m.id === id)?.description ?? "",
        draftTarget: metrics.find((m) => m.id === id)?.target ?? "",
        draftVisibility: metrics.find((m) => m.id === id)?.visibility ?? "Aggregate only (no raw clips)",
        draftScope: metrics.find((m) => m.id === id)?.scope ?? "Coach",
      },
    }));

  /* CHANGE: save inline edits back to the shared store (single source of truth => updates everywhere) */
  const saveEdit = (id: string) => {
    const d = local[id] as EditableMetric | undefined;
    if (!d) return;

    updateMetric(id, {
      name: (d.draftName ?? "").trim() || metrics.find((m) => m.id === id)?.name,
      description:
        (d.draftDescription ?? "").trim() ||
        metrics.find((m) => m.id === id)?.description,
      // NOTE: target persists unchanged; not editable in UI per request.
      target: metrics.find((m) => m.id === id)?.target,
      visibility: (d.draftVisibility as MetricVisibility) ?? metrics.find((m) => m.id === id)?.visibility,
      scope: (d.draftScope as MetricScope) ?? metrics.find((m) => m.id === id)?.scope,
    });

    setLocal((prev) => ({ ...prev, [id]: { ...prev[id], editing: false } }));
  };

  /* CHANGE (per request): delete a metric everywhere via store */
  const removeMetric = (id: string) => {
    if (confirm("Delete this metric? This action removes it everywhere.")) {
      deleteMetric(id);
      // clear any local edit state for this id
      setLocal((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  /* CHANGE: edit field changes are kept view-local */
  const onDraftChange = (id: string, field: keyof EditableMetric, value: any) =>
    setLocal((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));

  /* STYLE: shared pretty input classes to match your screenshot */
  const inputCls =
    "w-full rounded-2xl border border-neutral-300 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary";
  const textAreaCls =
    "w-full rounded-2xl border border-neutral-300 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary min-h-[110px]";
  const rowBtnCls = "btn-outline text-xs";

  return (
    <div className="space-y-6">
      {/* ---------- Create a metric ---------- */}
      <Card>
        <h2 className="text-xl font-bold">Create a metric</h2>

        <div className="mt-4 grid gap-3">
          <div>
            <label className="block text-sm text-neutral-700">Name</label>
            <input
              className={inputCls}
              placeholder='e.g., "Encouragement ratio"'
              value={form.name}
              onChange={(e) => onFormChange("name", e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-700">Scope</label>
            <select
              className={inputCls}
              value={form.scope}
              onChange={(e) => onFormChange("scope", e.target.value as MetricScope)}
            >
              <option>Coach</option>
              <option>Player</option>
              <option>Facilitator</option>
              <option>Teacher</option>
              <option>Team</option> {/* CHANGE (previous step): add "Team" to create options */}
            </select>
          </div>

          <div>
            <label className="block text-sm text-neutral-700">
              Description: What are you trying to observe? Provide as much detail as possible and one or more examples.
            </label>
            <textarea
              className={textAreaCls}
              placeholder="Enter text"
              value={form.description}
              onChange={(e) => onFormChange("description", e.target.value)}
            />
          </div>

          {/* CHANGE (previous step): removed the "Frequency of calculation" input from the create card. */}

          <div>
            <label className="block text-sm text-neutral-700">Visibility</label>
            <select
              className={inputCls}
              value={form.visibility}
              onChange={(e) =>
                onFormChange("visibility", e.target.value as MetricVisibility)
              }
            >
              <option>Aggregate only (no raw clips)</option>
              <option>Allow clip link if coach shares</option>
            </select>
          </div>
        </div>

        {/* STYLE: keep dark-blue via btn-primary; disable with opacity only */}
        <div className="mt-4">
          <button
            className={cn("btn-primary", !canCreate && "opacity-50 pointer-events-none")}
            onClick={onCreate}
            disabled={!canCreate}
          >
            + Create metric
          </button>
        </div>
      </Card>

      {/* ---------- Existing metric definitions ---------- */}
      <Card>
        <h2 className="mb-3 text-xl font-bold">Existing metric definitions</h2>

        <div className="divide-y rounded-2xl border">
          {merged.map((m) => (
            <div
              key={m.id}
              className="flex flex-col gap-2 p-3 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="flex-1">
                {!m.editing ? (
                  <>
                    <div className="font-medium text-ink">{m.name}</div>
                    <div className="text-xs text-neutral-500">
                      {m.scope} • {m.target} • {m.visibility}
                    </div>
                    {m.description ? (
                      <div className="mt-1 text-xs text-neutral-500">
                        {m.description}
                      </div>
                    ) : null}
                  </>
                ) : (
                  /* CHANGE (per request): edit mode shows ONLY Name, Scope, Description, Visibility */
                  <div className="grid gap-2 sm:grid-cols-2">
                    {/* Name */}
                    <input
                      className={inputCls}
                      value={m.draftName ?? ""}
                      onChange={(e) => onDraftChange(m.id, "draftName", e.target.value)}
                      placeholder="Name"
                    />
                    {/* Scope (same options as create, incl. Team) */}
                    <select
                      className={inputCls}
                      value={m.draftScope ?? "Coach"}
                      onChange={(e) =>
                        onDraftChange(m.id, "draftScope", e.target.value as MetricScope)
                      }
                    >
                      <option>Coach</option>
                      <option>Player</option>
                      <option>Facilitator</option>
                      <option>Teacher</option>
                      <option>Team</option> {/* CHANGE: add "Team" to edit options */}
                    </select>
                    {/* Visibility */}
                    <select
                      className={inputCls}
                      value={m.draftVisibility ?? "Aggregate only (no raw clips)"}
                      onChange={(e) =>
                        onDraftChange(
                          m.id,
                          "draftVisibility",
                          e.target.value as MetricVisibility
                        )
                      }
                    >
                      <option>Aggregate only (no raw clips)</option>
                      <option>Allow clip link if coach shares</option>
                    </select>
                    {/* Description */}
                    <textarea
                      className={cn(textAreaCls, "sm:col-span-2")}
                      value={m.draftDescription ?? ""}
                      onChange={(e) =>
                        onDraftChange(m.id, "draftDescription", e.target.value)
                      }
                      placeholder="Description"
                    />
                    {/* NOTE: target input intentionally removed in edit mode */}
                  </div>
                )}
              </div>

              {/* On/Off + Edit/Save/Delete */}
              <div className="flex gap-2 sm:ml-3 sm:mt-0">
                <button className={rowBtnCls} onClick={() => toggleActive(m.id)}>
                  {m.active ? "On" : "Off"}
                </button>
                {!m.editing ? (
                  <button className={rowBtnCls} onClick={() => startEdit(m.id)}>
                    Edit
                  </button>
                ) : (
                  <>
                    <button className="btn-primary text-xs" onClick={() => saveEdit(m.id)}>
                      Save
                    </button>
                    {/* CHANGE (per request): Delete button; removes metric everywhere */}
                    <button
                      className={cn(rowBtnCls, "text-red-600")}
                      onClick={() => removeMetric(m.id)}
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

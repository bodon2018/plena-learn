"use client";

/**
 * Admin › Metrics
 * - Beautiful UI + fully working create / toggle / edit.
 *
 * STYLE: uses Card + rounded 2xl inputs, soft shadows, proper spacing,
 *         and the same dark-blue .btn-primary used across admin.
 * LOGIC:  stateful metrics list, create metric, On/Off toggle, inline edit+save.
 */

import { useState } from "react";
import Card from "@/components/ui/Card";
import { cn } from "@/lib/cn";

type Metric = {
  id: string;
  name: string;
  scope: "Coach" | "Player" | "Facilitator" | "Teacher";
  description: string;
  target: string;
  visibility: "Aggregate only (no raw clips)" | "Allow clip link if coach shares";
  active: boolean;
  // edit drafts
  editing?: boolean;
  draftName?: string;
  draftDescription?: string;
  draftTarget?: string;
  draftVisibility?: Metric["visibility"];
  draftScope?: Metric["scope"];
};

export default function MetricsPage() {
  /* LOGIC: seed with 2 placeholder definitions */
  const [metrics, setMetrics] = useState<Metric[]>([
    {
      id: "m1",
      name: "Metric 1",
      scope: "Coach",
      description: "Placeholder description",
      target: "≥ 80%",
      visibility: "Aggregate only (no raw clips)",
      active: true,
    },
    {
      id: "m2",
      name: "Metric 2",
      scope: "Player",
      description: "Placeholder description",
      target: "≥ 2.0",
      visibility: "Allow clip link if coach shares",
      active: false,
    },
  ]);

  /* LOGIC: create form state */
  const [form, setForm] = useState({
    name: "",
    scope: "Coach" as Metric["scope"],
    description: "",
    target: "",
    visibility: "Aggregate only (no raw clips)" as Metric["visibility"],
  });

  const onFormChange = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const canCreate =
    form.name.trim().length > 0 &&
    form.scope &&
    form.visibility &&
    form.target.trim().length > 0;

  /* LOGIC: append newly created metric */
  const createMetric = () => {
    if (!canCreate) return;
    setMetrics((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        name: form.name.trim(),
        scope: form.scope,
        description: form.description.trim(),
        target: form.target.trim(),
        visibility: form.visibility,
        active: true,
      },
    ]);
    // STYLE/LOGIC: reset inputs to their pretty placeholders
    setForm({
      name: "",
      scope: "Coach",
      description: "",
      target: "",
      visibility: "Aggregate only (no raw clips)",
    });
  };

  /* LOGIC: on/off toggle */
  const toggleActive = (id: string) =>
    setMetrics((prev) =>
      prev.map((m) => (m.id === id ? { ...m, active: !m.active } : m))
    );

  /* LOGIC: start inline editing with drafts */
  const startEdit = (id: string) =>
    setMetrics((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              editing: true,
              draftName: m.name,
              draftDescription: m.description,
              draftTarget: m.target,
              draftVisibility: m.visibility,
              draftScope: m.scope,
            }
          : m
      )
    );

  /* LOGIC: save inline edits */
  const saveEdit = (id: string) =>
    setMetrics((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              editing: false,
              name: (m.draftName ?? m.name).trim(),
              description: (m.draftDescription ?? m.description).trim(),
              target: (m.draftTarget ?? m.target).trim(),
              visibility: m.draftVisibility ?? m.visibility,
              scope: m.draftScope ?? m.scope,
              draftName: undefined,
              draftDescription: undefined,
              draftTarget: undefined,
              draftVisibility: undefined,
              draftScope: undefined,
            }
          : m
      )
    );

  /* LOGIC: edit field changes */
  const onDraftChange = (id: string, field: keyof Metric, value: any) =>
    setMetrics((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );

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
          {/* STYLE: pretty placeholders, rounded-2xl inputs */}
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
              onChange={(e) => onFormChange("scope", e.target.value as Metric["scope"])}
            >
              <option>Coach</option>
              <option>Player</option>
              <option>Facilitator</option>
              <option>Teacher</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-neutral-700">Description</label>
            <textarea
              className={textAreaCls}
              placeholder="Explain how this metric is computed or what it means."
              value={form.description}
              onChange={(e) => onFormChange("description", e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-700">Target</label>
            <input
              className={inputCls}
              placeholder='e.g., "≥ 3.0", "≥ 80%"'
              value={form.target}
              onChange={(e) => onFormChange("target", e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-700">Visibility</label>
            <select
              className={inputCls}
              value={form.visibility}
              onChange={(e) =>
                onFormChange("visibility", e.target.value as Metric["visibility"])
              }
            >
              <option>Aggregate only (no raw clips)</option>
              <option>Allow clip link if coach shares</option>
            </select>
          </div>
        </div>

        {/* STYLE: keep dark-blue always via btn-primary; disable with opacity only */}
        <div className="mt-4">
          <button
            className={cn("btn-primary", !canCreate && "opacity-50 pointer-events-none")}
            onClick={createMetric}
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
          {metrics.map((m) => (
            <div key={m.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex-1">
                {!m.editing ? (
                  <>
                    <div className="font-medium text-ink">{m.name}</div>
                    <div className="text-xs text-neutral-500">
                      {m.scope} • {m.target} • {m.visibility}
                    </div>
                    {m.description ? (
                      <div className="mt-1 text-xs text-neutral-500">{m.description}</div>
                    ) : null}
                  </>
                ) : (
                  /* LOGIC+STYLE: pretty inline edit controls */
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      className={inputCls}
                      value={m.draftName ?? ""}
                      onChange={(e) => onDraftChange(m.id, "draftName", e.target.value)}
                      placeholder="Name"
                    />
                    <select
                      className={inputCls}
                      value={m.draftScope ?? "Coach"}
                      onChange={(e) => onDraftChange(m.id, "draftScope", e.target.value as Metric["scope"])}
                    >
                      <option>Coach</option>
                      <option>Player</option>
                      <option>Facilitator</option>
                      <option>Teacher</option>
                    </select>
                    <input
                      className={inputCls}
                      value={m.draftTarget ?? ""}
                      onChange={(e) => onDraftChange(m.id, "draftTarget", e.target.value)}
                      placeholder='Target (e.g., "≥ 3.0")'
                    />
                    <select
                      className={inputCls}
                      value={m.draftVisibility ?? "Aggregate only (no raw clips)"}
                      onChange={(e) =>
                        onDraftChange(
                          m.id,
                          "draftVisibility",
                          e.target.value as Metric["visibility"]
                        )
                      }
                    >
                      <option>Aggregate only (no raw clips)</option>
                      <option>Allow clip link if coach shares</option>
                    </select>
                    <textarea
                      className={cn(textAreaCls, "sm:col-span-2")}
                      value={m.draftDescription ?? ""}
                      onChange={(e) =>
                        onDraftChange(m.id, "draftDescription", e.target.value)
                      }
                      placeholder="Description"
                    />
                  </div>
                )}
              </div>

              {/* On/Off + Edit/Save */}
              <div className="flex gap-2 sm:ml-3 sm:mt-0">
                <button className={rowBtnCls} onClick={() => toggleActive(m.id)}>
                  {m.active ? "On" : "Off"}
                </button>
                {!m.editing ? (
                  <button className={rowBtnCls} onClick={() => startEdit(m.id)}>
                    Edit
                  </button>
                ) : (
                  <button className="btn-primary text-xs" onClick={() => saveEdit(m.id)}>
                    Save
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

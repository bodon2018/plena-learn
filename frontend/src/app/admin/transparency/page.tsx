// src/app/admin/transparency/page.tsx
"use client";

/**
 * CHANGE: Admin › Transparency
 * - UPDATED Labels card columns to: Data Point, Classifier, Source File, Audit Label, Feedback.
 * - ADDED native hover tooltips (title=...) with definitions for each column header.
 * - Source File now shows an audio file symbol (icon only; no playback yet).
 * - Kept existing card/table styling; no other parts of the app changed.
 */

import Card from "@/components/ui/Card";

/* CHANGE: tooltip definitions for headers */
const COL_INFO = {
  "Data Point":
    "A unit of data that has been assigned a label and it is used for metric calculation.",
  "Classifier":
    "A model used to assign a label to a data point. It can be AI, rules-based, or hybrid. Rules-based: More deterministic; tied to a rules dictionary created for your organization.  AI: Uses semantic understanding; generally better at capturing contextual meaning and may provide higher confidence that the assigned label reflects the data point’s intent.",
  "Source File":
    "The raw file containing the data point.",
  "Audit Label":
    "A verifiable record of how the label was produced (rules, AI, or both), including whether the two methods agreed. Both: Rules and AI assigned the same label, indicating high certainty that the label is accurate. Disagreement: Rules and AI assigned different labels.",
  "Feedback":
    "Provide your feedback on the label assigned to the data point. You can simply confirm that you agree with the label, or disagree and explain why. Your feedback helps the system improve future labeling.",
} as const;

/* CHANGE: updated row shape to match new columns */
type LabelRow = {
  dataPoint: string;   // e.g., text or id+text representation
  classifier: string;  // e.g., "AI", "Rules", "Hybrid"
  sourceFile?: string; // filename if available (icon shown regardless)
  auditLabel: string;  // e.g., "Encouragement"
  feedback?: string;   // optional admin feedback
};

export default function TransparencyPage() {
  // NOTE: keeping dataset empty by default as before (no extra behavior added)
  const rows: LabelRow[] = [];

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="mb-2 text-xl font-bold">Labels</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-neutral-600">
                {/* CHANGE: headers + native tooltips */}
                <ThWithTip label="Data Point" />
                <ThWithTip label="Classifier" />
                <ThWithTip label="Source File" />
                <ThWithTip label="Audit Label" />
                <ThWithTip label="Feedback" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className="px-3 py-2 text-ink">{r.dataPoint}</td>
                  <td className="px-3 py-2">{r.classifier}</td>
                  {/* CHANGE: show audio symbol under Source File (icon only) */}
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-2 text-neutral-700">
                      <AudioGlyph aria-label="Audio file" />
                      {/* render filename if present; otherwise just the icon */}
                      {r.sourceFile ? <span className="text-xs text-neutral-500">{r.sourceFile}</span> : null}
                    </span>
                  </td>
                  <td className="px-3 py-2">{r.auditLabel}</td>
                  <td className="px-3 py-2">{r.feedback ?? "—"}</td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td className="px-3 py-3 text-neutral-500" colSpan={5}>
                    No labels yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* CHANGE: helper to render a header cell with a title tooltip */
function ThWithTip({ label }: { label: keyof typeof COL_INFO }) {
  return (
    <th className="px-3 py-2 font-medium">
      <span title={COL_INFO[label]} className="cursor-help underline decoration-dotted underline-offset-2">
        {label}
      </span>
    </th>
  );
}

/* CHANGE: minimal inline audio icon (symbol only; no playback) */
function AudioGlyph(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 20 20"
      fill="currentColor"
      {...props}
    >
      {/* speaker */}
      <path d="M9 4a1 1 0 0 1 1 1v10a1 1 0 0 1-1.555.832L4.882 13H3a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h1.882l3.563-2.832A1 1 0 0 1 9 4z" />
      {/* sound waves */}
      <path d="M13.5 6.5a.75.75 0 0 1 1.06 0 4.5 4.5 0 0 1 0 6.364.75.75 0 1 1-1.06-1.06 3 3 0 0 0 0-4.243.75.75 0 0 1 0-1.061z" />
      <path d="M15.75 4.25a.75.75 0 0 1 1.06 0 7.5 7.5 0 0 1 0 10.607.75.75 0 1 1-1.06-1.06 6 6 0 0 0 0-8.486.75.75 0 0 1 0-1.061z" />
    </svg>
  );
}

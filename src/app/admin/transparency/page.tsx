// NEW: src/app/admin/transparency/page.tsx
"use client";

/**
 * CHANGE: Admin › Transparency
 * - Added "Labels" card listing utterance id, utterance text, and audit label.
 * - Matches existing Admin card/table styling.
 * - Read-only table (no extra features added).
 */

import Card from "@/components/ui/Card";

type LabelRow = {
  id: string;        // utterance id
  text: string;      // utterance text
  auditLabel: string; // audit label
};

export default function TransparencyPage() {
  // Placeholder dataset to keep the view functional; replace with real data later if desired.
  const rows: LabelRow[] = []; // keep empty by default per request (no extra behavior)

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="mb-2 text-xl font-bold">Labels</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-neutral-600">
                <th className="px-3 py-2 font-medium">Utterance ID</th>
                <th className="px-3 py-2 font-medium">Utterance</th>
                <th className="px-3 py-2 font-medium">Audit label</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-2 text-ink">{r.id}</td>
                  <td className="px-3 py-2">{r.text}</td>
                  <td className="px-3 py-2">{r.auditLabel}</td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td className="px-3 py-3 text-neutral-500" colSpan={3}>
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

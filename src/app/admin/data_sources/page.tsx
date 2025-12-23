"use client";

import { useEffect, useMemo } from "react";
import Card from "@/components/ui/Card";
import { cn } from "@/lib/cn";

// NEW: shared store so this state can be reused later in the Metrics tab.
import { useDataSourcesStore } from "@/hooks/useDataSourcesStore";

export default function DataSourcesPage() {
  // STYLE: match the Metrics tab input styles.
  const inputCls =
    "w-full rounded-2xl border border-neutral-300 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary";
  const rowBtnCls = "btn-outline text-xs";

  // Store state/actions
  const {
    files,
    filesLoading,
    filesError,
    uploading,
    uploadError,
    selectedSavedPath,
    overview,
    overviewLoading,
    overviewError,
    refreshFiles,
    uploadCsv,
    selectFile,
    clearSelection,
    fetchOverview,
  } = useDataSourcesStore();

  // Selected file object (derived)
  const selectedFile = useMemo(() => {
    if (!selectedSavedPath) return null;
    return files.find((f) => f.saved_path === selectedSavedPath) ?? null;
  }, [files, selectedSavedPath]);

  // On mount: load server-backed "Available Data" list.
  useEffect(() => {
    refreshFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Whenever the selection changes, fetch the overview from the server.
  useEffect(() => {
    if (!selectedSavedPath) return;
    fetchOverview(selectedSavedPath);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSavedPath]);

  return (
    <div className="space-y-6">
      {/* -------------------- Card 1: Available Data -------------------- */}
      <Card>
        <h2 className="text-xl font-bold">Available Data</h2>

        {/* Upload controls */}
        <div className="mt-4 grid gap-3">
          <div>
            <label className="block text-sm text-neutral-700">Upload CSV</label>

            {/* Keep styling consistent with existing UI:
               - rounded file input
               - btn-primary upload button (upload triggers on file choose) */}
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                className={cn(inputCls, "sm:flex-1")}
                type="file"
                accept=".csv,text/csv"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;

                  // Upload immediately on selection.
                  uploadCsv(f);

                  // Reset so selecting the same file again triggers onChange.
                  e.currentTarget.value = "";
                }}
              />

              <button
                className={cn("btn-primary", uploading && "opacity-50 pointer-events-none")}
                disabled={uploading}
                onClick={() => {
                  // Visual affordance: upload is triggered by file selection above.
                  // (We keep this button to match the design requirement.)
                  alert("Select a CSV file using the file picker to upload.");
                }}
              >
                {uploading ? "Uploading..." : "+ Upload"}
              </button>

              {/* Optional refresh button to sync with server state */}
              <button
                className={cn(rowBtnCls, filesLoading && "opacity-50 pointer-events-none")}
                disabled={filesLoading}
                onClick={() => refreshFiles()}
                title="Refresh list from server"
              >
                Refresh
              </button>
            </div>

            {uploadError ? <div className="mt-2 text-sm text-red-600">{uploadError}</div> : null}
          </div>
        </div>

        {/* List of uploaded CSVs (now server-backed via GET /admin/data-sources) */}
        <div className="mt-4">
          <div className="divide-y rounded-2xl border">
            {filesLoading ? (
              <div className="p-3 text-sm text-neutral-500">Loading…</div>
            ) : filesError ? (
              <div className="p-3 text-sm text-red-600">{filesError}</div>
            ) : files.length === 0 ? (
              <div className="p-3 text-sm text-neutral-500">No CSV files uploaded yet.</div>
            ) : (
              files.map((f) => {
                const isSelected = f.saved_path === selectedSavedPath;

                return (
                  <div
                    key={f.saved_path}
                    className={cn(
                      "flex flex-col gap-2 p-3 sm:flex-row sm:items-start sm:justify-between",
                      isSelected && "bg-neutral-50"
                    )}
                  >
                    <div className="flex-1">
                      <div className="font-medium text-ink">{f.original_filename}</div>
                      <div className="mt-1 text-xs text-neutral-500">
                        Size: {f.size_bytes.toLocaleString()} bytes
                      </div>
                      <div className="mt-1 text-xs text-neutral-400 break-all">{f.saved_path}</div>
                    </div>

                    <div className="flex gap-2 sm:ml-3">
                      <button
                        className={cn(rowBtnCls, isSelected && "opacity-60 pointer-events-none")}
                        onClick={() => selectFile(f.saved_path)}
                        disabled={isSelected}
                      >
                        {isSelected ? "Selected" : "Select"}
                      </button>

                      {isSelected ? (
                        <button className={rowBtnCls} onClick={() => clearSelection()}>
                          Clear
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Card>

      {/* -------------------- Card 2: Overview of Selected Data -------------------- */}
      <Card>
        <h2 className="text-xl font-bold">Overview of Selected Data</h2>

        <div className="mt-4">
          {!selectedFile ? (
            <div className="text-sm text-neutral-500">
              Select a CSV from “Available Data” to see its overview.
            </div>
          ) : overviewLoading ? (
            <div className="text-sm text-neutral-500">Loading overview…</div>
          ) : overviewError ? (
            <div className="text-sm text-red-600">{overviewError}</div>
          ) : overview ? (
            <div className="grid gap-3">
              {/* Basic metadata */}
              <div className="rounded-2xl border p-3">
                <div className="text-sm font-medium text-ink">File</div>
                <div className="mt-1 text-sm text-neutral-700">{overview.original_filename}</div>
                <div className="mt-1 text-xs text-neutral-500 break-all">{overview.saved_path}</div>
                <div className="mt-2 text-xs text-neutral-500">
                  Size: {overview.size_bytes.toLocaleString()} bytes
                </div>
              </div>

              {/* Shape */}
              <div className="rounded-2xl border p-3">
                <div className="text-sm font-medium text-ink">Shape</div>
                <div className="mt-2 text-sm text-neutral-700">
                  Rows: {overview.row_count.toLocaleString()}
                </div>
                <div className="mt-1 text-sm text-neutral-700">
                  Columns: {overview.column_count.toLocaleString()}
                </div>
              </div>

              {/* Columns */}
              <div className="rounded-2xl border p-3">
                <div className="text-sm font-medium text-ink">Columns</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {overview.columns.map((c) => (
                    <span
                      key={c.name}
                      className="rounded-full border px-3 py-1 text-xs text-neutral-700 bg-white"
                      title={
                        c.dtype
                          ? `dtype=${c.dtype}${
                              typeof c.nullable === "boolean" ? `, nullable=${c.nullable}` : ""
                            }`
                          : c.name
                      }
                    >
                      {c.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Missing values */}
              <div className="rounded-2xl border p-3">
                <div className="text-sm font-medium text-ink">Missing Values</div>

                {/* Minimal, discrete list (no heavy table styling) */}
                <div className="mt-2 divide-y rounded-2xl border">
                  {Object.keys(overview.missing_values || {}).length === 0 ? (
                    <div className="p-3 text-sm text-neutral-500">No missing-values report available.</div>
                  ) : (
                    Object.entries(overview.missing_values)
                      .sort((a, b) => b[1] - a[1]) // show most-missing first
                      .map(([col, missingCount]) => (
                        <div key={col} className="flex items-center justify-between p-3">
                          <div className="text-sm text-neutral-700">{col}</div>
                          <div className="text-sm text-neutral-700">{missingCount.toLocaleString()}</div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-neutral-500">No overview available yet.</div>
          )}
        </div>
      </Card>
    </div>
  );
}

// hooks/useDataSourcesStore.ts
"use client";

/**
 * Shared store for Data Sources state.
 *
 * Why a store:
 * - Data Sources tab needs to list and select uploaded CSVs.
 * - Metrics tab will also need that same list/selection when a job is WAITING_FOR_DATA_SOURCE.
 * - Centralizing fetch/upload/overview reduces duplicate logic and keeps UI consistent.
 */

import { create } from "zustand";

const AI_SERVER_BASE_URL =
  process.env.NEXT_PUBLIC_AI_BASE_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8001";

/**
 * Item returned by:
 * - POST /admin/data-sources/upload
 * - GET  /admin/data-sources   (server-backed list of files under UPLOAD_RAW_DIR)
 */
export type UploadedCsv = {
  original_filename: string;
  saved_path: string;
  size_bytes: number;
  data_source_type: "upload_csv";
};

/**
 * Returned by POST /admin/data-sources/overview
 * (matches your pandas overview helper)
 */
export type DataSourceOverview = {
  original_filename: string;
  saved_path: string;
  size_bytes: number;

  row_count: number;
  column_count: number;

  // Column schema summary
  columns: Array<{ name: string; dtype?: string; nullable?: boolean }>;

  // Missing values per column (count of missing cells)
  missing_values: Record<string, number>;
};

type DataSourcesState = {
  // Server-backed list of CSVs under UPLOAD_RAW_DIR
  files: UploadedCsv[];
  filesLoading: boolean;
  filesError: string | null;

  // Upload state
  uploading: boolean;
  uploadError: string | null;

  // Selection
  selectedSavedPath: string | null;

  // Overview for current selection
  overview: DataSourceOverview | null;
  overviewLoading: boolean;
  overviewError: string | null;

  // Actions
  refreshFiles: () => Promise<void>;
  uploadCsv: (file: File) => Promise<void>;
  selectFile: (savedPath: string) => void;
  clearSelection: () => void;
  fetchOverview: (savedPath: string) => Promise<void>;
};

function upsertNewestFirst(list: UploadedCsv[], item: UploadedCsv): UploadedCsv[] {
  // Keep unique by saved_path, and place the newest item first.
  const filtered = list.filter((x) => x.saved_path !== item.saved_path);
  return [item, ...filtered];
}

export const useDataSourcesStore = create<DataSourcesState>((set, get) => ({
  files: [],
  filesLoading: false,
  filesError: null,

  uploading: false,
  uploadError: null,

  selectedSavedPath: null,

  overview: null,
  overviewLoading: false,
  overviewError: null,

  refreshFiles: async () => {
    set({ filesLoading: true, filesError: null });
    try {
      // Server endpoint you added/are adding:
      // GET /admin/data-sources -> list all CSVs under UPLOAD_RAW_DIR
      const resp = await fetch(`${AI_SERVER_BASE_URL}/admin/data-sources`, {
        method: "GET",
        credentials: "include",
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`List failed (${resp.status}): ${text}`);
      }

      const data = (await resp.json()) as UploadedCsv[];

      // Store as-is; if your backend already sorts, great. If not, frontend still works.
      set({ files: data, filesLoading: false });
    } catch (e: any) {
      set({
        filesLoading: false,
        filesError: e?.message ?? "Failed to load available data.",
      });
    }
  },

  uploadCsv: async (file: File) => {
    set({ uploading: true, uploadError: null });

    try {
      const form = new FormData();
      form.append("file", file);

      const resp = await fetch(`${AI_SERVER_BASE_URL}/admin/data-sources/upload`, {
        method: "POST",
        body: form,
        credentials: "include",
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Upload failed (${resp.status}): ${text}`);
      }

      const uploaded = (await resp.json()) as UploadedCsv;

      // Optimistically update list so UI updates immediately.
      set((s) => ({
        files: upsertNewestFirst(s.files, uploaded),
        uploading: false,
        selectedSavedPath: uploaded.saved_path, // Auto-select newest upload
      }));

      // Optional: reconcile with server truth (covers cases where backend renames files, etc.)
      // We do it after optimistic update so UX remains snappy.
      await get().refreshFiles();
    } catch (e: any) {
      set({
        uploading: false,
        uploadError: e?.message ?? "Upload failed.",
      });
    }
  },

  selectFile: (savedPath: string) => {
    // Selecting a new file invalidates the previously shown overview until reloaded.
    set({
      selectedSavedPath: savedPath,
      overview: null,
      overviewError: null,
      overviewLoading: false,
    });
  },

  clearSelection: () => {
    set({
      selectedSavedPath: null,
      overview: null,
      overviewError: null,
      overviewLoading: false,
    });
  },

  fetchOverview: async (savedPath: string) => {
    set({ overviewLoading: true, overviewError: null, overview: null });

    try {
      const resp = await fetch(`${AI_SERVER_BASE_URL}/admin/data-sources/overview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ saved_path: savedPath }),
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Overview failed (${resp.status}): ${text}`);
      }

      const overview = (await resp.json()) as DataSourceOverview;
      set({ overview, overviewLoading: false });
    } catch (e: any) {
      set({
        overviewLoading: false,
        overviewError: e?.message ?? "Failed to load overview.",
      });
    }
  },
}));

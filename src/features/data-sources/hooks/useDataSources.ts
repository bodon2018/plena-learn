import { useCallback, useEffect, useState } from "react";
import { useDataSourcesStore } from "@/hooks/useDataSourcesStore";

const AI_BASE_URL =
  process.env.NEXT_PUBLIC_AI_BASE_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8001";

// -----------------------------------------------------------------------------
// Hook
// -----------------------------------------------------------------------------

type UseDataSourcesReturn = {
  // From store
  files: ReturnType<typeof useDataSourcesStore>["files"];
  filesLoading: boolean;
  filesError: string | null;
  uploading: boolean;
  uploadError: string | null;
  selectedSavedPath: string | null;
  overview: ReturnType<typeof useDataSourcesStore>["overview"];
  overviewLoading: boolean;
  overviewError: string | null;

  // Store actions
  refreshFiles: () => Promise<void>;
  uploadCsv: (file: File) => Promise<void>;
  selectFile: (savedPath: string) => void;
  clearSelection: () => void;
  fetchOverview: (savedPath: string) => Promise<void>;

  // Page-local delete state
  deletingPath: string | null;
  deleteError: string | null;
  deleteCsv: (savedPath: string, originalFilename?: string) => Promise<void>;

  // Computed
  selectedFile: ReturnType<typeof useDataSourcesStore>["files"][0] | null;
};

export function useDataSources(): UseDataSourcesReturn {
  // ---------------------------------------------------------------------------
  // Store
  // ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // Page-local delete state
  // ---------------------------------------------------------------------------
  const [deletingPath, setDeletingPath] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Computed
  // ---------------------------------------------------------------------------
  const selectedFile = selectedSavedPath
    ? files.find((f) => f.saved_path === selectedSavedPath) ?? null
    : null;

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  // Load files on mount
  useEffect(() => {
    refreshFiles();
  }, [refreshFiles]);

  // Fetch overview when selection changes
  useEffect(() => {
    if (selectedSavedPath) {
      fetchOverview(selectedSavedPath);
    }
  }, [selectedSavedPath, fetchOverview]);

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------
  const deleteCsv = useCallback(
    async (savedPath: string, originalFilename?: string) => {
      setDeleteError(null);

      if (!savedPath) return;

      const label = originalFilename ? `"${originalFilename}"` : "this file";
      if (!confirm(`Delete ${label}? This will remove it from the server and cannot be undone.`)) {
        return;
      }

      setDeletingPath(savedPath);
      try {
        const resp = await fetch(`${AI_BASE_URL}/admin/data-sources`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ saved_path: savedPath }),
        });

        if (!resp.ok) {
          const body = await resp.text();
          throw new Error(`Delete failed (${resp.status}): ${body}`);
        }

        // Clear selection if deleted file was selected
        if (selectedSavedPath === savedPath) {
          clearSelection();
        }

        // Refresh list
        refreshFiles();
      } catch (err: unknown) {
        setDeleteError(err instanceof Error ? err.message : "Failed to delete CSV.");
      } finally {
        setDeletingPath(null);
      }
    },
    [selectedSavedPath, clearSelection, refreshFiles]
  );

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------
  return {
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
    deletingPath,
    deleteError,
    deleteCsv,
    selectedFile,
  };
}
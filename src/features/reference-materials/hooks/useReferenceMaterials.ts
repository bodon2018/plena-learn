"use client";

import { useCallback, useEffect, useState } from "react";

const API_BASE =
  process.env.NEXT_PUBLIC_AI_BASE_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8001";

// =============================================================================
// Types
// =============================================================================

export type ReferenceMaterial = {
  doc_id: string;
  filename: string;
  name: string;
  description: string | null;
  categories: string[];
  file_size_bytes: number;
  page_count: number;
  is_indexed: boolean;
  chunk_count: number;
  uploaded_at: string | null;
  index_error: string | null;
};

export type UploadForm = {
  name: string;
  description: string;
  categories: string[];
};

type UseReferenceMaterialsReturn = {
  // Materials list
  materials: ReferenceMaterial[];
  isLoading: boolean;
  loadError: string | null;
  refreshMaterials: () => Promise<void>;

  // Upload form
  form: UploadForm;
  file: File | null;
  setFormField: <K extends keyof UploadForm>(field: K, value: UploadForm[K]) => void;
  setFile: (file: File | null) => void;
  canUpload: boolean;
  isUploading: boolean;
  uploadError: string | null;
  uploadMaterial: () => Promise<void>;

  // Delete
  deletingIds: Set<string>;
  deleteError: string | null;
  deleteMaterial: (docId: string) => Promise<void>;
};

// =============================================================================
// Hook
// =============================================================================

export function useReferenceMaterials(): UseReferenceMaterialsReturn {
  // ---------------------------------------------------------------------------
  // Materials list state
  // ---------------------------------------------------------------------------
  const [materials, setMaterials] = useState<ReferenceMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Upload form state
  // ---------------------------------------------------------------------------
  const [form, setForm] = useState<UploadForm>({
    name: "",
    description: "",
    categories: ["general"],
  });
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Delete state
  // ---------------------------------------------------------------------------
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Org ID - in real app, get from auth context
  // ---------------------------------------------------------------------------
  const orgId = "default_org"; // TODO: Get from auth context

  // ---------------------------------------------------------------------------
  // Load materials
  // ---------------------------------------------------------------------------
  const refreshMaterials = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const res = await fetch(`${API_BASE}/admin/orgs/${orgId}/reference-docs`);

      if (!res.ok) {
        throw new Error(`Failed to load materials: ${res.status}`);
      }

      const data = await res.json();
      setMaterials(data.documents || []);
    } catch (err) {
      console.error("Error loading materials:", err);
      setLoadError(err instanceof Error ? err.message : "Failed to load materials");
    } finally {
      setIsLoading(false);
    }
  }, [orgId]);

  // Load on mount
  useEffect(() => {
    void refreshMaterials();
  }, [refreshMaterials]);

  // ---------------------------------------------------------------------------
  // Form helpers
  // ---------------------------------------------------------------------------
  const setFormField = useCallback(
    <K extends keyof UploadForm>(field: K, value: UploadForm[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }));
      setUploadError(null);
    },
    []
  );

  const handleSetFile = useCallback((newFile: File | null) => {
    setFile(newFile);
    setUploadError(null);
  }, []);

  const canUpload = !!(form.name.trim() && file && !isUploading);

  // ---------------------------------------------------------------------------
  // Upload material
  // ---------------------------------------------------------------------------
  const uploadMaterial = useCallback(async () => {
    if (!canUpload || !file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const categoriesParam = form.categories.join(",");
      const descriptionParam = form.description.trim() 
        ? `&description=${encodeURIComponent(form.description.trim())}`
        : "";

      const res = await fetch(
        `${API_BASE}/admin/orgs/${orgId}/reference-docs?categories=${categoriesParam}${descriptionParam}`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || `Upload failed: ${res.status}`);
      }

      // Reset form
      setForm({ name: "", description: "", categories: ["general"] });
      setFile(null);

      // Refresh list
      await refreshMaterials();
    } catch (err) {
      console.error("Error uploading material:", err);
      setUploadError(err instanceof Error ? err.message : "Failed to upload material");
    } finally {
      setIsUploading(false);
    }
  }, [canUpload, file, form, orgId, refreshMaterials]);

  // ---------------------------------------------------------------------------
  // Delete material
  // ---------------------------------------------------------------------------
  const deleteMaterial = useCallback(
    async (docId: string) => {
      setDeletingIds((prev) => new Set(prev).add(docId));
      setDeleteError(null);

      try {
        const res = await fetch(
          `${API_BASE}/admin/orgs/${orgId}/reference-docs/${docId}`,
          { method: "DELETE" }
        );

        if (!res.ok) {
          throw new Error(`Failed to delete: ${res.status}`);
        }

        // Remove from local state
        setMaterials((prev) => prev.filter((m) => m.doc_id !== docId));
      } catch (err) {
        console.error("Error deleting material:", err);
        setDeleteError(err instanceof Error ? err.message : "Failed to delete material");
      } finally {
        setDeletingIds((prev) => {
          const next = new Set(prev);
          next.delete(docId);
          return next;
        });
      }
    },
    [orgId]
  );

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------
  return {
    // Materials list
    materials,
    isLoading,
    loadError,
    refreshMaterials,

    // Upload form
    form,
    file,
    setFormField,
    setFile: handleSetFile,
    canUpload,
    isUploading,
    uploadError,
    uploadMaterial,

    // Delete
    deletingIds,
    deleteError,
    deleteMaterial,
  };
}
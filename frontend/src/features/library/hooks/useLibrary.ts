import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";

/**
 * Base URL for talking to the FastAPI backend.
 */
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8000";

/**
 * Shape of media records coming back from /api/media and /upload.
 */
export type MediaItem = {
  id: number;
  filename: string;
  filepath: string;
  media_type: string;
  mime_type?: string | null;
  created_at: string;
  url?: string | null;
  session_context?: "practice" | "game" | null;
  recording_mode?: "audio" | "video" | null;
};

/**
 * Compute a playback URL for a media item.
 */
export function getMediaUrl(item: MediaItem): string | null {
  const normalizedUrl = (item.url ?? "").trim();

  // 1) Prefer the backend-provided URL.
  if (normalizedUrl) {
    if (normalizedUrl.startsWith("/")) return `${API_BASE}${normalizedUrl}`;
    return normalizedUrl;
  }

  const path = (item.filepath ?? "").trim();
  if (!path) return null;

  // 2) If filepath already looks like a full URL, use it directly.
  if (path.startsWith("http://") || path.startsWith("https://")) return path;

  // 3) If filepath is an absolute path on the API server
  if (path.startsWith("/")) return `${API_BASE}${path}`;

  // 4) If filepath looks like a local media path
  const lower = path.toLowerCase();
  const hasKnownExt =
    lower.endsWith(".mp4") ||
    lower.endsWith(".mp3") ||
    lower.endsWith(".webm") ||
    lower.endsWith(".wav") ||
    lower.endsWith(".m4a");

  if (path.includes("/") && hasKnownExt) {
    return `${API_BASE}/media/${path}`;
  }

  // 5) Otherwise assume it's a Google Drive file id.
  return `https://drive.google.com/file/d/${path}/preview`;
}

/**
 * Format a date string into a compact label.
 */
export function formatDateLabel(input: string): string {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Pick a human-readable label for the context.
 */
export function formatContextLabel(ctx?: string | null): string {
  if (!ctx) return "Session";
  if (ctx === "practice") return "Practice";
  if (ctx === "game") return "Game";
  return ctx;
}

type UseLibraryReturn = {
  /** List of media items */
  items: MediaItem[];
  /** Whether initial load is in progress */
  isLoading: boolean;
  /** Error message if something went wrong */
  error: string | null;
  /** Clear the error */
  clearError: () => void;
  /** Whether upload is in progress */
  isUploading: boolean;
  /** ID of item currently being deleted */
  deletingId: number | null;
  /** Ref for the hidden file input */
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  /** Trigger file picker */
  handleClickUpload: () => void;
  /** Handle file selection */
  handleSelectedFiles: (e: ChangeEvent<HTMLInputElement>) => Promise<void>;
  /** Delete a media item */
  handleDelete: (id: number) => Promise<void>;
  /** Refresh the library */
  refresh: () => Promise<void>;
};

/**
 * Custom hook for managing library state and operations.
 */
export function useLibrary(): UseLibraryReturn {
  const router = useRouter();

  const [items, setItems] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /**
   * Load media from the backend.
   */
  const fetchLibrary = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/media?media_type=`, {
        credentials: "include",
      });
      if (!res.ok) {
        console.error("Failed to load media", res.status);
        throw new Error("Media fetch failed");
      }
      const json = (await res.json()) as MediaItem[];
      setItems(json);
    } catch (err) {
      console.error("Error loading media", err);
      setError("Could not load your sessions. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load once on mount
  useEffect(() => {
    void fetchLibrary();
  }, [fetchLibrary]);

  /**
   * Open the native file picker.
   */
  const handleClickUpload = useCallback(() => {
    if (isUploading) return;
    fileInputRef.current?.click();
  }, [isUploading]);

  /**
   * Upload selected files.
   */
  const handleSelectedFiles = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(e.target.files ?? []);
      e.target.value = "";

      if (!selected.length) return;

      setIsUploading(true);
      setError(null);

      try {
        const form = new FormData();
        for (const f of selected) {
          form.append("files", f);
        }

        const res = await fetch(`${API_BASE}/upload`, {
          method: "POST",
          credentials: "include",
          body: form,
        });

        if (!res.ok) {
          const bodyText = await res.text().catch(() => "");
          console.error("Upload failed", res.status, bodyText);
          throw new Error("Upload failed");
        }

        const uploaded = (await res.json()) as MediaItem[];

        // Optimistically add uploaded items
        if (Array.isArray(uploaded) && uploaded.length > 0) {
          setItems((prev) => {
            const uploadedIds = new Set(uploaded.map((u) => u.id));
            const dedupedPrev = prev.filter((p) => !uploadedIds.has(p.id));
            return [...uploaded, ...dedupedPrev];
          });
        }

        setIsUploading(false);

        // Navigate to Learn for the first uploaded item
        const first = Array.isArray(uploaded) ? uploaded[0] : undefined;
        if (first?.id) {
          const playbackUrl = getMediaUrl(first);
          const href = playbackUrl
            ? `/user/learn?mediaId=${encodeURIComponent(String(first.id))}&mediaUrl=${encodeURIComponent(playbackUrl)}`
            : `/user/learn?mediaId=${encodeURIComponent(String(first.id))}`;
          router.push(href);
          return;
        }

        await fetchLibrary();
      } catch (err) {
        console.error("Error uploading media", err);
        setError("Upload failed. Please try again.");
        setIsUploading(false);
      }
    },
    [router, fetchLibrary]
  );

  /**
   * Delete a media record.
   */
  const handleDelete = useCallback(
    async (id: number) => {
      const item = items.find((m) => m.id === id);
      const label = item?.filename ?? `recording #${id}`;

      const ok = window.confirm(
        `Delete this session from your Library?\n\n${label}\n\nThis will remove it from the app and delete its annotations, but will not delete the underlying file from Google Drive.`
      );
      if (!ok) return;

      setDeletingId(id);
      setError(null);

      try {
        const res = await fetch(`${API_BASE}/api/media/${encodeURIComponent(String(id))}`, {
          method: "DELETE",
          credentials: "include",
        });

        if (!res.ok) {
          console.error("Failed to delete media", res.status);
          throw new Error("Delete failed");
        }

        setItems((prev) => prev.filter((m) => m.id !== id));
      } catch (err) {
        console.error("Error deleting media", err);
        setError("Could not delete that session. Please try again.");
      } finally {
        setDeletingId(null);
      }
    },
    [items]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    items,
    isLoading,
    error,
    clearError,
    isUploading,
    deletingId,
    fileInputRef,
    handleClickUpload,
    handleSelectedFiles,
    handleDelete,
    refresh: fetchLibrary,
  };
}

"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppBar from "@/components/navigation/AppBar";
import Card from "@/components/ui/Card";
import { Film, Mic, Trash2, ExternalLink, Loader2, Upload } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Base URL for talking to the FastAPI backend.
 * In dev, set NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
 */
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8000";

/**
 * Shape of media records coming back from /api/media and /upload.
 * This aligns with MediaFileRead on the backend.
 */
type MediaItem = {
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
 * Format a date string into a compact label for the card.
 */
function formatDateLabel(input: string): string {
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
 * Pick a human-readable label for the context (practice/game/unknown).
 */
function formatContextLabel(ctx?: string | null): string {
  if (!ctx) return "Session";
  if (ctx === "practice") return "Practice";
  if (ctx === "game") return "Game";
  return ctx;
}

/**
 * Compute a playback URL for a media item.
 *
 * Key behavior:
 * - Prefer backend-provided `url` when present.
 * - If backend returns a same-origin path (e.g. "/media/..."), prefix it with API_BASE
 *   so playback works from the Next.js origin.
 * - Fallback: derive either a local /media path (recordings/<file>.<ext>) or a Drive
 *   preview URL from `filepath`.
 */
function getMediaUrl(item: MediaItem): string | null {
  const normalizedUrl = (item.url ?? "").trim();

  // 1) Prefer the backend-provided URL.
  if (normalizedUrl) {
    // If the backend returns a same-origin path (e.g. "/media/recordings/..."),
    // make it absolute against the storage server base URL.
    if (normalizedUrl.startsWith("/")) return `${API_BASE}${normalizedUrl}`;
    return normalizedUrl;
  }

  const path = (item.filepath ?? "").trim();
  if (!path) return null;

  // 2) If filepath already looks like a full URL, use it directly.
  if (path.startsWith("http://") || path.startsWith("https://")) return path;

  // 3) If filepath is an absolute path on the API server (starts with "/"),
  //    prefix with API_BASE so it resolves correctly from the Next.js origin.
  if (path.startsWith("/")) return `${API_BASE}${path}`;

  // 4) If filepath looks like a local media path (e.g. "recordings/xyz.mp4"),
  //    serve via /media/<filepath>.
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
 * Main Library screen: lists recorded sessions and supports deletion + uploads.
 */
export default function LibraryScreen() {
  const router = useRouter();

  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track which item is currently being deleted so we can disable its button.
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Upload UI state + hidden <input type="file"> trigger.
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /**
   * Load media from the backend.
   *
   * Your FastAPI endpoint defaults to media_type="record".
   * Passing media_type= (empty string) disables filtering and returns ALL:
   * - recordings (media_type="record")
   * - uploads (media_type="upload")
   */
  const fetchLibrary = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/media?media_type=`);
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
      setLoading(false);
    }
  };

  // Load once on mount.
  useEffect(() => {
    void fetchLibrary();
  }, []);

  /**
   * Open the native file picker. The actual file input is hidden so we can
   * render a consistent button style in the header.
   */
  const handleClickUpload = () => {
    if (uploading) return;
    fileInputRef.current?.click();
  };

  /**
   * Upload one or more files via POST /upload.
   * Backend expects multipart/form-data with field name "files".
   *
   * After a successful upload, we immediately navigate to Learn for the
   * first uploaded item (minimal behavior that matches your requirement).
   */
  const handleSelectedFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);

    // Reset the input value so selecting the same file again still triggers onChange.
    e.target.value = "";

    if (!selected.length) return;

    setUploading(true);
    setError(null);

    try {
      const form = new FormData();

      // IMPORTANT: field name must be "files" to match:
      //   upload_media(files: List[UploadFile] = File(...))
      for (const f of selected) {
        form.append("files", f);
      }

      const res = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const bodyText = await res.text().catch(() => "");
        console.error("Upload failed", res.status, bodyText);
        throw new Error("Upload failed");
      }

      const uploaded = (await res.json()) as MediaItem[];

      // Optimistically add the uploaded items to the top of the list so the
      // Library stays consistent if the user navigates back.
      if (Array.isArray(uploaded) && uploaded.length > 0) {
        setItems((prev) => {
          const uploadedIds = new Set(uploaded.map((u) => u.id));
          const dedupedPrev = prev.filter((p) => !uploadedIds.has(p.id));
          return [...uploaded, ...dedupedPrev];
        });
      }

      // Stop "uploading" state before navigating so we don't update state after unmount.
      setUploading(false);

      // Navigate to Learn for the first uploaded item (minimal, predictable behavior).
      const first = Array.isArray(uploaded) ? uploaded[0] : undefined;
      if (first?.id) {
        const playbackUrl = getMediaUrl(first);
        const href = playbackUrl
          ? `/user/learn?mediaId=${encodeURIComponent(String(first.id))}&mediaUrl=${encodeURIComponent(
              playbackUrl,
            )}`
          : `/user/learn?mediaId=${encodeURIComponent(String(first.id))}`;
        router.push(href);
        return;
      }

      // If we didn't get a usable response, fall back to refreshing the list.
      await fetchLibrary();
    } catch (err) {
      console.error("Error uploading media", err);
      setError("Upload failed. Please try again.");
      setUploading(false);
    }
  };

  /**
   * Delete a media record from the local database.
   * This calls DELETE /api/media/{id} which:
   * - Removes the media row from `media_files`
   * - Removes all annotations for that media
   * - Does NOT delete the underlying file from Google Drive
   */
  const handleDelete = async (id: number) => {
    const item = items.find((m) => m.id === id);
    const label = item?.filename ?? `recording #${id}`;

    const ok = window.confirm(
      `Delete this session from your Library?\n\n${label}\n\nThis will remove it from the app and delete its annotations, but will not delete the underlying file from Google Drive.`,
    );
    if (!ok) return;

    setDeletingId(id);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/media/${encodeURIComponent(String(id))}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        console.error("Failed to delete media", res.status);
        throw new Error("Delete failed");
      }

      // Optimistically remove from local list.
      setItems((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      console.error("Error deleting media", err);
      setError("Could not delete that session. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <AppBar title="Library" />

      <Card className="mb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Sessions and uploads</h2>
            <p className="mt-1 text-sm text-neutral-600">
              Review your recordings and uploaded media. Open an item in Learn to annotate it,
              or delete it from your Library if you no longer need it.
            </p>
          </div>

          {/* Hidden file input + visible upload button */}
          <div className="shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              // Accept common media types; backend infers recording_mode from MIME type when possible.
              accept="audio/*,video/*"
              className="hidden"
              onChange={handleSelectedFiles}
            />

            <button
              type="button"
              onClick={handleClickUpload}
              disabled={uploading}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium",
                "hover:border-primary hover:text-primary disabled:opacity-50",
              )}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {uploading ? "Uploading…" : "Upload"}
            </button>
          </div>
        </div>
      </Card>

      {error && (
        <div className="mb-3 rounded-2xl border border-danger/40 bg-danger/5 px-4 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading sessions…
        </div>
      )}

      {!loading && !items.length && !error && (
        <p className="text-sm text-neutral-500">
          You do not have any recordings or uploads yet. Start a new session or upload a file
          to see items appear here.
        </p>
      )}

      <div className="mt-2 space-y-3">
        {items.map((item) => {
          const url = getMediaUrl(item);
          const isVideo = (item.recording_mode ?? "").toLowerCase() === "video";
          const isAudio = (item.recording_mode ?? "").toLowerCase() === "audio";
          const isUpload = (item.media_type ?? "").toLowerCase() === "upload";

          const contextLabel = formatContextLabel(item.session_context);
          const createdLabel = formatDateLabel(item.created_at);

          // Nicer display name instead of raw filename.
          const displayName =
            contextLabel && contextLabel !== "Session"
              ? `${contextLabel} session`
              : createdLabel
              ? `Session on ${createdLabel}`
              : "Recorded session";

          return (
            <Card key={item.id} className="flex flex-col gap-2">
              {/* Header row: context + created date */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700">
                    {contextLabel}
                  </span>

                  {isUpload && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-neutral-50 px-2 py-0.5 text-[11px] font-medium text-neutral-700">
                      <Upload className="h-3 w-3" />
                      Upload
                    </span>
                  )}

                  {isVideo && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700">
                      <Film className="h-3 w-3" />
                      Video
                    </span>
                  )}

                  {isAudio && !isVideo && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                      <Mic className="h-3 w-3" />
                      Audio
                    </span>
                  )}
                </div>

                {createdLabel && <span className="text-xs text-neutral-500">{createdLabel}</span>}
              </div>

              {/* Clean title instead of full filename */}
              <div className="text-sm font-medium text-neutral-900">{displayName}</div>

              {/* Actions row: Open in Learn + Delete */}
              <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Open in Learn (annotation view) */}
                  <Link
                    href={
                      url
                        ? `/user/learn?mediaId=${encodeURIComponent(
                            String(item.id),
                          )}&mediaUrl=${encodeURIComponent(url)}`
                        : `/user/learn?mediaId=${encodeURIComponent(String(item.id))}`
                    }
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium",
                      "hover:border-primary hover:text-primary",
                    )}
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open in Learn
                  </Link>
                </div>

                {/* Delete from Library (DB), keep file on Drive */}
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  disabled={deletingId === item.id}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium",
                    "border border-danger/40 text-danger hover:bg-danger/5 disabled:opacity-50",
                  )}
                >
                  <Trash2 className="h-3 w-3" />
                  {deletingId === item.id ? "Deleting…" : "Delete"}
                </button>
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}


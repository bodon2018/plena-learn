"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppBar from "@/components/navigation/AppBar";
import Card from "@/components/ui/Card";
import { Film, Mic, Trash2, ExternalLink, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Base URL for talking to the FastAPI backend.
 * In dev, set NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
 */
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8000";

/**
 * Shape of media records coming back from /api/media.
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
 * - Prefer the backend-provided `url` when present.
 * - As a fallback, derive a Google Drive preview URL from `filepath`
 *   if it looks like a Drive file id.
 */
function getMediaUrl(item: MediaItem): string | null {
  if (item.url && item.url.trim()) {
    return item.url.trim();
  }

  const path = item.filepath || "";
  if (!path) return null;

  // If filepath already looks like a full URL, use it directly.
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  // Otherwise assume it's a Google Drive file id.
  return `https://drive.google.com/file/d/${path}/preview`;
}

/**
 * Main Library screen: lists recorded sessions and supports deletion.
 */
export default function LibraryScreen() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track which item is currently being deleted so we can disable its button.
  const [deletingId, setDeletingId] = useState<number | null>(null);

  /**
   * Load recordings from the backend.
   * By default we only request media_type=record (session recordings).
   */
  const fetchLibrary = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/media?media_type=record`);
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
        <h2 className="text-lg font-semibold">Recorded sessions</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Review your recorded practices and games. Open a session in Learn to annotate it,
          or delete it from your Library if you no longer need it.
        </p>
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
          You do not have any recorded sessions yet. Start a new session to see recordings
          appear here.
        </p>
      )}

      <div className="mt-2 space-y-3">
        {items.map((item) => {
          const url = getMediaUrl(item);
          const isVideo = (item.recording_mode ?? "").toLowerCase() === "video";
          const isAudio = (item.recording_mode ?? "").toLowerCase() === "audio";

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
                {createdLabel && (
                  <span className="text-xs text-neutral-500">{createdLabel}</span>
                )}
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
                        ? `/user/summary?mediaId=${item.id}&mediaUrl=${encodeURIComponent(
                            url,
                          )}`
                        : `/user/summary?mediaId=${item.id}`
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

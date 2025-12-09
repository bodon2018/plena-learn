"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AppBar from "@/components/navigation/AppBar";
import Card from "@/components/ui/Card";
import { cn } from "@/lib/cn";

/**
 * Shape of a media item as returned by the backend /api/media endpoint.
 * Mirrors MediaFileRead in the FastAPI backend.
 */
type MediaItem = {
  id: number;
  filename: string;
  filepath: string;
  media_type: string; // "upload" | "record"
  mime_type?: string | null;
  created_at: string; // ISO datetime string
  url?: string | null;

  // Extra metadata for Library
  session_context?: string | null;  // "practice" | "game" | null
  recording_mode?: string | null;   // "audio" | "video" | null
};

/**
 * Helper: base URL for the FastAPI backend.
 * In dev, set NEXT_PUBLIC_API_BASE_URL to http://127.0.0.1:8000
 */
function getApiBaseUrl() {
  return (process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
}

/**
 * Helper: format a date into a label ("Today", "Yesterday", or "MMM d, yyyy").
 * This is used as the group header in the Library list.
 */
function formatDateLabel(d: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thatDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffMs = thatDay.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === -1) return "Yesterday";

  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Helper: format a time-of-day for each recording row, e.g. "3:45 PM".
 */
function formatTimeOfDay(d: Date): string {
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Helper: derive a simple media type label (Audio / Video / Media) from MIME type
 * and/or recording_mode when available.
 */
function deriveMediaKindLabel(item: MediaItem): string {
  if (item.recording_mode === "video") return "Video";
  if (item.recording_mode === "audio") return "Audio";

  const mime = item.mime_type || "";
  if (mime.startsWith("video/")) return "Video";
  if (mime.startsWith("audio/")) return "Audio";
  return "Media";
}

/**
 * Helper: format session context into a display label.
 */
function formatSessionContextLabel(ctx?: string | null): string | null {
  if (!ctx) return null;
  const v = ctx.toLowerCase();
  if (v === "practice") return "Practice";
  if (v === "game") return "Game";
  return ctx;
}

/**
 * Helper: group media items by date label for the Library UI.
 * Items are assumed to be sorted descending by created_at from the backend.
 */
function groupMediaByDate(items: MediaItem[]): { label: string; items: MediaItem[] }[] {
  const groups: Record<string, MediaItem[]> = {};

  for (const item of items) {
    const created = new Date(item.created_at);
    const label = formatDateLabel(created);
    if (!groups[label]) {
      groups[label] = [];
    }
    groups[label].push(item);
  }

  const orderedLabels = Object.keys(groups);
  return orderedLabels.map((label) => ({
    label,
    items: groups[label],
  }));
}

/**
 * Helper: compute a playback URL for Learn.
 * Prefer `item.url`, then filepath if it is already a URL, then treat
 * filepath as a Google Drive file id as a last resort.
 */
function getPlaybackUrl(item: MediaItem): string | null {
  if (item.url) return item.url;
  const path = item.filepath || "";
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  // Fallback: Drive-style preview link using the file id
  return `https://drive.google.com/file/d/${path}/preview`;
}

type ContextFilter = "all" | "practice" | "game";
type ModeFilter = "all" | "audio" | "video";

/**
 * LibraryScreen
 *
 * - Fetches list of recordings from /api/media on mount.
 * - Shows them grouped by date with basic metadata (mode + context).
 * - Provides simple filters (Practice/Game, Audio/Video) and text search.
 * - Clicking a row takes you to Learn with mediaId/mediaUrl in the query string.
 */
export default function LibraryScreen() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters (Step 9)
  const [contextFilter, setContextFilter] = useState<ContextFilter>("all");
  const [modeFilter, setModeFilter] = useState<ModeFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  /**
   * Load recordings from backend.
   * This calls GET /api/media and stores the result in state.
   */
  const loadMedia = async () => {
    setLoading(true);
    setError(null);

    try {
      const base = getApiBaseUrl();
      const res = await fetch(`${base}/api/media`, {
        method: "GET",
      });

      if (!res.ok) {
        throw new Error(`Failed to load media: ${res.status}`);
      }

      const data = (await res.json()) as MediaItem[];
      setMedia(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError("Could not load your recordings from the server.");
      setMedia([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch once on mount
  useEffect(() => {
    void loadMedia();
  }, []);

  const hasRecordings = media.length > 0;

  /**
   * Apply filters + search on the client side.
   */
  const filteredMedia = useMemo(() => {
    if (!media.length) return [];

    const query = searchQuery.trim().toLowerCase();

    return media.filter((item) => {
      // Context filter
      if (contextFilter !== "all") {
        const ctx = (item.session_context || "").toLowerCase();
        if (ctx !== contextFilter) return false;
      }

      // Mode filter
      if (modeFilter !== "all") {
        const mode = (item.recording_mode || "").toLowerCase();
        if (mode !== modeFilter) return false;
      }

      // Search filter (filename)
      if (query) {
        const name = (item.filename || "").toLowerCase();
        if (!name.includes(query)) return false;
      }

      return true;
    });
  }, [media, contextFilter, modeFilter, searchQuery]);

  const hasFilteredResults = filteredMedia.length > 0;

  // Group recordings by date label for display (after filters)
  const grouped = useMemo(() => groupMediaByDate(filteredMedia), [filteredMedia]);

  return (
    <>
      {/* Top bar label: "Library" (route is still /user/progress) */}
      <AppBar title="Library" />

      <div className="mt-4 space-y-4">
        {/* High-level status / empty / error card */}
        <Card>
          <h2 className="mb-2 text-lg font-semibold">Your recordings</h2>

          {loading && <p className="text-sm text-neutral-600">Loading recordings…</p>}

          {!loading && error && (
            <div className="space-y-2">
              <p className="text-sm text-amber-800">{error}</p>
              <button
                type="button"
                onClick={loadMedia}
                className="rounded-full bg-primary px-4 py-2 text-xs font-medium text-white"
              >
                Try again
              </button>
            </div>
          )}

          {!loading && !error && !hasRecordings && (
            <div className="space-y-3">
              <p className="text-sm text-neutral-600">
                You do not have any recordings yet. Once you record a game or practice, it will show
                up here by date.
              </p>
              <Link
                href="/user/session"
                className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-xs font-medium text-white"
              >
                Go to Session
              </Link>
            </div>
          )}

          {/* Filters + basic stats (only when there is at least one recording) */}
          {!loading && !error && hasRecordings && (
            <div className="space-y-3">
              <p className="text-sm text-neutral-600">
                You have{" "}
                <span className="font-semibold">
                  {media.length} recording{media.length === 1 ? "" : "s"}
                </span>
                . Use filters to focus on the sessions you want to review.
              </p>

              {/* Filters row */}
              <div className="space-y-2 rounded-2xl bg-neutral-50 p-3 text-xs">
                {/* Context filter */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-neutral-500">Context:</span>
                  {(["all", "practice", "game"] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setContextFilter(value)}
                      className={cn(
                        "rounded-full px-3 py-1",
                        contextFilter === value
                          ? "bg-primary text-white"
                          : "bg-white text-neutral-700 border border-neutral-200",
                      )}
                    >
                      {value === "all" ? "All" : value === "practice" ? "Practice" : "Game"}
                    </button>
                  ))}
                </div>

                {/* Mode filter */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-neutral-500">Type:</span>
                  {(["all", "audio", "video"] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setModeFilter(value)}
                      className={cn(
                        "rounded-full px-3 py-1",
                        modeFilter === value
                          ? "bg-primary text-white"
                          : "bg-white text-neutral-700 border border-neutral-200",
                      )}
                    >
                      {value === "all" ? "All" : value === "audio" ? "Audio" : "Video"}
                    </button>
                  ))}
                </div>

                {/* Search input */}
                <div className="flex items-center gap-2">
                  <span className="text-neutral-500">Search:</span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by file name…"
                    className="flex-1 rounded-full border border-neutral-200 px-3 py-1 text-xs"
                  />
                </div>

                {/* Filtered count */}
                <div className="text-[11px] text-neutral-500">
                  Showing{" "}
                  <span className="font-semibold">
                    {filteredMedia.length} recording{filteredMedia.length === 1 ? "" : "s"}
                  </span>{" "}
                  after filters.
                </div>
              </div>

              {/* No results for current filters */}
              {!hasFilteredResults && (
                <div className="rounded-2xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  No recordings match your current filters. Try clearing some filters or searching
                  for a different file name.
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Grouped list of recordings (only when we have filtered results) */}
        {!loading &&
          !error &&
          hasRecordings &&
          hasFilteredResults &&
          grouped.map((group) => (
            <div key={group.label} className="space-y-2">
              {/* Date header, e.g., "Today", "Yesterday", "Dec 9, 2025" */}
              <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {group.label}
              </h3>

              <Card>
                <ul className="divide-y divide-neutral-100">
                  {group.items.map((item) => {
                    const created = new Date(item.created_at);
                    const timeOfDay = formatTimeOfDay(created);
                    const kindLabel = deriveMediaKindLabel(item);
                    const contextLabel = formatSessionContextLabel(item.session_context);
                    const metaParts = ["Recorded session", kindLabel].concat(
                      contextLabel ? [contextLabel] : [],
                    );

                    const playbackUrl = getPlaybackUrl(item);
                    const clickable = !!playbackUrl;

                    const content = (
                      <div className="flex items-center justify-between gap-3">
                        {/* Left side: time and filename */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] text-neutral-500">
                              {timeOfDay}
                            </span>
                            <span className="line-clamp-1 text-sm font-medium text-neutral-900">
                              {item.filename}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-neutral-500">
                            {metaParts.join(" · ")}
                          </div>
                        </div>

                        {/* Right side: chip showing media_type */}
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold",
                            "bg-neutral-100 text-neutral-700",
                          )}
                        >
                          {item.media_type === "record" ? "Recorded" : "Uploaded"}
                        </span>
                      </div>
                    );

                    return (
                      <li key={item.id} className="py-3">
                        {clickable ? (
                          <Link
                            href={{
                              pathname: "/user/summary",
                              query: {
                                mediaId: item.id,
                                mediaUrl: playbackUrl ?? "",
                              },
                            }}
                            className="block"
                          >
                            {content}
                          </Link>
                        ) : (
                          <div className="opacity-70">{content}</div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </Card>
            </div>
          ))}
      </div>
    </>
  );
}

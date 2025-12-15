"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AppBar from "@/components/navigation/AppBar";
import Card from "@/components/ui/Card";
import { Bookmark } from "lucide-react";
import { cn } from "@/lib/cn";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8000";

type LearnProps = {
  /** Media id coming from the query string, e.g. ?mediaId=8 */
  mediaId: string | null;
  /** Media URL coming from the query string, e.g. Drive link or /media/... path */
  mediaUrl: string | null;
};

/**
 * Shape of an annotation as returned by the backend.
 * We keep snake_case to match the FastAPI schema.
 */
type Annotation = {
  id?: number;
  media_file_id?: number;
  kind: "bookmark" | "note";
  timestamp_ms: number;
  text?: string | null;
  created_at?: string;
};

/** Format seconds from <video>/<audio> into mm:ss. */
function formatTimeLabel(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  const mins = Math.floor(whole / 60);
  const secs = whole % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Normalize any media URL so the browser can actually reach it:
 * - If it already starts with http/https, use it as-is.
 * - If it is a relative path (e.g. "/media/recordings/…"), prefix API_BASE.
 */
function normalizeMediaUrl(url: string | null): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  const base = API_BASE.replace(/\/$/, "");
  if (url.startsWith("/")) {
    return `${base}${url}`;
  }
  return `${base}/${url}`;
}

export default function LearnScreen({ mediaId, mediaUrl }: LearnProps) {
  // ---------------------------------------------------------------------------
  // Playback state
  // ---------------------------------------------------------------------------

  /** Final URL we will hand to the media element (query param or resolved from API). */
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(
    normalizeMediaUrl(mediaUrl),
  );
  /** Whether we should render <video> (true) or <audio> (false). */
  const [isVideo, setIsVideo] = useState<boolean>(true);
  /** Current playback time, driven by native media events. */
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  /** Media duration in seconds. */
  const [durationSec, setDurationSec] = useState(0);

  /**
   * Single ref that points to either <video> or <audio>.
   * We rely on native controls; we only read currentTime and seek on it.
   */
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const attachMediaRef = (el: HTMLVideoElement | HTMLAudioElement | null) => {
    mediaRef.current = el;
  };

  // ---------------------------------------------------------------------------
  // Annotation state
  // ---------------------------------------------------------------------------

  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [annotationsLoading, setAnnotationsLoading] = useState(false);
  const [annotationsError, setAnnotationsError] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  // ---------------------------------------------------------------------------
  // Resolve media URL if one was not provided
  // ---------------------------------------------------------------------------

  useEffect(() => {
    // If the caller already gave us a URL, normalize and use it.
    if (mediaUrl) {
      setResolvedUrl(normalizeMediaUrl(mediaUrl));
      return;
    }

    // If there is no id, we have nothing to resolve.
    if (!mediaId) {
      setResolvedUrl(null);
      return;
    }

    const controller = new AbortController();

    async function resolveUrl() {
      try {
        // IMPORTANT:
        // Pass media_type= (empty) so the backend returns BOTH recordings and uploads.
        // This allows Learn to resolve uploaded items by id when mediaUrl is not provided.
        const res = await fetch(`${API_BASE}/api/media?media_type=`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          console.error("Failed to list media for URL resolution", res.status);
          return;
        }

        const list = (await res.json()) as Array<{ id: number; url?: string | null }>;
        const match = list.find((m) => String(m.id) === String(mediaId));
        if (match?.url) {
          setResolvedUrl(normalizeMediaUrl(match.url));
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        console.error("Error resolving media URL", err);
      }
    }

    void resolveUrl();

    return () => controller.abort();
  }, [mediaId, mediaUrl]);

  // ---------------------------------------------------------------------------
  // Decide whether this URL is more likely audio or video
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!resolvedUrl) {
      setIsVideo(true);
      return;
    }
    const lower = resolvedUrl.toLowerCase();
    const audioLike = /\.(mp3|wav|m4a|aac|ogg)(\?|$)/.test(lower);
    // For Google Drive preview links (no extension) we treat as video by default.
    setIsVideo(!audioLike);
  }, [resolvedUrl]);

  // ---------------------------------------------------------------------------
  // Load annotations for this media id
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!mediaId) {
      setAnnotations([]);
      setAnnotationsError(null);
      return;
    }

    const id: string = mediaId; // stable copy for closure
    const controller = new AbortController();
    setAnnotationsLoading(true);
    setAnnotationsError(null);

    async function loadAnnotations(currentId: string) {
      try {
        const res = await fetch(
          `${API_BASE}/api/media/${encodeURIComponent(currentId)}/annotations`,
          { signal: controller.signal },
        );

        if (!res.ok) {
          console.error("Failed to load annotations", res.status);
          throw new Error("Annotations fetch failed");
        }

        const json = await res.json();
        const items: Annotation[] = Array.isArray(json) ? json : [];
        setAnnotations(items);
        setAnnotationsError(null);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        console.error("Error loading annotations", err);
        setAnnotationsError("Could not load existing annotations from the server.");
      } finally {
        setAnnotationsLoading(false);
      }
    }

    void loadAnnotations(id);
    return () => controller.abort();
  }, [mediaId]);

  // ---------------------------------------------------------------------------
  // Media element event handlers (native controls do the heavy lifting)
  // ---------------------------------------------------------------------------

  const handleLoadedMetadata = () => {
    const el = mediaRef.current;
    if (!el) return;
    setDurationSec(el.duration || 0);
  };

  const handleTimeUpdate = () => {
    const el = mediaRef.current;
    if (!el) return;
    setCurrentTimeSec(el.currentTime || 0);
  };

  /** Seek to a specific time in seconds (used when clicking an annotation). */
  const handleSeek = (targetSeconds: number) => {
    const el = mediaRef.current;
    if (!el || !Number.isFinite(targetSeconds)) return;
    el.currentTime = Math.max(0, targetSeconds);
  };

  // ---------------------------------------------------------------------------
  // Annotation helpers
  // ---------------------------------------------------------------------------

  const currentTimestampMs = useMemo(
    () => Math.round(currentTimeSec * 1000),
    [currentTimeSec],
  );

  const postAnnotation = async (payload: {
    kind: "bookmark" | "note";
    timestamp_ms: number;
    text?: string | null;
  }) => {
    if (!mediaId) return;

    try {
      const res = await fetch(
        `${API_BASE}/api/media/${encodeURIComponent(mediaId)}/annotations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) {
        console.error("Failed to create annotation", res.status);
        return;
      }

      const created = (await res.json()) as Annotation;

      setAnnotations((prev) => {
        const next = [...prev, created];
        return next.sort((a, b) => {
          const tA = a.timestamp_ms ?? 0;
          const tB = b.timestamp_ms ?? 0;
          if (tA !== tB) return tA - tB;
          return (a.id ?? 0) - (b.id ?? 0);
        });
      });
    } catch (err) {
      console.error("Error posting annotation", err);
    }
  };

  const handleAddBookmark = () => {
    if (!mediaId || !mediaRef.current) return;
    void postAnnotation({
      kind: "bookmark",
      timestamp_ms: currentTimestampMs,
      text: null,
    });
  };

  const handleAddNote = () => {
    if (!mediaId || !mediaRef.current) return;
    const trimmed = noteDraft.trim();
    if (!trimmed) return;
    void postAnnotation({
      kind: "note",
      timestamp_ms: currentTimestampMs,
      text: trimmed,
    });
    setNoteDraft("");
  };

  const handleJumpToAnnotation = (ann: Annotation) => {
    const seconds = (ann.timestamp_ms ?? 0) / 1000;
    handleSeek(seconds);
  };

  const sortedAnnotations = useMemo(
    () =>
      [...annotations].sort((a, b) => {
        const tA = a.timestamp_ms ?? 0;
        const tB = b.timestamp_ms ?? 0;
        if (tA !== tB) return tA - tB;
        return (a.id ?? 0) - (b.id ?? 0);
      }),
    [annotations],
  );

  const currentTimeLabel = formatTimeLabel(currentTimeSec);
  const durationLabel = formatTimeLabel(durationSec);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
      <AppBar title="Learn" />

      {/* Media player + annotate controls */}
      <Card className="mb-4">
        <h2 className="mb-3 text-lg font-semibold">Annotate your session</h2>

        {resolvedUrl ? (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-2xl bg-black">
              {isVideo ? (
                <video
                  ref={attachMediaRef}
                  src={resolvedUrl}
                  className="h-full w-full max-h-[260px] object-contain bg-black"
                  controls
                  onLoadedMetadata={handleLoadedMetadata}
                  onTimeUpdate={handleTimeUpdate}
                  playsInline
                />
              ) : (
                <audio
                  ref={attachMediaRef}
                  src={resolvedUrl}
                  className="w-full"
                  controls
                  onLoadedMetadata={handleLoadedMetadata}
                  onTimeUpdate={handleTimeUpdate}
                />
              )}
            </div>

            {/* Simple time readout (native controls handle all play/pause/seek) */}
            <div className="text-right text-xs text-neutral-500">
              {currentTimeLabel} / {durationLabel}
            </div>

            {/* Bookmark + note actions driven by native playback time */}
            <div className="mt-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleAddBookmark}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-white"
                  disabled={!mediaId || !mediaRef.current}
                >
                  <Bookmark className="h-4 w-4" />
                  Add bookmark at {currentTimeLabel}
                </button>
                <span className="text-[11px] text-neutral-500">
                  Tap a bookmark or note below to jump back to that moment.
                </span>
              </div>

              <div className="flex flex-col gap-2">
                <textarea
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  placeholder="Add a quick note about this moment…"
                  className="min-h-[64px] w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleAddNote}
                    className="rounded-full bg-neutral-900 px-4 py-1.5 text-xs font-medium text-white disabled:opacity-40"
                    disabled={!noteDraft.trim() || !mediaId || !mediaRef.current}
                  >
                    Add note at {currentTimeLabel}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-neutral-500">
            No recording selected. Start a session first, or pick a recording from your
            Library, then return here to annotate it.
          </p>
        )}
      </Card>

      {/* Annotations list */}
      <Card>
        <h2 className="mb-2 text-lg font-semibold">Your bookmarks &amp; notes</h2>

        {annotationsLoading && (
          <p className="text-sm text-neutral-500">Loading annotations…</p>
        )}

        {annotationsError && (
          <p className="text-sm text-danger">{annotationsError}</p>
        )}

        {!annotationsLoading && !annotationsError && sortedAnnotations.length === 0 && (
          <p className="text-sm text-neutral-500">
            You have not added any bookmarks or notes yet. Play the recording and capture
            moments you want to revisit.
          </p>
        )}

        <ul className="mt-2 space-y-2">
          {sortedAnnotations.map((ann) => {
            const tsLabel = formatTimeLabel((ann.timestamp_ms ?? 0) / 1000);
            const isBookmark = ann.kind === "bookmark";
            return (
              <li key={ann.id ?? `${ann.kind}-${ann.timestamp_ms}-${ann.text ?? ""}`}>
                <button
                  type="button"
                  onClick={() => handleJumpToAnnotation(ann)}
                  className={cn(
                    "flex w-full items-start gap-2 rounded-xl border px-3 py-2 text-left text-sm",
                    "hover:border-primary/60 hover:bg-primary/5",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                      isBookmark
                        ? "bg-sky-50 text-sky-700"
                        : "bg-amber-50 text-amber-700",
                    )}
                  >
                    {isBookmark ? "Bookmark" : "Note"}
                  </span>
                  <div className="flex-1 space-y-0.5">
                    <div className="flex items-center justify-between text-xs text-neutral-500">
                      <span>{tsLabel}</span>
                      {ann.created_at && (
                        <span>
                          {new Date(ann.created_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      )}
                    </div>
                    {ann.text && (
                      <p className="text-sm text-neutral-800">{ann.text}</p>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </Card>
    </>
  );
}

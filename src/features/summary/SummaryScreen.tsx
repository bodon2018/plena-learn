"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AppBar from "@/components/navigation/AppBar";
import Card from "@/components/ui/Card";
import { Bookmark, Play, Pause, RotateCcw } from "lucide-react";
import { cn } from "@/lib/cn";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8000";

type SummaryProps = {
  /** Media id coming from the query string, e.g. ?mediaId=8 */
  mediaId: string | null;
  /** Media URL coming from the query string, e.g. Drive or /media/... link */
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

/**
 * Convert seconds from the media element into a mm:ss label.
 */
function formatTimeLabel(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  const mins = Math.floor(whole / 60);
  const secs = whole % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function SummaryScreen({ mediaId, mediaUrl }: SummaryProps) {
  // ---------------------------------------------------------------------------
  // Playback state
  // ---------------------------------------------------------------------------

  // URL that we actually want to play (may come from query or from /api/media)
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(mediaUrl);
  // For now we default to video; <video> can play audio too.
  const [isVideo] = useState<boolean>(true);
  const [playing, setPlaying] = useState(false);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [durationSec, setDurationSec] = useState(0);

  // Single ref that will point to either <video> or <audio>
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);

  /**
   * Attach ref for either <video> or <audio> without fighting TS
   * union types. React will call this with the underlying element.
   */
  const attachMediaRef = (el: HTMLVideoElement | HTMLAudioElement | null) => {
    mediaRef.current = el;
  };

  /**
   * The actual src we hand to the <video>/<audio> element.
   *
   * - If resolvedUrl is /media/..., we prefix API_BASE so it hits FastAPI.
   * - If resolvedUrl is some other relative path (e.g. recordings/...), we
   *   also prefix API_BASE.
   * - If resolvedUrl is already absolute (http/https), we leave it alone.
   */
  const playbackSrc = useMemo(() => {
    if (!resolvedUrl) return null;

    const trimmed = resolvedUrl.trim();
    if (!trimmed) return null;

    const isAbsolute =
      trimmed.startsWith("http://") || trimmed.startsWith("https://");

    // Already a full URL – use as-is (covers old Drive URLs)
    if (isAbsolute) return trimmed;

    // If it starts with /media, prefix API_BASE
    if (trimmed.startsWith("/media")) {
      return `${API_BASE}${trimmed}`;
    }

    // Any other relative path – assume it lives under FastAPI
    // e.g. "recordings/foo.mp4" -> "http://127.0.0.1:8000/recordings/foo.mp4"
    return `${API_BASE}/${trimmed.replace(/^\/+/, "")}`;
  }, [resolvedUrl]);

  // ---------------------------------------------------------------------------
  // Annotation state
  // ---------------------------------------------------------------------------

  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [annotationsLoading, setAnnotationsLoading] = useState(false);
  const [annotationsError, setAnnotationsError] = useState<string | null>(null);

  const [noteDraft, setNoteDraft] = useState("");

  // ---------------------------------------------------------------------------
  // Resolve media URL if one was not provided in the query string
  // ---------------------------------------------------------------------------

  useEffect(() => {
    // If the caller already gave us a URL, trust it.
    if (mediaUrl) {
      setResolvedUrl(mediaUrl);
      return;
    }

    // If no id, we cannot resolve anything.
    if (!mediaId) {
      setResolvedUrl(null);
      return;
    }

    const controller = new AbortController();

    async function resolveUrl() {
      try {
        const res = await fetch(`${API_BASE}/api/media?media_type=record`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          console.error("Failed to list media for URL resolution", res.status);
          return;
        }
        const list = (await res.json()) as Array<{
          id: number;
          url?: string | null;
        }>;
        const match = list.find((m) => String(m.id) === String(mediaId));
        if (match?.url) {
          setResolvedUrl(match.url);
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
  // Load annotations for this media id
  // ---------------------------------------------------------------------------

  useEffect(() => {
    // If we have no media id yet, clear list and error.
    if (!mediaId) {
      setAnnotations([]);
      setAnnotationsError(null);
      return;
    }

    const id: string = mediaId;
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
  // Media element handlers
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

  const handlePlay = () => {
    const el = mediaRef.current;
    if (!el) return;
    el.play().catch((err) => {
      console.error("Failed to play media", err);
    });
    setPlaying(true);
  };

  const handlePause = () => {
    const el = mediaRef.current;
    if (!el) return;
    el.pause();
    setPlaying(false);
  };

  const handleTogglePlay = () => {
    const el = mediaRef.current;
    if (!el) return;
    if (el.paused) handlePlay();
    else handlePause();
  };

  const handleSeek = (targetSeconds: number) => {
    const el = mediaRef.current;
    if (!el || !Number.isFinite(targetSeconds)) return;
    el.currentTime = Math.max(0, targetSeconds);
  };

  const handleRestart = () => {
    handleSeek(0);
    handlePlay();
  };

  // ---------------------------------------------------------------------------
  // Annotation helpers
  // ---------------------------------------------------------------------------

  const currentTimestampMs = useMemo(
    () => Math.round(currentTimeSec * 1000),
    [currentTimeSec],
  );

  const handleJumpToAnnotation = (ann: Annotation) => {
    const seconds = (ann.timestamp_ms ?? 0) / 1000;
    handleSeek(seconds);
    handlePlay();
  };

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

      {/* Annotate card: media player + controls */}
      <Card className="mb-4">
        <h2 className="mb-3 text-lg font-semibold">Annotate your session</h2>

        {playbackSrc ? (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-2xl bg-black">
              {isVideo ? (
                <video
                  ref={attachMediaRef}
                  src={playbackSrc}
                  className="h-full w-full max-h-[260px] object-contain bg-black"
                  controls
                  onLoadedMetadata={handleLoadedMetadata}
                  onTimeUpdate={handleTimeUpdate}
                  onPlay={() => setPlaying(true)}
                  onPause={() => setPlaying(false)}
                  playsInline
                />
              ) : (
                <audio
                  ref={attachMediaRef}
                  src={playbackSrc}
                  className="w-full"
                  controls
                  onLoadedMetadata={handleLoadedMetadata}
                  onTimeUpdate={handleTimeUpdate}
                  onPlay={() => setPlaying(true)}
                  onPause={() => setPlaying(false)}
                />
              )}
            </div>

            {/* Playback + timestamp row */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTogglePlay}
                  className={cn(
                    "grid h-9 w-9 place-items-center rounded-full border",
                    playing ? "bg-primary text-white" : "text-neutral-700",
                  )}
                >
                  {playing ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleRestart}
                  className="grid h-8 w-8 place-items-center rounded-full border text-neutral-600"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
              <div className="text-xs text-neutral-500">
                {currentTimeLabel} / {durationLabel}
              </div>
            </div>

            {/* Timeline slider */}
            {Number.isFinite(durationSec) && durationSec > 0 && (
              <input
                type="range"
                min={0}
                max={durationSec}
                step={0.1}
                value={currentTimeSec}
                onChange={(e) => handleSeek(Number(e.target.value))}
                className="w-full"
              />
            )}

            {/* Bookmark + note actions */}
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

      {/* Annotations list card */}
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

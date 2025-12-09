"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import AppBar from "@/components/navigation/AppBar";
import Card from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { Bookmark, Play, Pause, RotateCcw } from "lucide-react";

type SummaryProps = {
  // ID of the media file just recorded (if provided via query string)
  mediaId: string | null;
  // URL where the media can be played (Drive link, etc.)
  mediaUrl: string | null;
};

/**
 * In-memory representation of a bookmark or note tied to a timestamp.
 * Backend stores this as Annotation with timestamp_ms; we keep seconds here.
 */
type AnnotationKind = "bookmark" | "note";

type Annotation = {
  id: string;
  kind: AnnotationKind;
  timestamp: number; // seconds from start of media
  text: string;
};

/**
 * Utility to format a timestamp in seconds as mm:ss, e.g. 75 -> "1:15".
 */
function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  const padded = secs < 10 ? `0${secs}` : String(secs);
  return `${mins}:${padded}`;
}

/**
 * Decide if a URL looks like an audio-only file based on extension.
 * NOTE: Drive links often have no extension; in that case we fall back
 * to the video player (which can still play audio).
 */
function isLikelyAudioUrl(url: string | null): boolean {
  if (!url) return false;
  return /\.(mp3|wav|m4a|ogg)$/i.test(url);
}

/**
 * Base URL for the FastAPI backend.
 * In dev: NEXT_PUBLIC_API_BASE_URL can point to http://127.0.0.1:8000
 */
function getApiBaseUrl() {
  return (process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
}

export default function SummaryScreen({ mediaId, mediaUrl }: SummaryProps) {
  // --- player state ----------------------------------------------------------

  // Whether we think this should use <audio> instead of <video>.
  const audioOnly = useMemo(() => isLikelyAudioUrl(mediaUrl), [mediaUrl]);

  // Separate refs for audio and video elements
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Helper to get the currently active media element
  const getMediaEl = () =>
    (audioOnly ? audioRef.current : videoRef.current) as HTMLMediaElement | null;

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Reset player state whenever we get a new media URL
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    const el = getMediaEl();
    if (el) {
      el.pause();
      el.currentTime = 0;
    }
  }, [mediaUrl, audioOnly]);

  const handlePlayPause = () => {
    const el = getMediaEl();
    if (!el) return;

    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
    } else {
      void el.play().then(
        () => setIsPlaying(true),
        () => {
          // If play() fails (e.g., autoplay blocked), we just keep state as paused.
          setIsPlaying(false);
        },
      );
    }
  };

  const handleSeek = (value: number) => {
    const el = getMediaEl();
    if (!el) return;
    el.currentTime = value;
    setCurrentTime(value);
  };

  const handleLoadedMetadata = () => {
    const el = getMediaEl();
    if (!el) return;
    setDuration(el.duration || 0);
  };

  const handleTimeUpdate = () => {
    const el = getMediaEl();
    if (!el) return;
    setCurrentTime(el.currentTime || 0);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(duration);
  };

  const handleRestart = () => {
    const el = getMediaEl();
    if (!el) return;
    el.currentTime = 0;
    setCurrentTime(0);
    void el.play().then(
      () => setIsPlaying(true),
      () => setIsPlaying(false),
    );
  };

  // --- annotations state (frontend) -----------------------------------------

  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [noteText, setNoteText] = useState("");
  const [savingBookmark, setSavingBookmark] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [annotationError, setAnnotationError] = useState<string | null>(null);
  const [annotationsLoading, setAnnotationsLoading] = useState(false);

  // Short-lived “saved” feedback banner text, e.g. "Bookmark saved".
  const [lastSaveMessage, setLastSaveMessage] = useState<string | null>(null);

  // Auto-hide the "saved" message after a short delay.
  useEffect(() => {
    if (!lastSaveMessage) return;
    const id = window.setTimeout(() => setLastSaveMessage(null), 2500);
    return () => window.clearTimeout(id);
  }, [lastSaveMessage]);

  /**
   * On first load (and whenever mediaId changes), fetch annotations from backend.
   */
  useEffect(() => {
    if (!mediaId) {
      setAnnotations([]);
      return;
    }

    const base = getApiBaseUrl();
    setAnnotationsLoading(true);
    setAnnotationError(null);

    fetch(`${base}/media/${mediaId}/annotations`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Failed to load annotations: ${res.status}`);
        }
        const data = await res.json();
        if (!Array.isArray(data)) return;

        const mapped: Annotation[] = data.map((row: any) => {
          const tsMs = typeof row.timestamp_ms === "number" ? row.timestamp_ms : 0;
          return {
            id: String(row.id),
            kind: row.kind as AnnotationKind,
            timestamp: tsMs / 1000,
            text: row.text ?? "",
          };
        });

        mapped.sort((a, b) => a.timestamp - b.timestamp);
        setAnnotations(mapped);
      })
      .catch((err) => {
        console.error(err);
        setAnnotationError("Could not load existing annotations from the server.");
        setAnnotations([]);
      })
      .finally(() => {
        setAnnotationsLoading(false);
      });
  }, [mediaId]);

  /**
   * Helper to create an annotation on the backend when we have a mediaId.
   * Converts seconds -> milliseconds and maps the response back into
   * the frontend Annotation shape (timestamp in seconds).
   */
  const createAnnotationOnServer = async (
    kind: AnnotationKind,
    timestampSec: number,
    text: string,
  ): Promise<Annotation | null> => {
    if (!mediaId) {
      // No mediaId means we can't call the backend; we treat this as local-only.
      return null;
    }

    const base = getApiBaseUrl();
    const timestamp_ms = Math.round(timestampSec * 1000);

    const res = await fetch(`${base}/media/${mediaId}/annotations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        kind,
        timestamp_ms,
        text: text || null,
      }),
    });

    if (!res.ok) {
      throw new Error(`Failed to create annotation: ${res.status}`);
    }

    const data = await res.json();
    const timestampFromServer =
      typeof data.timestamp_ms === "number" ? data.timestamp_ms / 1000 : timestampSec;

    return {
      id: String(data.id),
      kind: data.kind as AnnotationKind,
      timestamp: timestampFromServer,
      text: data.text ?? "",
    };
  };

  /**
   * Add a bookmark at the current playback time.
   * First tries to persist it via POST /media/{id}/annotations;
   * if that fails or we have no mediaId, we still keep it locally.
   */
  const handleAddBookmark = async () => {
    if (!mediaUrl) return; // no media to bookmark
    const ts = currentTime;
    setAnnotationError(null);
    setSavingBookmark(true);

    const fallbackId = `bookmark-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const fallback: Annotation = {
      id: fallbackId,
      kind: "bookmark",
      timestamp: ts,
      text: "",
    };

    try {
      const fromServer = await createAnnotationOnServer("bookmark", ts, "");
      const ann = fromServer ?? fallback;
      setAnnotations((prev) => [...prev, ann].sort((a, b) => a.timestamp - b.timestamp));
      if (fromServer) {
        setLastSaveMessage("Bookmark saved");
      }
    } catch (err) {
      console.error(err);
      setAnnotationError("Could not save bookmark to the server. It will only stay on this device.");
      // Keep at least a local bookmark so the user sees it.
      setAnnotations((prev) => [...prev, fallback].sort((a, b) => a.timestamp - b.timestamp));
    } finally {
      setSavingBookmark(false);
    }
  };

  /**
   * Add a text note at the current playback time.
   * Same strategy as bookmarks: try backend first, fall back to local.
   */
  const handleAddNote = async () => {
    if (!mediaUrl || !noteText.trim()) return;
    setAnnotationError(null);
    setSavingNote(true);

    const ts = currentTime;
    const text = noteText.trim();
    const fallbackId = `note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const fallback: Annotation = {
      id: fallbackId,
      kind: "note",
      timestamp: ts,
      text,
    };

    try {
      const fromServer = await createAnnotationOnServer("note", ts, text);
      const ann = fromServer ?? fallback;
      setAnnotations((prev) => [...prev, ann].sort((a, b) => a.timestamp - b.timestamp));
      setNoteText("");
      if (fromServer) {
        setLastSaveMessage("Note saved");
      }
    } catch (err) {
      console.error(err);
      setAnnotationError("Could not save note to the server. It will only stay on this device.");
      setAnnotations((prev) => [...prev, fallback].sort((a, b) => a.timestamp - b.timestamp));
      setNoteText("");
    } finally {
      setSavingNote(false);
    }
  };

  /**
   * Jump to the timestamp of the annotation and auto-play that moment.
   */
  const handleJumpToAnnotation = (ann: Annotation) => {
    handleSeek(ann.timestamp);
    const el = getMediaEl();
    if (!el) return;
    void el.play().then(
      () => setIsPlaying(true),
      () => setIsPlaying(false),
    );
  };

  // Highlight annotation close to the current time (within 1.5s window).
  const activeAnnotationId = useMemo(() => {
    if (!annotations.length) return null;
    const threshold = 1.5;
    const candidates = annotations.filter(
      (a) => Math.abs(a.timestamp - currentTime) <= threshold,
    );
    if (!candidates.length) return null;
    // Prefer notes over bookmarks when both are close.
    const sorted = [...candidates].sort((a, b) => {
      if (a.kind === b.kind) return a.timestamp - b.timestamp;
      return a.kind === "note" ? -1 : 1;
    });
    return sorted[0].id;
  }, [annotations, currentTime]);

  const activeAnnotation = useMemo(
    () => annotations.find((a) => a.id === activeAnnotationId) ?? null,
    [annotations, activeAnnotationId],
  );

  // Counts used in header
  const bookmarkCount = useMemo(
    () => annotations.filter((a) => a.kind === "bookmark").length,
    [annotations],
  );
  const noteCount = useMemo(
    () => annotations.filter((a) => a.kind === "note").length,
    [annotations],
  );

  // --- empty state -----------------------------------------------------------

 const hasMedia = !!mediaId && !!mediaUrl;


  const minutes = Math.floor(currentTime / 60);
  const seconds = Math.floor(currentTime % 60);
  const durationLabel = `${formatTime(currentTime)} / ${formatTime(duration)}`;

  return (
    <>
      <AppBar title="Learn" />

      {!hasMedia && (
        <Card className="mb-4">
          <h2 className="mb-2 text-lg font-semibold">No session selected</h2>
          <p className="text-sm text-neutral-600">
            Record a game or practice in the Session tab, then come back here to review it.
          </p>
          <Link
            href="/user/session"
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white"
          >
            <Play className="h-4 w-4" />
            Go to Session
          </Link>
        </Card>
      )}

      {hasMedia && (
        <>
          {/* Annotate card */}
          <Card className="mb-4">
            <h2 className="mb-3 text-lg font-semibold">Annotate your session</h2>

            {/* Media player */}
            <div className="mb-3">
              <div
                className={cn(
                  "overflow-hidden rounded-2xl bg-black",
                  audioOnly ? "p-4" : "aspect-video",
                )}
              >
                {audioOnly ? (
                  <audio
                    ref={audioRef}
                    src={mediaUrl ?? undefined}
                    onLoadedMetadata={handleLoadedMetadata}
                    onTimeUpdate={handleTimeUpdate}
                    onEnded={handleEnded}
                    className="w-full"
                    controls={false}
                  />
                ) : (
                  <video
                    ref={videoRef}
                    src={mediaUrl ?? undefined}
                    onLoadedMetadata={handleLoadedMetadata}
                    onTimeUpdate={handleTimeUpdate}
                    onEnded={handleEnded}
                    className="h-full w-full object-cover"
                    playsInline
                    controls={false}
                  />
                )}
              </div>

              {/* Custom controls */}
              <div className="mt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handlePlayPause}
                  className="grid h-9 w-9 place-items-center rounded-full bg-primary text-white"
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </button>

                <button
                  type="button"
                  onClick={handleRestart}
                  className="grid h-9 w-9 place-items-center rounded-full border border-neutral-300 text-neutral-700"
                  aria-label="Restart"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>

                <div className="flex-1">
                  <input
                    type="range"
                    min={0}
                    max={duration || 0}
                    step={0.1}
                    value={currentTime}
                    onChange={(e) => handleSeek(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="mt-1 flex justify-between text-xs text-neutral-500">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-1 text-xs text-neutral-500">
                Elapsed: {minutes} min {seconds < 10 ? `0${seconds}` : seconds} sec (
                {durationLabel})
              </div>
            </div>

            {/* Error and "saved" feedback */}
            {annotationError && (
              <div className="mb-2 rounded-2xl border border-amber-400 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {annotationError}
              </div>
            )}

            {!annotationError && lastSaveMessage && (
              <div className="mb-2 rounded-2xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                {lastSaveMessage}
              </div>
            )}

            {/* Add bookmark / note */}
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleAddBookmark}
                disabled={savingBookmark}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border border-neutral-300 px-3 py-1 text-xs font-medium",
                  savingBookmark
                    ? "bg-neutral-100 text-neutral-400"
                    : "bg-white text-neutral-700",
                )}
              >
                <Bookmark className="h-4 w-4" />
                {savingBookmark
                  ? "Saving bookmark…"
                  : `Add bookmark at ${formatTime(currentTime)}`}
              </button>
            </div>

            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="text"
                placeholder="Add a quick note…"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="flex-1 rounded-full border border-neutral-300 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={handleAddNote}
                disabled={!noteText.trim() || savingNote}
                className={cn(
                  "mt-2 inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium sm:mt-0",
                  noteText.trim() && !savingNote
                    ? "bg-primary text-white"
                    : "bg-neutral-200 text-neutral-500",
                )}
              >
                {savingNote ? "Saving…" : "Add note"}
              </button>
            </div>

            {/* Annotations list */}
            <div className="mt-2 rounded-2xl bg-neutral-50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-neutral-700">
                  Bookmarks &amp; notes
                </h3>
                {annotations.length > 0 && (
                  <span className="text-[11px] text-neutral-500">
                    {noteCount} note{noteCount === 1 ? "" : "s"} · {bookmarkCount} bookmark
                    {bookmarkCount === 1 ? "" : "s"}
                  </span>
                )}
              </div>

              {activeAnnotation && (
                <div className="mb-2 rounded-xl bg-white px-3 py-2 text-[11px] text-neutral-700">
                  <span className="font-semibold">
                    Now near {activeAnnotation.kind === "note" ? "note" : "bookmark"} at{" "}
                    {formatTime(activeAnnotation.timestamp)}
                    {activeAnnotation.kind === "note" && activeAnnotation.text
                      ? ": "
                      : ""}
                  </span>
                  {activeAnnotation.kind === "note" && activeAnnotation.text && (
                    <span className="line-clamp-1">{activeAnnotation.text}</span>
                  )}
                </div>
              )}

              {annotationsLoading && (
                <p className="text-xs text-neutral-500">Loading annotations…</p>
              )}

              {!annotationsLoading && annotations.length === 0 && (
                <p className="text-xs text-neutral-500">
                  No bookmarks or notes yet. Press <b>Add bookmark</b> or write a note while
                  watching or listening.
                </p>
              )}

              {!annotationsLoading && annotations.length > 0 && (
                <ul className="flex flex-col gap-1">
                  {annotations.map((ann) => (
                    <li key={ann.id}>
                      <button
                        type="button"
                        onClick={() => handleJumpToAnnotation(ann)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs",
                          ann.id === activeAnnotationId
                            ? "bg-primary/10 text-primary"
                            : "bg-white text-neutral-700",
                        )}
                      >
                        <span className="flex items-center gap-2">
                          {ann.kind === "bookmark" && (
                            <Bookmark className="h-3 w-3" />
                          )}
                          <span className="font-mono text-[11px]">
                            {formatTime(ann.timestamp)}
                          </span>
                          {ann.kind === "note" && (
                            <span className="line-clamp-1">{ann.text}</span>
                          )}
                          {ann.kind === "bookmark" && !ann.text && (
                            <span className="text-neutral-400">Bookmark</span>
                          )}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          {/* Placeholder for future AI/analytics section */}
          <Card className="mb-24">
            <h2 className="mb-2 text-lg font-semibold">Learn with your data</h2>
            <p className="mb-3 text-sm text-neutral-600">
              As you add bookmarks and notes, you build a history of key moments. Later we can connect
              this area to analytics or AI to suggest what to focus on next.
            </p>
            <p className="rounded-2xl bg-blue-50 p-3 text-xs text-blue-800">
              TODO: hook this section into an insights/AI endpoint once annotations are stored in the
              backend and queried here.
            </p>
          </Card>
        </>
      )}
    </>
  );
}

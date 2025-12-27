"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { Bookmark, FileText } from "lucide-react";
import Card from "@/components/ui/Card";
import { useMediaPlayer, formatTime } from "./hooks/useMediaPlayer";
import MediaPlayer from "./components/MediaPlayer";
import AnnotationList from "./components/AnnotationList";
import EmptyState from "./components/EmptyState";

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
 * Learn screen - Review and annotate recordings.
 * 
 * Features:
 * - Beautiful audio/video playback with custom controls
 * - Siri-like visualizer for audio
 * - Add bookmarks and notes at any timestamp
 * - Jump back to any annotation
 */
export default function LearnScreen({ mediaId, mediaUrl }: LearnProps) {
  // ---------------------------------------------------------------------------
  // Media player hook
  // ---------------------------------------------------------------------------

  const player = useMediaPlayer({ mediaId, mediaUrl });

  // ---------------------------------------------------------------------------
  // Annotation state
  // ---------------------------------------------------------------------------

  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [annotationsLoading, setAnnotationsLoading] = useState(false);
  const [annotationsError, setAnnotationsError] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  // ---------------------------------------------------------------------------
  // Load annotations for this media id
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!mediaId) {
      setAnnotations([]);
      setAnnotationsError(null);
      return;
    }

    const id = mediaId;
    const controller = new AbortController();
    setAnnotationsLoading(true);
    setAnnotationsError(null);

    async function loadAnnotations() {
      try {
        const res = await fetch(
          `${API_BASE}/api/media/${encodeURIComponent(id)}/annotations`,
          { signal: controller.signal }
        );

        if (!res.ok) {
          throw new Error("Annotations fetch failed");
        }

        const json = await res.json();
        const items: Annotation[] = Array.isArray(json) ? json : [];
        setAnnotations(items);
        setAnnotationsError(null);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        console.error("Error loading annotations", err);
        setAnnotationsError("Could not load annotations from the server.");
      } finally {
        setAnnotationsLoading(false);
      }
    }

    void loadAnnotations();
    return () => controller.abort();
  }, [mediaId]);

  // ---------------------------------------------------------------------------
  // Annotation helpers
  // ---------------------------------------------------------------------------

  const currentTimestampMs = useMemo(
    () => Math.round(player.currentTime * 1000),
    [player.currentTime]
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
        }
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
    if (!mediaId || !player.mediaRef.current) return;
    void postAnnotation({
      kind: "bookmark",
      timestamp_ms: currentTimestampMs,
      text: null,
    });
  };

  const handleAddNote = () => {
    if (!mediaId || !player.mediaRef.current) return;
    const trimmed = noteDraft.trim();
    if (!trimmed) return;
    void postAnnotation({
      kind: "note",
      timestamp_ms: currentTimestampMs,
      text: trimmed,
    });
    setNoteDraft("");
  };

  const handleJumpToAnnotation = (annotation: Annotation) => {
    const seconds = (annotation.timestamp_ms ?? 0) / 1000;
    player.seek(seconds);
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  // Show empty state if no media is selected
  if (!player.resolvedUrl) {
    return (
      <div className="space-y-6">
        {/* Page title */}
        <h1 className="text-heading-1 text-ink">Learn</h1>
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page title */}
      <h1 className="text-heading-1 text-ink">Learn</h1>

      {/* Media player section */}
      <Card>
        <div className="space-y-6">
          {/* Section header */}
          <div>
            <h2 className="text-heading-3 text-ink mb-1">
              Review your session
            </h2>
            <p className="text-body-sm text-mute">
              Play back your recording and add bookmarks at key moments.
            </p>
          </div>

          {/* Player */}
          <MediaPlayer
            url={player.resolvedUrl}
            isVideo={player.isVideo}
            isPlaying={player.isPlaying}
            currentTimeFormatted={player.currentTimeFormatted}
            durationFormatted={player.durationFormatted}
            progress={player.progress}
            setMediaRef={player.setMediaRef}
            onTogglePlayPause={player.togglePlayPause}
            onSkipForward={player.skipForward}
            onSkipBackward={player.skipBackward}
            onSeekToPercent={player.seekToPercent}
            onLoadedMetadata={player.handleLoadedMetadata}
            onTimeUpdate={player.handleTimeUpdate}
            onPlay={player.handlePlay}
            onPause={player.handlePause}
            onEnded={player.handleEnded}
          />

          {/* Annotation actions */}
          <div className="space-y-4 pt-2 border-t border-neutral-100">
            {/* Bookmark button row */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <button
                type="button"
                onClick={handleAddBookmark}
                disabled={!mediaId || !player.mediaRef.current}
                className={cn(
                  "inline-flex items-center justify-center gap-2",
                  "px-4 py-2.5 rounded-full",
                  "bg-sky/10 text-sky",
                  "text-ui font-semibold",
                  "hover:bg-sky/20",
                  "transition-all duration-150",
                  "active:scale-[0.98]",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                <Bookmark className="w-4 h-4" />
                Add bookmark at {player.currentTimeFormatted}
              </button>
              <span className="text-caption text-subtle text-center sm:text-right">
                Tap any bookmark below to jump back
              </span>
            </div>

            {/* Note input */}
            <div className="space-y-3">
              <textarea
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder="Add a quick note about this moment…"
                className={cn(
                  "w-full min-h-[80px] p-4",
                  "rounded-2xl",
                  "border border-neutral-200",
                  "bg-neutral-50",
                  "text-body-sm text-ink",
                  "placeholder:text-subtle",
                  "focus:outline-none focus:border-primary focus:bg-white",
                  "transition-all duration-150",
                  "resize-none"
                )}
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAddNote}
                  disabled={!noteDraft.trim() || !mediaId || !player.mediaRef.current}
                  className={cn(
                    "inline-flex items-center justify-center gap-2",
                    "px-4 py-2.5 rounded-full",
                    "bg-secondary/10 text-secondary",
                    "text-ui font-semibold",
                    "hover:bg-secondary/20",
                    "transition-all duration-150",
                    "active:scale-[0.98]",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  <FileText className="w-4 h-4" />
                  Add note at {player.currentTimeFormatted}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Annotations list */}
      <Card>
        <AnnotationList
          annotations={annotations}
          isLoading={annotationsLoading}
          error={annotationsError}
          onJump={handleJumpToAnnotation}
        />
      </Card>
    </div>
  );
}
// CHANGE (NEW FEATURE): Summary redesigned with an "Annotate your practice" card
// beneath "Your 2 Moments". It includes:
//  - A play/pause control visually matched to Moments
//  - A scrubbable time slider for the full-session audio
//  - "Add Note" and "Bookmark" at the current playback time
//  - A collapsible grey panel listing notes & bookmarks with timestamps
//
// CHANGE (NEW ACTION): Below "Your Metrics", add a right-aligned "Record Again"
// button that navigates to the Session tab.
//
// NOTE: Duration label prefers a store value `lastSessionDurationSec` (if you later
// add it to zustand). If absent, we use the audio file's metadata duration.
//
// This file remains backend-agnostic. When you wire a real session audio URL
// and persisted annotations, replace the placeholder `sessionAudioSrc`.

"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import Link from "next/link";
import AppBar from "@/components/navigation/AppBar";
import Card from "@/components/ui/Card";
import AudioPlayButton from "@/components/audio/AudioPlayButton";
import ProgressBar from "@/components/ui/ProgressBar";
import { CheckCircle2, Lock } from "lucide-react";
import { Play, Pause, Bookmark } from "lucide-react";
import { cn } from "@/lib/cn";
import { statusLabel } from "@/lib/progress";
import { useSessionStore } from "@/store/sessionStore";

type Props = {
  category: string;
  metrics: string[];
};

type Moment = { src: string; tone: "Win" | "Urgent"; label: string };

// Small helper to format seconds like 1:23:45 / 12:34
function fmtTime(totalSec: number | null | undefined) {
  if (!totalSec || totalSec <= 0 || !isFinite(totalSec)) return "0:00";
  const s = Math.floor(totalSec % 60)
    .toString()
    .padStart(2, "0");
  const m = Math.floor((totalSec / 60) % 60).toString();
  const h = Math.floor(totalSec / 3600);
  return h > 0 ? `${h}:${m.padStart(2, "0")}:${s}` : `${m}:${s}`;
}

export default function SummaryScreen({ category, metrics = [] }: Props) {
  // Mirror Progress unlock state for metrics
  const progressByMetric = useSessionStore((s) => s.progressByMetric);

  // CHANGE (USE STORE IF AVAILABLE): optional last session duration (in seconds)
  const storeDuration = useSessionStore((s: any) => s.lastSessionDurationSec ?? undefined);

  // CHOOSE active metric: first unlocked, else first
  const activeMetric = useMemo(() => {
    if (!metrics.length) return "";
    const firstUnlocked = metrics.find((m) => progressByMetric?.[m]?.unlocked);
    return firstUnlocked ?? metrics[0];
  }, [metrics, progressByMetric]);

  // Win + Urgent only
  const MOMENTS: Moment[] = useMemo(
    () => [
      { src: "/audio/top1.mp3", tone: "Win", label: "Moment #1" },
      { src: "/audio/top3.mp3", tone: "Urgent", label: "Moment #2" }
    ],
    []
  );

  const [playingIdx, setPlayingIdx] = useState<number | null>(null);

  // Derive normalized list from progress store
  const list = useMemo(
    () =>
      (metrics ?? []).map((m, idx) => {
        const item = progressByMetric?.[m];
        return (
          item ?? {
            metric: m,
            value: 0,
            target: 1,
            unlocked: idx === 0
          }
        );
      }),
    [metrics, progressByMetric]
  );

  /* =========================
     Annotate your practice
     ========================= */
  // CHANGE (SESSION AUDIO): Replace with your real recorded session URL when available.
  const sessionAudioSrc = "/audio/top2.mp3";

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [durationSec, setDurationSec] = useState<number>(0);
  const [currentSec, setCurrentSec] = useState<number>(0);
  const [panelOpen, setPanelOpen] = useState(true); // grey panel collapsible

  // Simple annotation model kept locally; swap with backend later.
  type Note = { t: number; text: string };
  type Mark = { t: number };
  const [notes, setNotes] = useState<Note[]>([]);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [noteText, setNoteText] = useState("");

  // Init audio events
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const onLoaded = () => {
      setDurationSec(Math.floor(el.duration || 0));
    };
    const onTime = () => setCurrentSec(el.currentTime || 0);
    const onEnded = () => setIsPlaying(false);

    el.addEventListener("loadedmetadata", onLoaded);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("ended", onEnded);

    return () => {
      el.removeEventListener("loadedmetadata", onLoaded);
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("ended", onEnded);
    };
  }, []);

  // Prefer store duration if present
  const displayDuration = storeDuration ?? durationSec;

  // Controls
  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
    } else {
      el.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };
  const onScrub = (val: number) => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = val;
    setCurrentSec(val);
  };
  const addNote = () => {
    if (!noteText.trim()) return;
    setNotes((n) => [...n, { t: Math.floor(currentSec), text: noteText.trim() }]);
    setNoteText("");
  };
  const addBookmark = () => {
    setMarks((m) => [...m, { t: Math.floor(currentSec) }]);
  };
  const jumpTo = (t: number) => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = t;
    setCurrentSec(t);
  };

  return (
    <>
      <AppBar title="Session Summary" />

      {/* ===== Moments (Win + Urgent only) ===== */}
      <Card>
        <h2 className="text-xl font-bold">Your 2 Moments</h2>
        <div className="mt-3 space-y-3">
          {MOMENTS.map((m, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-3 rounded-xl border p-3"
            >
              <div className="flex items-center gap-3">
                <AudioPlayButton
                  src={m.src}
                  playing={playingIdx === i}
                  onPlay={() => setPlayingIdx(i)}
                  onPause={() =>
                    setPlayingIdx((idx) => (idx === i ? null : idx))
                  }
                  label="20s"
                />
                <div className="text-sm">
                  <div className="font-medium">{m.label}</div>
                  <div className="text-xs text-neutral-500">
                    20 sec · session clip
                  </div>
                </div>
              </div>

              <span
                className={cn(
                  "rounded-md px-2 py-0.5 text-xs",
                  m.tone === "Win"
                    ? "bg-success/15 text-success"
                    : "bg-danger/15 text-danger"
                )}
              >
                {m.tone}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* ===== CHANGE (NEW CARD): Annotate your practice ===== */}
      <Card className="mt-4">
        <h2 className="text-xl font-bold">Annotate Your Practice</h2>

        <div className="mt-3 flex items-center gap-3">
          {/* Visually match Moments button (simple inline version) */}
          <button
            onClick={togglePlay}
            className="grid h-10 w-10 place-items-center rounded-xl border"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </button>

          <div className="text-sm">
            <div className="font-medium">Full session</div>
            {/* CHANGE: Duration shows actual session length if available */}
            <div className="text-xs text-neutral-500">
              {fmtTime(displayDuration)}
            </div>
          </div>
        </div>

        {/* Hidden audio element we control */}
        <audio ref={audioRef} src={sessionAudioSrc} preload="metadata" />

        {/* Scrub bar (like Frequency slider, but horizontal time ruler) */}
        <div className="mt-3">
          <input
            type="range"
            min={0}
            max={Math.max(1, Math.floor(displayDuration || durationSec || 0))}
            value={Math.floor(currentSec)}
            onChange={(e) => onScrub(parseInt(e.target.value))}
            className="w-full"
          />
          <div className="mt-1 flex items-center justify-between text-xs text-neutral-500">
            <span>{fmtTime(currentSec)}</span>
            <span>{fmtTime(displayDuration)}</span>
          </div>
        </div>

        {/* Add Note & Bookmark controls */}
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={addBookmark}
            className="inline-flex items-center gap-1 rounded-pill border px-3 py-1.5 text-sm"
          >
            <Bookmark className="h-4 w-4" />
            Bookmark
          </button>
          <input
            type="text"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Add a quick note…"
            className="flex-1 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="button"
            onClick={addNote}
            className="btn-primary text-sm"
            disabled={!noteText.trim()}
          >
            Add note
          </button>
        </div>

        {/* Collapsible Notes & Bookmarks list in soft grey like locked metrics */}
        <div className="mt-3">
          <button
            type="button"
            className="text-xs text-neutral-600 underline"
            onClick={() => setPanelOpen((v) => !v)}
          >
            {panelOpen ? "Hide notes & bookmarks" : "Show notes & bookmarks"}
          </button>

          {panelOpen && (
            <div className="mt-2 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
              {/* Bookmarks */}
              <div className="text-xs font-semibold text-neutral-600">
                Bookmarks
              </div>
              {marks.length === 0 ? (
                <div className="mt-1 text-xs text-neutral-500">
                  No bookmarks yet.
                </div>
              ) : (
                <ul className="mt-1 space-y-1">
                  {marks.map((b, idx) => (
                    <li key={`bm-${idx}`} className="flex items-center gap-2">
                      <button
                        className="rounded border px-2 py-0.5 text-xs"
                        onClick={() => jumpTo(b.t)}
                        title="Jump to time"
                      >
                        {fmtTime(b.t)}
                      </button>
                      <span className="text-xs text-neutral-600">
                        Bookmark
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {/* Notes */}
              <div className="mt-3 text-xs font-semibold text-neutral-600">
                Notes
              </div>
              {notes.length === 0 ? (
                <div className="mt-1 text-xs text-neutral-500">No notes yet.</div>
              ) : (
                <ul className="mt-1 space-y-1">
                  {notes.map((n, idx) => (
                    <li key={`nt-${idx}`} className="flex items-center gap-2">
                      <button
                        className="rounded border px-2 py-0.5 text-xs"
                        onClick={() => jumpTo(n.t)}
                        title="Jump to time"
                      >
                        {fmtTime(n.t)}
                      </button>
                      <span className="text-xs text-neutral-700">{n.text}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* ===== Metrics (focus on active metric; others locked unless unlocked) ===== */}
      <Card className="mt-4">
        <h2 className="text-xl font-bold">Your Metrics</h2>

        <div className="mt-4 grid grid-cols-1 gap-3">
          {list.map((m) => {
            const isActive = m.metric === activeMetric;
            const isLocked = !m.unlocked;
            const label = statusLabel(isLocked ? 0 : m.value);

            return (
              <div
                key={m.metric}
                className={cn(
                  "rounded-2xl border p-4",
                  isLocked && "opacity-70",
                  !isActive && "bg-neutral-50"
                )}
              >
                <div className="mb-1 flex items-center gap-2">
                  <div className={cn("font-medium", !isActive && "text-neutral-600")}>
                    {m.metric}
                    {isActive && (
                      <span className="ml-2 rounded-md bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                        Focused
                      </span>
                    )}
                  </div>

                  <span
                    className={cn(
                      "ml-auto inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs",
                      isLocked
                        ? "bg-neutral-200 text-neutral-600"
                        : label === "Mastered"
                        ? "bg-success/15 text-success"
                        : label === "On track"
                        ? "bg-secondary/15 text-secondary"
                        : "bg-sky/15 text-sky"
                    )}
                  >
                    {isLocked ? (
                      <Lock className="h-3.5 w-3.5" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    {isLocked ? "Locked" : label}
                  </span>
                </div>

                {isActive ? (
                  <>
                    <ProgressBar value={isLocked ? 0 : m.value} target={m.target ?? 1} />
                    <div className="mt-2 flex items-center gap-2 text-xs text-neutral-500">
                      {!isLocked ? (
                        <>
                          <span>{Math.round(m.value * 100)}%</span>
                          <span className="ml-auto">Target: 100%</span>
                        </>
                      ) : (
                        <span>Unlock this metric to start tracking progress.</span>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="mt-2 flex items-center gap-2 text-xs text-neutral-500">
                    {isLocked ? (
                      <span>Locked — complete focus steps to unlock.</span>
                    ) : (
                      <span>Unlocked — not focused this session.</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* CHANGE (NEW ACTION): Right-aligned Record Again button below metrics */}
      <div className="mt-3 flex justify-end">
        <Link
          href="/session"
          className="btn-outline"   // instead of custom border+hover, use shared white style
        >
          Record Again
        </Link>
      </div>
    </>
  );
}

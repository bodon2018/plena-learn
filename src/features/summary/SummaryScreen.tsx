"use client";

/**
 * CHANGE (NEW CARD): “Learn with your data”
 * - Sits directly BELOW “Annotate Your Practice”.
 * - Users can tap any Bookmark/Note in the Annotate card to add it as a context chip
 *   in the new card. They can also remove chips.
 * - A small chat composer lets them ask questions; an AI reply appears (mock for now).
 * - Reply area is compact to preserve the clean visual hierarchy.
 *
 * CHANGE (ANNOTATE): Notes/Bookmarks list items get a tiny “Use in chat” affordance
 * (the whole pill is clickable) that pushes the annotation into the “Learn with your data” context.
 *
 * NOTE: This file remains backend-agnostic. Replace the mock AI reply with a real fetch
 * to /api/summary/ask (or similar) later.
 */

import { useMemo, useRef, useState, useEffect } from "react";
import Link from "next/link";
import AppBar from "@/components/navigation/AppBar";
import Card from "@/components/ui/Card";
import AudioPlayButton from "@/components/audio/AudioPlayButton";
import ProgressBar from "@/components/ui/ProgressBar";
import { CheckCircle2, Lock, Play, Pause, Bookmark, X, Send } from "lucide-react";
import { cn } from "@/lib/cn";
import { statusLabel } from "@/lib/progress";
import { useSessionStore } from "@/store/sessionStore";

type Props = {
  category: string;
  metrics: string[];
};

type Moment = { src: string; tone: "Win" | "Urgent"; label: string };

/* Helper: format seconds to 0:00 / 1:23:45 */
function fmtTime(totalSec: number | null | undefined) {
  if (!totalSec || totalSec <= 0 || !isFinite(totalSec)) return "0:00";
  const s = Math.floor(totalSec % 60).toString().padStart(2, "0");
  const m = Math.floor((totalSec / 60) % 60).toString();
  const h = Math.floor(totalSec / 3600);
  return h > 0 ? `${h}:${m.padStart(2, "0")}:${s}` : `${m}:${s}`;
}

export default function SummaryScreen({ category, metrics = [] }: Props) {
  /* ====== Metrics state (mirrors Progress tab) ====== */
  const progressByMetric = useSessionStore((s) => s.progressByMetric);
  const storeDuration = useSessionStore((s: any) => s.lastSessionDurationSec ?? undefined);

  const activeMetric = useMemo(() => {
    if (!metrics.length) return "";
    const firstUnlocked = metrics.find((m) => progressByMetric?.[m]?.unlocked);
    return firstUnlocked ?? metrics[0];
  }, [metrics, progressByMetric]);

  /* ====== Moments (Win + Urgent) — unchanged from current ====== */
  const MOMENTS: Moment[] = useMemo(
    () => [
      { src: "/audio/top1.mp3", tone: "Win",    label: "Moment #1" },
      { src: "/audio/top3.mp3", tone: "Urgent", label: "Moment #2" },
    ],
    []
  );
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);

  /* ====== Normalize metrics list for rendering (unchanged) ====== */
  const list = useMemo(
    () =>
      (metrics ?? []).map((m, idx) => {
        const item = progressByMetric?.[m];
        return (
          item ?? {
            metric: m,
            value: idx === 0 ? 0.45 : 0, // demo default for first metric
            target: 1,
            unlocked: idx === 0,
          }
        );
      }),
    [metrics, progressByMetric]
  );

  /* =========================
     Annotate your practice
     ========================= */
  const sessionAudioSrc = "/audio/top2.mp3";

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [durationSec, setDurationSec] = useState<number>(0);
  const [currentSec, setCurrentSec] = useState<number>(0);
  const [panelOpen, setPanelOpen] = useState(true);

  type Note = { t: number; text: string };
  type Mark = { t: number };
  const [notes, setNotes] = useState<Note[]>([]);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [noteText, setNoteText] = useState("");

  // CHANGE (NEW STATE): context items selected for “Learn with your data”
  type ContextItem =
    | { kind: "bookmark"; t: number }
    | { kind: "note"; t: number; text: string };
  const [contextItems, setContextItems] = useState<ContextItem[]>([]);

  // Init audio events
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const onLoaded = () => setDurationSec(Math.floor(el.duration || 0));
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

  const displayDuration = storeDuration ?? durationSec;

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
    } else {
      el
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
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

  // CHANGE (HANDLERS): push an annotation into the “Learn with your data” context
  const pushBookmarkToContext = (t: number) => {
    setContextItems((prev) => [...prev, { kind: "bookmark", t }]);
  };
  const pushNoteToContext = (t: number, text: string) => {
    setContextItems((prev) => [...prev, { kind: "note", t, text }]);
  };
  const removeContextAt = (idx: number) => {
    setContextItems((prev) => prev.filter((_, i) => i !== idx));
  };

  /* =========================
     Learn with your data (chat)
     ========================= */
  type ChatMsg = { role: "user" | "assistant"; text: string; ts: number };
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");

  const send = async () => {
    const q = input.trim();
    if (!q) return;
    setChat((c) => [...c, { role: "user", text: q, ts: Date.now() }]);
    setInput("");

    // CHANGE (MOCK AI): Replace with a real fetch later
    const summaryBits = contextItems
      .map((ci) =>
        ci.kind === "bookmark"
          ? `bookmark @ ${fmtTime(ci.t)}`
          : `note @ ${fmtTime(ci.t)}: "${ci.text}"`
      )
      .join("; ");

    const mock = `Considering ${summaryBits || "your session"}, here’s a concise suggestion focused on your current metric: try one concrete behavior in your next turn.`;

    // small delay to feel async
    setTimeout(() => {
      setChat((c) => [...c, { role: "assistant", text: mock, ts: Date.now() }]);
    }, 350);
  };

  return (
    <>
      <AppBar title="Session Summary" />

      {/* ===== Your 2 Moments (unchanged) ===== */}
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
                  onPause={() => setPlayingIdx((idx) => (idx === i ? null : idx))}
                  label="20s"
                />
                <div className="text-sm">
                  <div className="font-medium">{m.label}</div>
                  <div className="text-xs text-neutral-500">20 sec · session clip</div>
                </div>
              </div>

              <span
                className={cn(
                  "rounded-md px-2 py-0.5 text-xs",
                  m.tone === "Win" ? "bg-success/15 text-success" : "bg-danger/15 text-danger"
                )}
              >
                {m.tone}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* ===== Annotate Your Practice (now emits context to chat) ===== */}
      <Card className="mt-4">
        <h2 className="text-xl font-bold">Annotate Your Practice</h2>

        {/* CHANGE: put Bookmark button to the far right of “Full session” row */}
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="grid h-10 w-10 place-items-center rounded-xl border"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </button>

            <div className="text-sm">
              <div className="font-medium">Full session</div>
              <div className="text-xs text-neutral-500">{fmtTime(displayDuration)}</div>
            </div>
          </div>

          {/* NEW POSITION: Bookmark button styled like “Send” */}
          <button type="button" onClick={addBookmark} className="btn-primary">
            <Bookmark className="mr-1 inline-block h-4 w-4" />
            Bookmark
          </button>
        </div>

        <audio ref={audioRef} src={sessionAudioSrc} preload="metadata" />

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

        {/* Controls */}
        <div className="mt-3 flex items-center gap-2">
          {/* REMOVED bookmark from here (moved above) */}
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
            className="btn-primary"
            disabled={!noteText.trim()}
          >
            Add note
          </button>
        </div>

        {/* Lists with round-corner pills that are clickable to “Use in chat” */}
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
              <div className="text-xs font-semibold text-neutral-600">Bookmarks</div>
              {marks.length === 0 ? (
                <div className="mt-1 text-xs text-neutral-500">No bookmarks yet.</div>
              ) : (
                <ul className="mt-1 flex flex-wrap gap-2">
                  {marks.map((b, idx) => (
                    <li key={`bm-${idx}`}>
                      {/* CHANGE: rounded pill; click to add to chat context */}
                      <button
                        className="rounded-full border border-neutral-300 bg-white px-3 py-1 text-xs hover:bg-neutral-50"
                        title="Use in chat"
                        onClick={() => pushBookmarkToContext(b.t)}
                      >
                        ⏱ {fmtTime(b.t)}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* Notes */}
              <div className="mt-3 text-xs font-semibold text-neutral-600">Notes</div>
              {notes.length === 0 ? (
                <div className="mt-1 text-xs text-neutral-500">No notes yet.</div>
              ) : (
                <ul className="mt-1 flex flex-col gap-2">
                  {notes.map((n, idx) => (
                    <li key={`nt-${idx}`} className="flex items-center gap-2">
                      <button
                        className="rounded-full border border-neutral-300 bg-white px-2 py-0.5 text-[11px] hover:bg-neutral-50"
                        title="Jump to time"
                        onClick={() => jumpTo(n.t)}
                      >
                        {fmtTime(n.t)}
                      </button>
                      {/* CHANGE: rounded note box; click to add to chat context */}
                      <button
                        className="max-w-[80%] rounded-xl border border-neutral-200 bg-white px-3 py-2 text-left text-xs hover:bg-neutral-50"
                        title="Use in chat"
                        onClick={() => pushNoteToContext(n.t, n.text)}
                      >
                        {n.text}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* ===== CHANGE (NEW CARD): Learn with your data (chat over selected annotations) ===== */}
      <Card className="mt-4">
        <h2 className="text-xl font-bold">Learn with your data</h2>

        {/* Selected context chips */}
        <div className="mt-3 flex flex-wrap gap-2">
          {contextItems.length === 0 ? (
            <div className="text-xs text-neutral-500">
              Tip: tap a bookmark or note above to add it here as context.
            </div>
          ) : (
            contextItems.map((ci, i) => (
              <span
                key={`cx-${i}`}
                className="inline-flex items-center gap-1 rounded-full border border-neutral-300 bg-white px-3 py-1 text-xs"
                title={ci.kind === "bookmark" ? "Bookmark" : "Note"}
              >
                {ci.kind === "bookmark" ? `⏱ ${fmtTime(ci.t)}` : `📝 ${fmtTime(ci.t)} · ${ci.text}`}
                <button
                  className="ml-1 rounded-full p-0.5 hover:bg-neutral-100"
                  onClick={() => removeContextAt(i)}
                  aria-label="Remove"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))
          )}
        </div>

        {/* Compact transcript area */}
        <div className="mt-3 max-h-40 overflow-auto rounded-xl border border-neutral-200 bg-neutral-50 p-3">
          {chat.length === 0 ? (
            <div className="text-xs text-neutral-500">No conversation yet.</div>
          ) : (
            <ul className="space-y-2">
              {chat.map((m) => (
                <li
                  key={m.ts}
                  className={cn(
                    "max-w-[85%] rounded-xl px-3 py-2 text-xs",
                    m.role === "user"
                      ? "ml-auto bg-primary/10 text-primary"
                      : "bg-white text-neutral-800 border border-neutral-200"
                  )}
                >
                  {m.text}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Composer (small, right-aligned send) */}
        <div className="mt-3 flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about those moments…"
            className="flex-1 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
          <button className="btn-primary" onClick={send} disabled={!input.trim()}>
            <Send className="mr-1 inline-block h-4 w-4" />
            Send
          </button>
        </div>
      </Card>

      {/* ===== Your Metrics (unchanged) ===== */}
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
                    {isLocked ? <Lock className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    {isLocked ? "Locked" : label}
                  </span>
                </div>

                {/* Bar */}
                <ProgressBar value={isLocked ? 0 : m.value} target={m.target ?? 1} />

                {/* % + Target below bar (small) */}
                <div className="mt-1 flex items-center text-xs text-neutral-600">
                  <span>{isLocked ? "0%" : `${Math.round(m.value * 100)}%`}</span>
                  <span className="ml-auto">Target: {Math.round((m.target ?? 1) * 100)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Right-aligned Record Again (route under /user) */}
      <div className="mt-3 flex justify-end">
        <Link href="/user/session" className="btn-outline">
          Record Again
        </Link>
      </div>
    </>
  );
}

/*
CHANGES MADE (for this request):
1) Moved the Bookmark button to the far right of the “Full session” row inside the Annotate card.
   - Layout change: the row now uses `justify-between` and wraps the play+label on the left and
     a `btn-primary` Bookmark button on the right.
   - Exact area marked with comment: “put Bookmark button to the far right…”.
2) Removed the old Bookmark button from the controls row (under the scrubber) so it doesn’t duplicate.
3) Kept the “Add note” button inside the card and styled as `btn-primary` to match the “Send” button.
*/ 

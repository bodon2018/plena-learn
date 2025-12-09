"use client";

/**
 * CHANGE (REMOVAL): The "Your Metrics" card has been removed from Summary,
 * per request. All related imports (ProgressBar, statusLabel, Lock, CheckCircle2),
 * props, and derived metric state were deleted to avoid unused-code errors.
 * The rest of the page (Your 2 Moments, Annotate Your Practice, Learn with your data,
 * and the "Record Again" button) continues to work unchanged.
 *
 * NOTE: This file stays backend-agnostic; audio, chat, and annotations are mock/local only.
 *
 * NEW CHANGE (COMMENT): The "Your 2 Moments" section is fully commented out per request,
 * along with its dedicated import and state, so only "Annotate Your Practice" and
 * "Learn with your data" render now. Uncomment to restore.
 */

import { /* useMemo, */ useRef, useState, useEffect } from "react";
import Link from "next/link";
import AppBar from "@/components/navigation/AppBar";
import Card from "@/components/ui/Card";
// CHANGE: comment out AudioPlayButton import (used only by the Moments section)
// import AudioPlayButton from "@/components/audio/AudioPlayButton";
// CHANGE: removed ProgressBar import
// import ProgressBar from "@/components/ui/ProgressBar";
// CHANGE: removed statusLabel import
// import { statusLabel } from "@/lib/progress";
import { Play, Pause, Bookmark, X, Send } from "lucide-react"; // CHANGE: trimmed icon imports
import { cn } from "@/lib/cn";
import { useSessionStore } from "@/store/sessionStore";
// CHANGE: removed useMetricsStore import
// import { useMetricsStore } from "@/hooks/useMetricsStore";

type Props = {
  // CHANGE: keep type for compatibility, but we no longer use these in Summary
  category?: string;
  metrics?: string[];
};

// CHANGE: comment out Moment type (used only by Moments section)
// type Moment = { src: string; tone: "Win" | "Urgent"; label: string };

/* Helper: format seconds to 0:00 / 1:23:45 */
function fmtTime(totalSec: number | null | undefined) {
  if (!totalSec || totalSec <= 0 || !isFinite(totalSec)) return "0:00";
  const s = Math.floor(totalSec % 60).toString().padStart(2, "0");
  const m = Math.floor((totalSec / 60) % 60).toString();
  const h = Math.floor(totalSec / 3600);
  return h > 0 ? `${h}:${m.padStart(2, "0")}:${s}` : `${m}:${s}`;
}

export default function SummaryScreen({}: Props) {
  /* ===== Moments (Win + Urgent) ===== */
  // CHANGE: comment out Moments data and local playing state
  // const MOMENTS: Moment[] = useMemo(
  //   () => [
  //     { src: "/audio/top1.mp3", tone: "Win",    label: "Moment #1" },
  //     { src: "/audio/top3.mp3", tone: "Urgent", label: "Moment #2" },
  //   ],
  //   []
  // );
  // const [playingIdx, setPlayingIdx] = useState<number | null>(null);

  /* ===== Store values (duration) ===== */
  const storeDuration = useSessionStore((s: any) => s.lastSessionDurationSec ?? undefined);

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

  // CHANGE (NEW STATE from previous work): chips used by "Learn with your data"
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

  // Push an annotation into the “Learn with your data” context
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

    // Mock “AI” reply (replace with real fetch later)
    const summaryBits = contextItems
      .map((ci) =>
        ci.kind === "bookmark"
          ? `bookmark @ ${fmtTime(ci.t)}`
          : `note @ ${fmtTime(ci.t)}: "${ci.text}"`
      )
      .join("; ");
    const mock =
      `Considering ${summaryBits || "your session"}, here’s a concise suggestion: ` +
      `try one concrete behavior in your next turn.`;

    setTimeout(() => {
      setChat((c) => [...c, { role: "assistant", text: mock, ts: Date.now() }]);
    }, 350);
  };

  return (
    <>
      <AppBar title="Session Summary" />

      {/* ===== Your 2 Moments ===== */}
      {/*
      CHANGE (COMMENTED OUT): The entire Moments card is commented out per request.
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
      */}

      {/* ===== Annotate Your Practice ===== */}
      <Card className="mt-4">
        <h2 className="text-xl font-bold">Annotate Your Practice</h2>

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

          {/* Bookmark button */}
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

        {/* Notes & Bookmarks list */}
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

      {/* ===== Learn with your data (chat) TD: replace learn with your data with a prompt that makes coaches reflect ===== */}
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

        {/* Composer */}
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

      {/* Right-aligned Record Again (route under /user) */}
      <div className="mt-3 flex justify-end">
        <Link href="/user/session" className="btn-outline">
          Record Again
        </Link>
      </div>
    </>
  );
}

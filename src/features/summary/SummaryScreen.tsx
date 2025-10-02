"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link"; // CHANGE: used for "Record Again" navigation
import AppBar from "@/components/navigation/AppBar";
import Card from "@/components/ui/Card";
import ProgressBar from "@/components/ui/ProgressBar";
import { Play, Pause, Bookmark } from "lucide-react";
import { cn } from "@/lib/cn";
import { useSessionStore } from "@/store/sessionStore";
import { METRICS_BY_CATEGORY } from "@/lib/constants";

export default function SummaryScreen() {
  const category = useSessionStore((s) => s.category);
  const metrics = useMemo(() => METRICS_BY_CATEGORY[category] ?? [], [category]);

  // --- Audio state for "Annotate Your Practice" ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [pos, setPos] = useState(0); // 0..1 slider position
  const [durationSec] = useState(60); // placeholder duration (wire to real session length)
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [noteText, setNoteText] = useState("");
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  const [notes, setNotes] = useState<{ t: number; text: string }[]>([]);
  const [showLists, setShowLists] = useState(true);

  const currentTimeSec = Math.round(pos * durationSec);

  const togglePlay = () => {
    setIsPlaying((p) => !p);
    // TODO: integrate real <audio> element with audioRef.current?.play()/pause()
  };

  const addBookmark = () => {
    setBookmarks((b) => Array.from(new Set([...b, currentTimeSec])));
  };

  const addNote = () => {
    if (!noteText.trim()) return;
    setNotes((n) => [...n, { t: currentTimeSec, text: noteText.trim() }]);
    setNoteText("");
  };

  return (
    <>
      <AppBar title="Session Summary" />

      {/* Your 2 Moments (unchanged spec: show Win + Urgent) */}
      <Card>
        <h2 className="text-xl font-bold">Your 2 Moments</h2>

        <div className="mt-3 space-y-3">
          {[{ label: "Moment #1", tone: "Win" }, { label: "Moment #2", tone: "Urgent" }].map(
            (m, i) => (
              <div key={i} className="flex items-center justify-between gap-3 rounded-xl border p-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="grid h-10 w-10 place-items-center rounded-xl border"
                  >
                    {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                  </button>
                  <div className="text-sm">
                    <div className="font-medium">{m.label}</div>
                    <div className="text-xs text-neutral-500">20 sec · session clip</div>
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
            )
          )}
        </div>
      </Card>

      {/* Annotate Your Practice */}
      <Card className="mt-4">
        <h2 className="text-xl font-bold">Annotate Your Practice</h2>

        {/* Header row: play + clock */}
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={togglePlay}
            className="grid h-9 w-9 place-items-center rounded-xl border"
            aria-label={isPlaying ? "Pause full session" : "Play full session"}
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </button>
          <div className="text-sm">
            <div className="font-medium">Full session</div>
            <div className="text-xs text-neutral-500">
              {Math.floor(currentTimeSec / 60)}:{String(currentTimeSec % 60).padStart(2, "0")}
            </div>
          </div>
        </div>

        {/* Scrub bar */}
        <div className="mt-3">
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(pos * 100)}
            onChange={(e) => setPos(Number(e.target.value) / 100)}
            className="w-full"
          />
          <div className="mt-1 flex justify-between text-xs text-neutral-500">
            <span>0:00</span>
            <span>
              {Math.floor(durationSec / 60)}:{String(durationSec % 60).padStart(2, "0")}
            </span>
          </div>
        </div>

        {/* Controls row: Bookmark, note field, Add note */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-sm"
            onClick={addBookmark}
          >
            <Bookmark className="h-4 w-4" />
            Bookmark
          </button>

          <input
            type="text"
            placeholder="Add a quick note…"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            className="min-w-[200px] flex-1 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />

          <button
            type="button"
            onClick={addNote}
            className="btn-primary h-9 px-4" // CHANGE: inline primary button (no floating FAB)
          >
            Add note
          </button>
        </div>

        {/* Show/Hide notes & bookmarks */}
        <div className="mt-3">
          <button
            type="button"
            className="text-xs text-neutral-600 underline hover:text-neutral-800"
            onClick={() => setShowLists((s) => !s)}
          >
            {showLists ? "Hide" : "Show"} notes & bookmarks
          </button>
        </div>

        {/* Notes & Bookmarks list in a soft panel (same tone as locked tiles) */}
        {showLists && (
          <div className="mt-3 rounded-xl border bg-neutral-50 p-3">
            <div>
              <div className="text-xs font-semibold text-neutral-600">Bookmarks</div>
              <div className="mt-1 text-sm text-neutral-600">
                {bookmarks.length === 0
                  ? "No bookmarks yet."
                  : bookmarks
                      .sort((a, b) => a - b)
                      .map((t, i) => (
                        <span key={i} className="mr-2 inline-block rounded bg-white px-2 py-0.5 text-xs border">
                          {Math.floor(t / 60)}:{String(t % 60).padStart(2, "0")}
                        </span>
                      ))}
              </div>
            </div>

            <div className="mt-3">
              <div className="text-xs font-semibold text-neutral-600">Notes</div>
              <div className="mt-1 space-y-1 text-sm text-neutral-700">
                {notes.length === 0
                  ? "No notes yet."
                  : notes.map((n, i) => (
                      <div key={i} className="rounded border bg-white px-2 py-1">
                        <span className="mr-2 rounded bg-neutral-100 px-1.5 py-0.5 text-xs">
                          {Math.floor(n.t / 60)}:{String(n.t % 60).padStart(2, "0")}
                        </span>
                        {n.text}
                      </div>
                    ))}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Your Metrics (restored % + Target layout and badge placement) */}
      <Card className="mt-4">
        <h2 className="text-xl font-bold">Your Metrics</h2>

        <div className="mt-4 grid grid-cols-1 gap-3">
          {/* Unlocked / focused metric first */}
          <div className="rounded-2xl border p-4">
            <div className="mb-1 flex items-center gap-2">
              <div className="font-medium">{metrics[0]}</div>
              {/* badge on the right, small + subtle */}
              <span className="ml-auto rounded-md bg-sky/15 px-2 py-0.5 text-xs text-sky">Novice</span>
            </div>

            {/* CHANGE: put ProgressBar first, % + target below with same size */}
            <div className="mt-2">
              <ProgressBar value={0.45} target={1} />
            </div>
            <div className="mt-1 flex justify-between text-xs text-neutral-600">
              <span>45%</span>
              <span>Target: 100%</span>
            </div>
          </div>

          {/* Locked others mirror Progress tab’s look (dimmed) */}
          {metrics.slice(1).map((m) => (
            <div key={m} className="rounded-2xl border p-4 opacity-70">
              <div className="text-sm text-neutral-500">{m}</div>
              <div className="mt-1 text-xs text-neutral-500">Locked</div>
              <div className="mt-2">
                <ProgressBar value={0} target={1} />
              </div>
            </div>
          ))}
        </div>

        {/* CHANGE: Re-added the white "Record Again" button that navigates to Session */}
        <div className="mt-3 flex justify-end">
          <Link href="/user/session" className="btn-outline">
            Record Again
          </Link>
        </div>
      </Card>
    </>
  );
}


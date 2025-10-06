"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link"; // CHANGE: import Link for reliable navigation
import AppBar from "@/components/navigation/AppBar";
import Card from "@/components/ui/Card";
import { Play, Pause, Mic, CheckCircle2, TriangleAlert, Activity, CheckCircle } from "lucide-react";
import { cn } from "@/lib/cn";

type Props = {
  category: string;
  metrics: string[];
  // onFinish is no longer required for navigation, but we keep it optional
  // in case you still want to log/flush data before leaving the page.
  onFinish?: () => void; // CHANGE: made optional
};

function ToneBadge({ tone }: { tone?: "Win" | "Progress" | "Urgent" | "Info" }) {
  const cls =
    tone === "Win"
      ? "bg-success/15 text-success"
      : tone === "Progress"
      ? "bg-secondary/15 text-secondary"
      : tone === "Urgent"
      ? "bg-danger/15 text-danger"
      : "bg-sky/15 text-sky";
  return <span className={cn("rounded-md px-2 py-0.5 text-xs", cls)}>{tone ?? "Info"}</span>;
}

function ToneIcon({ tone }: { tone?: "Win" | "Progress" | "Urgent" | "Info" }) {
  if (tone === "Win") return <CheckCircle2 className="h-4 w-4" />;
  if (tone === "Progress") return <Activity className="h-4 w-4" />;
  if (tone === "Urgent") return <TriangleAlert className="h-4 w-4" />;
  return <CheckCircle className="h-4 w-4" />;
}

function SessionMessageBox({
  header,
  body,
  tone,
  metric,
}: {
  header: string;
  body: React.ReactNode;
  tone?: "Win" | "Progress" | "Urgent" | "Info";
  metric?: string;
}) {
  return (
    <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 animate-fade-up">
      <div className="mb-1 flex items-center gap-2 text-xs text-neutral-600">
        <ToneIcon tone={tone} />
        <span>
          {header}
          {metric ? ` · ${metric}` : ""}
        </span>
        <span className="ml-auto">
          <ToneBadge tone={tone} />
        </span>
      </div>
      <div className="text-base font-medium leading-snug">{body}</div>
    </div>
  );
}

function MicWave() {
  return (
    <div className="flex items-end gap-1">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="h-5 w-[6px] animate-pulse rounded bg-primary/70"
          style={{ animationDelay: `${i * 60}ms` }}
        />
      ))}
    </div>
  );
}

export default function SessionScreen({ category, metrics = [], onFinish }: Props) {
  const [recording, setRecording] = useState(false);
  const [showWelcome] = useState(true);

  const tips = useMemo(
    () =>
      (metrics ?? []).map((m, i) => ({
        id: `tip-${i}`,
        metric: m,
        message:
          i === 0
            ? `Great start on “${m}”. Keep it up.`
            : i === 1
            ? `Lean into “${m}” in your next response.`
            : `Quick fix: try a reset and refocus on “${m}”.`,
        tone: (["Win", "Progress", "Urgent"] as const)[i] ?? "Progress",
      })),
    [metrics]
  );

  const currentTip = tips.length ? tips[0] : undefined;
  const header = showWelcome ? "Welcome" : "Real-time tip";
  const body = showWelcome ? (
    <span>
      In this session you’ll focus on <b>{metrics[0]}</b>. Try to apply it in your answers.
    </span>
  ) : (
    currentTip?.message
  );

  return (
    <>
      
      <AppBar title="Start Session" />
      <Card className="mb-4">
      {/* Blue Tip Box */}
      <SessionMessageBox header={header} body={body} tone="Info" metric={currentTip?.metric} />
      </Card>
      {/* Context Card (AI option removed) */}
      <Card className="mb-4">
        <h2 className="text-lg font-semibold">What is the context of this practice?</h2>
        <div className="mt-3 flex flex-col gap-2">
          <label className="flex items-center gap-2">
            <input type="radio" name="context" value="free" defaultChecked />
            <span>Free form</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="context" value="describe" />
            <input
              type="text"
              placeholder="Describe here"
              className="flex-1 rounded-md border border-neutral-300 px-2 py-1 text-sm"
            />
          </label>
          {/* REMOVED: "AI-generated random for practice" option */}
        </div>
      </Card>

      {/* Recording bar (no frequency/real-time feedback card) */}
      <div className="sticky bottom-20 mt-4 flex items-center justify-between rounded-2xl border bg-white/80 p-4 shadow-soft backdrop-blur">
        <div className="flex items-center gap-3">
          <button
            className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-white"
            onClick={() => setRecording((r) => !r)}
            aria-label={recording ? "Pause" : "Play"}
          >
            {recording ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </button>
          {recording ? (
            <div className="flex items-center gap-2">
              <Mic className="h-4 w-4 text-primary" />
              <MicWave />
            </div>
          ) : (
            <div className="text-neutral-400">Not recording</div>
          )}
        </div>

        <div className="text-xs text-neutral-500">
          Duration: {recording ? "recording…" : "0 min 0 sec"}
        </div>

        {/* CHANGE: Use Link to navigate to Summary reliably */}
        <Link
          href="/user/summary"
          className="btn-outline"
          onClick={onFinish} // optional: still let you run any finalization side-effects
        >
          Finish
        </Link>
      </div>
    </>
  );
}

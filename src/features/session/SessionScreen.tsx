"use client";

/*
  CHANGE (NEW): Added a new Card above SessionMessageBox for practice context:
    - Heading: "What context would you like to practice?"
    - Options: "Free form", "Describe here" (with input), "AI-generated random for practice"
    - Local state: contextType ('free' | 'custom' | 'ai') and contextText for the custom description
    - This state is ready to be sent to the backend to contextualize tips.

  CHANGE (TYPOGRAPHY): Increased the body text size inside SessionMessageBox from text-sm
    to text-base so it matches the size used for metric labels in the Progress tab.
*/
import Link from "next/link"; // CHANGE: import Link
import { useEffect, useMemo, useState } from "react";
import AppBar from "@/components/navigation/AppBar";
import Card from "@/components/ui/Card";
import {
  Play,
  Pause,
  Mic,
  ThumbsUp,
  ThumbsDown,
  TriangleAlert,
  Activity,
  CheckCircle2,
  CheckCircle,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useSessionStore } from "@/store/sessionStore";

type Props = {
  category: string;
  metrics?: string[];
  onFinish: () => void;
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
      {/* CHANGE (TYPOGRAPHY): body size increased to text-base (from text-sm) */}
      <div className="text-base font-medium leading-snug">{body}</div>
    </div>
  );
}

/** Compact, one-line feedback row */
function TipFeedback({
  value,
  comment,
  onVote,
  onChangeComment,
  onSubmit,
  disabled,
}: {
  value: "up" | "down" | undefined;
  comment: string;
  onVote: (v: "up" | "down") => void;
  onChangeComment: (c: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}) {
  const upSelected = value === "up";
  const downSelected = value === "down";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!disabled && value) onSubmit();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-md rounded-xl border bg-white/80 px-2 py-1 shadow-soft"
    >
      <div className={cn("flex items-center gap-2", disabled && "opacity-60")}>
        <button
          type="button"
          className={cn(
            "grid h-7 w-7 place-items-center rounded-full transition",
            upSelected ? "bg-success/15 text-success" : "hover:bg-neutral-100 text-ink"
          )}
          onClick={() => onVote("up")}
          aria-label="Like"
          disabled={disabled}
        >
          <ThumbsUp className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={cn(
            "grid h-7 w-7 place-items-center rounded-full transition",
            downSelected ? "bg-danger/15 text-danger" : "hover:bg-neutral-100 text-ink"
          )}
          onClick={() => onVote("down")}
          aria-label="Dislike"
          disabled={disabled}
        >
          <ThumbsDown className="h-4 w-4" />
        </button>

        <input
          type="text"
          value={comment}
          onChange={(e) => onChangeComment(e.target.value)}
          placeholder="Provide Feedback"
          className="ml-1 flex-1 rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-primary"
          disabled={disabled}
        />

        <button
          type="submit"
          className="rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50"
          disabled={disabled || !value}
        >
          Send
        </button>
      </div>
    </form>
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
  const [freqMins, setFreqMins] = useState(15);
  const [recording, setRecording] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [idx, setIdx] = useState(0);

  // CHANGE (CONTEXT STATE): practice context selection
  const [contextType, setContextType] = useState<"free" | "custom" | "ai">("free");
  const [contextText, setContextText] = useState<string>("");

  // progress-based active metric (first unlocked else first)
  const progressByMetric = useSessionStore((s) => s.progressByMetric);
  const activeMetric = useMemo(() => {
    const list = metrics ?? [];
    if (!list.length) return "";
    const firstUnlocked = list.find((m) => progressByMetric?.[m]?.unlocked);
    return firstUnlocked ?? list[0];
  }, [metrics, progressByMetric]);

  // rotating tips from metrics
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

  // per-tip feedback state
  const [feedback, setFeedback] =
    useState<Record<string, { vote?: "up" | "down"; comment?: string }>>({});

  // reset on category/metrics change
  useEffect(() => {
    setShowWelcome(true);
    setIdx(0);
    setFeedback({});
  }, [category, metrics.length]);

  // Show first tip immediately when recording starts, then rotate thereafter
  useEffect(() => {
    let intervalId: number | undefined;
    if (recording && tips.length > 0) {
      setShowWelcome(false);
      setIdx(0);

      const ms = Math.max(5, freqMins) * 60 * 1000;
      intervalId = window.setInterval(() => {
        setIdx((i) => (i + 1) % tips.length);
      }, ms);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [recording, freqMins, tips.length]);

  const currentTip = tips.length ? tips[idx] : undefined;
  const header = showWelcome ? "Welcome" : "Real-time tip";
  const tone: "Win" | "Progress" | "Urgent" | "Info" =
    showWelcome ? "Info" : (currentTip?.tone ?? "Progress");
  const metric = showWelcome ? activeMetric : currentTip?.metric;

  // CHANGE (WELCOME COPY): Larger body text handled in component; copy unchanged here.
  const body = showWelcome ? (
    activeMetric ? (
      <span>
        In this session you’ll focus on <span className="font-semibold">{activeMetric}</span>.{" "}
        To do well in <span className="font-semibold">{activeMetric}</span>, try{" "}
        <em className="not-italic text-ink/80">[tip from backend]</em>.
      </span>
    ) : (
      "Pick a category to begin."
    )
  ) : (
    currentTip?.message
  );

  // feedback bindings for the visible tip
  const vote = currentTip ? feedback[currentTip.id]?.vote : undefined;
  const comment = currentTip ? feedback[currentTip.id]?.comment ?? "" : "";

  const handleVote = (v: "up" | "down") => {
    if (!currentTip) return;
    setFeedback((f) => ({ ...f, [currentTip.id]: { ...f[currentTip.id], vote: v } }));
  };
  const handleCommentChange = (val: string) => {
    if (!currentTip) return;
    setFeedback((f) => ({ ...f, [currentTip.id]: { ...f[currentTip.id], comment: val } }));
  };
  const handleSubmitFeedback = () => {
    if (!currentTip) return;
    const payload = {
      tipId: currentTip.id,
      metric: currentTip.metric,
      vote: feedback[currentTip.id]?.vote,
      comment: feedback[currentTip.id]?.comment?.trim() || undefined,
      category,
      contextType,                 // CHANGE (CONTEXT): include selected context
      contextText: contextText || undefined,
      at: new Date().toISOString(),
    };
    console.log("TIP_FEEDBACK_SUBMIT", payload);
    setFeedback((f) => ({ ...f, [currentTip.id]: { ...f[currentTip.id], comment: "" } }));
  };

  const feedbackDisabled = showWelcome || !currentTip;

  return (
    <>
      <AppBar title="Start Session" />

      {/* CHANGE (NEW): Context selection card above the tip box */}
      <Card className="mb-3">
        <h2 className="text-xl font-bold">What context would you like to practice?</h2>
        <div className="mt-3 space-y-2">
          <label className="flex items-center gap-3 rounded-xl border border-neutral-200 p-3">
            <input
              type="radio"
              name="ctx"
              checked={contextType === "free"}
              onChange={() => setContextType("free")}
            />
            <span className="font-medium">Free form</span>
          </label>

          <label className="flex items-center gap-3 rounded-xl border border-neutral-200 p-3">
            <input
              type="radio"
              name="ctx"
              checked={contextType === "custom"}
              onChange={() => setContextType("custom")}
            />
            <span className="font-medium">Describe here</span>
          </label>
          {contextType === "custom" && (
            <div className="ml-7">
              <input
                type="text"
                value={contextText}
                onChange={(e) => setContextText(e.target.value)}
                placeholder="Describe here"
                className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-neutral-500">
                This helps tailor real-time feedback to your scenario.
              </p>
            </div>
          )}

          <label className="flex items-center gap-3 rounded-xl border border-neutral-200 p-3">
            <input
              type="radio"
              name="ctx"
              checked={contextType === "ai"}
              onChange={() => setContextType("ai")}
            />
            <span className="font-medium inline-flex items-center gap-1">
              AI-generated random for practice <Sparkles className="h-4 w-4 text-primary" />
            </span>
          </label>
        </div>
      </Card>

      {/* Tip (blue) */}
      <SessionMessageBox header={header} body={body} tone={tone} metric={metric} />

      {/* Always-visible compact feedback row under the tip */}
      <div className="mt-2 flex justify-end">
        <TipFeedback
          value={vote}
          comment={comment}
          onVote={handleVote}
          onChangeComment={handleCommentChange}
          onSubmit={handleSubmitFeedback}
          disabled={feedbackDisabled}
        />
      </div>

      {/* Compact frequency card (half height) */}
      <Card className="mt-3 p-3">
        <div className="text-center text-xs text-neutral-500">Frequency of real-time feedback</div>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="range"
            min={5}
            max={59}
            value={freqMins}
            onChange={(e) => setFreqMins(parseInt(e.target.value))}
            className="w-full"
          />
        </div>
        <div className="mt-1 text-center text-[11px] text-neutral-500">{freqMins} mins</div>
      </Card>

      {/* Smaller recording bar */}
      <div className="sticky bottom-20 mt-3 flex items-center justify-between rounded-2xl border bg-white/80 p-4 shadow-soft backdrop-blur">
        <div className="flex items-center gap-3">
          <button
            className="grid h-9 w-9 place-items-center rounded-2xl bg-primary text-white"
            onClick={() => setRecording((r) => !r)}
            aria-label={recording ? "Pause" : "Play"}
          >
            {recording ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
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
        <Link href="/summary" className="btn-outline">
          Finish
        </Link>
      </div>
    </>
  );
}

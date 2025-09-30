// CHANGE: stop passing a 2nd param (shallow) to the store hook;
// select each slice individually (0–1 args), and derive lists via useMemo.
// This resolves the TS "unknown" errors and prevents render loops.

"use client";
import { useMemo } from "react";
import Card from "@/components/ui/Card";
import AppBar from "@/components/navigation/AppBar";
import ProgressBar from "@/components/ui/ProgressBar";
import { useSessionStore } from "@/store/sessionStore";
import milestonesData from "@/data/milestones.json";
import { statusLabel, narrative } from "@/lib/progress";
import { CheckCircle2, Lock } from "lucide-react";
import { cn } from "@/lib/cn";
import { METRICS_BY_CATEGORY } from "@/lib/constants";

function Radar({
  values,
  labels,
}: { values: number[]; labels: string[] }) {
  const size = 220;
  const r = 90;
  const cx = size / 2;
  const cy = size / 2;
  const pts = values.map((v, i) => {
    const angle = (Math.PI * 2 * i) / values.length - Math.PI / 2;
    const radius = r * Math.max(0, Math.min(1, v));
    return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
  });
  const d = pts.map((p) => p.join(",")).join(" ");

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
      <circle cx={cx} cy={cy} r={r} className="fill-surface stroke-neutral-200" />
      {[0.25, 0.5, 0.75, 1].map((t) => (
        <circle key={t} cx={cx} cy={cy} r={r * t} className="fill-none stroke-neutral-200" />
      ))}
      <polygon points={d} className="fill-primary/20 stroke-primary" />
      {pts.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={3} className="fill-primary" />
          <text x={x} y={y - 8} className="text-[10px] fill-ink" textAnchor="middle">
            {labels[i]}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default function ProgressScreen() {
  const category = useSessionStore((s) => s.category);
  const progressByMetric = useSessionStore((s) => s.progressByMetric);
  const unlockMetric = useSessionStore((s) => s.unlockMetric);

  const metrics = useMemo(() => METRICS_BY_CATEGORY[category] ?? [], [category]);

  const list = useMemo(
    () =>
      metrics.map((m, i) => {
        const item = progressByMetric[m];
        return item ?? { metric: m, value: 0, target: 1, unlocked: i === 0 ? true : false };
      }),
    [metrics, progressByMetric]
  );

  const unlockedCount = list.filter((m) => m.unlocked).length;

  const narrativeText = useMemo(() => {
    if (list.length === 0) return "Pick a category to begin.";
    const head = list[0];
    const from = Math.max(0, head.value - 0.2);
    return narrative(head.metric, from, head.value);
  }, [list]);

  const milestonesForCategory = (milestonesData as any)[category] ?? [];

  return (
    <>
      <AppBar title="Progress" />

      {/* Metrics */}
      <Card className="mt-2">
        <h2 className="text-xl font-bold">Your Metrics</h2>
        <div className="mt-4 grid gap-3">
          {list.map((m) => {
            const label = statusLabel(m.unlocked ? m.value : 0);
            const isLocked = !m.unlocked;
            return (
              <div key={m.metric} className={cn("rounded-2xl border p-4", isLocked && "opacity-70")}>
                <div className="mb-1 flex items-center gap-2">
                  <div className="font-medium">{m.metric}</div>
                  <span
                    className={cn(
                      "ml-auto inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs",
                      label === "Mastered"
                        ? "bg-success/15 text-success"
                        : label === "On track"
                        ? "bg-secondary/15 text-secondary"
                        : label === "Novice"
                        ? "bg-sky/15 text-sky"
                        : "bg-neutral-200 text-neutral-600"
                    )}
                  >
                    {isLocked ? <Lock className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    {isLocked ? "Locked" : label}
                  </span>
                </div>

                <ProgressBar value={isLocked ? 0 : m.value} target={m.target ?? 1} />

                <div className="mt-2 flex items-center gap-2 text-xs text-mute">
                  {!isLocked ? (
                    <>
                      <span>{Math.round(m.value * 100)}%</span>
                      <span className="ml-auto">Target: 100%</span>
                    </>
                  ) : (
                    <>
                      <span>Unlock this metric to start tracking progress.</span>
                      <button className="ml-auto btn-outline" onClick={() => unlockMetric(m.metric)}>
                        Unlock
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* CHANGE: Radar is now ALWAYS rendered.
         Added empty state placeholder if all values are 0. */}
      <Card className="mt-4">
        <h2 className="text-xl font-bold">Relative Strengths</h2>
        {list.every((m) => m.value === 0) ? (
          <p className="mt-4 text-center text-sm text-mute">
            Start a session to see your progress!
          </p>
        ) : (
          <Radar
            values={list.map((m) => (m.unlocked ? m.value : 0))}
            labels={metrics}
          />
        )}
      </Card>

      {/* Milestones */}
      <Card className="mt-4">
        <h2 className="text-xl font-bold">Milestones</h2>
        <ul className="mt-3 space-y-2">
          {milestonesForCategory.map((ms: any) => {
            const completed = ms.id === "sessions_3" ? unlockedCount >= 1 : false;
            return (
              <li key={ms.id} className="flex items-center gap-2 rounded-xl border p-3">
                <CheckCircle2 className={cn("h-4 w-4", completed ? "text-success" : "text-neutral-400")} />
                <span className={cn("text-sm", completed ? "text-ink" : "text-neutral-500")}>
                  {ms.label}
                  {ms.metric ? ` · ${ms.metric}` : ""}
                </span>
              </li>
            );
          })}
        </ul>
      </Card>

      {/* Narrative */}
      <Card className="mt-4">
        <h2 className="text-xl font-bold">Narrative Feedback</h2>
        <p className="mt-2 text-sm text-ink">{narrativeText}</p>
        <p className="mt-1 text-sm text-mute">Next step: focus 10 minutes on your most unlocked-but-lowest metric.</p>
      </Card>
    </>
  );
}

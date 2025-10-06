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
// import { METRICS_BY_CATEGORY } from "@/lib/constants";
import { useMetricsStore } from "@/hooks/useMetricsStore"; // single source of truth from Admin

// CHANGE (READABILITY): enlarge SVG canvas and label font, add extra padding
// so outer-ring labels are fully visible (no clipping).
function Radar({
  values,
  labels,
}: { values: number[]; labels: string[] }) {
  // Increased from 220 → 280; leaves margin for labels.
  const size = 280;
  // Slightly larger radius is fine with the bigger canvas.
  const r = 100;
  // Push labels further past the ring so they don't sit on the stroke.
  const labelPad = 22;

  const cx = size / 2;
  const cy = size / 2;

  const ang = (i: number) =>
    (Math.PI * 2 * i) / Math.max(1, labels.length) - Math.PI / 2;

  // Polygon points based on values (0..1) — the blue fill
  const polyPts = values.map((v, i) => {
    const a = ang(i);
    const radius = r * Math.max(0, Math.min(1, v));
    return [cx + radius * Math.cos(a), cy + radius * Math.sin(a)];
  });
  const polyD = polyPts.map((p) => p.join(",")).join(" ");

  // Anchoring helpers keep labels readable around the circle
  const textAnchorFor = (a: number) => {
    const x = Math.cos(a);
    if (x > 0.35) return "start";
    if (x < -0.35) return "end";
    return "middle";
  };
  const dyFor = (a: number) => {
    const y = Math.sin(a);
    if (y > 0.35) return "0.8em";
    if (y < -0.35) return "-0.4em";
    return "0.35em";
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="mx-auto"
    >
      {/* Concentric rings */}
      <circle cx={cx} cy={cy} r={r} className="fill-surface stroke-neutral-200" />
      {[0.25, 0.5, 0.75].map((t) => (
        <circle key={t} cx={cx} cy={cy} r={r * t} className="fill-none stroke-neutral-200" />
      ))}

      {/* Spokes for orientation */}
      {labels.map((_, i) => {
        const a = ang(i);
        const x = cx + r * Math.cos(a);
        const y = cy + r * Math.sin(a);
        return (
          <line
            key={`spoke-${i}`}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            className="stroke-neutral-200"
          />
        );
      })}

      {/* Filled polygon */}
      <polygon points={polyD} className="fill-primary/20 stroke-primary" />

      {/* Points for each metric */}
      {polyPts.map(([x, y], i) => (
        <circle key={`pt-${i}`} cx={x} cy={y} r={3} className="fill-primary" />
      ))}

      {/* CHANGE: Labels placed on the outer ring with larger font and padding */}
      {labels.map((label, i) => {
        const a = ang(i);
        const lx = cx + (r + labelPad) * Math.cos(a);
        const ly = cy + (r + labelPad) * Math.sin(a);
        return (
          <text
            key={`label-${i}`}
            x={lx}
            y={ly}
            className="text-[12px] fill-ink"  /* was 10px → 12px for readability */
            textAnchor={textAnchorFor(a) as any}
            dominantBaseline="middle"
            dy={dyFor(a)}
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}

// UI item type used locally (decouples from session store internal shape)
type UIProgressItem = {
  metricId: string;
  metricName: string;
  value: number;     // 0..1
  target?: number;   // normalized target if available (fallback to 1)
  unlocked: boolean;
};

export default function ProgressScreen() {
  const progressByMetric = useSessionStore((s) => s.progressByMetric);
  const unlockMetric = useSessionStore((s) => s.unlockMetric);

  // Admin-defined metrics as single source of truth
  const { metrics: defs } = useMetricsStore();

  const activeDefs = useMemo(
    () =>
      defs
        .filter((m) => m.active)
        .sort((a, b) => (a.name.localeCompare(b.name) || a.id.localeCompare(b.id))),
    [defs]
  );

  const activeMetricNames = useMemo(() => activeDefs.map((d) => d.name), [activeDefs]);

  const list: UIProgressItem[] = useMemo(() => {
    return activeDefs.map((def, i) => {
      const byId = (progressByMetric as any)?.[def.id];
      const byName = (progressByMetric as any)?.[def.name];
      const item = byId || byName;

      return {
        metricId: def.id,
        metricName: def.name,
        value: item?.value ?? 0,
        target: item?.target ?? 1,
        unlocked: item?.unlocked ?? (i === 0),
      } as UIProgressItem;
    });
  }, [activeDefs, progressByMetric]);

  const radarLabels: string[] = useMemo(() => {
    if (activeDefs.length > 0) return activeDefs.map((d) => d.name);
    return ["Metric 1", "Metric 2", "Metric 3"];
  }, [activeDefs]);

  const radarValues: number[] = useMemo(() => {
    if (list.length > 0) return list.map((m) => (m.unlocked ? m.value : 0));
    return Array.from({ length: radarLabels.length }, () => 0);
  }, [list, radarLabels.length]);

  const unlockedCount = list.filter((m) => m.unlocked).length;

  const narrativeText = useMemo(() => {
    if (list.length === 0) {
      return "Start a session to generate progress. Your admin can define metrics at any time.";
    }
    const head = list[0];
    const from = Math.max(0, head.value - 0.2);
    return narrative(head.metricName, from, head.value);
  }, [list]);

  // Normalize milestones to an array
  const milestonesForCategory = useMemo(() => {
    const data: any = milestonesData;
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.default)) return data.default;
    if (data && typeof data === "object") {
      const key = Object.keys(data).find((k) => Array.isArray((data as any)[k]));
      if (key) return (data as any)[key];
    }
    return [] as any[];
  }, []);

  return (
    <>
      <AppBar title="Progress" />

      {/* Metrics */}
      <Card className="mt-2">
        <h2 className="text-xl font-bold">Your Metrics</h2>
        <div className="mt-4 grid gap-3">
          {list.length === 0 ? (
            <>
              {["Metric 1", "Metric 2", "Metric 3"].map((name) => (
                <div key={name} className={cn("rounded-2xl border p-4", "opacity-70")}>
                  <div className="mb-1 flex items-center gap-2">
                    <div className="font-medium">{name}</div>
                    <span className="ml-auto inline-flex items-center gap-1 rounded-md bg-neutral-200 px-2 py-0.5 text-xs text-neutral-600">
                      <Lock className="h-3.5 w-3.5" />
                      Locked
                    </span>
                  </div>
                  <ProgressBar value={0} target={1} />
                  <div className="mt-2 flex items-center gap-2 text-xs text-mute">
                    <span>Ask your admin to add metrics.</span>
                    <span className="ml-auto">Target: 100%</span>
                  </div>
                </div>
              ))}
            </>
          ) : (
            list.map((m) => {
              const label = statusLabel(m.unlocked ? m.value : 0);
              const isLocked = !m.unlocked;
              return (
                <div key={m.metricId} className={cn("rounded-2xl border p-4", isLocked && "opacity-70")}>
                  <div className="mb-1 flex items-center gap-2">
                    <div className="font-medium">{m.metricName}</div>
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
                        <button
                          className="ml-auto btn-outline"
                          onClick={() =>
                            unlockMetric((m as any).metricId ?? (m as any).metricName)
                          }
                        >
                          Unlock
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* Radar (always rendered) */}
      <Card className="mt-4">
        <h2 className="text-xl font-bold">Relative Strengths</h2>
        <Radar values={radarValues} labels={radarLabels} />
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
        <p className="mt-1 text-sm text-mute">
          Next step: focus 10 minutes on your most unlocked-but-lowest metric.
        </p>
      </Card>
    </>
  );
}

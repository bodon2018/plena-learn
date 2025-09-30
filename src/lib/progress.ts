// CHANGE: Helpers to map raw numbers → statuses, and to craft a short narrative.

export type MetricProgress = {
  metric: string;
  value: number;   // 0..1 normalized progress toward mastery
  target?: number; // optional target marker (default 1.0)
  unlocked: boolean;
};

export function statusLabel(value: number): "Locked" | "Novice" | "On track" | "Mastered" {
  if (value >= 1) return "Mastered";
  if (value >= 0.6) return "On track";
  if (value <= 0) return "Locked";
  return "Novice";
}

// Very lightweight narrative using two numbers (e.g., last avg vs current)
export function narrative(metric: string, from: number, to: number): string {
  const pct = (n: number) => Math.round(n * 100);
  if (to > from) {
    return `Your ${metric.toLowerCase()} improved from ${pct(from)}% → ${pct(to)}%. Keep going — you're trending up.`;
  }
  if (to < from) {
    return `Your ${metric.toLowerCase()} dipped slightly (${pct(from)}% → ${pct(to)}%). Try one focused drill next session.`;
  }
  return `Your ${metric.toLowerCase()} is steady at ${pct(to)}%. Add one deliberate practice to push forward.`;
}

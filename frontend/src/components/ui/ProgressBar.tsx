// CHANGE: New reusable ProgressBar component that follows our design system
// (large rounded track, soft shadow, smooth fill).

export default function ProgressBar({
  value,        // 0..1
  target = 1,   // 0..1 (for a thin target marker)
  className = "",
}: {
  value: number;
  target?: number;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  const targetPct = Math.max(0, Math.min(1, target)) * 100;
  return (
    <div className={`h-3 w-full rounded-full bg-neutral-200/70 relative overflow-hidden shadow-soft ${className}`}>
      <div
        className="absolute left-0 top-0 h-full bg-primary transition-[width] duration-500"
        style={{ width: `${pct}%` }}
      />
      {/* Target marker */}
      <div
        className="absolute top-0 h-full w-[2px] bg-success/90"
        style={{ left: `calc(${targetPct}% - 1px)` }}
      />
    </div>
  );
}

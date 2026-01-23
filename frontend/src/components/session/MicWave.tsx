export default function MicWave() {
  return (
    <div className="flex items-end gap-1">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="h-5 w-[6px] animate-pulse rounded bg-blue-600/70"
          style={{ animationDelay: `${i * 60}ms` }}
        />
      ))}
    </div>
  );
}

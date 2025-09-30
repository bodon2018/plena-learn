// CHANGE: Adopt the design-system card styles (roundness, shadow, hover, subtle enter animation).
import { cn } from "@/lib/cn";

export default function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("card", className)}>
      {/* CHANGE: internal padding kept consistent across the app */}
      <div className="p-5">{children}</div>
    </div>
  );
}

import { cn } from "@/lib/cn";

export default function ToneBadge({ tone }: { tone: string }) {
  const cls =
    tone === "Win"
      ? "bg-green-100 text-green-700"
      : tone === "Progress"
      ? "bg-amber-100 text-amber-700"
      : tone === "Urgent"
      ? "bg-red-100 text-red-700"
      : "bg-blue-100 text-blue-700";
  return <span className={cn("rounded-md px-2 py-0.5 text-xs", cls)}>{tone}</span>;
}

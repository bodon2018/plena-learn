import ToneBadge from "@/components/badges/ToneBadge";
import ToneIcon from "@/components/icons/ToneIcon";

export default function SessionMessageBox({
  header,
  body,
  tone,
  metric,
  children,
}: {
  header: string;
  body: React.ReactNode;
  tone: string;
  metric?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 animate-in fade-in-50 slide-in-from-top-1">
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
      <div className="text-sm font-medium leading-snug">{body}</div>
      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}

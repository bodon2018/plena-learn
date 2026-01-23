import { CheckCircle2, Activity, TriangleAlert, CheckCircle } from "lucide-react";

export default function ToneIcon({ tone }: { tone: string }) {
  if (tone === "Win") return <CheckCircle2 className="h-4 w-4" />;
  if (tone === "Progress") return <Activity className="h-4 w-4" />;
  if (tone === "Urgent") return <TriangleAlert className="h-4 w-4" />;
  return <CheckCircle className="h-4 w-4" />;
}

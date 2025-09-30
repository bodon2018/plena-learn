"use client";
import { ChevronRight } from "lucide-react";
import AppBar from "@/components/navigation/AppBar";
import Card from "@/components/ui/Card";
import { METRICS_BY_CATEGORY } from "@/lib/constants";

export default function MetricsList({
  category,
  onNext,
}: {
  category: string;
  onNext: () => void;
}) {
  const metrics = METRICS_BY_CATEGORY[category] || [];

  return (
    <>
      <AppBar title="Metrics" onNavigate={() => {}} />
      <Card>
        <h2 className="text-xl font-bold">Metrics</h2>
        <p className="text-sm text-neutral-500">
          The 3 metrics to help you achieve your goal are:
        </p>
        <ul className="mt-3 space-y-2">
          {metrics.map((m) => (
            <li key={m} className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-blue-600" />
              <span className="font-medium">{m}</span>
            </li>
          ))}
        </ul>

        <div className="pt-4">
          <button
            className="w-full rounded-2xl bg-blue-600 px-4 py-2 font-semibold text-white"
            onClick={onNext}
          >
            Continue
          </button>
        </div>
      </Card>
    </>
  );
}

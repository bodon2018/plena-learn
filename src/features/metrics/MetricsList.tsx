"use client";

import AppBar from "@/components/navigation/AppBar";
import Card from "@/components/ui/Card";
import { METRICS_BY_CATEGORY } from "@/lib/constants";
import { ChevronRight } from "lucide-react";

export default function MetricsList({
  category,
  onNext, // kept optional in case callers still pass it; we just don't use it here
}: {
  category: string;
  onNext?: () => void;
}) {
  const metrics = METRICS_BY_CATEGORY[category] || [];

  return (
    <>
      {/* CHANGE: Removed `onNavigate` prop; AppBar no longer supports it after
         we deleted the hamburger menu. */}
      <AppBar title="Metrics" />

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
      </Card>
    </>
  );
}

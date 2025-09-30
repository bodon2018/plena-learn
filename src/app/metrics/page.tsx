"use client";
import { useState } from "react";
import MetricsList from "@/features/metrics/MetricsList";
import { CATEGORIES } from "@/lib/constants";

export default function MetricsPage() {
  const [category] = useState(CATEGORIES[0]); // stub until category is global
  return <MetricsList category={category} onNext={() => {}} />;
}

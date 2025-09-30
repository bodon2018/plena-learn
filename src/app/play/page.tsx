"use client";
import { useState } from "react";
import CategorySelector from "@/features/category/CategorySelector";
import MetricsList from "@/features/metrics/MetricsList";
import SessionScreen from "@/features/session/SessionScreen";
import SummaryScreen from "@/features/summary/SummaryScreen";
import BottomTabBar from "@/components/navigation/BottomTabBar";
import { CATEGORIES, METRICS_BY_CATEGORY } from "@/lib/constants";

export default function PlayPage() {
  const [tab, setTab] = useState(1);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const metrics = METRICS_BY_CATEGORY[category] || [];

  return (
    <div className="min-h-[100dvh] bg-neutral-50">
      <div className="mx-auto max-w-sm px-3 pb-24 pt-3">
        {tab === 1 && <CategorySelector value={category} onChange={setCategory} />}
        {tab === 2 && <MetricsList category={category} onNext={() => setTab(3)} />}
        {tab === 3 && (
          <SessionScreen category={category} metrics={metrics} onFinish={() => setTab(4)} />
        )}
        {tab === 4 && <SummaryScreen metrics={metrics} onRestart={() => setTab(3)} />}
      </div>

      <div className="h-16" />
      <BottomTabBar active={tab} onSelect={setTab} />
    </div>
  );
}

"use client";

import AppBar from "@/components/navigation/AppBar";
import Card from "@/components/ui/Card";
import { CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/cn";

export default function CategorySelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (c: string) => void;
}) {
  return (
    <>
      {/* CHANGE: AppBar no longer supports onNavigate; removed that prop */}
      <AppBar title="Select Category" />

      <Card>
        {/* CHANGE: Replaced duplicate header text per your request */}
        <h2 className="text-xl font-bold">What would you like to learn first?</h2>

        <div className="mt-3 space-y-3">
          {CATEGORIES.map((c) => (
            <label
              key={c}
              className={cn(
                "flex items-center gap-3 rounded-2xl border p-3",
                value === c ? "border-blue-600 ring-2 ring-blue-200" : "border-neutral-200"
              )}
            >
              <input
                type="radio"
                name="cat"
                checked={value === c}
                onChange={() => onChange(c)}
              />
              <span className="font-medium">{c}</span>
            </label>
          ))}
        </div>
      </Card>
    </>
  );
}


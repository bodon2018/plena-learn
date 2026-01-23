"use client";

import { cn } from "@/lib/cn";
import { 
  Search, 
  Swords, 
  DollarSign, 
  TrendingUp, 
  GraduationCap,
  Sparkles 
} from "lucide-react";
import Card from "@/components/ui/Card";

const REPORT_TYPES = [
  {
    type: "scouting_report",
    name: "Scouting Report",
    description: "Comprehensive player evaluations for recruitment decisions, including strengths, weaknesses, and potential fit.",
    icon: Search,
    categories: ["scouting", "general"],
    color: "text-blue-600 bg-blue-100",
  },
  {
    type: "opposition_analysis",
    name: "Opposition Analysis",
    description: "Tactical breakdown of opposing teams, their formations, patterns, and potential vulnerabilities.",
    icon: Swords,
    categories: ["tactical", "general"],
    color: "text-orange-600 bg-orange-100",
  },
  {
    type: "player_valuation",
    name: "Player Valuation",
    description: "Market value assessments based on performance metrics, age, contract status, and comparable players.",
    icon: DollarSign,
    categories: ["valuation", "general"],
    color: "text-green-600 bg-green-100",
  },
  {
    type: "player_development",
    name: "Player Development",
    description: "Individual growth plans with targeted training recommendations and milestone tracking.",
    icon: TrendingUp,
    categories: ["player_development", "general"],
    color: "text-purple-600 bg-purple-100",
  },
  {
    type: "coaching_development",
    name: "Coaching Development",
    description: "Coaching effectiveness analysis with feedback on communication, tactics, and team management.",
    icon: GraduationCap,
    categories: ["coaching_development", "general"],
    color: "text-pink-600 bg-pink-100",
  },
];

/**
 * Overview card showing all available report types with descriptions.
 */
export default function ReportTypesOverview() {
  return (
    <Card>
      {/* Welcome header */}
      <div className="flex items-start gap-4 mb-6">
        <div
          className={cn(
            "w-12 h-12 rounded-xl flex-shrink-0",
            "bg-gradient-to-br from-primary to-sky",
            "flex items-center justify-center"
          )}
        >
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-heading-3 text-ink">AI-Powered Reports</h2>
          <p className="text-body-sm text-mute mt-1">
            Generate professional reports grounded in your organization's reference materials. 
            Select a data source, choose your report type, and let AI do the heavy lifting.
          </p>
        </div>
      </div>

      {/* Report types grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORT_TYPES.map((report) => {
          const Icon = report.icon;

          return (
            <div
              key={report.type}
              className={cn(
                "p-4 rounded-xl",
                "border border-neutral-200/80",
                "bg-white",
                "hover:shadow-soft hover:border-primary/30",
                "transition-all duration-150"
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "w-10 h-10 rounded-lg flex-shrink-0",
                    "flex items-center justify-center",
                    report.color
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-ui font-semibold text-ink">
                    {report.name}
                  </h3>
                  <p className="text-caption text-mute mt-1 line-clamp-2">
                    {report.description}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {report.categories.map((cat) => (
                      <span
                        key={cat}
                        className={cn(
                          "px-1.5 py-0.5 rounded",
                          "text-[10px] font-medium",
                          "bg-neutral-100 text-mute"
                        )}
                      >
                        {cat.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
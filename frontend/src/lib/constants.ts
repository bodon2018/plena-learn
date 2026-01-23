export const CATEGORIES = [
  "Youth Sports Coaching",
  "Assertive Communication",
  "Executive Briefing",
  "Intimate Relationships",
  "Public Speaking",
] as const;

export const METRICS_BY_CATEGORY: Record<string, string[]> = {
  "Youth Sports Coaching": [
    "Encouragement ratio",
    "Open question use",
    "Inclusivity language",
  ],
  "Assertive Communication": [
    "Directness of ask",
    "I-statement usage",
    "Confidence markers",
  ],
  "Executive Briefing": [
    "Clarity of learn (BLUF)",
    "Explicit decision request",
    "Tradeoff articulation",
  ],
  "Intimate Relationships": [
    "Reflective listening",
    "Affection/positivity",
    "Repair attempts",
  ],
  "Public Speaking": [
    "Pacing/fluency",
    "Vocal variety",
    "Audience engagement",
  ],
};


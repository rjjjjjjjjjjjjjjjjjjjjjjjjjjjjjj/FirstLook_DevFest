export type Tier = "self_care" | "clinic" | "urgent_care" | "emergency";
export const TIER_ORDER: Tier[] = ["self_care", "clinic", "urgent_care", "emergency"];

export type Answers = {
  fever: boolean;
  spreadingRedness: boolean;
  pus: boolean;
  warmth: boolean;
  numbness: boolean;
  pain: number;
  howLong: string;
  tetanus: "yes" | "no" | "unsure";
};

export const DEFAULT_ANSWERS: Answers = {
  fever: false,
  spreadingRedness: false,
  pus: false,
  warmth: false,
  numbness: false,
  pain: 3,
  howLong: "today",
  tetanus: "unsure",
};

export type AiResult = {
  wound_type: string;
  visible_signs: string[];
  severity_tier: Tier;
  confidence: "low" | "medium" | "high";
  reasoning: string;
  next_steps: string[];
  warning_signs: string[];
  retake_needed: boolean;
  comparison: { change: "better" | "same" | "worse" | "unclear"; summary: string } | null;
};

export function tierRank(t: Tier) {
  return TIER_ORDER.indexOf(t);
}

export function maxTier(a: Tier, b: Tier): Tier {
  return tierRank(a) >= tierRank(b) ? a : b;
}

export function bumpTier(t: Tier): Tier {
  return TIER_ORDER[Math.min(tierRank(t) + 1, TIER_ORDER.length - 1)] ?? "emergency";
}

/** Rule layer applied on top of whatever the AI returns. Never lowers the tier. */
export function applySafetyRules(
  ai: AiResult,
  answers: Answers,
  emergencyChips: string[] = [],
): AiResult & { lowConfidence: boolean } {
  let tier: Tier = TIER_ORDER.includes(ai.severity_tier) ? ai.severity_tier : "clinic";
  if (emergencyChips.length > 0) tier = "emergency";
  if (answers.fever && (answers.spreadingRedness || answers.pus)) tier = maxTier(tier, "urgent_care");
  const lowConfidence = ai.retake_needed || ai.confidence === "low";
  if (lowConfidence) tier = bumpTier(tier);
  return { ...ai, severity_tier: tier, lowConfidence };
}

export function trendFromChange(change?: string): "improving" | "same" | "worse" | "unclear" {
  if (change === "better") return "improving";
  if (change === "same") return "same";
  if (change === "worse") return "worse";
  return "unclear";
}

export const EMERGENCY_CHIPS = [
  "bleeding",
  "breathing",
  "chest",
  "confusion",
  "allergy",
  "deep",
  "head",
] as const;

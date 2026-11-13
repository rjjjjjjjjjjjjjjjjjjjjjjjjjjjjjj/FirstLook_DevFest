export type Tier = "self_care" | "clinic" | "urgent_care" | "emergency";
export const TIER_ORDER: Tier[] = ["self_care", "clinic", "urgent_care", "emergency"];

export const RISK_KEYS = [
  "diabetes",
  "bloodThinners",
  "weakImmune",
  "pregnant",
  "biteOrPuncture",
  "handsFaceJoint",
  "noTetanus",
] as const;
export type RiskKey = (typeof RISK_KEYS)[number];
export type RiskFactors = Record<RiskKey, boolean>;
export const DEFAULT_RISK: RiskFactors = {
  diabetes: false,
  bloodThinners: false,
  weakImmune: false,
  pregnant: false,
  biteOrPuncture: false,
  handsFaceJoint: false,
  noTetanus: false,
};

export type Answers = {
  fever: boolean;
  spreadingRedness: boolean;
  pus: boolean;
  warmth: boolean;
  numbness: boolean;
  pain: number;
  howLong: string;
  tetanus: "yes" | "no" | "unsure";
  description: string;
  risk: RiskFactors;
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
  description: "",
  risk: { ...DEFAULT_RISK },
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
  rulesTriggered?: string[];
  rawAiOutput?: AiResult;
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
  const rules = new Set(ai.rulesTriggered ?? []);
  if (emergencyChips.length > 0) {
    tier = "emergency";
    rules.add("emergency_sign");
  }
  if (answers.fever && (answers.spreadingRedness || answers.pus)) {
    tier = maxTier(tier, "urgent_care");
    rules.add(answers.spreadingRedness ? "fever_spreading_redness" : "fever_pus");
  }
  if (Object.values(answers.risk ?? DEFAULT_RISK).some(Boolean)) {
    tier = bumpTier(tier);
    rules.add("risk_factor");
  }
  const lowConfidence = ai.retake_needed || ai.confidence === "low";
  if (lowConfidence) {
    tier = bumpTier(tier);
    rules.add("low_confidence");
  }
  return { ...ai, severity_tier: tier, lowConfidence, rulesTriggered: [...rules] };
}

/** A user-reported decline always moves one level higher, up to emergency. */
export function escalateResult(result: AiResult): AiResult {
  return {
    ...result,
    severity_tier: bumpTier(result.severity_tier),
    rulesTriggered: [...new Set([...(result.rulesTriggered ?? []), "getting_worse"])],
  };
}

/** Pain and every symptom/risk switch share this explicit user-interaction flag. */
export function hasEnoughInformation(photo: string | null, description: string, symptomsTouched: boolean) {
  return Boolean(photo || description.trim() || symptomsTouched);
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

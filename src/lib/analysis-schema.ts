import { z } from "zod";

export const RiskInput = z.object({
  diabetes: z.boolean(),
  bloodThinners: z.boolean(),
  weakImmune: z.boolean(),
  pregnant: z.boolean(),
  biteOrPuncture: z.boolean(),
  handsFaceJoint: z.boolean(),
  noTetanus: z.boolean(),
});

export const AnalysisInput = z.object({
  mode: z.enum(["check", "followup"]),
  images: z.array(z.string().max(4_000_000).regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/)).max(2),
  description: z.string().max(500),
  risk: RiskInput,
  answers: z.object({
    fever: z.boolean(), spreadingRedness: z.boolean(), pus: z.boolean(),
    warmth: z.boolean(), numbness: z.boolean(), pain: z.number().min(0).max(10),
    howLong: z.string().max(100), tetanus: z.enum(["yes", "no", "unsure"]),
  }).passthrough(),
  forWhom: z.enum(["me", "other"]),
  ageGroup: z.string().max(100).nullable(),
  lang: z.enum(["en", "es"]),
});
export type AnalysisRequest = z.infer<typeof AnalysisInput>;

export const SeverityTier = z.enum(["self_care", "clinic", "urgent_care", "emergency"]);
/** The AWS endpoint may also say it cannot judge the wound at all. */
export const LambdaSeverity = z.union([SeverityTier, z.literal("not_enough_info")]);

export const Comparison = z.object({
  change: z.enum(["better", "same", "worse", "unclear"]),
  summary: z.string(),
});
export type Comparison = z.infer<typeof Comparison>;

/** Check body sent to the AWS analyze endpoint. */
export const CheckRequest = z.object({
  user_id: z.string().min(1),
  description: z.string(),
  symptoms: z.object({
    fever: z.boolean(), spreading_redness: z.boolean(), pus: z.boolean(),
    warmth: z.boolean(), numbness: z.boolean(),
  }),
  risk_factors: z.object({
    diabetes: z.boolean(), blood_thinners: z.boolean(), weak_immune: z.boolean(),
    pregnant: z.boolean(), bite_or_puncture: z.boolean(), hand_face_joint: z.boolean(),
    no_tetanus_10y: z.boolean(),
  }),
  extra: z.object({
    pain: z.number().min(0).max(10),
    how_long: z.string(),
    tetanus: z.enum(["yes", "no", "unsure"]),
    age_group: z.string().nullable(),
  }),
  who: z.enum(["me", "other"]),
  language: z.enum(["en", "es"]),
  emergency_flags: z.array(z.string()),
  image_b64: z.string().min(1).optional(),
});
export type CheckRequest = z.infer<typeof CheckRequest>;

/** Compare body sent to the AWS analyze endpoint for a follow-up with two photos. */
export const CompareRequest = z.object({
  action: z.literal("compare"),
  before_b64: z.string().min(1),
  after_b64: z.string().min(1),
  language: z.enum(["en", "es"]),
});
export type CompareRequest = z.infer<typeof CompareRequest>;

/** What the AWS endpoint may return for a check: only severity_tier is required. */
export const AnalyzeResponse = z.object({
  wound_type: z.string().optional(),
  visible_signs: z.array(z.string()).optional(),
  severity_tier: LambdaSeverity,
  confidence: z.enum(["low", "medium", "high"]).optional(),
  reasoning: z.string().optional(),
  next_steps: z.array(z.string()).optional(),
  warning_signs: z.array(z.string()).optional(),
  retake_needed: z.boolean().optional(),
  comparison: Comparison.nullable().optional(),
});
export type AnalyzeResponse = z.infer<typeof AnalyzeResponse>;

/** Compare replies may put the verdict at the top level or under `comparison`. */
export const CompareResponse = z.object({
  change: z.enum(["better", "same", "worse", "unclear"]).optional(),
  summary: z.string().optional(),
  comparison: Comparison.nullable().optional(),
});
export type CompareResponse = z.infer<typeof CompareResponse>;

/** The result shape the front end already renders. */
export const AnalysisResult = z.object({
  wound_type: z.string(),
  visible_signs: z.array(z.string()).max(6),
  severity_tier: SeverityTier,
  confidence: z.enum(["low", "medium", "high"]),
  reasoning: z.string().min(1),
  next_steps: z.array(z.string()).max(6),
  warning_signs: z.array(z.string()).max(6),
  retake_needed: z.boolean(),
  comparison: Comparison.nullable(),
});
export type AnalysisResult = z.infer<typeof AnalysisResult>;

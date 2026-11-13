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

export const AnalysisResult = z.object({
  wound_type: z.string(),
  visible_signs: z.array(z.string()).max(6),
  severity_tier: z.enum(["self_care", "clinic", "urgent_care", "emergency"]),
  confidence: z.enum(["low", "medium", "high"]),
  reasoning: z.string().min(1),
  next_steps: z.array(z.string()).min(1).max(6),
  warning_signs: z.array(z.string()).min(1).max(6),
  retake_needed: z.boolean(),
  comparison: z.object({ change: z.enum(["better", "same", "worse", "unclear"]), summary: z.string() }).nullable(),
});

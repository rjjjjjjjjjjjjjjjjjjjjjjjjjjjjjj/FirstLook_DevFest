// Pure mapping between the app's check input and the AWS analyze endpoint.
// No secrets, no network: safe to import from tests and the client.
import {
  AnalysisResult,
  AnalyzeResponse,
  CheckRequest,
  CompareRequest,
  CompareResponse,
  type AnalysisRequest,
  type Comparison,
} from "./analysis-schema";
import { maxTier, type AiResult } from "./triage";

/** Exact message the front end shows for every AWS-side failure. */
export const AWS_FAILURE_MESSAGE = "Something went wrong. Please try again.";
/** A photo is only sent when it decodes to less than this. */
export const MAX_IMAGE_BYTES = 1_000_000;

export const IMAGE_TOO_LARGE: Record<"en" | "es", string> = {
  en: "That photo is too large to check. Please try a smaller photo.",
  es: "Esa foto es demasiado grande para revisarla. Inténtalo con una foto más pequeña.",
};

const FALLBACK_REASONING: Record<"en" | "es", string> = {
  en: "We couldn't get a clear read from what you shared. If you're worried, get checked.",
  es: "No pudimos obtener una lectura clara de lo que compartiste. Si estás preocupado, hazte revisar.",
};

const DATA_URL_PREFIX = /^data:image\/(jpeg|png|webp);base64,/;

export type ImageB64 = { ok: true; b64: string } | { ok: false; reason: "invalid" | "too_large" };

/** Strip the data-URL prefix so only raw base64 is sent, and enforce the size cap. */
export function toBase64Image(dataUrl: string): ImageB64 {
  const match = DATA_URL_PREFIX.exec(dataUrl);
  if (!match) return { ok: false, reason: "invalid" };
  const b64 = dataUrl.slice(match[0].length);
  if (!b64) return { ok: false, reason: "invalid" };
  if (Math.floor((b64.length * 3) / 4) > MAX_IMAGE_BYTES) return { ok: false, reason: "too_large" };
  return { ok: true, b64 };
}

/**
 * Check body for the AWS endpoint. `userId` comes from the verified auth token,
 * never from the request body, and only the mapped symptom/risk booleans go out.
 */
export function buildCheckPayload(input: AnalysisRequest, userId: string, imageB64?: string): CheckRequest {
  return CheckRequest.parse({
    user_id: userId,
    description: input.description,
    symptoms: {
      fever: input.answers.fever,
      spreading_redness: input.answers.spreadingRedness,
      pus: input.answers.pus,
      warmth: input.answers.warmth,
      numbness: input.answers.numbness,
    },
    risk_factors: {
      diabetes: input.risk.diabetes,
      blood_thinners: input.risk.bloodThinners,
      weak_immune: input.risk.weakImmune,
      pregnant: input.risk.pregnant,
      bite_or_puncture: input.risk.biteOrPuncture,
      hand_face_joint: input.risk.handsFaceJoint,
      no_tetanus_10y: input.risk.noTetanus,
    },
    extra: {
      pain: input.answers.pain,
      how_long: input.answers.howLong,
      tetanus: input.answers.tetanus,
      age_group: input.ageGroup,
    },
    who: input.forWhom,
    language: input.lang,
    emergency_flags: [],
    ...(imageB64 ? { image_b64: imageB64 } : {}),
  });
}

export function buildComparePayload(beforeB64: string, afterB64: string, language: "en" | "es"): CompareRequest {
  return CompareRequest.parse({ action: "compare", before_b64: beforeB64, after_b64: afterB64, language });
}

/** Tolerate a JSON string, or the result nested under a `result` key. */
function unwrap(raw: unknown): unknown {
  let value = raw;
  for (let i = 0; i < 2; i++) {
    if (typeof value === "string") {
      try {
        value = JSON.parse(value);
      } catch {
        return null;
      }
    } else if (value && typeof value === "object" && "result" in value) {
      value = (value as { result: unknown }).result;
    } else {
      return value;
    }
  }
  return value;
}

/**
 * Fill every field the front end renders, so a short AWS reply
 * (severity_tier + reasoning only) never reaches the UI as an empty result.
 * "not_enough_info" becomes self_care at low confidence, which the safety layer
 * in triage.ts then raises to at least clinic.
 */
export function normalizeCheckResult(raw: unknown, lang: "en" | "es", hasPhoto: boolean): AiResult | null {
  const parsed = AnalyzeResponse.safeParse(unwrap(raw));
  if (!parsed.success) return null;
  const r = parsed.data;
  const result: AiResult = {
    wound_type: r.wound_type ?? "",
    visible_signs: (r.visible_signs ?? []).slice(0, 6),
    severity_tier: r.severity_tier === "not_enough_info" ? "self_care" : r.severity_tier,
    confidence: r.confidence ?? "low",
    reasoning: r.reasoning?.trim() || FALLBACK_REASONING[lang],
    next_steps: (r.next_steps ?? []).slice(0, 6),
    warning_signs: (r.warning_signs ?? []).slice(0, 6),
    retake_needed: hasPhoto && (r.retake_needed ?? false),
    comparison: null,
  };
  return AnalysisResult.safeParse(result).success ? result : null;
}

/** Read a compare verdict from either reply shape. */
export function extractComparison(raw: unknown): Comparison | null {
  const parsed = CompareResponse.safeParse(unwrap(raw));
  if (!parsed.success) return null;
  if (parsed.data.comparison) return parsed.data.comparison;
  if (parsed.data.change) return { change: parsed.data.change, summary: parsed.data.summary ?? "" };
  return null;
}

/** A worse or unclear trend is never allowed to read as home care. */
export function applyComparison(result: AiResult, comparison: Comparison | null): AiResult {
  if (!comparison) return result;
  const tier = comparison.change === "worse" || comparison.change === "unclear"
    ? maxTier(result.severity_tier, "clinic")
    : result.severity_tier;
  return { ...result, comparison, severity_tier: tier };
}

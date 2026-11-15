import { describe, expect, it } from "vitest";
import { AnalysisInput } from "./analysis-schema";
import {
  applyComparison,
  AWS_FAILURE_MESSAGE,
  buildCheckPayload,
  buildComparePayload,
  extractComparison,
  MAX_IMAGE_BYTES,
  normalizeCheckResult,
  toBase64Image,
} from "./analyze-map";
import { applySafetyRules, DEFAULT_ANSWERS, DEFAULT_RISK, type AiResult } from "./triage";

const USER_ID = "3f2b7c1a-9d4e-4a6b-8c2f-1e5d7a9b0c12";

const input = AnalysisInput.parse({
  mode: "check",
  images: [],
  description: "Scraped my knee today.",
  risk: { ...DEFAULT_RISK, bloodThinners: true, noTetanus: true },
  answers: { ...DEFAULT_ANSWERS, fever: true, pain: 4, howLong: "2-7 days", tetanus: "no" },
  forWhom: "me",
  ageGroup: null,
  lang: "en",
});

const home: AiResult = {
  wound_type: "Scrape",
  visible_signs: [],
  severity_tier: "self_care",
  confidence: "high",
  reasoning: "Looks shallow.",
  next_steps: ["Keep clean."],
  warning_signs: ["Fever."],
  retake_needed: false,
  comparison: null,
};

describe("AWS check request mapping", () => {
  it("sends only the mapped fields plus the signed-in user id", () => {
    expect(buildCheckPayload(input, USER_ID)).toEqual({
      user_id: USER_ID,
      description: "Scraped my knee today.",
      symptoms: { fever: true, spreading_redness: false, pus: false, warmth: false, numbness: false },
      risk_factors: {
        diabetes: false, blood_thinners: true, weak_immune: false, pregnant: false,
        bite_or_puncture: false, hand_face_joint: false, no_tetanus_10y: true,
      },
      extra: { pain: 4, how_long: "2-7 days", tetanus: "no", age_group: null },
      who: "me",
      language: "en",
      emergency_flags: [],
    });
  });

  it("sends the photo as raw base64 and omits it when there is none", () => {
    expect(toBase64Image("data:image/jpeg;base64,QQ==")).toEqual({ ok: true, b64: "QQ==" });
    expect(buildCheckPayload(input, USER_ID, "QQ==").image_b64).toBe("QQ==");
    expect("image_b64" in buildCheckPayload(input, USER_ID)).toBe(false);
  });

  it("refuses a photo larger than 1 MB", () => {
    const big = "A".repeat(Math.ceil(((MAX_IMAGE_BYTES + 1) * 4) / 3));
    expect(toBase64Image(`data:image/jpeg;base64,${big}`)).toEqual({ ok: false, reason: "too_large" });
    expect(toBase64Image("data:image/jpeg;base64,QQ==").ok).toBe(true);
  });

  it("sends a compare body with both photos", () => {
    expect(buildComparePayload("YQ==", "Yg==", "es")).toEqual({
      action: "compare", before_b64: "YQ==", after_b64: "Yg==", language: "es",
    });
  });
});

describe("AWS reply mapping", () => {
  it("fills defaults when AWS returns only emergency and reasoning", () => {
    expect(normalizeCheckResult({ severity_tier: "emergency", reasoning: "Heavy bleeding that won't stop." }, "en", true)).toEqual({
      wound_type: "",
      visible_signs: [],
      severity_tier: "emergency",
      confidence: "low",
      reasoning: "Heavy bleeding that won't stop.",
      next_steps: [],
      warning_signs: [],
      retake_needed: false,
      comparison: null,
    });
  });

  it("keeps a not_enough_info reply cautious without an empty result", () => {
    const result = normalizeCheckResult({ severity_tier: "not_enough_info", reasoning: "I can't tell from this." }, "en", false);
    expect(result?.severity_tier).toBe("self_care");
    expect(result?.confidence).toBe("low");
    expect(applySafetyRules(result!, DEFAULT_ANSWERS).severity_tier).toBe("clinic");
  });

  it("writes its own reasoning when the reply has none, in the requested language", () => {
    expect(normalizeCheckResult({ severity_tier: "self_care" }, "es", false)?.reasoning).toContain("hazte revisar");
    expect(normalizeCheckResult({ severity_tier: "self_care", reasoning: "   " }, "en", false)?.reasoning).toContain("get checked");
  });

  it("unwraps a reply nested under result or as a JSON string", () => {
    expect(normalizeCheckResult({ result: '{"severity_tier":"clinic","reasoning":"See a clinic."}' }, "en", true)?.severity_tier).toBe("clinic");
    expect(normalizeCheckResult('{"severity_tier":"urgent_care","reasoning":"Needs care today."}', "en", true)?.severity_tier).toBe("urgent_care");
  });

  it("refuses a reply with no usable severity tier", () => {
    expect(normalizeCheckResult({ reasoning: "No tier here." }, "en", false)).toBeNull();
    expect(normalizeCheckResult(null, "en", false)).toBeNull();
  });

  it("reads a compare verdict from either reply shape", () => {
    expect(extractComparison({ change: "worse", summary: "More red." })).toEqual({ change: "worse", summary: "More red." });
    expect(extractComparison({ comparison: { change: "same", summary: "No change." } })).toEqual({ change: "same", summary: "No change." });
    expect(extractComparison({ note: "no verdict" })).toBeNull();
  });

  it("never lets a worse or unclear trend read as home care", () => {
    expect(applyComparison(home, { change: "worse", summary: "Redder." }).severity_tier).toBe("clinic");
    expect(applyComparison(home, { change: "unclear", summary: "Hard to tell." }).severity_tier).toBe("clinic");
    expect(applyComparison(home, { change: "better", summary: "Healing." }).severity_tier).toBe("self_care");
    expect(applyComparison({ ...home, severity_tier: "urgent_care" }, { change: "worse", summary: "Redder." }).severity_tier).toBe("urgent_care");
    expect(applyComparison(home, null).comparison).toBeNull();
  });
});

describe("AWS failure contract", () => {
  it("shows one fixed message for every AWS-side failure", () => {
    expect(AWS_FAILURE_MESSAGE).toBe("Something went wrong. Please try again.");
  });
});

import { normalizeCheckResult as _n } from "./analyze-map";
describe("fallback replies", () => {
  it("treats an AWS fallback reply as a failure, not a result", () => {
    expect(_n({ severity_tier: "clinic", confidence: "low", reasoning: "x", source: "fallback" }, "en", true)).toBeNull();
  });
});
import { isFallback as _f } from "./analyze-map";
describe("quota outage detection", () => {
  it("flags the AWS placeholder reply", () => { expect(_f({ source: "fallback" })).toBe(true); });
  it("does not flag a real reply", () => { expect(_f({ severity_tier: "clinic", source: "bedrock" })).toBe(false); });
});

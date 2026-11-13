import { describe, it, expect } from "vitest";
import { applySafetyRules, DEFAULT_ANSWERS, DEFAULT_RISK, RISK_KEYS, escalateResult, hasEnoughInformation, type AiResult } from "./triage";

const base: AiResult = {
  wound_type: "scrape", visible_signs: [], severity_tier: "self_care", confidence: "high",
  reasoning: "", next_steps: [], warning_signs: [], retake_needed: false, comparison: null,
};

describe("safety rules", () => {
  it("emergency chip always forces emergency", () => {
    expect(applySafetyRules(base, DEFAULT_ANSWERS, ["chest"]).severity_tier).toBe("emergency");
  });
  it("fever + spreading redness raises minimum to urgent care", () => {
    expect(applySafetyRules(base, { ...DEFAULT_ANSWERS, fever: true, spreadingRedness: true }).severity_tier).toBe("urgent_care");
  });
  it("fever + pus raises minimum to urgent care", () => {
    expect(applySafetyRules(base, { ...DEFAULT_ANSWERS, fever: true, pus: true }).severity_tier).toBe("urgent_care");
  });
  it("fever alone does not force urgent care", () => {
    expect(applySafetyRules(base, { ...DEFAULT_ANSWERS, fever: true }).severity_tier).toBe("self_care");
  });
  it("never lowers an AI emergency", () => {
    expect(applySafetyRules({ ...base, severity_tier: "emergency" }, DEFAULT_ANSWERS).severity_tier).toBe("emergency");
  });
  it("low confidence picks the more cautious tier", () => {
    const r = applySafetyRules({ ...base, confidence: "low" }, DEFAULT_ANSWERS);
    expect(r.severity_tier).toBe("clinic");
    expect(r.lowConfidence).toBe(true);
  });
});

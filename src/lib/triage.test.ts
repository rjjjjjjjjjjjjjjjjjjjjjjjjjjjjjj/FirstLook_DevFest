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
  it.each(RISK_KEYS)("the %s risk factor raises the minimum tier by one level", (key) => {
    const risk = { ...DEFAULT_RISK, [key]: true };
    const r = applySafetyRules(base, { ...DEFAULT_ANSWERS, risk });
    expect(r.severity_tier).toBe("clinic");
    expect(r.rulesTriggered).toContain("risk_factor");
  });
  it("multiple risk factors still add only one level", () => {
    const risk = { ...DEFAULT_RISK, diabetes: true, pregnant: true, bloodThinners: true };
    expect(applySafetyRules(base, { ...DEFAULT_ANSWERS, risk }).severity_tier).toBe("clinic");
  });
  it("getting worse moves the result one level higher and records the rule", () => {
    const r = escalateResult({ ...base, severity_tier: "clinic" });
    expect(r.severity_tier).toBe("urgent_care");
    expect(r.rulesTriggered).toContain("getting_worse");
  });
  it("does not allow AI analysis without a photo, description, or symptom interaction", () => {
    expect(hasEnoughInformation(null, "  ", false)).toBe(false);
    expect(hasEnoughInformation(null, "", true)).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { AnalysisInput, AnalysisResult } from "./analysis-schema";
import { DEFAULT_ANSWERS } from "./triage";

const input = { mode: "check", images: ["data:image/jpeg;base64,YQ=="], answers: DEFAULT_ANSWERS, forWhom: "me", ageGroup: null, lang: "en" };
const result = { wound_type: "Scrape", visible_signs: [], severity_tier: "self_care", confidence: "high", reasoning: "Looks shallow.", next_steps: ["Keep clean."], warning_signs: ["Fever."], retake_needed: false, comparison: null };

describe("Gemini photo and symptom contract", () => {
  it("accepts a photo and concrete symptom answers", () => {
    expect(AnalysisInput.parse(input).answers.pain).toBe(3);
  });
  it("rejects an external photo URL instead of inline image data", () => {
    expect(AnalysisInput.safeParse({ ...input, images: ["https://example.com/photo.jpg"] }).success).toBe(false);
  });
  it("rejects missing symptom answers", () => {
    expect(AnalysisInput.safeParse({ ...input, answers: {} }).success).toBe(false);
  });
  it("returns validated JSON with a known triage tier", () => {
    expect(AnalysisResult.parse(result).severity_tier).toBe("self_care");
    expect(AnalysisResult.safeParse({ ...result, severity_tier: "unknown" }).success).toBe(false);
  });
  it("rejects incomplete JSON instead of inventing missing advice", () => {
    expect(AnalysisResult.safeParse({ severity_tier: "self_care" }).success).toBe(false);
  });
});
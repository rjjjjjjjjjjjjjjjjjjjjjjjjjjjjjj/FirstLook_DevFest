import { describe, expect, it } from "vitest";
import { EMPTY_HEALTH_PROFILE, profileRiskFlags } from "./health";

describe("health profile risk mapping", () => {
  it("maps only diabetes, medication, immune, and pregnancy flags relevant to a check", () => {
    const flags = profileRiskFlags({
      ...EMPTY_HEALTH_PROFILE,
      conditions: ["diabetes", "heart_disease", "pregnant"],
      medications: ["blood_thinners"],
      allergies: ["latex"],
    });
    expect(flags).toMatchObject({ diabetes: true, pregnant: true, bloodThinners: true, weakImmune: false });
    expect(Object.keys(flags)).not.toContain("allergies");
    expect(Object.keys(flags)).not.toContain("heart_disease");
  });
  it("treats an unsure tetanus date as a risk flag", () => {
    expect(profileRiskFlags({ ...EMPTY_HEALTH_PROFILE, lastTetanus: "unsure" }).noTetanus).toBe(true);
  });
  it("flags a tetanus shot more than ten years old", () => {
    const flags = profileRiskFlags({ ...EMPTY_HEALTH_PROFILE, lastTetanus: "2010-01-01" }, new Date("2026-11-13"));
    expect(flags.noTetanus).toBe(true);
  });
});

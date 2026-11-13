import { describe, expect, it } from "vitest";
import { lowestCostForTier, SAMPLE_COSTS } from "./cost";

describe("sample cost guidance", () => {
  it("highlights telehealth as the lowest sample cost matching a clinic result", () => {
    expect(lowestCostForTier("clinic", SAMPLE_COSTS.no_insurance)).toBe("telehealth");
  });
  it("matches an urgent-care result only with urgent care", () => {
    expect(lowestCostForTier("urgent_care", SAMPLE_COSTS.employer)).toBe("urgent");
  });
  it("offers no cost recommendation for an emergency", () => {
    expect(lowestCostForTier("emergency", SAMPLE_COSTS.employer)).toBeNull();
  });
});

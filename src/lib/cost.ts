import type { Tier } from "./triage";

export type PlanType = "no_insurance" | "medicaid" | "employer" | "student" | "marketplace" | "not_sure";
export type CareCostKey = "telehealth" | "clinic" | "urgent" | "er";
export type CostRange = { low: number; high: number; plus?: boolean };

/** Illustrative sample ranges only; these are not coverage or quote data. */
export const SAMPLE_COSTS: Record<PlanType, Record<CareCostKey, CostRange>> = {
  no_insurance: {
    telehealth: { low: 25, high: 75 }, clinic: { low: 75, high: 250 }, urgent: { low: 150, high: 400 }, er: { low: 1000, high: 3000, plus: true },
  },
  medicaid: {
    telehealth: { low: 0, high: 20 }, clinic: { low: 0, high: 50 }, urgent: { low: 0, high: 75 }, er: { low: 0, high: 150 },
  },
  employer: {
    telehealth: { low: 20, high: 60 }, clinic: { low: 25, high: 100 }, urgent: { low: 75, high: 250 }, er: { low: 250, high: 1500, plus: true },
  },
  student: {
    telehealth: { low: 0, high: 40 }, clinic: { low: 10, high: 75 }, urgent: { low: 50, high: 200 }, er: { low: 150, high: 1000, plus: true },
  },
  marketplace: {
    telehealth: { low: 20, high: 75 }, clinic: { low: 30, high: 125 }, urgent: { low: 100, high: 300 }, er: { low: 300, high: 2000, plus: true },
  },
  not_sure: {
    telehealth: { low: 0, high: 100 }, clinic: { low: 0, high: 250 }, urgent: { low: 50, high: 400 }, er: { low: 150, high: 3000, plus: true },
  },
};

export function lowestCostForTier(tier: Tier, costs: Record<CareCostKey, CostRange>): CareCostKey | null {
  const matching: CareCostKey[] = tier === "self_care" ? ["telehealth"] : tier === "clinic" ? ["telehealth", "clinic"] : tier === "urgent_care" ? ["urgent"] : [];
  return matching.reduce<CareCostKey | null>((best, key) => (!best || costs[key].low < costs[best].low ? key : best), null);
}

import { useState } from "react";
import { AlertTriangle, CircleDollarSign, HeartHandshake } from "lucide-react";
import { SAMPLE_COSTS, lowestCostForTier, type CareCostKey, type PlanType } from "@/lib/cost";
import { useI18n } from "@/lib/i18n";
import type { Tier } from "@/lib/triage";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CARE_KEYS: CareCostKey[] = ["telehealth", "clinic", "urgent", "er"];
const PLAN_KEYS: PlanType[] = ["no_insurance", "medicaid", "employer", "student", "marketplace", "not_sure"];

export function CostEstimate({ tier }: { tier: Tier }) {
  const { t } = useI18n();
  const [plan, setPlan] = useState<PlanType>("not_sure");
  const [deductible, setDeductible] = useState("");
  const [copay, setCopay] = useState("");

  if (tier === "emergency") {
    return (
      <section className="flex gap-3 rounded-2xl bg-tier-er-soft p-5 font-semibold text-tier-er" role="alert">
        <AlertTriangle className="mt-0.5 size-6 shrink-0" aria-hidden />
        <p>{t.emergencyCost}</p>
      </section>
    );
  }

  const costs = SAMPLE_COSTS[plan];
  const best = lowestCostForTier(tier, costs);
  return (
    <section className="card-soft space-y-5 p-5">
      <div className="flex items-center gap-2">
        <CircleDollarSign className="size-6 text-primary" aria-hidden />
        <h2 className="font-semibold">{t.costTitle}</h2>
      </div>
      <div className="space-y-2">
        <Label htmlFor="plan-type">{t.planType}</Label>
        <Select value={plan} onValueChange={(value) => setPlan(value as PlanType)}>
          <SelectTrigger id="plan-type" className="h-12 text-base"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PLAN_KEYS.map((key) => <SelectItem key={key} value={key} className="min-h-11">{t[`plan_${key}`]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="deductible">{t.deductible}</Label>
          <Input id="deductible" type="number" min="0" max="1000000" inputMode="decimal" placeholder="$0" value={deductible} onChange={(e) => setDeductible(e.target.value)} className="h-12 text-base" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="copay">{t.copay}</Label>
          <Input id="copay" type="number" min="0" max="1000000" inputMode="decimal" placeholder="$0" value={copay} onChange={(e) => setCopay(e.target.value)} className="h-12 text-base" />
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{t.costInputNote}</p>
      <div>
        <p className="mb-2 text-sm font-semibold text-muted-foreground">{t.estimatesOnly}</p>
        <div className="grid grid-cols-2 gap-2">
          {CARE_KEYS.map((key) => {
            const range = costs[key];
            const highlighted = key === best;
            return (
              <div key={key} className={cn("rounded-xl border p-3", highlighted && "border-primary bg-secondary ring-1 ring-primary")}>
                <p className="font-medium">{t[`cost_${key}`]}</p>
                <p className="mt-1 text-lg font-bold">${range.low.toLocaleString("en-US")}–${range.high.toLocaleString("en-US")}{range.plus ? "+" : ""}</p>
                {highlighted && <p className="mt-1 text-xs font-semibold text-primary">{t.lowestMatch}</p>}
              </div>
            );
          })}
        </div>
      </div>
      {plan === "no_insurance" && (
        <div className="rounded-xl bg-secondary p-4">
          <div className="flex items-center gap-2 font-semibold text-secondary-foreground">
            <HeartHandshake className="size-5" aria-hidden /> {t.lowCostTitle}
          </div>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-sm">{t.lowCostItems.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
      )}
      <div>
        <h3 className="font-semibold">{t.insurerQuestions}</h3>
        <div className="mt-2 space-y-3">
          {t.insurerQs.map((question, index) => (
            <label key={question} className="flex min-h-11 items-start gap-3 text-sm">
              <Checkbox id={`insurer-${index}`} className="mt-0.5" />
              <span>{question}</span>
            </label>
          ))}
        </div>
      </div>
      <p className="text-sm font-medium">{t.coverageLine}</p>
    </section>
  );
}

import { Check, AlertTriangle, MapPin, CalendarClock } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import type { AiResult } from "@/lib/triage";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TIER_STYLE } from "./TierBadge";
import { CostEstimate } from "./CostEstimate";

export function TierHero({ tier }: { tier: AiResult["severity_tier"] }) {
  const { t } = useI18n();
  const style = TIER_STYLE[tier];
  const Icon = style.icon;
  return (
    <section className={cn("rounded-2xl p-5", style.bg)} aria-live="polite">
      <div className={cn("flex items-center gap-2 font-semibold", style.text)}>
        <span className={cn("grid size-10 shrink-0 place-items-center rounded-full text-primary-foreground", style.solid)}>
          <Icon className="size-5" aria-hidden />
        </span>
        {t[`tier_${tier}`]}
      </div>
      <h1 className="mt-3 text-2xl font-bold leading-tight text-foreground">{t[`head_${tier}`]}</h1>
    </section>
  );
}

export function ResultView({ result, actions }: { result: AiResult; actions?: ReactNode }) {
  const { t } = useI18n();
  const warnings = result.warning_signs.length > 0 ? result.warning_signs : t.warningFallback;
  return (
    <div className="space-y-4">
      <TierHero tier={result.severity_tier} />
      {result.reasoning && (
        <section className="card-soft p-5">
          <h2 className="font-semibold">{t.why}</h2>
          <p className="mt-1.5 text-foreground/90">{result.reasoning}</p>
        </section>
      )}
      {result.next_steps.length > 0 && (
        <section className="card-soft p-5">
          <h2 className="font-semibold">{t.whatNow}</h2>
          <ul className="mt-2 space-y-2">
            {result.next_steps.map((step, index) => (
              <li key={index} className="flex gap-2.5"><Check className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden /><span>{step}</span></li>
            ))}
          </ul>
        </section>
      )}
      <section className="card-soft p-5">
        <h2 className="font-semibold">{t.warning}</h2>
        <ul className="mt-2 space-y-2">
          {warnings.map((sign, index) => (
            <li key={index} className="flex gap-2.5"><AlertTriangle className="mt-0.5 size-5 shrink-0 text-tier-urgent" aria-hidden /><span>{sign}</span></li>
          ))}
        </ul>
        <p className="mt-4 flex gap-2.5 rounded-xl bg-secondary p-3 font-medium text-secondary-foreground">
          <CalendarClock className="mt-0.5 size-5 shrink-0" aria-hidden /> {t.checkAgain}
        </p>
      </section>
      <CostEstimate tier={result.severity_tier} />
      <div className="no-print space-y-3 pt-2">
        <Button size="xl" asChild><Link to="/care"><MapPin aria-hidden /> {t.findCare}</Link></Button>
        {actions}
      </div>
      <p className="text-center text-sm text-muted-foreground">{t.disclaimerShort}</p>
    </div>
  );
}

export function AnalyzingSkeleton() {
  const { t } = useI18n();
  return (
    <div className="step-in space-y-4 pt-4" role="status">
      <p className="text-xl font-semibold">{t.analyzing}</p>
      <p className="text-muted-foreground">{t.analyzingSub}</p>
      <div className="animate-pulse space-y-4">
        <div className="h-32 rounded-2xl bg-muted" />
        <div className="card-soft space-y-3 p-5"><div className="h-4 w-1/3 rounded bg-muted" /><div className="h-4 w-full rounded bg-muted" /><div className="h-4 w-5/6 rounded bg-muted" /></div>
        <div className="card-soft space-y-3 p-5"><div className="h-4 w-1/2 rounded bg-muted" /><div className="h-4 w-2/3 rounded bg-muted" /></div>
      </div>
    </div>
  );
}

export function RetakeView({ onRetake, onContinue }: { onRetake: () => void; onContinue: () => void }) {
  const { t } = useI18n();
  return (
    <div className="step-in space-y-5 pt-4">
      <h1 className="text-2xl font-bold">{t.retakeTitle}</h1>
      <p className="text-muted-foreground">{t.retakeSub}</p>
      <ul className="card-soft space-y-2.5 p-5">
        {t.retakeTips.map((tip) => <li key={tip} className="flex gap-2.5"><Check className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />{tip}</li>)}
      </ul>
      <Button size="xl" onClick={onRetake}>{t.retakeBtn}</Button>
      <Button size="xl" variant="outline" onClick={onContinue}>{t.seeCautious}</Button>
    </div>
  );
}

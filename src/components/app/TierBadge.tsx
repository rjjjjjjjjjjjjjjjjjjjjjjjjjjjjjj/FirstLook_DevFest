import { CheckCircle2, Stethoscope, Clock, Siren } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Tier } from "@/lib/triage";
import { useI18n } from "@/lib/i18n";

export const TIER_STYLE: Record<Tier, { icon: typeof Siren; text: string; bg: string; solid: string }> = {
  self_care: { icon: CheckCircle2, text: "text-tier-home", bg: "bg-tier-home-soft", solid: "bg-tier-home" },
  clinic: { icon: Stethoscope, text: "text-tier-clinic", bg: "bg-tier-clinic-soft", solid: "bg-tier-clinic" },
  urgent_care: { icon: Clock, text: "text-tier-urgent", bg: "bg-tier-urgent-soft", solid: "bg-tier-urgent" },
  emergency: { icon: Siren, text: "text-tier-er", bg: "bg-tier-er-soft", solid: "bg-tier-er" },
};

export function TierBadge({ tier, className }: { tier: Tier; className?: string }) {
  const { t } = useI18n();
  const s = TIER_STYLE[tier];
  const Icon = s.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-semibold", s.bg, s.text, className)}>
      <Icon className="size-4" aria-hidden />
      {t[`tier_${tier}`]}
    </span>
  );
}

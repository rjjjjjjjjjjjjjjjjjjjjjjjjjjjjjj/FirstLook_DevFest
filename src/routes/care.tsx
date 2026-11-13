import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Video, Building2, Clock, Siren, ExternalLink, Info } from "lucide-react";
import { AppShell, StepHeader } from "@/components/app/AppShell";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/care")({
  head: () => ({
    meta: [
      { title: "Find care near you — FirstLook" },
      { name: "description", content: "Telehealth, community health centers, urgent care and ERs near you." },
      { property: "og:title", content: "Find care near you — FirstLook" },
      { property: "og:description", content: "Telehealth, community health centers, urgent care and ERs near you." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Care,
});

const TYPES = [
  { key: "telehealth", icon: Video, q: "telehealth doctor" },
  { key: "chc", icon: Building2, q: "community health center" },
  { key: "urgent", icon: Clock, q: "urgent care" },
  { key: "er", icon: Siren, q: "emergency room" },
] as const;

function openMaps(q: string) {
  const fallback = () => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q + " near me")}`, "_blank", "noopener");
  if (!navigator.geolocation) return fallback();
  const win = window.open("about:blank", "_blank");
  navigator.geolocation.getCurrentPosition(
    (p) => {
      const url = `https://www.google.com/maps/search/${encodeURIComponent(q)}/@${p.coords.latitude},${p.coords.longitude},13z`;
      if (win) win.location.href = url; else window.open(url, "_blank");
    },
    () => {
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q + " near me")}`;
      if (win) win.location.href = url; else fallback();
    },
    { timeout: 5000 },
  );
}

function Care() {
  const { t } = useI18n();
  const router = useRouter();
  return (
    <AppShell>
      <StepHeader onBack={() => router.history.back()} />
      <div className="step-in space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">{t.careTitle}</h1>
        <p className="text-muted-foreground">{t.careSub}</p>
        {TYPES.map(({ key, icon: Icon, q }) => (
          <button key={key} type="button" onClick={() => openMaps(q)} className="card-soft flex w-full items-center gap-4 p-4 text-left hover:ring-2 hover:ring-primary/30">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-secondary text-primary"><Icon className="size-6" aria-hidden /></span>
            <span className="flex-1">
              <span className="block font-semibold">{t[`care_${key}`]}</span>
              <span className="block text-muted-foreground">{t[`care_${key}_g`]}</span>
            </span>
            <ExternalLink className="size-5 text-primary" aria-label={t.openMaps} />
          </button>
        ))}
        <p className="flex gap-3 rounded-2xl bg-secondary p-4 text-secondary-foreground">
          <Info className="mt-0.5 size-5 shrink-0" aria-hidden /> {t.michigan}
        </p>
      </div>
    </AppShell>
  );
}

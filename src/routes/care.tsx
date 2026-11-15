import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Video, Building2, Clock, Siren, ExternalLink, Info, Bandage, Stethoscope, Loader2, Star, Navigation, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { findNearbyCare, type NearbyPlace } from "@/lib/places.functions";
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
  { key: "wound", icon: Bandage, q: "wound care center" },
  { key: "urgent", icon: Clock, q: "urgent care" },
  { key: "derm", icon: Stethoscope, q: "dermatologist" },
  { key: "chc", icon: Building2, q: "community health center" },
  { key: "telehealth", icon: Video, q: "telehealth doctor" },
  { key: "er", icon: Siren, q: "emergency room" },
] as const;
type Kind = (typeof TYPES)[number]["key"];

function mapsSearch(q: string, pos?: { lat: number; lng: number }) {
  return pos
    ? `https://www.google.com/maps/search/${encodeURIComponent(q)}/@${pos.lat},${pos.lng},13z`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q + " near me")}`;
}

function Care() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const find = useServerFn(findNearbyCare);
  const [kind, setKind] = useState<Kind | null>(null);
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "done" | "error" | "noloc">("idle");
  const [places, setPlaces] = useState<NearbyPlace[]>([]);

  const load = async (k: Kind, p: { lat: number; lng: number }) => {
    setState("loading");
    const r = await find({ data: { kind: k, lat: p.lat, lng: p.lng, lang } }).catch(() => ({ ok: false as const }));
    if (r.ok) { setPlaces(r.places); setState("done"); } else setState("error");
  };

  const choose = (k: Kind) => {
    setKind(k);
    if (pos) { void load(k, pos); return; }
    if (!navigator.geolocation) { setState("noloc"); return; }
    setState("loading");
    navigator.geolocation.getCurrentPosition(
      (g) => { const p = { lat: g.coords.latitude, lng: g.coords.longitude }; setPos(p); void load(k, p); },
      () => setState("noloc"),
      { timeout: 8000 },
    );
  };

  const active = TYPES.find((x) => x.key === kind);
  const miles = (d: number) => (lang === "en" ? `${(d * 0.621).toFixed(1)} mi` : `${d.toFixed(1)} km`);

  return (
    <AppShell>
      <StepHeader onBack={() => router.history.back()} />
      <div className="step-in space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">{t.careTitle}</h1>
        <p className="text-muted-foreground">{t.careSub}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {TYPES.map(({ key, icon: Icon }) => (
            <button key={key} type="button" onClick={() => choose(key)} aria-pressed={kind === key}
              className={cn("card-soft flex w-full items-center gap-4 p-4 text-left hover:ring-2 hover:ring-primary/30", kind === key && "ring-2 ring-primary")}>
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-secondary text-primary"><Icon className="size-6" aria-hidden /></span>
              <span className="flex-1">
                <span className="block font-semibold">{t[`care_${key}`]}</span>
                <span className="block text-sm text-muted-foreground">{t[`care_${key}_g`]}</span>
              </span>
            </button>
          ))}
        </div>

        {active && (
          <section className="space-y-3" aria-live="polite">
            {state === "loading" && <p className="flex items-center gap-2 text-muted-foreground"><Loader2 className="size-4 animate-spin" aria-hidden />{t.nearbyLoading}</p>}
            {state === "noloc" && <p className="text-muted-foreground">{t.nearbyNeedLocation}</p>}
            {state === "error" && <p className="text-muted-foreground">{t.nearbyError}</p>}
            {state === "done" && places.length === 0 && <p className="text-muted-foreground">{t.nearbyNone}</p>}
            {state === "done" && places.map((p) => (
              <article key={p.id} className="card-soft space-y-2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-semibold">{p.name}</h2>
                  {p.distanceKm != null && <span className="shrink-0 text-sm text-muted-foreground">{miles(p.distanceKm)}</span>}
                </div>
                <p className="text-sm text-muted-foreground">{p.address}</p>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  {p.rating != null && <span className="flex items-center gap-1"><Star className="size-4 text-primary" aria-hidden />{p.rating.toFixed(1)} ({p.ratings})</span>}
                  {p.openNow != null && <span className={p.openNow ? "font-medium text-primary" : "text-muted-foreground"}>{p.openNow ? t.openNow : t.closedNow}</span>}
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {p.mapsUrl && <Button size="sm" asChild><a href={p.mapsUrl} target="_blank" rel="noopener noreferrer"><Navigation aria-hidden />{t.directions}</a></Button>}
                  {p.phone && <Button size="sm" variant="outline" asChild><a href={`tel:${p.phone}`}><Phone aria-hidden />{t.callPlace} {p.phone}</a></Button>}
                </div>
              </article>
            ))}
            <a href={mapsSearch(active.q, pos ?? undefined)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline">
              <ExternalLink className="size-4" aria-hidden />{t.openMaps}
            </a>
          </section>
        )}

        <p className="flex gap-3 rounded-2xl bg-secondary p-4 text-secondary-foreground">
          <Info className="mt-0.5 size-5 shrink-0" aria-hidden /> {t.michigan}
        </p>
      </div>
    </AppShell>
  );
}

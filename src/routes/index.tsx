import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Camera, HeartPulse, ClipboardList, ShieldCheck, ScanLine, MessageCircle, ArrowUpRight } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { AuthGate } from "@/components/app/AuthGate";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";
import { useWounds } from "@/lib/data";
import { WoundCard } from "@/components/app/WoundCard";
import { toDataUrl } from "@/lib/photos";
import { setScreeningDraft } from "@/lib/screening-draft";
import { useProfilePreferences } from "@/lib/health";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "FIRSTLOOK — Your health, in focus" },
    { name: "description", content: "Your private health workspace for injury screenings, recovery logs, and care guidance." },
    { property: "og:title", content: "FIRSTLOOK — Your health, in focus" },
    { property: "og:description", content: "Your private health workspace for injury screenings, recovery logs, and care guidance." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: () => <AuthGate><Home /></AuthGate>,
});
function Home() {
  const { t } = useI18n();
  const { data, isLoading } = useWounds();
  const { data: preferences } = useProfilePreferences();
  const input = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const stats = [
    { label: t.injuryLogs, value: data?.length ?? 0, note: t.recoveryPlace, icon: ClipboardList, to: "/history" as const },
    { label: t.connectedDevices, value: 0, note: t.connectTerms, icon: HeartPulse, to: "/connected" as const },
    { label: t.insurance, value: preferences?.insurance ? t.insuranceAdded : t.insuranceNotAdded, note: t.reviewPlan, icon: ShieldCheck, to: "/insurance" as const },
  ];
  return <AppShell><div className="space-y-6 py-7 sm:py-9">
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
      <div className="min-w-0"><p className="mb-2 text-[10px] font-bold uppercase text-muted-foreground">{t.clearerStep}</p><h1 className="text-[28px] font-bold leading-tight sm:text-[32px]">{t.dashboardTitle}</h1><p className="mt-2 text-sm text-muted-foreground sm:text-base">{t.dashboardSub}</p></div>
      <Button variant="outline" asChild className="hidden min-h-11 sm:inline-flex"><Link to="/help"><MessageCircle />{t.screeningHelp}<ArrowUpRight /></Link></Button>
    </div>
    <div className="grid gap-3 sm:grid-cols-3">{stats.map(stat => <Link key={stat.label} to={stat.to} className="card-soft grid min-h-24 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 py-4 sm:block sm:min-h-32"><div className="min-w-0"><p className="flex items-center gap-2 text-xs text-muted-foreground"><stat.icon className="size-4 shrink-0 text-primary" />{stat.label}</p><p className="mt-1 text-xs text-muted-foreground sm:hidden">{stat.note}</p></div><p className="text-xl font-bold sm:mt-3 sm:text-2xl">{stat.value}</p><p className="mt-1 hidden text-xs text-muted-foreground sm:block">{stat.note}</p></Link>)}</div>
    <section className="border-y bg-screening px-4 py-6 sm:px-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3"><div className="min-w-0"><p className="text-[10px] font-bold uppercase text-muted-foreground">{t.navScreening}</p><h2 className="mt-2 text-xl font-semibold">{t.screeningTitle}</h2><p className="mt-2 text-sm text-muted-foreground">{t.screeningSub}</p></div><ScanLine className="size-7 shrink-0 text-primary" /></div>
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div className="min-w-0"><input ref={input} type="file" className="hidden" accept="image/jpeg,image/png,image/webp" aria-label={t.addInjuryPhoto} onChange={async e => { const file = e.target.files?.[0]; if (!file) return; setBusy(true); try { setPhoto(await toDataUrl(file)); } catch { toast.error(t.imageError); } finally { setBusy(false); } }} />
          <Button type="button" variant="outline" className="relative h-auto min-h-44 w-full gap-4 whitespace-normal border-dashed border-primary/65 bg-card px-4 py-6 text-left shadow-none md:h-full" onClick={() => input.current?.click()} disabled={busy}>
            {photo ? <img src={photo} alt={t.addInjuryPhoto} className="max-h-48 w-full rounded-md object-contain" /> : <><span className="grid size-12 shrink-0 place-items-center rounded-md bg-secondary text-primary"><Camera className="size-6" /></span><span className="min-w-0"><span className="block text-sm font-semibold">{busy ? t.loading : t.addInjuryPhoto}</span><span className="mt-1 block text-xs font-normal text-muted-foreground">{t.chooseImage}</span><span className="mt-2 block text-[10px] font-normal text-muted-foreground">{t.imageFormats}</span></span></>}
          </Button>
        </div>
        <div className="min-w-0"><label htmlFor="dashboard-description" className="text-xs font-semibold">{t.feelingLabel}</label><Textarea id="dashboard-description" value={description} maxLength={500} onChange={e => setDescription(e.target.value)} placeholder={t.feelingPlaceholder} className="mt-2 min-h-28 bg-card text-base sm:text-sm" /><div className="mt-3 grid items-center gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"><p className="text-[10px] text-muted-foreground">{t.disclaimerShort}</p><Button className="min-h-11" disabled={busy} onClick={() => { setScreeningDraft({ photo, description }); void navigate({ to: "/check" }); }}>{t.startScreening}<ArrowRight /></Button></div></div>
      </div>
    </section>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]"><section className="min-w-0 space-y-4"><div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3"><h2 className="text-xl font-semibold">{t.recentLogs}</h2><Button variant="link" asChild className="px-0 text-xs"><Link to="/history">{t.viewAll}<ArrowRight /></Link></Button></div>{isLoading ? <p className="text-sm text-muted-foreground">{t.loading}</p> : data?.length ? data.slice(0, 3).map(w => <WoundCard key={w.id} wound={w} />) : <p className="py-5 text-sm text-muted-foreground">{t.noRecent}</p>}</section><aside className="border-t pt-5 xl:border-l xl:border-t-0 xl:pl-6"><h2 className="flex items-center gap-3 text-base font-semibold"><HeartPulse className="size-5 shrink-0 text-primary" />{t.connectedPicture}</h2><p className="mt-3 text-sm text-muted-foreground">{t.connectedPictureSub}</p><Button variant="link" asChild className="mt-3 px-0"><Link to="/profile">{t.viewProfile}<ArrowRight /></Link></Button></aside></div>
  </div></AppShell>;
}

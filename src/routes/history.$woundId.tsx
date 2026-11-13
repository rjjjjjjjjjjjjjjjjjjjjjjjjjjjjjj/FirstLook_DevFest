import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, Share2, Printer, TrendingUp, TrendingDown, Minus, HelpCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell, StepHeader } from "@/components/app/AppShell";
import { AuthGate } from "@/components/app/AuthGate";
import { PhotoPicker } from "@/components/app/PhotoPicker";
import { ResultView, AnalyzingSkeleton } from "@/components/app/ResultView";
import { TierBadge } from "@/components/app/TierBadge";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useWounds, buildSummary, type CheckRow } from "@/lib/data";
import { analyzeWound } from "@/lib/analyze.functions";
import { applySafetyRules, escalateResult, trendFromChange } from "@/lib/triage";
import { photoUrl, toDataUrl, uploadDataUrl, usePhotoUrl } from "@/lib/photos";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/history/$woundId")({
  head: () => ({
    meta: [
      { title: "Wound details — FirstLook" },
      { name: "description", content: "Compare photos over time and share a summary with a clinician." },
      { property: "og:title", content: "Wound details — FirstLook" },
      { property: "og:description", content: "Compare photos over time and share a summary with a clinician." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AuthGate>
      <Detail />
    </AuthGate>
  ),
});

const TREND_ICON = { improving: TrendingUp, same: Minus, worse: TrendingDown, unclear: HelpCircle };
const TREND_STYLE = { improving: "bg-tier-home-soft text-tier-home", same: "bg-tier-clinic-soft text-tier-clinic", worse: "bg-tier-er-soft text-tier-er", unclear: "bg-muted text-muted-foreground" };

function Detail() {
  const { woundId } = Route.useParams();
  const { t, lang } = useI18n();
  const { session } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const analyze = useServerFn(analyzeWound);
  const { data } = useWounds();
  const [mode, setMode] = useState<"view" | "follow" | "analyzing">("view");
  const [photo, setPhoto] = useState<string | null>(null);
  const wound = data?.find((w) => w.id === woundId);
  if (!data) return <AppShell><p className="pt-10 text-muted-foreground">{t.loading}</p></AppShell>;
  if (!wound || wound.checks.length === 0) return <AppShell><StepHeader onBack={() => nav({ to: "/history" })} /><p>Not found.</p></AppShell>;

  const first = wound.checks[0]!;
  const last = wound.checks[wound.checks.length - 1]!;
  const tierLabel = (x: CheckRow["tier"]) => t[`tier_${x}`];

  const runFollowup = async () => {
    if (!photo || !session) return;
    setMode("analyzing");
    try {
      const firstUrl = await photoUrl(first.photo_path);
      const images = firstUrl ? [await toDataUrl(firstUrl), photo] : [photo];
      const res = await analyze({ data: {
        mode: "followup", images, answers: last.answers, description: last.answers.description ?? "",
        risk: last.answers.risk, forWhom: last.for_whom as "me", ageGroup: last.age_group, lang,
      } });
      if (!res.ok) throw new Error(res.error);
      const final = applySafetyRules(res.result, last.answers);
      if (final.comparison?.change === "worse") final.severity_tier = final.severity_tier === "self_care" ? "clinic" : final.severity_tier;
      const path = await uploadDataUrl(session.user.id, photo);
      const { error } = await supabase.from("checks").insert({
        wound_id: wound.id, photo_path: path, for_whom: last.for_whom, age_group: last.age_group, answers: last.answers,
        result: { ...final, rawAiOutput: res.result } as never, tier: final.severity_tier, summary: final.comparison?.summary || final.reasoning,
      });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["wounds"] });
      setPhoto(null);
      setMode("view");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
      setMode("follow");
    }
  };

  const share = async () => {
    const text = buildSummary(wound, { tier: tierLabel, disclaimer: t.disclaimerFull });
    if (navigator.share) {
      try { await navigator.share({ title: "FirstLook", text }); return; } catch { /* fall through */ }
    }
    await navigator.clipboard.writeText(text);
    toast.success(t.copied);
  };

  const remove = async () => {
    if (!confirm(`${t.deleteWound}?`)) return;
    const paths = wound.checks.map((c) => c.photo_path).filter((p): p is string => !!p && !p.startsWith("/"));
    if (paths.length) await supabase.storage.from("photos").remove(paths);
    await supabase.from("wounds").delete().eq("id", wound.id);
    await qc.invalidateQueries({ queryKey: ["wounds"] });
    nav({ to: "/history" });
  };

  if (mode === "analyzing") return <AppShell hideTabs><AnalyzingSkeleton /></AppShell>;
  if (mode === "follow")
    return (
      <AppShell hideTabs>
        <StepHeader onBack={() => setMode("view")} />
        <div className="step-in space-y-4">
          <h1 className="text-2xl font-bold">{t.followTitle}</h1>
          <PhotoPicker value={photo} onChange={setPhoto} />
          {photo && <Button size="xl" onClick={runFollowup}>{t.analyze}</Button>}
        </div>
      </AppShell>
    );

  const comparison = wound.checks.length > 1 ? last.result.comparison : null;
  const trend = trendFromChange(comparison?.change);
  const TrendIcon = TREND_ICON[trend];
  const date = (s: string) => new Date(s).toLocaleDateString(lang === "es" ? "es" : "en", { month: "short", day: "numeric" });

  return (
    <AppShell>
      <StepHeader onBack={() => nav({ to: "/history" })} />
      <div className="step-in space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{wound.title}</h1>
            <p className="text-muted-foreground">{wound.checks.length} {t.checks} · {date(first.created_at)}</p>
          </div>
          <TierBadge tier={last.tier} />
        </div>

        {wound.checks.length > 1 ? (
          <section className="card-soft space-y-3 p-4">
            <h2 className="font-semibold">{t.compare}</h2>
            <div className="grid grid-cols-2 gap-3">
              <Photo path={first.photo_path} label={`${t.day1} · ${date(first.created_at)}`} />
              <Photo path={last.photo_path} label={`${t.today} · ${date(last.created_at)}`} />
            </div>
            <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold", TREND_STYLE[trend])}>
              <TrendIcon className="size-4" aria-hidden /> {t[`trend_${trend}`]}
            </span>
            {comparison?.summary && <p>{comparison.summary}</p>}
            {trend === "worse" && <p className="rounded-xl bg-tier-er-soft p-3 font-semibold text-tier-er">{t.worsePrompt}</p>}
          </section>
        ) : (
          <Photo path={first.photo_path} label={date(first.created_at)} />
        )}

        <Button size="xl" variant="secondary" onClick={() => setMode("follow")}>
          <Camera aria-hidden /> {t.addFollowup}
        </Button>

        <ResultView
          result={last.result}
          actions={
            <div className="grid grid-cols-2 gap-2">
              <Button size="tap" variant="outline" onClick={share}><Share2 aria-hidden /> {t.share}</Button>
              <Button size="tap" variant="outline" onClick={() => window.print()}><Printer aria-hidden /> {t.print}</Button>
              <Button size="tap" variant="ghost" className="col-span-2 text-destructive" onClick={remove}><Trash2 aria-hidden /> {t.deleteWound}</Button>
            </div>
          }
        />
      </div>
    </AppShell>
  );
}

function Photo({ path, label }: { path: string | null; label: string }) {
  const url = usePhotoUrl(path);
  return (
    <figure className="space-y-1.5">
      {url ? <img src={url} alt={label} className="aspect-square w-full rounded-xl object-cover" /> : <div className="aspect-square w-full rounded-xl bg-muted" />}
      <figcaption className="text-sm font-medium text-muted-foreground">{label}</figcaption>
    </figure>
  );
}

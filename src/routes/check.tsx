import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Phone, User, Users, Check as CheckIcon, Save } from "lucide-react";
import { toast } from "sonner";
import { AppShell, StepHeader } from "@/components/app/AppShell";
import { AuthGate } from "@/components/app/AuthGate";
import { PhotoPicker } from "@/components/app/PhotoPicker";
import { ResultView, AnalyzingSkeleton, RetakeView } from "@/components/app/ResultView";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { analyzeWound } from "@/lib/analyze.functions";
import { applySafetyRules, DEFAULT_ANSWERS, EMERGENCY_CHIPS, type AiResult, type Answers } from "@/lib/triage";
import { supabase } from "@/integrations/supabase/client";
import { uploadDataUrl } from "@/lib/photos";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/check")({
  head: () => ({
    meta: [
      { title: "Check a wound — FirstLook" },
      { name: "description", content: "Answer a few questions and add a photo to get a calm, clear next step." },
      { property: "og:title", content: "Check a wound — FirstLook" },
      { property: "og:description", content: "Answer a few questions and add a photo to get a calm, clear next step." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AuthGate>
      <CheckFlow />
    </AuthGate>
  ),
});

type Step = "who" | "age" | "emergency" | "photo" | "symptoms" | "analyzing" | "retake" | "result" | "er" | "error";
const STEP_NUM: Partial<Record<Step, number>> = { who: 1, age: 1, emergency: 2, photo: 3, symptoms: 4 };

function CheckFlow() {
  const { t, lang } = useI18n();
  const { session } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const analyze = useServerFn(analyzeWound);
  const [step, setStep] = useState<Step>("who");
  const [forWhom, setForWhom] = useState<"me" | "other">("me");
  const [age, setAge] = useState<string | null>(null);
  const [chips, setChips] = useState<string[]>([]);
  const [photo, setPhoto] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Answers>(DEFAULT_ANSWERS);
  const [result, setResult] = useState<AiResult | null>(null);
  const [error, setError] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  const go = (s: Step) => {
    setStep(s);
    window.scrollTo({ top: 0 });
  };
  const back = () => {
    const prev: Partial<Record<Step, Step>> = { age: "who", emergency: forWhom === "other" ? "age" : "who", photo: "emergency", symptoms: "photo", retake: "symptoms", result: "symptoms", error: "symptoms", er: "emergency" };
    if (step === "who") nav({ to: "/" });
    else go(prev[step] ?? "who");
  };

  const run = async () => {
    go("analyzing");
    const res = await analyze({ data: { mode: "check", images: photo ? [photo] : [], answers, forWhom, ageGroup: age, lang } });
    if (!res.ok) {
      setError(res.error);
      return go("error");
    }
    const final = applySafetyRules(res.result, answers, chips);
    setResult(final);
    setSaveState("idle");
    go(final.lowConfidence && photo ? "retake" : "result");
  };

  const save = async () => {
    if (!session || !result) return;
    setSaveState("saving");
    try {
      const path = photo ? await uploadDataUrl(session.user.id, photo) : null;
      const { data: w, error: we } = await supabase.from("wounds").insert({ title: result.wound_type || t.startCheck }).select("id").single();
      if (we) throw we;
      const { error: ce } = await supabase.from("checks").insert({
        wound_id: w.id, photo_path: path, for_whom: forWhom, age_group: age, answers, result: result as never,
        tier: result.severity_tier, summary: result.reasoning.split(/(?<=\.)\s/)[0] ?? "",
      });
      if (ce) throw ce;
      setSaveState("saved");
      qc.invalidateQueries({ queryKey: ["wounds"] });
      toast.success(t.saved);
    } catch (e) {
      setSaveState("idle");
      toast.error(e instanceof Error ? e.message : "Error");
    }
  };

  if (step === "er") return <EmergencyScreen onBack={() => { setChips([]); go("emergency"); }} />;

  const num = STEP_NUM[step];
  return (
    <AppShell hideTabs={!!num}>
      {step !== "analyzing" && <StepHeader step={num} total={num ? 4 : undefined} onBack={back} />}
      <div key={step} className="step-in">
        {step === "who" && (
          <Screen title={t.whoTitle}>
            <Choice icon={User} label={t.me} onClick={() => { setForWhom("me"); setAge(null); go("emergency"); }} />
            <Choice icon={Users} label={t.someoneElse} sub={t.someoneElseSub} onClick={() => { setForWhom("other"); go("age"); }} />
          </Screen>
        )}
        {step === "age" && (
          <Screen title={t.ageTitle}>
            {(["child", "adult", "older"] as const).map((a) => (
              <Choice key={a} label={t[a]} onClick={() => { setAge(a); go("emergency"); }} />
            ))}
          </Screen>
        )}
        {step === "emergency" && (
          <Screen title={forWhom === "me" ? t.emTitleMe : t.emTitleThem} sub={t.emSub}>
            <div className="grid gap-2.5">
              {EMERGENCY_CHIPS.map((c) => (
                <Button key={c} variant="choice" size="tap" className="min-h-14 py-3" onClick={() => { setChips([c]); go("er"); }}>
                  {t[`em_${c}`]}
                </Button>
              ))}
            </div>
            <Bottom>
              <Button size="xl" variant="secondary" onClick={() => { setChips([]); go("photo"); }}>{t.noneOfThese}</Button>
            </Bottom>
          </Screen>
        )}
        {step === "photo" && (
          <Screen title={t.photoTitle}>
            <PhotoPicker value={photo} onChange={setPhoto} />
            <Bottom>
              {photo && <Button size="xl" onClick={() => go("symptoms")}>{t.next}</Button>}
              <Button size="xl" variant="ghost" onClick={() => { setPhoto(null); go("symptoms"); }}>{t.skipPhoto}</Button>
            </Bottom>
          </Screen>
        )}
        {step === "symptoms" && <Symptoms answers={answers} setAnswers={setAnswers} onDone={run} />}
        {step === "analyzing" && <AnalyzingSkeleton />}
        {step === "retake" && <RetakeView onRetake={() => { setPhoto(null); go("photo"); }} onContinue={() => go("result")} />}
        {step === "error" && (
          <Screen title={error}>
            <Bottom><Button size="xl" onClick={run}>{t.tryAgain}</Button></Bottom>
          </Screen>
        )}
        {step === "result" && result && (
          <div className="pt-2">
            <ResultView
              result={result}
              actions={
                <Button size="xl" variant="outline" onClick={save} disabled={saveState !== "idle"}>
                  {saveState === "saved" ? <CheckIcon aria-hidden /> : <Save aria-hidden />}
                  {saveState === "saved" ? t.saved : saveState === "saving" ? t.saving : t.save}
                </Button>
              }
            />
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Screen({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4 pt-2">
      <h1 className="text-2xl font-bold leading-tight">{title}</h1>
      {sub && <p className="text-muted-foreground">{sub}</p>}
      {children}
    </div>
  );
}

function Bottom({ children }: { children: React.ReactNode }) {
  return <div className="space-y-2 pt-4">{children}</div>;
}

function Choice({ icon: Icon, label, sub, onClick }: { icon?: typeof User; label: string; sub?: string; onClick: () => void }) {
  return (
    <Button variant="choice" className="min-h-20 w-full gap-4 px-5 py-4" onClick={onClick}>
      {Icon && (
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-secondary text-primary">
          <Icon className="!size-6" aria-hidden />
        </span>
      )}
      <span>
        <span className="block text-lg font-semibold">{label}</span>
        {sub && <span className="block text-muted-foreground">{sub}</span>}
      </span>
    </Button>
  );
}

function Symptoms({ answers, setAnswers, onDone }: { answers: Answers; setAnswers: (a: Answers) => void; onDone: () => void }) {
  const { t } = useI18n();
  const set = <K extends keyof Answers>(k: K, v: Answers[K]) => setAnswers({ ...answers, [k]: v });
  const toggles = ["fever", "spreadingRedness", "pus", "warmth", "numbness"] as const;
  return (
    <Screen title={t.symTitle}>
      <div className="card-soft divide-y px-4">
        {toggles.map((k) => (
          <label key={k} className="flex min-h-14 items-center justify-between gap-3 py-2 text-base">
            {t[k]}
            <Switch checked={answers[k]} onCheckedChange={(v) => set(k, v)} aria-label={t[k]} />
          </label>
        ))}
      </div>
      <div className="card-soft space-y-3 p-4">
        <div className="flex items-baseline justify-between">
          <span id="pain-label" className="font-medium">{t.pain}</span>
          <span className="text-2xl font-bold text-primary">{answers.pain}</span>
        </div>
        <Slider aria-labelledby="pain-label" min={0} max={10} step={1} value={[answers.pain]} onValueChange={([v]) => set("pain", v)} className="py-3" />
        <div className="flex justify-between text-sm text-muted-foreground"><span>{t.painLow}</span><span>{t.painHigh}</span></div>
      </div>
      <div className="card-soft space-y-2 p-4">
        <span id="howlong" className="font-medium">{t.howLong}</span>
        <Select value={answers.howLong} onValueChange={(v) => set("howLong", v)}>
          <SelectTrigger aria-labelledby="howlong" className="h-12 text-base"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(t.howLongOpts).map(([k, v]) => (
              <SelectItem key={k} value={k} className="min-h-11 text-base">{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="card-soft space-y-2 p-4">
        <span className="font-medium">{t.tetanus}</span>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t.tetanus}>
          {(["yes", "no", "unsure"] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={answers.tetanus === v}
              onClick={() => set("tetanus", v)}
              className={cn("min-h-12 rounded-xl border-2 font-medium", answers.tetanus === v ? "border-primary bg-secondary text-secondary-foreground" : "border-border")}
            >
              {t[v]}
            </button>
          ))}
        </div>
      </div>
      <Bottom><Button size="xl" onClick={onDone}>{t.analyze}</Button></Bottom>
    </Screen>
  );
}

function EmergencyScreen({ onBack }: { onBack: () => void }) {
  const { t } = useI18n();
  return (
    <div className="flex min-h-dvh flex-col bg-tier-er text-destructive-foreground">
      <div className="mx-auto flex w-full max-w-[480px] flex-1 flex-col px-5 py-8">
        <div className="step-in flex-1 space-y-5">
          <Phone className="size-12" aria-hidden />
          <h1 className="text-4xl font-bold">{t.emergencyTitle}</h1>
          <p className="text-xl">{t.emergencySub}</p>
          <ul className="space-y-2 text-lg">
            {t.emergencySteps.map((s) => <li key={s}>• {s}</li>)}
          </ul>
        </div>
        <div className="space-y-3">
          <a href="tel:911" className="flex min-h-20 items-center justify-center gap-3 rounded-2xl bg-card text-2xl font-bold text-destructive shadow-soft">
            <Phone className="size-7" aria-hidden /> {t.call911}
          </a>
          <button type="button" onClick={onBack} className="min-h-12 w-full rounded-xl underline">{t.emergencyBack}</button>
        </div>
      </div>
    </div>
  );
}

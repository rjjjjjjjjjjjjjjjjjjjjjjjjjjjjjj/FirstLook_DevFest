import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Phone, Check as CheckIcon, Save, TrendingDown, HeartHandshake, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { AppShell, StepHeader } from "@/components/app/AppShell";
import { AuthGate } from "@/components/app/AuthGate";
import { FirstUseGate } from "@/components/app/FirstUseGate";
import { PhotoPicker } from "@/components/app/PhotoPicker";
import { ResultView, AnalyzingSkeleton, RetakeView } from "@/components/app/ResultView";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { analyzeWound } from "@/lib/analyze.functions";
import {
  applySafetyRules, DEFAULT_ANSWERS, DEFAULT_RISK, EMERGENCY_CHIPS, RISK_KEYS, escalateResult,
  hasEnoughInformation, type AiResult, type Answers, type RiskFactors, type RiskKey,
} from "@/lib/triage";
import { scanDescription } from "@/lib/description-safety";
import { profileRiskFlags, useProfilePreferences } from "@/lib/health";
import { supabase } from "@/integrations/supabase/client";
import { uploadDataUrl } from "@/lib/photos";

export const Route = createFileRoute("/check")({
  head: () => ({
    meta: [
      { title: "Check a wound — FirstLook" },
      { name: "description", content: "Check for emergencies, add optional details, and get a calm, clear next step." },
      { property: "og:title", content: "Check a wound — FirstLook" },
      { property: "og:description", content: "Check for emergencies, add optional details, and get a calm, clear next step." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <AuthGate><FirstUseGate><CheckFlow /></FirstUseGate></AuthGate>,
});

type Step = "emergency" | "photo" | "description" | "symptoms" | "analyzing" | "retake" | "result" | "er" | "crisis" | "insufficient" | "error";
const STEP_NUM: Partial<Record<Step, number>> = { emergency: 1, photo: 2, description: 3, symptoms: 4 };

function CheckFlow() {
  const { t, lang } = useI18n();
  const { session } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const analyze = useServerFn(analyzeWound);
  const { data: preferences } = useProfilePreferences();
  const [step, setStep] = useState<Step>("emergency");
  const [chips, setChips] = useState<string[]>([]);
  const [photo, setPhoto] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [answers, setAnswers] = useState<Answers>({ ...DEFAULT_ANSWERS, risk: { ...DEFAULT_RISK } });
  const [manualRisk, setManualRisk] = useState<RiskFactors>({ ...DEFAULT_RISK });
  const [useProfile, setUseProfile] = useState(true);
  const [symptomsTouched, setSymptomsTouched] = useState(false);
  const [result, setResult] = useState<AiResult | null>(null);
  const [rawAi, setRawAi] = useState<AiResult | null>(null);
  const [error, setError] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [savedCheckId, setSavedCheckId] = useState<string | null>(null);
  const [emergencyReturn, setEmergencyReturn] = useState<"emergency" | "description">("emergency");

  const profileFlags = profileRiskFlags(preferences?.healthProfile);
  const hasHealthProfile = Boolean(preferences?.healthProfile);
  const effectiveRisk = RISK_KEYS.reduce<RiskFactors>((risk, key) => {
    risk[key] = manualRisk[key] || (useProfile && profileFlags[key]);
    return risk;
  }, { ...DEFAULT_RISK });

  const go = (next: Step) => {
    setStep(next);
    window.scrollTo({ top: 0 });
  };
  const back = () => {
    const prev: Partial<Record<Step, Step>> = {
      photo: "emergency", description: "photo", symptoms: "description", retake: "symptoms",
      result: "symptoms", error: "symptoms", insufficient: "symptoms", crisis: "description",
    };
    if (step === "emergency") nav({ to: "/" });
    else go(prev[step] ?? "emergency");
  };

  const continueDescription = () => {
    const alert = scanDescription(description);
    if (alert === "self_harm") return go("crisis");
    if (alert === "emergency") {
      setEmergencyReturn("description");
      return go("er");
    }
    go("symptoms");
  };

  const persist = async (finalArg?: AiResult, rawArg?: AiResult, answersArg?: Answers) => {
    const final = finalArg ?? result;
    const raw = rawArg ?? rawAi;
    const currentAnswers = answersArg ?? answers;
    if (!session || !final) return;
    setSaveState("saving");
    try {
      const path = photo ? await uploadDataUrl(session.user.id, photo) : null;
      const { data: wound, error: woundError } = await supabase.from("wounds").insert({ title: final.wound_type || t.startCheck }).select("id").single();
      if (woundError) throw woundError;
      const savedResult = { ...final, rawAiOutput: raw ?? undefined };
      const { data: check, error: checkError } = await supabase.from("checks").insert({
        wound_id: wound.id,
        photo_path: path,
        for_whom: "me",
        age_group: null,
        answers: currentAnswers,
        result: savedResult as never,
        tier: final.severity_tier,
        summary: final.reasoning.split(/(?<=\.)\s/)[0] ?? "",
      }).select("id").single();
      if (checkError) throw checkError;
      setSavedCheckId(check.id);
      setSaveState("saved");
      qc.invalidateQueries({ queryKey: ["wounds"] });
    } catch (e) {
      console.error(e);
      setSaveState("error");
      toast.error(t.saveError);
    }
  };

  const run = async () => {
    const currentAnswers: Answers = {
      ...answers,
      description: description.trim(),
      risk: { ...effectiveRisk },
      tetanus: effectiveRisk.noTetanus ? "no" : answers.tetanus,
    };
    if (!hasEnoughInformation(photo, currentAnswers.description, symptomsTouched)) return go("insufficient");
    setAnswers(currentAnswers);
    go("analyzing");
    const res = await analyze({
      data: {
        mode: "check", images: photo ? [photo] : [], description: currentAnswers.description,
        risk: effectiveRisk, answers: currentAnswers, forWhom: "me", ageGroup: null, lang,
      },
    });
    if (!res.ok) {
      setError(res.error);
      return go("error");
    }
    const final = applySafetyRules(res.result, currentAnswers, chips);
    setResult(final);
    setRawAi(res.result);
    setSaveState("idle");
    setSavedCheckId(null);
    go(final.lowConfidence && photo ? "retake" : "result");
    void persist(final, res.result, currentAnswers);
  };

  const markWorse = async () => {
    if (!result) return;
    const next = escalateResult(result);
    setResult(next);
    if (savedCheckId) {
      const savedResult = { ...next, rawAiOutput: rawAi ?? undefined };
      const { error: updateError } = await supabase.from("checks").update({
        tier: next.severity_tier,
        result: savedResult as never,
      }).eq("id", savedCheckId);
      if (updateError) {
        toast.error(updateError.message);
        return;
      }
      qc.invalidateQueries({ queryKey: ["wounds"] });
    }
    toast.success(t.worseUpdated);
  };

  const changeRisk = (key: RiskKey, value: boolean) => {
    setSymptomsTouched(true);
    if (useProfile && hasHealthProfile) {
      setManualRisk({ ...effectiveRisk, [key]: value });
      setUseProfile(false);
    } else {
      setManualRisk({ ...manualRisk, [key]: value });
    }
  };

  if (step === "er") return <EmergencyScreen onBack={() => { setChips([]); go(emergencyReturn); }} />;
  if (step === "crisis") return <CrisisScreen onBack={() => go("description")} />;

  const num = STEP_NUM[step];
  return (
    <AppShell hideTabs={!!num || step === "insufficient"}>
      {step !== "analyzing" && <StepHeader step={num} total={num ? 4 : undefined} onBack={back} />}
      <div key={step} className="step-in">
        {step === "emergency" && (
          <Screen title={t.emTitleMe} sub={t.emSub}>
            <div className="grid gap-2.5">
              {EMERGENCY_CHIPS.map((chip) => (
                <Button key={chip} variant="choice" size="tap" className="min-h-14 py-3" onClick={() => { setChips([chip]); setEmergencyReturn("emergency"); go("er"); }}>
                  {t[`em_${chip}`]}
                </Button>
              ))}
            </div>
            <Bottom><Button size="xl" variant="secondary" onClick={() => { setChips([]); go("photo"); }}>{t.noneOfThese}</Button></Bottom>
          </Screen>
        )}
        {step === "photo" && (
          <Screen title={t.photoTitle}>
            <PhotoPicker value={photo} onChange={setPhoto} />
            <Bottom>
              {photo && <Button size="xl" onClick={() => go("description")}>{t.next}</Button>}
              <Button size="xl" variant="ghost" onClick={() => { setPhoto(null); go("description"); }}>{t.skipPhoto}</Button>
            </Bottom>
          </Screen>
        )}
        {step === "description" && (
          <Screen title={t.descriptionTitle} sub={t.descriptionSub}>
            <div className="space-y-2">
              <Textarea
                aria-label={t.descriptionTitle}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={500}
                placeholder={t.descriptionPlaceholder}
                className="min-h-40 resize-none p-4 text-base"
              />
              <p className="text-right text-sm text-muted-foreground">{description.length}/500</p>
            </div>
            <Bottom><Button size="xl" onClick={continueDescription}>{t.next}</Button></Bottom>
          </Screen>
        )}
        {step === "symptoms" && (
          <Symptoms
            answers={answers}
            setAnswers={setAnswers}
            risk={effectiveRisk}
            onRisk={changeRisk}
            hasHealthProfile={hasHealthProfile}
            useProfile={useProfile}
            onUseProfile={setUseProfile}
            onInteraction={() => setSymptomsTouched(true)}
            onDone={run}
          />
        )}
        {step === "analyzing" && <AnalyzingSkeleton />}
        {step === "retake" && <RetakeView onRetake={() => {
          setPhoto(null); setResult(null); setRawAi(null); setSavedCheckId(null); setSaveState("idle"); go("photo");
        }} onContinue={() => go("result")} />}
        {step === "insufficient" && (
          <Screen title={t.insufficientTitle} sub={t.insufficientBody}>
            <div className="card-soft flex gap-3 p-4 text-destructive">
              <Phone className="size-6 shrink-0" aria-hidden />
              <a href="tel:911" className="min-h-11 font-semibold underline">{t.notEnough911}</a>
            </div>
            <Bottom>
              <Button size="xl" onClick={() => go("description")}>{t.addDetails}</Button>
              <Button size="xl" variant="outline" asChild><Link to="/care">{t.findCare}</Link></Button>
            </Bottom>
          </Screen>
        )}
        {step === "error" && <Screen title={error}><Bottom><Button size="xl" onClick={run}>{t.tryAgain}</Button></Bottom></Screen>}
        {step === "result" && result && (
          <div className="pt-2">
            <ResultView result={result} actions={
              <>
                {result.severity_tier !== "emergency" && (
                  <Button size="xl" variant="secondary" onClick={markWorse} disabled={saveState === "saving"}>
                    <TrendingDown aria-hidden /> {t.gettingWorse}
                  </Button>
                )}
                {saveState === "error" ? (
                  <Button size="xl" variant="outline" onClick={() => persist()}><Save aria-hidden /> {t.save}</Button>
                ) : (
                  <p className="flex min-h-11 items-center justify-center gap-2 text-sm text-muted-foreground" role="status">
                    {saveState === "saved" ? <CheckIcon className="size-4 text-primary" aria-hidden /> : <Save className="size-4" aria-hidden />}
                    {saveState === "saved" ? t.saved : t.saving}
                  </p>
                )}
              </>
            } />
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

function Symptoms({ answers, setAnswers, risk, onRisk, hasHealthProfile, useProfile, onUseProfile, onInteraction, onDone }: {
  answers: Answers;
  setAnswers: (answers: Answers) => void;
  risk: RiskFactors;
  onRisk: (key: RiskKey, value: boolean) => void;
  hasHealthProfile: boolean;
  useProfile: boolean;
  onUseProfile: (value: boolean) => void;
  onInteraction: () => void;
  onDone: () => void;
}) {
  const { t } = useI18n();
  const set = <K extends keyof Answers>(key: K, value: Answers[K]) => setAnswers({ ...answers, [key]: value });
  const toggles = ["fever", "spreadingRedness", "pus", "warmth", "numbness"] as const;
  const riskLabels: Record<RiskKey, string> = {
    diabetes: t.risk_diabetes, bloodThinners: t.risk_bloodThinners, weakImmune: t.risk_weakImmune,
    pregnant: t.risk_pregnant, biteOrPuncture: t.risk_biteOrPuncture,
    handsFaceJoint: t.risk_handsFaceJoint, noTetanus: t.risk_noTetanus,
  };
  return (
    <Screen title={t.symTitle}>
      <div className="card-soft divide-y px-4">
        {toggles.map((key) => (
          <label key={key} className="flex min-h-14 items-center justify-between gap-3 py-2 text-base">
            {t[key]}
            <Switch checked={answers[key]} onCheckedChange={(value) => { set(key, value); onInteraction(); }} aria-label={t[key]} />
          </label>
        ))}
      </div>
      <div className="card-soft space-y-3 p-4">
        <div className="flex items-baseline justify-between">
          <span id="pain-label" className="font-medium">{t.pain}</span>
          <span className="text-2xl font-bold text-primary">{answers.pain}</span>
        </div>
        <Slider aria-labelledby="pain-label" min={0} max={10} step={1} value={[answers.pain]} onValueChange={([value]) => { set("pain", value ?? 0); onInteraction(); }} className="py-3" />
        <div className="flex justify-between text-sm text-muted-foreground"><span>{t.painLow}</span><span>{t.painHigh}</span></div>
      </div>
      <section className="space-y-3">
        <div>
          <h2 className="text-xl font-semibold">{t.riskTitle}</h2>
          <p className="text-sm text-muted-foreground">{t.riskSub}</p>
        </div>
        {hasHealthProfile && (
          <div className="flex min-h-14 items-center justify-between gap-3 rounded-full bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground">
            <span>{useProfile ? t.usingHealthProfile : t.notForThisCheck}</span>
            <span className="flex items-center gap-2">
              <span className="text-xs font-medium">{t.notForThisCheck}</span>
              <Switch checked={!useProfile} onCheckedChange={(checked) => onUseProfile(!checked)} aria-label={t.notForThisCheck} />
            </span>
          </div>
        )}
        <div className="card-soft divide-y px-4">
          {RISK_KEYS.map((key) => (
            <label key={key} className="flex min-h-14 items-center justify-between gap-3 py-2 text-base">
              {riskLabels[key]}
              <Switch checked={risk[key]} onCheckedChange={(value) => onRisk(key, value)} aria-label={riskLabels[key]} />
            </label>
          ))}
        </div>
      </section>
      <div className="card-soft space-y-2 p-4">
        <span id="howlong" className="font-medium">{t.howLong}</span>
        <Select value={answers.howLong} onValueChange={(value) => set("howLong", value)}>
          <SelectTrigger aria-labelledby="howlong" className="h-12 text-base"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(t.howLongOpts).map(([key, value]) => <SelectItem key={key} value={key} className="min-h-11 text-base">{value}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <Bottom><Button size="xl" onClick={onDone}>{t.analyze}</Button></Bottom>
    </Screen>
  );
}

function CrisisScreen({ onBack }: { onBack: () => void }) {
  const { t } = useI18n();
  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col px-5 py-8">
        <div className="step-in flex-1 space-y-5">
          <HeartHandshake className="size-12 text-primary" aria-hidden />
          <h1 className="text-3xl font-bold">{t.crisisTitle}</h1>
          <p className="text-xl">{t.crisisBody}</p>
          <div className="card-soft space-y-3 p-5">
            <h2 className="text-xl font-semibold">{t.crisis988Name}</h2>
            <a href="tel:988" className="flex min-h-16 items-center justify-center gap-3 rounded-2xl bg-primary text-xl font-bold text-primary-foreground">
              <Phone aria-hidden /> {t.call988}
            </a>
            <a href="sms:988" className="flex min-h-12 items-center justify-center rounded-xl border font-semibold text-primary">{t.text988}</a>
          </div>
          <p className="flex gap-2 font-semibold text-destructive"><AlertCircle className="size-6 shrink-0" aria-hidden /> {t.immediateDanger}</p>
          <a href="tel:911" className="inline-flex min-h-12 items-center font-bold text-destructive underline">{t.call911}</a>
        </div>
        <button type="button" onClick={onBack} className="min-h-12 w-full rounded-xl underline">{t.crisisBack}</button>
      </div>
    </div>
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
          <ul className="space-y-2 text-lg">{t.emergencySteps.map((item) => <li key={item}>• {item}</li>)}</ul>
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

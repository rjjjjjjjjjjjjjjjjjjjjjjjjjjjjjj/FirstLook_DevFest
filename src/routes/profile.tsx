import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LockKeyhole, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell, StepHeader } from "@/components/app/AppShell";
import { AuthGate } from "@/components/app/AuthGate";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { EMPTY_HEALTH_PROFILE, useProfilePreferences, type HealthProfile } from "@/lib/health";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "My Health Profile — FirstLook" },
      { name: "description", content: "Private, optional health details for your FirstLook checks." },
      { property: "og:title", content: "My Health Profile — FirstLook" },
      { property: "og:description", content: "Private, optional health details for your FirstLook checks." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <AuthGate><HealthProfileScreen /></AuthGate>,
});

function HealthProfileScreen() {
  const { t } = useI18n();
  const { session } = useAuth();
  const { data, isLoading } = useProfilePreferences();
  const qc = useQueryClient();
  const nav = useNavigate();
  const router = useRouter();
  const [profile, setProfile] = useState<HealthProfile>({ ...EMPTY_HEALTH_PROFILE });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data?.healthProfile) setProfile({ ...EMPTY_HEALTH_PROFILE, ...data.healthProfile });
  }, [data]);

  const update = async (next: HealthProfile | null) => {
    if (!session) return;
    setBusy(true);
    const preferences = { ...data, healthProfile: next };
    const { error } = await supabase.from("profiles").update({ preferences }).eq("id", session.user.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    qc.setQueryData(["profile-preferences", session.user.id], preferences);
    toast.success(next ? t.profileSaved : t.profileDeleted);
  };

  const toggle = (field: "conditions" | "medications" | "allergies", value: string, checked: boolean) => {
    const values = checked ? [...profile[field], value] : profile[field].filter((item) => item !== value);
    setProfile({ ...profile, [field]: [...new Set(values)] });
  };

  return (
    <AppShell hideTabs>
      <StepHeader onBack={() => router.history.back()} />
      <div className="step-in space-y-5 pb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.profileTitle}</h1>
          <p className="mt-2 text-muted-foreground">{t.profileSub}</p>
        </div>
        <p className="flex gap-2 rounded-xl bg-secondary p-4 text-sm font-medium text-secondary-foreground">
          <LockKeyhole className="size-5 shrink-0" aria-hidden /> {t.profilePrivacy}
        </p>
        {isLoading ? <p>{t.loading}</p> : (
          <>
            <OptionGroup title={t.conditions} field="conditions" options={[
              ["diabetes", t.condition_diabetes], ["heart_disease", t.condition_heart_disease], ["bleeding_disorder", t.condition_bleeding_disorder],
              ["weak_immune", t.condition_weak_immune], ["pregnant", t.condition_pregnant],
            ]} values={profile.conditions} toggle={toggle} />
            <OptionGroup title={t.medications} field="medications" options={[
              ["blood_thinners", t.medication_blood_thinners], ["steroids", t.medication_steroids], ["immunosuppressants", t.medication_immunosuppressants],
            ]} values={profile.medications} toggle={toggle} />
            <OptionGroup title={t.allergies} field="allergies" options={[
              ["antibiotics", t.allergy_antibiotics], ["latex", t.allergy_latex], ["adhesives", t.allergy_adhesives], ["other", t.allergy_other],
            ]} values={profile.allergies} toggle={toggle} />
            <section className="card-soft space-y-3 p-4">
              <Label htmlFor="tetanus-date" className="text-base font-semibold">{t.tetanusDate}</Label>
              <Input id="tetanus-date" type="date" max={new Date().toISOString().slice(0, 10)} disabled={profile.lastTetanus === "unsure"} value={profile.lastTetanus === "unsure" ? "" : profile.lastTetanus} onChange={(e) => setProfile({ ...profile, lastTetanus: e.target.value })} className="h-12 text-base" />
              <label className="flex min-h-11 items-center gap-3">
                <Checkbox id="tetanus-unsure" checked={profile.lastTetanus === "unsure"} onCheckedChange={(checked) => setProfile({ ...profile, lastTetanus: checked === true ? "unsure" : "" })} />
                <span>{t.unsure}</span>
              </label>
            </section>
            <section className="card-soft space-y-3 p-4">
              <Label htmlFor="age-range" className="text-base font-semibold">{t.ageRange}</Label>
              <Select value={profile.ageRange} onValueChange={(ageRange) => setProfile({ ...profile, ageRange })}>
                <SelectTrigger id="age-range" className="h-12 text-base"><SelectValue placeholder={t.selectAge} /></SelectTrigger>
                <SelectContent>
                  {(["under18", "18_39", "40_64", "65plus"] as const).map((age) => <SelectItem key={age} value={age} className="min-h-11">{t[`age_${age}`]}</SelectItem>)}
                </SelectContent>
              </Select>
            </section>
            <div className="space-y-2">
              <Button size="xl" disabled={busy} onClick={() => update(profile)}>{t.saveProfile}</Button>
              <Button size="xl" variant="outline" onClick={() => nav({ to: "/check" })}>{t.skipProfile}</Button>
              <Button size="xl" variant="ghost" className="text-destructive" disabled={busy} onClick={() => {
                if (!confirm(t.deleteProfileConfirm)) return;
                setProfile({ ...EMPTY_HEALTH_PROFILE });
                void update(null);
              }}><Trash2 aria-hidden /> {t.deleteMyData}</Button>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function OptionGroup({ title, field, options, values, toggle }: {
  title: string;
  field: "conditions" | "medications" | "allergies";
  options: [string, string][];
  values: string[];
  toggle: (field: "conditions" | "medications" | "allergies", value: string, checked: boolean) => void;
}) {
  return (
    <fieldset className="card-soft space-y-1 p-4">
      <legend className="px-1 font-semibold">{title}</legend>
      {options.map(([value, label]) => (
        <label key={value} className="flex min-h-12 cursor-pointer items-center gap-3">
          <Checkbox id={`${field}-${value}`} checked={values.includes(value)} onCheckedChange={(checked) => toggle(field, value, checked === true)} />
          <span>{label}</span>
        </label>
      ))}
    </fieldset>
  );
}

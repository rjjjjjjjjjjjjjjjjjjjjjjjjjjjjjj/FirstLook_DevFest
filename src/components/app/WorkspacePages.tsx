import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { HeartPulse, ShieldCheck, ArrowRight, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "./AppShell";
import { AuthGate } from "./AuthGate";
import { WoundCard } from "./WoundCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useWounds, buildSummary } from "@/lib/data";
import { useProfilePreferences, type ProfilePreferences } from "@/lib/health";
import { supabase } from "@/integrations/supabase/client";

export function WorkspacePage({ page }: { page: "connected" | "insurance" | "reports" | "settings" }) {
  return <AuthGate><AppShell><WorkspaceContent page={page} /></AppShell></AuthGate>;
}
function WorkspaceContent({ page }: { page: "connected" | "insurance" | "reports" | "settings" }) {
  const { t, lang, setLang } = useI18n();
  const { session } = useAuth();
  const { data: preferences, isLoading } = useProfilePreferences();
  const { data: wounds } = useWounds(page === "reports");
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [insurance, setInsurance] = useState({ provider: "", plan: "", deductible: "", copay: "", coinsurance: "" });
  useEffect(() => { if (preferences?.insurance) setInsurance(preferences.insurance); }, [preferences]);
  const save = async (remove = false) => {
    if (!session || isLoading) return;
    setBusy(true);
    const next: ProfilePreferences = { ...preferences, insurance: remove ? undefined : insurance };
    const { error } = await supabase.from("profiles").update({ preferences: JSON.parse(JSON.stringify(next)) }).eq("id", session.user.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    if (remove) setInsurance({ provider: "", plan: "", deductible: "", copay: "", coinsurance: "" });
    qc.setQueryData(["profile-preferences", session.user.id], next);
    toast.success(remove ? t.insuranceDeleted : t.insuranceSaved);
  };
  const title = page === "connected" ? t.navConnected : page === "insurance" ? t.navInsurance : page === "reports" ? t.navReports : t.navSettings;
  const sub = page === "connected" ? t.connectedPictureSub : page === "insurance" ? t.insuranceSub : page === "reports" ? t.reportsSub : t.settingsSub;
  return <div className="space-y-7 py-8"><div><h1 className="text-3xl font-bold">{title}</h1><p className="mt-2 text-sm text-muted-foreground">{sub}</p></div>
    {page === "connected" && <><section className="border-y py-6"><HeartPulse className="mb-3 size-7 text-primary" /><h2 className="text-xl font-semibold">{t.devicesUnavailable}</h2><p className="mt-2 max-w-xl text-muted-foreground">{t.devicesNote}</p></section><section><h2 className="font-semibold">{t.profileConnection}</h2><p className="mt-2 text-sm text-muted-foreground">{t.profileConnectionSub}</p><Button variant="outline" asChild className="mt-4 min-h-11"><Link to="/profile">{t.viewProfile}<ArrowRight /></Link></Button></section></>}
    {page === "insurance" && <form className="max-w-2xl space-y-6" onSubmit={e => { e.preventDefault(); void save(); }}><p className="flex items-start gap-2 text-sm text-muted-foreground"><ShieldCheck className="size-5 shrink-0 text-primary" />{t.profilePrivacy}</p><div className="grid gap-5 sm:grid-cols-2">{([['provider', t.providerLabel], ['plan', t.planLabel], ['deductible', t.deductible], ['copay', t.copay], ['coinsurance', t.coinsurance]] as const).map(([key, label]) => <div key={key} className="space-y-2"><label htmlFor={`insurance-${key}`} className="text-sm font-medium">{label}</label><Input id={`insurance-${key}`} type={key === 'provider' || key === 'plan' ? 'text' : 'number'} min={0} max={key === 'coinsurance' ? 100 : undefined} maxLength={150} value={insurance[key]} onChange={e => setInsurance({ ...insurance, [key]: e.target.value })} className="h-12 bg-card text-base" /></div>)}</div><div className="flex flex-wrap gap-3"><Button type="submit" disabled={busy || isLoading} className="min-h-11">{t.saveInsurance}</Button><Button type="button" variant="ghost" disabled={busy || isLoading} onClick={() => void save(true)}><Trash2 />{t.deleteInsurance}</Button></div><div className="border-t pt-5"><p className="text-sm">{t.coverageLine}</p><p className="mt-2 text-sm text-muted-foreground">{t.directoryNote}</p><Button variant="link" asChild className="mt-2 px-0"><a href={`https://www.google.com/search?q=${encodeURIComponent(insurance.provider + ' official provider directory')}`} target="_blank" rel="noopener noreferrer">{t.directoryLink}<ArrowRight /></a></Button></div></form>}
    {page === "reports" && <><div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-y py-5"><p className="font-medium">{t.totalScreenings}: {wounds?.reduce((n, w) => n + w.checks.length, 0) ?? 0}</p><Button variant="outline" className="min-h-11" disabled={!wounds?.length} onClick={() => { if (!wounds) return; const text = wounds.map(w => buildSummary(w, { tier: tier => t[`tier_${tier}`], disclaimer: t.disclaimerFull })).join('\n\n'); const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' })); const link = document.createElement('a'); link.href = url; link.download = 'firstlook-summaries.txt'; link.click(); URL.revokeObjectURL(url); }}><Download />{t.exportReports}</Button></div><div className="grid gap-3 xl:grid-cols-2">{wounds?.length ? wounds.map(w => <WoundCard key={w.id} wound={w} />) : <p className="text-muted-foreground">{t.noReports}</p>}</div></>}
    {page === "settings" && <div className="max-w-2xl divide-y"><section className="py-5"><h2 className="font-semibold">{t.languageLabel}</h2><div className="mt-3 flex gap-2"><Button variant={lang === 'en' ? 'default' : 'outline'} onClick={() => setLang('en')}>English</Button><Button variant={lang === 'es' ? 'default' : 'outline'} onClick={() => setLang('es')}>Español</Button></div></section><section className="py-5"><h2 className="font-semibold">{t.privacyLabel}</h2><p className="mt-2 text-sm text-muted-foreground">{t.privacySettingsSub}</p><Button variant="outline" asChild className="mt-4 min-h-11"><Link to="/profile">{t.viewProfile}<ArrowRight /></Link></Button></section><section className="py-5"><h2 className="font-semibold">{t.accountLabel}</h2><Button variant="outline" className="mt-4 min-h-11" onClick={() => void supabase.auth.signOut()}>{t.signOut}</Button></section></div>}
  </div>;
}

import { useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useProfilePreferences } from "@/lib/health";
import { useI18n } from "@/lib/i18n";
import { AppShell } from "./AppShell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export function FirstUseGate({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const { session } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading } = useProfilePreferences();
  const [checked, setChecked] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);

  if (isLoading) return <AppShell hideTabs><p className="py-20 text-center text-muted-foreground">{t.loading}</p></AppShell>;
  if (accepted || data?.acknowledgedAt) return <>{children}</>;

  const accept = async (goToProfile: boolean) => {
    if (!checked || !session) return;
    setBusy(true);
    const preferences = { ...data, acknowledgedAt: new Date().toISOString() };
    const { error } = await supabase.from("profiles").update({ preferences }).eq("id", session.user.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.setQueryData(["profile-preferences", session.user.id], preferences);
    if (goToProfile) nav({ to: "/profile" });
    else setAccepted(true);
  };

  return (
    <AppShell hideTabs>
      <div className="step-in space-y-5 pt-8">
        <span className="grid size-12 place-items-center rounded-full bg-secondary text-primary"><ShieldCheck className="size-6" aria-hidden /></span>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">{t.ackTitle}</h1>
          <p className="text-lg leading-relaxed">{t.ackText}</p>
        </div>
        <label htmlFor="first-use-ack" className="card-soft flex min-h-16 cursor-pointer items-start gap-3 p-4 font-medium">
          <Checkbox id="first-use-ack" checked={checked} onCheckedChange={(value) => setChecked(value === true)} className="mt-1" />
          <span>{t.ackCheckbox}</span>
        </label>
        <div className="space-y-2">
          <Button size="xl" disabled={!checked || busy} onClick={() => accept(false)}>{t.ackContinue}</Button>
          <Button size="xl" variant="outline" disabled={!checked || busy} onClick={() => accept(true)}>{t.ackProfile}</Button>
        </div>
      </div>
    </AppShell>
  );
}

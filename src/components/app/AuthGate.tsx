import { useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { startDemo } from "@/lib/demo.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppShell } from "./AppShell";

export function AuthGate({ children }: { children: ReactNode }) {
  const { session, ready } = useAuth();
  const { t } = useI18n();
  const demo = useServerFn(startDemo);
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!ready) return <AppShell hideTabs><p className="py-20 text-center text-muted-foreground">{t.loading}</p></AppShell>;
  if (session) return <>{children}</>;

  const tryDemo = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const s = await demo();
      await supabase.auth.setSession(s);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Error");
    }
    setBusy(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg(error.message);
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin, data: { display_name: displayName.trim() } } });
      if (error) setMsg(error.message);
      else if (!data.session) setMsg(t.checkEmail);
    }
    setBusy(false);
  };

  return (
    <AppShell hideTabs>
      <div className="step-in space-y-6 pt-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.signInTitle}</h1>
          <p className="mt-2 text-muted-foreground">{t.signInSub}</p>
        </div>
        <Button size="xl" onClick={tryDemo} disabled={busy}>
          <Sparkles aria-hidden /> {t.tryDemo}
        </Button>
        <p className="text-center text-sm text-muted-foreground">{t.orEmail}</p>
        <form onSubmit={submit} className="card-soft space-y-4 p-5">
          {mode === "up" && <div className="space-y-1.5">
            <Label htmlFor="display-name" className="text-base">{t.displayName}</Label>
            <Input id="display-name" autoComplete="nickname" maxLength={100} className="h-12 text-base" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-base">{t.email}</Label>
            <Input id="email" type="email" required autoComplete="email" className="h-12 text-base" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pw" className="text-base">{t.password}</Label>
            <Input id="pw" type="password" required minLength={6} autoComplete={mode === "in" ? "current-password" : "new-password"} className="h-12 text-base" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button size="xl" variant="secondary" type="submit" disabled={busy}>
            {mode === "in" ? t.signIn : t.signUp}
          </Button>
          <Button variant="ghost" type="button" className="min-h-12 w-full text-sm font-medium text-primary" onClick={() => { setMsg(null); setMode(mode === "in" ? "up" : "in"); }}>
            {mode === "in" ? t.needAccount : t.haveAccount}
          </Button>
        </form>
        {msg && <p role="status" className="rounded-xl bg-muted p-3 text-center">{msg}</p>}
        <p className="text-center text-sm text-muted-foreground">{t.disclaimerShort}</p>
      </div>
    </AppShell>
  );
}

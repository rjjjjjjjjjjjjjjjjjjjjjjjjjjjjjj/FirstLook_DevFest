import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardList, UserRound } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { AuthGate } from "@/components/app/AuthGate";
import { WoundCard } from "@/components/app/WoundCard";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useWounds } from "@/lib/data";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/history/")({
  head: () => ({
    meta: [
      { title: "Your history — FirstLook" },
      { name: "description", content: "Track how a wound is healing over time." },
      { property: "og:title", content: "Your history — FirstLook" },
      { property: "og:description", content: "Track how a wound is healing over time." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AuthGate>
      <History />
    </AuthGate>
  ),
});

function History() {
  const { t } = useI18n();
  const { data, isLoading } = useWounds();
  return (
    <AppShell>
      <div className="step-in space-y-4 pt-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{t.historyTitle}</h1>
          <Button variant="outline" size="tap" asChild>
            <Link to="/profile" aria-label={t.profileTitle}><UserRound aria-hidden /><span className="sr-only sm:not-sr-only">{t.profileTitle}</span></Link>
          </Button>
        </div>
        {isLoading ? (
          <p className="text-muted-foreground">{t.loading}</p>
        ) : data && data.length > 0 ? (
          data.map((w) => <WoundCard key={w.id} wound={w} />)
        ) : (
          <div className="card-soft space-y-4 p-6 text-center">
            <ClipboardList className="mx-auto size-10 text-primary" aria-hidden />
            <p>{t.historyEmpty}</p>
            <Button size="xl" asChild><Link to="/check">{t.startFirst}</Link></Button>
          </div>
        )}
        <button type="button" className="min-h-12 w-full text-sm text-muted-foreground underline" onClick={() => supabase.auth.signOut()}>
          {t.signOut}
        </button>
      </div>
    </AppShell>
  );
}

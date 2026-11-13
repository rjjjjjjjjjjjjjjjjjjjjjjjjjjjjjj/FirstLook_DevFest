import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Eye } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { AuthGate } from "@/components/app/AuthGate";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useWounds } from "@/lib/data";
import { WoundCard } from "@/components/app/WoundCard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FirstLook — Check a wound or symptom" },
      { name: "description", content: "Free, private first-look tool: ER, clinic, or home care? Takes about a minute." },
      { property: "og:title", content: "FirstLook — Check a wound or symptom" },
      { property: "og:description", content: "Free, private first-look tool: ER, clinic, or home care? Takes about a minute." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AuthGate>
      <Home />
    </AuthGate>
  ),
});

function Home() {
  const { t } = useI18n();
  const { data } = useWounds();
  return (
    <AppShell>
      <div className="step-in space-y-6 pt-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.greeting}</h1>
          <p className="mt-2 text-muted-foreground">{t.greetingSub}</p>
        </div>
        <div className="space-y-2">
          <Button size="xl" asChild className="min-h-20 text-lg">
            <Link to="/check">
              {t.startCheck} <ArrowRight aria-hidden />
            </Link>
          </Button>
          <p className="text-center text-sm text-muted-foreground">{t.startSub}</p>
        </div>
        <Button size="xl" variant="secondary" asChild>
          <Link to="/history">
            <Eye aria-hidden /> {t.trackWound}
          </Link>
        </Button>
        <section className="space-y-3 pt-2">
          <h2 className="font-semibold">{t.recent}</h2>
          {data && data.length > 0 ? (
            data.slice(0, 3).map((w) => <WoundCard key={w.id} wound={w} />)
          ) : (
            <p className="text-muted-foreground">{t.noRecent}</p>
          )}
        </section>
      </div>
    </AppShell>
  );
}

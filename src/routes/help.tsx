import { createFileRoute } from "@tanstack/react-router";
import { Phone, Lock, AlertCircle, FileText } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help — FirstLook" },
      { name: "description", content: "How FirstLook works, when to call 911, how photos are handled, and limitations." },
      { property: "og:title", content: "Help — FirstLook" },
      { property: "og:description", content: "How FirstLook works, when to call 911, how photos are handled, and limitations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Help,
});

function Help() {
  const { t } = useI18n();
  return (
    <AppShell>
      <div className="step-in space-y-4 pt-6">
        <h1 className="text-3xl font-bold tracking-tight">{t.helpTitle}</h1>
        <section className="card-soft p-5">
          <h2 className="font-semibold">{t.howTitle}</h2>
          <ol className="mt-3 space-y-3">
            {t.how.map((s, i) => (
              <li key={s} className="flex gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary font-semibold text-primary-foreground">{i + 1}</span>
                <span className="pt-1">{s}</span>
              </li>
            ))}
          </ol>
        </section>
        <section className="rounded-2xl bg-tier-er-soft p-5">
          <h2 className="flex items-center gap-2 font-semibold text-tier-er"><Phone className="size-5" aria-hidden /> {t.when911}</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">{t.when911List.map((s) => <li key={s}>{s}</li>)}</ul>
        </section>
        <Block icon={Lock} title={t.photosTitle} body={t.photosBody} />
        <Block icon={AlertCircle} title={t.limitsTitle} body={t.limitsBody} />
        <Block icon={FileText} title={t.disclaimerTitle} body={t.disclaimerFull} />
      </div>
    </AppShell>
  );
}

function Block({ icon: Icon, title, body }: { icon: typeof Lock; title: string; body: string }) {
  return (
    <section className="card-soft p-5">
      <h2 className="flex items-center gap-2 font-semibold"><Icon className="size-5 text-primary" aria-hidden /> {title}</h2>
      <p className="mt-2">{body}</p>
    </section>
  );
}

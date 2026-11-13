import { Link, useLocation } from "@tanstack/react-router";
import { Phone, Search, Clock3, HelpCircle, Languages } from "lucide-react";
import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function AppShell({ children, hideTabs }: { children: ReactNode; hideTabs?: boolean }) {
  const { t, lang, setLang } = useI18n();
  const path = useLocation({ select: (l) => l.pathname });
  const tabs = [
    { to: "/" as const, label: t.tabCheck, icon: Search, active: path === "/" || path.startsWith("/check") || path.startsWith("/care") },
    { to: "/history" as const, label: t.tabHistory, icon: Clock3, active: path.startsWith("/history") },
    { to: "/help" as const, label: t.tabHelp, icon: HelpCircle, active: path.startsWith("/help") },
  ];
  return (
    <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col">
      <header className="no-print sticky top-0 z-20 flex items-center justify-between gap-2 bg-background/95 px-4 py-3 backdrop-blur">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold tracking-tight text-foreground">
          <span className="grid size-8 place-items-center rounded-xl bg-primary text-primary-foreground" aria-hidden>
            <Search className="size-4" />
          </span>
          FirstLook
        </Link>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setLang(lang === "en" ? "es" : "en")}
            className="inline-flex min-h-12 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-muted-foreground hover:bg-muted"
            aria-label={lang === "en" ? "Cambiar a español" : "Switch to English"}
          >
            <Languages className="size-4" aria-hidden />
            {t.langToggle}
          </button>
          <a
            href="tel:911"
            className="inline-flex min-h-12 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-destructive hover:bg-tier-er-soft"
          >
            <Phone className="size-4" aria-hidden />
            {t.call911}
          </a>
        </div>
      </header>
      <main className={cn("flex-1 px-4", hideTabs ? "pb-6" : "pb-28")}>{children}</main>
      {!hideTabs && (
        <nav className="no-print fixed inset-x-0 bottom-0 z-20 border-t bg-card/95 backdrop-blur" aria-label="Main">
          <div className="mx-auto grid max-w-[480px] grid-cols-3">
            {tabs.map((tab) => (
              <Link
                key={tab.to}
                to={tab.to}
                className={cn(
                  "flex min-h-16 flex-col items-center justify-center gap-1 text-sm font-medium",
                  tab.active ? "text-primary" : "text-muted-foreground",
                )}
                aria-current={tab.active ? "page" : undefined}
              >
                <tab.icon className="size-6" aria-hidden />
                {tab.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}

export function StepHeader({ step, total, onBack }: { step?: number | undefined; total?: number | undefined; onBack: () => void }) {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-3 py-2">
      <button
        type="button"
        onClick={onBack}
        className="grid size-12 place-items-center rounded-xl hover:bg-muted"
        aria-label={t.back}
      >
        <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {step && total ? (
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{t.stepOf(step, total)}</p>
          <div className="mt-1 h-1.5 rounded-full bg-muted" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={total}>
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(step / total) * 100}%` }} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

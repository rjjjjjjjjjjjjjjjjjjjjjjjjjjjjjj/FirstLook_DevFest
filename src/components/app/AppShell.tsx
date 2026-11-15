import { Link, useLocation } from "@tanstack/react-router";
import { Phone, Languages, Plus, Home, ScanLine, ClipboardList, HeartPulse, MapPin, ShieldCheck, FileText, Settings, Menu, X, ChevronRight, ArrowLeft } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function AppShell({ children, hideTabs }: { children: ReactNode; hideTabs?: boolean }) {
  const { t, lang, setLang } = useI18n();
  const path = useLocation({ select: (l) => l.pathname });
  const [open, setOpen] = useState(false);
  const items = [
    { to: "/" as const, label: t.navHome, icon: Home },
    { to: "/check" as const, label: t.navScreening, icon: ScanLine },
    { to: "/history" as const, label: t.navLogs, icon: ClipboardList },
    { to: "/connected" as const, label: t.navConnected, icon: HeartPulse },
    { to: "/care" as const, label: t.navCare, icon: MapPin },
    { to: "/insurance" as const, label: t.navInsurance, icon: ShieldCheck },
    { to: "/reports" as const, label: t.navReports, icon: FileText },
    { to: "/settings" as const, label: t.navSettings, icon: Settings },
  ];
  const current = items.find(i => i.to === "/" ? path === "/" : path.startsWith(i.to));
  const wide = path === "/" || ["/history", "/connected", "/insurance", "/reports", "/settings"].includes(path);
  return (
    <div className="min-h-dvh">
      {open && <Button variant="ghost" className="no-print fixed inset-0 z-30 h-dvh w-full rounded-none bg-foreground/30 lg:hidden" aria-label={t.closeMenu} onClick={() => setOpen(false)} />}
      <aside className={cn("no-print fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r bg-card px-4 transition-transform lg:translate-x-0", open ? "translate-x-0" : "-translate-x-full")}>
        <div className="flex h-24 items-center justify-between px-2">
          <Link to="/" onClick={() => setOpen(false)} className="flex min-w-0 items-center gap-2.5 text-lg font-bold"><span className="grid size-8 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground"><Plus className="size-5" /></span>FIRSTLOOK.</Link>
          <Button variant="ghost" size="icon" className="shrink-0 lg:hidden" aria-label={t.closeMenu} onClick={() => setOpen(false)}><X /></Button>
        </div>
        <p className="mb-3 mt-4 px-3 text-[10px] font-bold uppercase text-muted-foreground">{t.workspaceLabel}</p>
        <nav aria-label={t.workspace} className="space-y-1">
          {items.map(item => <Link key={item.to} to={item.to} onClick={() => setOpen(false)} aria-current={current?.to === item.to ? "page" : undefined} className={cn("flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium", current?.to === item.to ? "bg-secondary text-primary" : "text-muted-foreground hover:bg-muted")}><item.icon className="size-[18px] shrink-0" />{item.label}</Link>)}
        </nav>
        <div className="mt-auto border-t px-3 py-6"><p className="flex items-center gap-2 text-xs font-semibold"><ShieldCheck className="size-4 text-primary" />{t.yourControl}</p><p className="ml-6 mt-1 text-xs text-muted-foreground">{t.privateLogs}</p></div>
      </aside>
      <div className="min-w-0 lg:ml-60">
        <header className="no-print sticky top-0 z-20 border-b bg-card">
          <div className="grid min-h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-4 sm:px-8">
            <div className="flex min-w-0 items-center gap-2">
              <Button size="icon" variant="ghost" className="shrink-0 lg:hidden" aria-label={t.menu} onClick={() => setOpen(true)}><Menu /></Button>
              <span className="hidden text-xs text-muted-foreground sm:inline">{t.workspace}</span><ChevronRight className="hidden size-3 text-muted-foreground sm:block" />
              <span className="truncate text-xs font-semibold">{current?.label ?? t.profileTitle}</span>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <span className="mr-3 hidden items-center gap-2 text-xs text-muted-foreground xl:flex"><span className="size-1.5 rounded-full bg-tier-home" />{t.privateWorkspace}</span>
              <Button variant="ghost" size="icon" onClick={() => setLang(lang === "en" ? "es" : "en")} aria-label={t.langToggle} title={t.langToggle}><Languages /></Button>
              <Button variant="ghost" asChild className="min-h-11 px-2 text-xs text-destructive"><a href="tel:911"><Phone className="size-4" />{t.call911}</a></Button>
            </div>
          </div>
        </header>
        <main className={cn("mx-auto min-w-0 px-4 pb-10 sm:px-8", wide ? "max-w-[1240px]" : "max-w-[760px]", !hideTabs && "pb-12")}>{children}</main>
      </div>
    </div>
  );
}

export function StepHeader({ step, total, onBack }: { step?: number; total?: number; onBack: () => void }) {
  const { t } = useI18n();
  return <div className="flex items-center gap-3 py-4"><Button type="button" size="icon" variant="ghost" className="size-11 shrink-0" onClick={onBack} aria-label={t.back}><ArrowLeft /></Button>{step && total ? <div className="min-w-0 flex-1"><p className="text-sm font-medium text-muted-foreground">{t.stepOf(step, total)}</p><div className="mt-2 h-1 rounded-full bg-muted" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={total}><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${step / total * 100}%` }} /></div></div> : null}</div>;
}

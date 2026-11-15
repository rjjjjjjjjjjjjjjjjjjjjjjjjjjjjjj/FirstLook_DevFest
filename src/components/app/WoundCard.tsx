import { Link } from "@tanstack/react-router";
import { ChevronRight, ImageOff } from "lucide-react";
import type { WoundRow } from "@/lib/data";
import { usePhotoUrl } from "@/lib/photos";
import { useI18n } from "@/lib/i18n";
import { TierBadge } from "./TierBadge";

export function WoundCard({ wound }: { wound: WoundRow }) {
  const { lang } = useI18n();
  const last = wound.checks[wound.checks.length - 1];
  const url = usePhotoUrl(last?.photo_path ?? null);
  if (!last) return null;
  return (
    <Link
      to="/history/$woundId"
      params={{ woundId: wound.id }}
      className="card-soft grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-4 hover:border-primary/40"
    >
      {url ? (
        <img src={url} alt="" className="size-14 shrink-0 rounded-md object-cover" />
      ) : (
        <div className="grid size-14 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
          <ImageOff className="size-6" aria-hidden />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <TierBadge tier={last.tier} />
          <span className="text-sm text-muted-foreground">
            {new Date(last.created_at).toLocaleDateString(lang === "es" ? "es" : "en", { month: "short", day: "numeric" })}
          </span>
        </div>
        <p className="mt-1 truncate font-medium">{wound.title}</p>
        <p className="truncate text-sm text-muted-foreground">{last.summary}</p>
      </div>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
    </Link>
  );
}

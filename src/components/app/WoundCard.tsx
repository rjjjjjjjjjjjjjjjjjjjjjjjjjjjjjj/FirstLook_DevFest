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
      className="card-soft flex items-center gap-3 p-3 hover:ring-2 hover:ring-primary/30"
    >
      {url ? (
        <img src={url} alt="" className="size-16 shrink-0 rounded-xl object-cover" />
      ) : (
        <div className="grid size-16 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
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
      <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
    </Link>
  );
}

import { useRef } from "react";
import { Camera, Lock } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { toDataUrl } from "@/lib/photos";

export function PhotoPicker({ value, onChange }: { value: string | null; onChange: (d: string) => void }) {
  const { t } = useI18n();
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-3">
      <input
        ref={ref}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        aria-label={t.photoTake}
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) onChange(await toDataUrl(f));
          e.target.value = "";
        }}
      />
      {value ? (
        <img src={value} alt="" className="aspect-square w-full rounded-2xl object-cover" />
      ) : null}
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className={
          value
            ? "min-h-12 w-full rounded-xl text-base font-medium text-primary hover:bg-secondary"
            : "card-soft flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 border-2 border-dashed border-primary/30 text-primary hover:bg-secondary"
        }
      >
        {!value && <Camera className="size-12" aria-hidden />}
        <span className="text-lg font-semibold">{value ? t.photoRetake : t.photoTake}</span>
      </button>
      <p className="text-muted-foreground">{t.photoTips}</p>
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Lock className="size-4" aria-hidden /> {t.photoPrivate}
      </p>
    </div>
  );
}

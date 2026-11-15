import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AnalysisInput } from "./analysis-schema";
import {
  applyComparison,
  AWS_FAILURE_MESSAGE,
  buildCheckPayload,
  buildComparePayload,
  extractComparison,
  IMAGE_TOO_LARGE,
  normalizeCheckResult,
  toBase64Image,
} from "./analyze-map";

export const analyzeWound = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => AnalysisInput.parse(d))
  .handler(async ({ data, context }) => {
    const { callAnalyze } = await import("./ai.server");

    const photos = data.images.map(toBase64Image);
    for (const photo of photos) {
      if (!photo.ok) {
        return { ok: false as const, error: photo.reason === "too_large" ? IMAGE_TOO_LARGE[data.lang] : AWS_FAILURE_MESSAGE };
      }
    }

    const isFollowup = data.mode === "followup" && photos.length === 2;
    // A follow-up checks today's photo; the earlier one is only used for the compare call.
    const checked = isFollowup ? photos[1]! : photos[0];
    const checkBody = buildCheckPayload(data, context.userId, checked?.ok ? checked.b64 : undefined);

    try {
      if (isFollowup && photos[0]!.ok && photos[1]!.ok) {
        const compareBody = buildComparePayload(photos[0]!.b64, photos[1]!.b64, data.lang);
        const [compareRaw, checkRaw] = await Promise.all([callAnalyze(compareBody), callAnalyze(checkBody)]);
        const result = normalizeCheckResult(checkRaw, data.lang, true);
        if (!result) return { ok: false as const, error: AWS_FAILURE_MESSAGE };
        return { ok: true as const, result: applyComparison(result, extractComparison(compareRaw)) };
      }

      const raw = await callAnalyze(checkBody);
      const result = normalizeCheckResult(raw, data.lang, photos.length > 0);
      if (!result) return { ok: false as const, error: AWS_FAILURE_MESSAGE };
      return { ok: true as const, result };
    } catch (e) {
      console.error("[analyze] AWS analysis failed:", e);
      return { ok: false as const, error: AWS_FAILURE_MESSAGE };
    }
  });

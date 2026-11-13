import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AiResult } from "./triage";

const Input = z.object({
  mode: z.enum(["check", "followup"]),
  images: z.array(z.string().startsWith("data:image/").max(4_000_000)).max(2),
  answers: z.record(z.any()),
  forWhom: z.enum(["me", "other"]),
  ageGroup: z.string().nullable(),
  lang: z.enum(["en", "es"]),
});

const SYSTEM = `You are a first-aid triage assistant. Look at the image and the symptoms. Return only JSON: {wound_type, visible_signs[], severity_tier: self_care|clinic|urgent_care|emergency, confidence: low|medium|high, reasoning, next_steps[], warning_signs[], retake_needed: boolean, comparison: {change: better|same|worse|unclear, summary}}. Never diagnose. If the image is unclear or not a wound, set retake_needed true. When unsure, choose the more cautious tier. Write in plain language at a 6th-grade level in the requested language.
Keep reasoning to 2-3 short sentences. Give 3-5 next_steps and 3-5 warning_signs, each under 12 words. If there is no photo, judge from symptoms only and set retake_needed false. Set comparison to null unless you are given two photos to compare (first = earlier, second = today).`;

export const analyzeWound = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const { streamGatewayText, parseJsonLoose, GatewayError } = await import("./ai.server");
    const language = data.lang === "es" ? "Spanish" : "English";
    const who =
      data.forWhom === "me" ? "The person checking is the patient." : `This is for someone else (age group: ${data.ageGroup ?? "unknown"}). Refer to them as "they".`;
    const task =
      data.mode === "followup"
        ? "This is a follow-up. Compare the earlier photo (first) with today's photo (second) and fill in comparison."
        : "This is a new check.";
    const text = `${task}\n${who}\nRequested language: ${language}.\nSymptom answers: ${JSON.stringify(data.answers)}\nPhotos attached: ${data.images.length}.`;
    try {
      const raw = await streamGatewayText(SYSTEM, [
        { type: "text", text },
        ...data.images.map((url) => ({ type: "image_url" as const, image_url: { url } })),
      ]);
      const parsed = parseJsonLoose(raw) as Partial<AiResult> | null;
      if (!parsed) return { ok: false as const, error: "We couldn't read the result. Please try again." };
      const result: AiResult = {
        wound_type: String(parsed.wound_type ?? ""),
        visible_signs: Array.isArray(parsed.visible_signs) ? parsed.visible_signs.map(String).slice(0, 6) : [],
        severity_tier: (["self_care", "clinic", "urgent_care", "emergency"] as const).includes(parsed.severity_tier as never)
          ? (parsed.severity_tier as AiResult["severity_tier"])
          : "clinic",
        confidence: (["low", "medium", "high"] as const).includes(parsed.confidence as never)
          ? (parsed.confidence as AiResult["confidence"])
          : "low",
        reasoning: String(parsed.reasoning ?? ""),
        next_steps: Array.isArray(parsed.next_steps) ? parsed.next_steps.map(String).slice(0, 6) : [],
        warning_signs: Array.isArray(parsed.warning_signs) ? parsed.warning_signs.map(String).slice(0, 6) : [],
        retake_needed: data.images.length > 0 && Boolean(parsed.retake_needed),
        comparison:
          parsed.comparison && typeof parsed.comparison === "object"
            ? {
                change: (["better", "same", "worse", "unclear"] as const).includes((parsed.comparison as { change: string }).change as never)
                  ? (parsed.comparison as { change: "better" }).change
                  : "unclear",
                summary: String((parsed.comparison as { summary?: string }).summary ?? ""),
              }
            : null,
      };
      return { ok: true as const, result };
    } catch (e) {
      if (e instanceof GatewayError) {
        const error =
          e.status === 402
            ? "The AI check is paused because the app is out of AI credits."
            : e.status === 429
              ? "Lots of people are checking right now. Please wait a minute and try again."
              : e.message;
        return { ok: false as const, error };
      }
      console.error(e);
      return { ok: false as const, error: "Something went wrong. Please try again." };
    }
  });

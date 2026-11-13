import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AnalysisInput, AnalysisResult } from "./analysis-schema";

const SYSTEM = `You are a first-aid triage assistant. Look at the image and the symptoms. Return only JSON: {wound_type, visible_signs[], severity_tier: self_care|clinic|urgent_care|emergency, confidence: low|medium|high, reasoning, next_steps[], warning_signs[], retake_needed: boolean, comparison: {change: better|same|worse|unclear, summary}}. Never diagnose. If the image is unclear or not a wound, set retake_needed true. When unsure, choose the more cautious tier. Write in plain language at a 6th-grade level in the requested language.
Keep reasoning to 2-3 short sentences. Give 3-5 next_steps and 3-5 warning_signs, each under 12 words. If there is no photo, judge from symptoms only and set retake_needed false. Set comparison to null unless you are given two photos to compare (first = earlier, second = today).`;

export const analyzeWound = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => AnalysisInput.parse(d))
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
      const parsed = AnalysisResult.safeParse(parseJsonLoose(raw));
      if (!parsed.success) return { ok: false as const, error: data.lang === "es" ? "No pudimos leer el resultado. Inténtalo de nuevo." : "We couldn't read the result. Please try again." };
      const result = {
        ...parsed.data,
        retake_needed: data.images.length > 0 && parsed.data.retake_needed,
        comparison: data.images.length === 2 ? parsed.data.comparison : null,
      };
      return { ok: true as const, result };
    } catch (e) {
      if (e instanceof GatewayError) {
        const error =
          e.status === 402 || e.status === 403
            ? "The AI check is paused because the app is out of AI credits or the Gemini key was rejected."
            : e.status === 429
              ? "Lots of people are checking right now. Please wait a minute and try again."
              : e.message;
        return { ok: false as const, error };
      }
      console.error(e);
      return { ok: false as const, error: "Something went wrong. Please try again." };
    }
  });

// Server-only: direct Google Gemini API call (no Lovable AI gateway).
export const GEMINI_MODEL = "gemini-3.8-flash";
export const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export class GatewayError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

type Part = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };

function toGeminiPart(p: Part) {
  if (p.type === "text") return { text: p.text };
  const m = /^data:([^;]+);base64,(.+)$/.exec(p.image_url.url);
  if (!m) throw new GatewayError(400, "Invalid image.");
  return { inline_data: { mime_type: m[1], data: m[2] } };
}

export async function streamGatewayText(system: string, parts: Part[]): Promise<string> {
  const key = process.env['GEMINI_API_KEY'];
  if (!key) throw new GatewayError(401, "AI is not configured.");
  const call = () => fetch(GEMINI_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: parts.map(toGeminiPart) }],
      generationConfig: { responseMimeType: "application/json" },
    }),
  });
  let res = await call();
  for (let i = 0; i < 2 && (res.status === 503 || res.status === 429); i++) {
    await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    res = await call();
  }
  if (!res.ok) {
    let msg = "The photo check is unavailable right now.";
    try {
      const j = (await res.json()) as { error?: { message?: string } };
      msg = j.error?.message ?? msg;
    } catch {}
    throw new GatewayError(res.status, msg);
  }
  const j = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  return j.candidates?.[0]?.content?.parts?.map((x) => x.text ?? "").join("") ?? "";
}

export function parseJsonLoose(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

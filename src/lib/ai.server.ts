// Server-only: Lovable AI Gateway call (streamed, consumed server-side).
const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
export const VISION_MODEL = "google/gemini-3-flash-preview";

export class GatewayError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

type Part = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };

export async function streamGatewayText(system: string, parts: Part[]): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new GatewayError(401, "AI is not configured.");
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: VISION_MODEL,
      stream: true,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: parts },
      ],
    }),
  });
  if (!res.ok || !res.body) {
    let msg = "The photo check is unavailable right now.";
    try {
      const j = (await res.json()) as { message?: string; error?: { message?: string } };
      msg = j.message ?? j.error?.message ?? msg;
    } catch {}
    throw new GatewayError(res.status, msg);
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let out = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      const l = line.trim();
      if (!l.startsWith("data:")) continue;
      const data = l.slice(5).trim();
      if (data === "[DONE]") continue;
      try {
        const j = JSON.parse(data);
        out += j.choices?.[0]?.delta?.content ?? "";
      } catch {}
    }
  }
  return out;
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

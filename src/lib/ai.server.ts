// Server-only: AWS analyze endpoint client. Secrets are read inside the call and
// never reach browser code. Import only from *.functions.ts handlers.
export class AnalyzeError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** The app gives up on the endpoint after this long. */
export const ANALYZE_TIMEOUT_MS = 20_000;

export async function callAnalyze(body: unknown): Promise<unknown> {
  const url = process.env["AWS_ANALYZE_URL"];
  const secret = process.env["AWS_API_SECRET"];
  if (!url || !secret) throw new AnalyzeError(500, "AWS analysis is not configured.");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ANALYZE_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-secret": secret },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    throw new AnalyzeError(0, `AWS request failed: ${reason}`);
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text().catch(() => "");
  if (!res.ok) throw new AnalyzeError(res.status, `AWS returned ${res.status}: ${text.slice(0, 500)}`);
  try {
    return JSON.parse(text);
  } catch {
    throw new AnalyzeError(502, `AWS returned unreadable JSON: ${text.slice(0, 200)}`);
  }
}
